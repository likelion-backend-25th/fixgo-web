export const AS_RECEPTION_STATUSES = [
  "RECEIVED",
  "INSPECTION",
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
  customerId?: number | null;
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

export interface StatusHistoryListItem {
  id: number;
  receptionId: number;
  receptionNumber: string;
  customerName: string;
  modelName: string | null;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  changedBy: string | null;
  createdAt: string;
}

export interface TechnicianHistoryListItem {
  id: number;
  receptionId: number;
  receptionNumber: string;
  customerName: string;
  modelName: string | null;
  previousTechnicianName: string | null;
  newTechnicianName: string | null;
  reason: string | null;
  changedBy: string | null;
  createdAt: string;
}

export interface HistoryListResult<T> {
  items: T[];
  totalPages: number;
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

export type {
  CreateCustomerInput,
  CustomerSummary,
} from "@/types/customer";

export interface ProductSummary {
  id: number;
  productModelId: number;
  serialNumber: string;
  modelName: string;
  name: string;
  category: ProductCategory;
  manufacturedAt: string | null;
  purchasedAt: string | null;
  warrantyMonths: number | null;
}

export interface TechnicianSummary {
  id: number;
  name: string;
  email: string;
  status: string;
}

export const TECHNICIAN_SORTS = [
  "NAME",
  "INSPECTION_WAITING_COUNT",
  "REPAIR_IN_PROGRESS_COUNT",
  "ESTIMATED_DURATION_MINUTES",
] as const;

export type TechnicianSort = (typeof TECHNICIAN_SORTS)[number];

// 배정 가능한 활성 기사. 건수와 예상 시간은 접수·수리 기록으로 서버가 계산한다.
export interface AssignableTechnician {
  id: number;
  name: string;
  email: string;
  status: string;
  inspectionWaitingCount: number;
  repairInProgressCount: number;
  estimatedDurationMinutes: number | null;
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
