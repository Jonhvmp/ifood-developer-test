// Tipos para a API iFood
export interface Order {
  id: string;
  reference?: string;
  shortReference?: string;
  createdAt: Date;
  type: string;
  merchant: {
    id: string;
    name: string;
  };
  customer: {
    id: string;
    name: string;
    phone: {
      number: string;
    };
    documentNumber?: string;
  };
  items: OrderItem[];
  totalPrice: number;
  deliveryAddress?: Address;
  deliveryFee?: number;
  deliveryDateTime?: string;
  deliveryProvider?: string;
  payments: Payment[];
  status: string;
  events: OrderEvent[];
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  subItems?: OrderItem[];
  observations?: string;
  unit?: string;
}

export interface Address {
  streetName: string;
  streetNumber: string;
  formattedAddress: string;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  reference?: string;
  complement?: string;
}

export interface Payment {
  type: string;
  method: string;
  amount: number;
  prepaid: boolean;
  changeFor?: number;
}

export interface OrderEvent {
  id: string;
  code: string;
  orderId: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface PollingEvent {
  id: string;
  code: string;
  orderId: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface AuthResponse {
  // Atualizando para corresponder aos nomes reais retornados pela API
  accessToken: string;
  type: string;
  expiresIn: number;
  scope?: string;
  // Mantendo os campos antigos para compatibilidade
  access_token?: string;
  token_type?: string;
  expires_in?: number;
}

export interface CancellationRequest {
  cancellationCode: string;
}

export interface TrackingInfo {
  status: string;
  courierName?: string;
  eta?: string;
  currentPosition?: {
    latitude: number;
    longitude: number;
  };
}

export interface Merchant {
  id: string;
  name: string;
  corporateName?: string;
  description?: string;
  address: Address;
  phoneNumber?: string;
  status: string;
  createdAt: string;
  categories: string[];
  averageTicket?: number;
  minimumOrderValue?: number;
  deliveryFee?: number;
  deliveryTime?: {
    min: number;
    max: number;
    unit: string;
  };
  operationHours: OperationHours[];
}

export interface OperationHours {
  dayOfWeek: string;
  openingTime: string;
  closingTime: string;
}

export interface CatalogItem {
  id: string;
  externalCode?: string;
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  available: boolean;
  imageUrl?: string;
  serving?: string;
  complementCategories?: ComplementCategory[];
  modifiers?: Modifier[];
}

export interface ComplementCategory {
  id: string;
  name: string;
  required: boolean;
  maxQuantity: number;
  minQuantity: number;
  items: ComplementItem[];
}

export interface ComplementItem {
  id: string;
  name: string;
  price: number;
  available: boolean;
}

export interface Modifier {
  id: string;
  name: string;
  price?: number;
  available: boolean;
}

export interface Promotion {
  id?: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  type: 'DISCOUNT' | 'FREE_ITEM' | 'FREE_DELIVERY';
  value?: number;
  minOrderValue?: number;
  itemId?: string;
  active: boolean;
}

export interface MerchantPerformance {
  period: {
    start: string;
    end: string;
  };
  metrics: {
    totalOrders: number;
    averageTicket: number;
    canceledOrders: number;
    salesVolume: number;
    averagePreparationTime: number;
    deliveryPerformance: {
      onTime: number;
      late: number;
      veryLate: number;
    };
    customerSatisfaction: {
      average: number;
      details: {
        food: number;
        delivery: number;
        app: number;
      }
    };
  };
}
