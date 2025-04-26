// src/services/ifoodOrder.ts
import axios from 'axios';
import { Order, PollingEvent, TrackingInfo, CancellationRequest } from '../types/index.js';
import * as ifoodAuth from './ifoodAuth.js';

class IfoodOrderService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'https://merchant-api.ifood.com.br';
  }

  // Método para fazer polling de eventos
  async pollEvents(): Promise<PollingEvent[]> {
    try {
      const headers = await ifoodAuth.getAuthHeaders();
      const response = await axios.get<PollingEvent[]>(`${this.baseUrl}/order/v1.0/events:polling`, { headers });
      return response.data;
    } catch (error) {
      console.error('Erro ao fazer polling de eventos:',
        axios.isAxiosError(error) ? error.response?.data : error);
      throw error;
    }
  }

  // Método para confirmar o recebimento de eventos (acknowledgment)
  async acknowledgeEvents(eventIds: string[]): Promise<boolean> {
    try {
      const headers = await ifoodAuth.getAuthHeaders();

      // Tratamento especial para contornar o problema de formato
      // Para cada evento, enviar confirmação separadamente
      for (const id of eventIds) {
        try {
          console.log(`Confirmando evento ${id}...`);

          await axios.post(
            `${this.baseUrl}/order/v1.0/events/acknowledgment`,
            { id }, // Enviando apenas um id por vez
            { headers }
          );

          console.log(`Evento ${id} confirmado com sucesso`);
        } catch (e) {
          console.error(`Falha ao confirmar evento ${id}:`,
            axios.isAxiosError(e) ? e.response?.data : e);
        }
      }

      return true;
    } catch (error) {
      console.error('Erro ao confirmar eventos:',
        axios.isAxiosError(error) ? error.response?.data : error);
      throw error;
    }
  }

  // Método para obter detalhes de um pedido
  async getOrderDetails(orderId: string): Promise<Order> {
    try {
      console.log(`Buscando detalhes do pedido ${orderId}...`);
      const headers = await ifoodAuth.getAuthHeaders();
      const response = await axios.get<Order>(`${this.baseUrl}/order/v1.0/orders/${orderId}`, { headers });
      console.log(`Detalhes do pedido ${orderId} obtidos com sucesso:`, JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error(`Erro ao obter detalhes do pedido ${orderId}:`,
        axios.isAxiosError(error) ? error.response?.data : error);
      throw error;
    }
  }

  // Método para confirmar um pedido
  async confirmOrder(orderId: string): Promise<boolean> {
    try {
      const headers = await ifoodAuth.getAuthHeaders();
      await axios.post(`${this.baseUrl}/order/v1.0/orders/${orderId}/confirm`, {}, { headers });
      console.log(`Pedido ${orderId} confirmado com sucesso`);
      return true;
    } catch (error) {
      console.error(`Erro ao confirmar pedido ${orderId}:`,
        axios.isAxiosError(error) ? error.response?.data : error);
      throw error;
    }
  }

  // Método para iniciar a preparação de um pedido
  async startPreparation(orderId: string): Promise<boolean> {
    try {
      const headers = await ifoodAuth.getAuthHeaders();
      await axios.post(`${this.baseUrl}/order/v1.0/orders/${orderId}/startPreparation`, {}, { headers });
      console.log(`Preparação do pedido ${orderId} iniciada com sucesso`);
      return true;
    } catch (error) {
      console.error(`Erro ao iniciar preparação do pedido ${orderId}:`,
        axios.isAxiosError(error) ? error.response?.data : error);
      throw error;
    }
  }

  // Método para indicar que o pedido está pronto para retirada
  async readyToPickup(orderId: string): Promise<boolean> {
    try {
      const headers = await ifoodAuth.getAuthHeaders();
      await axios.post(`${this.baseUrl}/order/v1.0/orders/${orderId}/readyToPickup`, {}, { headers });
      console.log(`Pedido ${orderId} pronto para retirada`);
      return true;
    } catch (error) {
      console.error(`Erro ao marcar pedido ${orderId} como pronto para retirada:`,
        axios.isAxiosError(error) ? error.response?.data : error);
      throw error;
    }
  }

  // Método para despachar um pedido (quando for entrega)
  async dispatchOrder(orderId: string): Promise<boolean> {
    try {
      const headers = await ifoodAuth.getAuthHeaders();
      await axios.post(`${this.baseUrl}/order/v1.0/orders/${orderId}/dispatch`, {}, { headers });
      console.log(`Pedido ${orderId} despachado com sucesso`);
      return true;
    } catch (error) {
      console.error(`Erro ao despachar pedido ${orderId}:`,
        axios.isAxiosError(error) ? error.response?.data : error);
      throw error;
    }
  }

  // Método para solicitar o cancelamento de um pedido
  async requestCancellation(orderId: string, cancellationCode: string): Promise<boolean> {
    try {
      const headers = await ifoodAuth.getAuthHeaders();
      await axios.post<CancellationRequest>(`${this.baseUrl}/order/v1.0/orders/${orderId}/requestCancellation`,
        { cancellationCode },
        { headers }
      );
      console.log(`Solicitação de cancelamento do pedido ${orderId} enviada com sucesso`);
      return true;
    } catch (error) {
      console.error(`Erro ao solicitar cancelamento do pedido ${orderId}:`,
        axios.isAxiosError(error) ? error.response?.data : error);
      throw error;
    }
  }

  // Método para rastrear a entrega (quando feita por entregadores do iFood)
  async trackDelivery(orderId: string): Promise<TrackingInfo> {
    try {
      const headers = await ifoodAuth.getAuthHeaders();
      const response = await axios.get<TrackingInfo>(`${this.baseUrl}/order/v1.0/orders/${orderId}/tracking`, { headers });
      return response.data;
    } catch (error) {
      console.error(`Erro ao rastrear entrega do pedido ${orderId}:`,
        axios.isAxiosError(error) ? error.response?.data : error);
      throw error;
    }
  }
}

export default new IfoodOrderService();
