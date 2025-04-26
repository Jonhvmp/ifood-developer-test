// src/services/ifoodOrder.ts
import axios from 'axios';
import { Order, PollingEvent, TrackingInfo, CancellationRequest, CatalogItem, Merchant } from '../types/index.js';
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

  // ===== NOVAS FUNCIONALIDADES =====

  // Obter informações do restaurante
  async getMerchantInfo(merchantId: string): Promise<Merchant> {
    try {
      const headers = await ifoodAuth.getAuthHeaders();
      const response = await axios.get<Merchant>(
        `${this.baseUrl}/merchant/v1.0/merchants/${merchantId}`,
        { headers }
      );
      console.log(`Informações do restaurante ${merchantId} obtidas com sucesso`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao obter informações do restaurante ${merchantId}:`,
        axios.isAxiosError(error) ? error.response?.data : error);
      throw error;
    }
  }

  // Buscar cardápio/catálogo do restaurante
  async getMerchantCatalog(merchantId: string): Promise<CatalogItem[]> {
    try {
      const headers = await ifoodAuth.getAuthHeaders();
      const response = await axios.get<CatalogItem[]>(
        `${this.baseUrl}/catalog/v1.0/merchants/${merchantId}/catalog`,
        { headers }
      );
      console.log(`Catálogo do restaurante ${merchantId} obtido com sucesso`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao obter catálogo do restaurante ${merchantId}:`,
        axios.isAxiosError(error) ? error.response?.data : error);
      throw error;
    }
  }

  // Alterar status de disponibilidade de um item do cardápio
  async updateItemAvailability(merchantId: string, externalCode: string, available: boolean): Promise<boolean> {
    try {
      const headers = await ifoodAuth.getAuthHeaders();
      await axios.patch(
        `${this.baseUrl}/catalog/v1.0/merchants/${merchantId}/items/${externalCode}/status`,
        { available },
        { headers }
      );
      console.log(`Disponibilidade do item ${externalCode} atualizada com sucesso`);
      return true;
    } catch (error) {
      console.error(`Erro ao atualizar disponibilidade do item ${externalCode}:`,
        axios.isAxiosError(error) ? error.response?.data : error);
      throw error;
    }
  }

  // Obter histórico de pedidos por período
  async getOrdersHistory(merchantId: string, startDate: string, endDate: string): Promise<Order[]> {
    try {
      const headers = await ifoodAuth.getAuthHeaders();
      const response = await axios.get<Order[]>(
        `${this.baseUrl}/order/v1.0/merchants/${merchantId}/orders`,
        {
          headers,
          params: {
            startDate,
            endDate
          }
        }
      );
      console.log(`Histórico de pedidos obtido com sucesso (${response.data.length} pedidos)`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao obter histórico de pedidos:`,
        axios.isAxiosError(error) ? error.response?.data : error);
      throw error;
    }
  }

  // Alterar status de operação do restaurante (aberto/fechado)
  async updateMerchantStatus(merchantId: string, isOpen: boolean): Promise<boolean> {
    try {
      const headers = await ifoodAuth.getAuthHeaders();
      await axios.post(
        `${this.baseUrl}/merchant/v1.0/merchants/${merchantId}/status`,
        { operation: isOpen ? 'OPEN' : 'CLOSED' },
        { headers }
      );
      console.log(`Status do restaurante ${merchantId} atualizado para ${isOpen ? 'ABERTO' : 'FECHADO'}`);
      return true;
    } catch (error) {
      console.error(`Erro ao atualizar status do restaurante ${merchantId}:`,
        axios.isAxiosError(error) ? error.response?.data : error);
      throw error;
    }
  }

  // Adicionar ou atualizar promoção
  async createOrUpdatePromotion(merchantId: string, promotion: any): Promise<boolean> {
    try {
      const headers = await ifoodAuth.getAuthHeaders();
      await axios.post(
        `${this.baseUrl}/promotion/v1.0/merchants/${merchantId}/promotions`,
        promotion,
        { headers }
      );
      console.log(`Promoção criada/atualizada com sucesso para o restaurante ${merchantId}`);
      return true;
    } catch (error) {
      console.error(`Erro ao criar/atualizar promoção para o restaurante ${merchantId}:`,
        axios.isAxiosError(error) ? error.response?.data : error);
      throw error;
    }
  }

  // Obter métricas de desempenho do restaurante
  async getMerchantPerformance(merchantId: string, startDate: string, endDate: string): Promise<any> {
    try {
      const headers = await ifoodAuth.getAuthHeaders();
      const response = await axios.get(
        `${this.baseUrl}/merchant/v1.0/merchants/${merchantId}/performance`,
        {
          headers,
          params: {
            startDate,
            endDate
          }
        }
      );
      console.log(`Métricas de desempenho obtidas com sucesso para o restaurante ${merchantId}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao obter métricas de desempenho para o restaurante ${merchantId}:`,
        axios.isAxiosError(error) ? error.response?.data : error);
      throw error;
    }
  }
}

export default new IfoodOrderService();
