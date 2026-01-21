
export type Role = 'ADMIN' | 'MANAGER' | 'CASHIER';
export type CreditStatus = 'ACTIVE' | 'PAID' | 'OVERDUE' | 'PLAN_SEPARE';

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string; // Campo para contraseña
  securityQuestion?: string; // Pregunta secreta
  securityAnswer?: string; // Respuesta secreta
  role: Role;
  permissions: string[];
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  brand: string;
  sku: string;
  image?: string;
}

export interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Sale {
  id: string;
  date: string;
  items: SaleItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  customerId?: string;
  paymentMethod: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO_PERSONAL';
  userId: string;
}

export interface CreditPayment {
  id: string;
  date: string;
  amount: number;
  method: string;
}

export interface Credit {
  id: string;
  saleId: string;
  customerId: string;
  totalAmount: number;
  balance: number;
  status: CreditStatus;
  dueDate: string;
  payments: CreditPayment[];
}

export interface Purchase {
  id: string;
  date: string;
  supplier: string;
  items: SaleItem[];
  total: number;
}

export interface Customer {
  id: string;
  name: string;
  nit: string;
  email: string;
  phone: string;
  address: string;
  isIvaResponsible: boolean;
}

export interface StoreConfig {
  name: string;
  nit: string;
  address: string;
  phone: string;
  email: string;
  slogan: string;
  logo: string;
}

export interface Promotion {
  id: string;
  name: string;
  discount: number;
  startDate: string;
  endDate: string;
  active: boolean;
}
