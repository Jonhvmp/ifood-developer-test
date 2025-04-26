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
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
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
