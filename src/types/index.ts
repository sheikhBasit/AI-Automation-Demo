export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  stock: number;
  createdAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  product?: Product;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  city: string;
  total: number;
  status: string;
  callStatus: string;
  callRoomUrl: string | null;
  callAttempts: number;
  webhookSent: boolean;
  createdAt: Date;
  updatedAt: Date;
  items?: OrderItem[];
}
