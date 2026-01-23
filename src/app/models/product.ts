// src/app/models/product.ts
export interface Product {
  id: number;
  category: string;
  code: string;
  name: string;
  price: number;
  unit: string;
  unitType?: "Số lượng" | "Thời gian"; // Định nghĩa rõ kiểu
  stock: number;
  quantity?: number;
}

export interface Category {
  id: number;
  code: string;
  name: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface OrderItem extends Product {
  quantity: number;
}