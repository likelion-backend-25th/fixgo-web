export interface CustomerSummary {
  id: number;
  name: string;
  phone: string;
  email: string;
  zipcode: string | null;
  basicAddress: string | null;
  detailAddress: string | null;
}

export interface CustomerDetail extends CustomerSummary {
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateCustomerInput {
  name: string;
  phone: string;
  email: string;
  zipcode: string | null;
  basicAddress: string | null;
  detailAddress: string | null;
}

export type UpdateCustomerInput = CreateCustomerInput;

export interface CustomerListQuery {
  keyword: string;
  page: number;
  size: number;
}

export interface CustomerListResult {
  items: CustomerDetail[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface CustomerBulkRow {
  rowNumber: number;
  name: string;
  phone: string;
  email: string;
  zipcode: string | null;
  basicAddress: string | null;
  detailAddress: string | null;
  registrable: boolean;
  reason: string | null;
}

export interface CustomerBulkValidateResult {
  fileName: string;
  totalCount: number;
  validCount: number;
  invalidCount: number;
  rows: CustomerBulkRow[];
}

export interface CustomerBulkCreateItem {
  rowNumber: number;
  name: string;
  phone: string;
  email: string;
  zipcode: string | null;
  basicAddress: string | null;
  detailAddress: string | null;
}

export interface CustomerBulkCreateResult {
  successCount: number;
  failCount: number;
  failures: { rowNumber: number; reason: string }[];
}
