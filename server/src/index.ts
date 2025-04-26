// src/index.ts
import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { Order, OrderEvent, PollingEvent } from './types/index.js';
import * as ifoodAuth from './services/ifoodAuth.js';
import ifoodOrder from './services/ifoodOrder.js';

// Configuração do ambiente
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Configuração da aplicação
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Armazenamento temporário de pedidos (em produção use um banco de dados)
const orders = new Map<string, Order & { status: string, events: OrderEvent[] }>();
const processedEvents = new Set<string>(); // Para registrar eventos já processados

// Middleware para verificar se temos token válido
async function ensureAuthenticated(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await ifoodAuth.getValidToken();
    next();
  } catch (error) {
    console.error('Erro de autenticação:', error);
    res.status(401).json({ error: 'Erro de autenticação com a API do iFood' });
  }
}

// Iniciar o polling de eventos do iFood
let pollingInterval: NodeJS.Timeout;

async function startPolling(): Promise<void> {
  try {
    console.log('Iniciando polling de eventos...');
    const events: PollingEvent[] = await ifoodOrder.pollEvents();

    if (events && events.length > 0) {
      console.log(`Recebido ${events.length} eventos do iFood`);

      // Processar eventos
      for (const event of events) {
        // Verificar se o evento já foi processado
        if (!processedEvents.has(event.id)) {
          console.log(`Processando evento: ${event.code} para o pedido ${event.orderId}`);

          // Processar eventos de acordo com o tipo
          await processEvent(event);

          // Registrar evento como processado
          processedEvents.add(event.id);
          console.log(`Evento ${event.id} registrado como processado`);
        } else {
          console.log(`Evento ${event.id} já foi processado anteriormente, ignorando.`);
        }
      }

      // Como a confirmação de eventos está causando problemas, vamos apenas
      // registrar que os eventos foram processados sem tentar confirmá-los na API
      console.log(`${events.length} eventos processados com sucesso`);
    }
  } catch (error) {
    console.error('Erro durante o polling de eventos:', error);
  }
}

async function processEvent(event: PollingEvent): Promise<void> {
  console.log(`Processando evento: ${event.code} para o pedido ${event.orderId}`);

  // Processar diferentes tipos de eventos
  switch (event.code) {
    case 'PLACED':
    case 'PLC': // Adicionando o código PLC que também significa novo pedido
      // Novo pedido recebido
      try {
        const orderDetails = await ifoodOrder.getOrderDetails(event.orderId);
        orders.set(event.orderId, {
          ...orderDetails,
          status: 'NOVO',
          createdAt: new Date(),
          events: [event]
        });
        console.log(`Novo pedido recebido: ${event.orderId}`);
      } catch (error) {
        console.error(`Erro ao processar novo pedido ${event.orderId}:`, error);
      }
      break;

    case 'CFM':
      // Pedido confirmado
      if (orders.has(event.orderId)) {
        const order = orders.get(event.orderId)!;
        order.status = 'CONFIRMADO';
        order.events.push(event);
        orders.set(event.orderId, order);
      }
      break;

    case 'PRS':
      // Preparação iniciada
      if (orders.has(event.orderId)) {
        const order = orders.get(event.orderId)!;
        order.status = 'EM_PREPARACAO';
        order.events.push(event);
        orders.set(event.orderId, order);
      }
      break;

    case 'RTP':
      // Pronto para retirada
      if (orders.has(event.orderId)) {
        const order = orders.get(event.orderId)!;
        order.status = 'PRONTO_PARA_RETIRADA';
        order.events.push(event);
        orders.set(event.orderId, order);
      }
      break;

    case 'DSP':
      // Despachado para entrega
      if (orders.has(event.orderId)) {
        const order = orders.get(event.orderId)!;
        order.status = 'DESPACHADO';
        order.events.push(event);
        orders.set(event.orderId, order);
      }
      break;

    case 'CON':
      // Pedido concluído
      if (orders.has(event.orderId)) {
        const order = orders.get(event.orderId)!;
        order.status = 'CONCLUIDO';
        order.events.push(event);
        orders.set(event.orderId, order);
      }
      break;

    case 'CAN':
      // Pedido cancelado
      if (orders.has(event.orderId)) {
        const order = orders.get(event.orderId)!;
        order.status = 'CANCELADO';
        order.events.push(event);
        orders.set(event.orderId, order);
      }
      break;

    default:
      // Outros eventos - apenas armazenar
      if (orders.has(event.orderId)) {
        const order = orders.get(event.orderId)!;
        order.events.push(event);
        orders.set(event.orderId, order);
      }
      break;
  }
}

// Rotas da API
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'API funcionando normalmente' });
});

// Rota para iniciar manualmente o polling
app.get('/api/start-polling', ensureAuthenticated, async (_req: Request, res: Response) => {
  try {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    // Iniciar polling a cada 30 segundos (conforme recomendação do iFood)
    pollingInterval = setInterval(startPolling, 30000);

    // Executar imediatamente a primeira vez
    await startPolling();

    res.json({ message: 'Polling de eventos iniciado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao iniciar polling de eventos' });
  }
});

// Rota para confirmar um pedido
app.post('/api/orders/:orderId/confirm', ensureAuthenticated, async (req: Request, res: Response) => {
  const { orderId } = req.params;

  try {
    await ifoodOrder.confirmOrder(orderId);

    // Atualizar status localmente
    if (orders.has(orderId)) {
      const order = orders.get(orderId)!;
      order.status = 'CONFIRMADO';
      orders.set(orderId, order);
    }

    res.json({ success: true, message: `Pedido ${orderId} confirmado com sucesso` });
  } catch (error) {
    res.status(500).json({ error: `Erro ao confirmar pedido ${orderId}` });
  }
});

// Rota para iniciar preparação
app.post('/api/orders/:orderId/start-preparation', ensureAuthenticated, async (req: Request, res: Response) => {
  const { orderId } = req.params;

  try {
    await ifoodOrder.startPreparation(orderId);

    // Atualizar status localmente
    if (orders.has(orderId)) {
      const order = orders.get(orderId)!;
      order.status = 'EM_PREPARACAO';
      orders.set(orderId, order);
    }

    res.json({ success: true, message: `Preparação do pedido ${orderId} iniciada com sucesso` });
  } catch (error) {
    res.status(500).json({ error: `Erro ao iniciar preparação do pedido ${orderId}` });
  }
});

// Rota para marcar como pronto para retirada
app.post('/api/orders/:orderId/ready', ensureAuthenticated, async (req: Request, res: Response) => {
  const { orderId } = req.params;

  try {
    await ifoodOrder.readyToPickup(orderId);

    // Atualizar status localmente
    if (orders.has(orderId)) {
      const order = orders.get(orderId)!;
      order.status = 'PRONTO_PARA_RETIRADA';
      orders.set(orderId, order);
    }

    res.json({ success: true, message: `Pedido ${orderId} pronto para retirada` });
  } catch (error) {
    res.status(500).json({ error: `Erro ao marcar pedido ${orderId} como pronto para retirada` });
  }
});

// Rota para despachar pedido
app.post('/api/orders/:orderId/dispatch', ensureAuthenticated, async (req: Request, res: Response) => {
  const { orderId } = req.params;

  try {
    await ifoodOrder.dispatchOrder(orderId);

    // Atualizar status localmente
    if (orders.has(orderId)) {
      const order = orders.get(orderId)!;
      order.status = 'DESPACHADO';
      orders.set(orderId, order);
    }

    res.json({ success: true, message: `Pedido ${orderId} despachado com sucesso` });
  } catch (error) {
    res.status(500).json({ error: `Erro ao despachar pedido ${orderId}` });
  }
});

// Rota para solicitar cancelamento
app.post('/api/orders/:orderId/cancel', ensureAuthenticated, async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { cancellationCode } = req.body;

  if (!cancellationCode) {
    res.status(400).json({ error: 'Código de cancelamento é obrigatório' });
    return;
  }

  try {
    await ifoodOrder.requestCancellation(orderId, cancellationCode);

    res.json({ success: true, message: `Solicitação de cancelamento do pedido ${orderId} enviada com sucesso` });
  } catch (error) {
    res.status(500).json({ error: `Erro ao solicitar cancelamento do pedido ${orderId}` });
  }
});

// Rota para rastrear entrega
app.get('/api/orders/:orderId/tracking', ensureAuthenticated, async (req: Request, res: Response) => {
  const { orderId } = req.params;

  try {
    const trackingInfo = await ifoodOrder.trackDelivery(orderId);
    res.json(trackingInfo);
  } catch (error) {
    res.status(500).json({ error: `Erro ao rastrear entrega do pedido ${orderId}` });
  }
});

// Rota para listar todos os pedidos
app.get('/api/orders', (_req: Request, res: Response) => {
  res.json(Array.from(orders.values()));
});

// Rota para obter detalhes de um pedido específico
app.get('/api/orders/:orderId', async (req: Request, res: Response) => {
  const { orderId } = req.params;

  if (orders.has(orderId)) {
    res.json(orders.get(orderId));
  } else {
    try {
      const orderDetails = await ifoodOrder.getOrderDetails(orderId);
      res.json(orderDetails);
    } catch (error) {
      res.status(404).json({ error: `Pedido ${orderId} não encontrado` });
    }
  }
});

// Rota para forçar a busca de um pedido específico pelo ID
app.get('/api/force-fetch-order/:orderId', ensureAuthenticated, async (req: Request, res: Response) => {
  const { orderId } = req.params;

  try {
    console.log(`Forçando a busca do pedido ${orderId}...`);
    const orderDetails = await ifoodOrder.getOrderDetails(orderId);

    // Armazenar o pedido localmente
    orders.set(orderId, {
      ...orderDetails,
      status: 'NOVO',
      createdAt: new Date(),
      events: []
    });

    console.log(`Pedido ${orderId} buscado e armazenado manualmente.`);
    res.json({ success: true, message: `Pedido ${orderId} obtido com sucesso` });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao buscar pedido ${orderId}: ${errorMessage}` });
  }
});

// Iniciar o servidor
app.listen(PORT, async () => {
  console.log(`Servidor rodando na porta ${PORT}`);

  try {
    // Obter token inicial usando qualquer método disponível
    console.log('Iniciando autenticação com o iFood...');
    await ifoodAuth.getValidToken();
    console.log('Autenticação com iFood concluída com sucesso!');

    // Iniciar polling de eventos
    pollingInterval = setInterval(startPolling, 30000);

    // Executar imediatamente a primeira vez
    await startPolling();
  } catch (error) {
    console.error('Erro ao inicializar a aplicação:', error);
  }
});

