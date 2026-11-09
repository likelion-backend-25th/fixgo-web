export const AS_RECEPTION_STATUSES = [
  "RECEIVED",
  "INSPECTION",
  "WARRANTY_REVIEW",
  "AWAITING_QUOTE_APPROVAL",
  "AWAITING_REPAIR",
  "REPAIR_IN_PROGRESS",
  "AWAITING_PAYMENT",
  "AWAITING_SHIPMENT",
  "AWAITING_PICKUP",
  "COMPLETED",
] as const;

export type AsReceptionStatus = (typeof AS_RECEPTION_STATUSES)[number];

export const REPAIR_STATUSES = [
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "DIAGNOSING",
  "REPAIRING",
  "COMPLETED",
] as const;

export type RepairStatus = (typeof REPAIR_STATUSES)[number];

export type ReturnMethod = "DELIVERY" | "PICKUP";

export type ProductCategory = "LAPTOP" | "PHONE";

export interface AsReceptionListItem {
  id: number;
  receptionNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  modelName: string | null;
  receptionStatus: AsReceptionStatus;
  repairStatus: RepairStatus | null;
  technicianName: string | null;
}

export interface AsReceptionListQuery {
  keyword: string;
  status: AsReceptionStatus | null;
  technicianId: number | null;
  page: number;
  size: number;
  sort: string;
}

export interface AsReceptionListResult {
  items: AsReceptionListItem[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ReceptionCustomer {
  id: number;
  name: string;
  phone: string;
  email: string;
  zipcode: string | null;
  basicAddress: string | null;
  detailAddress: string | null;
}

export interface ReceptionProduct {
  id: number;
  serialNumber: string;
  productModelId: number;
  purchasedAt: string | null;
}

export interface ReceptionMember {
  id: number;
  name: string;
}

export interface AsReceptionDetail {
  id: number;
  receptionNumber: string;
  createdAt: string;
  customer: ReceptionCustomer;
  product: ReceptionProduct;
  modelName: string | null;
  receptionist: ReceptionMember | null;
  technician: ReceptionMember | null;
  status: AsReceptionStatus;
  symptom: string;
  symptomDetail: string;
  memo: string | null;
  returnMethod: ReturnMethod;
  fileUrl: string | null;
}

export interface ReceptionRepair {
  id: number;
  status: RepairStatus;
  diagnosis: string | null;
  warrantyResult: "FREE" | "PAID" | "UNDECIDED";
  reason: string | null;
  reasonForRejection: string | null;
}

export interface MyReceptionDetail {
  reception: AsReceptionDetail;
  repair: ReceptionRepair | null;
}

export interface AsStatusHistory {
  id: number;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  changedBy: string | null;
  createdAt: string;
}

export interface AssignmentMember {
  id: number;
  name: string;
}

export interface TechnicianAssignmentHistory {
  receptionId: number;
  previousTechnician: AssignmentMember | null;
  newTechnician: AssignmentMember | null;
  reason: string | null;
  createdAt: string;
  changedBy: AssignmentMember | null;
}

export interface CreateReceptionInput {
  customerId: number;
  productId: number;
  technicianId: number;
  symptom: string;
  symptomDetail: string;
  memo: string;
  returnMethod: ReturnMethod;
}

export interface UpdateReceptionInput {
  symptom: string;
  symptomDetail: string;
  memo: string;
  returnMethod: ReturnMethod;
}

export interface CreateReceptionResult {
  id: number;
  receptionNumber: string;
  status: AsReceptionStatus;
  createdAt: string;
}

export interface CustomerSummary {
  id: number;
  name: string;
  phone: string;
  email: string;
  zipcode: string | null;
  basicAddress: string | null;
  detailAddress: string | null;
}

export interface CreateCustomerInput {
  name: string;
  phone: string;
  email: string;
  zipcode: string;
  basicAddress: string;
  detailAddress: string;
}

export interface ProductSummary {
  id: number;
  serialNumber: string;
  modelName: string;
  name: string;
  category: ProductCategory;
  purchasedAt: string | null;
}

export interface TechnicianSummary {
  id: number;
  name: string;
  email: string;
  status: string;
}

export interface CustomerPortalLink {
  token: string;
  expiresAt: string;
}

export interface ReceptionReceipt {
  receptionNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  zipcode: string | null;
  basicAddress: string | null;
  detailAddress: string | null;
  modelName: string;
  serialNumber: string;
  symptom: string;
  returnMethod: ReturnMethod;
  receptionistName: string;
  technicianName: string | null;
}

export interface EstimateItem {
  category: string;
  name: string;
  quantity: number | null;
  amount: number | null;
}

export interface EstimateDocument {
  receptionId: number;
  receptionNumber: string;
  confirmedAt: string | null;
  laborRate: number;
  inspectionCost: number;
  totalAmount: number;
  items: EstimateItem[];
}

export interface RepairPartUsage {
  id: number;
  partName: string;
  quantity: number;
  totalPrice: number;
}

export interface RepairWorkLine {
  repairWorkId: number;
  repairPresetName: string | null;
  workName: string;
  usedParts: RepairPartUsage[];
}

export interface RepairStatement {
  receptionNumber: string;
  customerName: string;
  issuedAt: string;
  technicianName: string | null;
  workNote: string | null;
  repairWorks: RepairWorkLine[];
  laborCost: number;
  finalAmount: number;
}
