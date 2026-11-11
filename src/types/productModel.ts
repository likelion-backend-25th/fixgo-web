import type { ProductCategory } from "@/types/asReception";

export interface ProductModel {
  id: number;
  name: string;
  modelName: string;
  category: ProductCategory;
  warrantyMonths: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateProductModelInput {
  name: string;
  modelName: string;
  category: ProductCategory;
  warrantyMonths: number;
}

export interface UpdateProductModelInput {
  name: string;
  modelName: string;
  category: ProductCategory;
  warrantyMonths: number;
  isActive: boolean;
}

export interface ProductModelListQuery {
  keyword: string;
  page: number;
  size: number;
}

export interface ProductModelListResult {
  items: ProductModel[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
