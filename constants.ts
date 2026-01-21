
import { Product, StoreConfig, User } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Balón de Fútbol Pro', category: 'Fútbol', price: 45.99, cost: 20.00, stock: 50, minStock: 10, brand: 'Nike', sku: 'SKU-001' },
  { id: '2', name: 'Zapatillas de Running X', category: 'Calzado', price: 120.00, cost: 65.00, stock: 25, minStock: 5, brand: 'Adidas', sku: 'SKU-002' },
  { id: '3', name: 'Pesas 5kg (Par)', category: 'Fitness', price: 35.50, cost: 15.00, stock: 15, minStock: 8, brand: 'GymMaster', sku: 'SKU-003' },
  { id: '4', name: 'Camiseta Selección', category: 'Ropa', price: 75.00, cost: 30.00, stock: 100, minStock: 20, brand: 'Puma', sku: 'SKU-004' },
];

export const INITIAL_STORE_CONFIG: StoreConfig = {
  name: 'SPORT MASTER',
  nit: '900.123.456-7',
  address: 'Calle 100 #15-30, Zona Deportiva',
  phone: '+57 300 123 4567',
  email: 'contacto@sportmaster.com',
  slogan: 'Tu victoria empieza aquí',
  logo: 'https://picsum.photos/200/200?random=1'
};

export const INITIAL_USER: User = {
  id: 'u1',
  name: 'Administrador Principal',
  username: 'admin',
  password: 'admin',
  securityQuestion: '¿Nombre de la tienda?',
  securityAnswer: 'sportmaster',
  role: 'ADMIN',
  permissions: ['ALL']
};

export const SECURITY_QUESTIONS = [
  "¿Nombre de tu primera mascota?",
  "¿Ciudad de nacimiento de tu madre?",
  "¿Nombre de tu escuela primaria?",
  "¿Marca de tu primer coche?",
  "¿Tu equipo de fútbol favorito?",
  "¿Nombre de la tienda?"
];
