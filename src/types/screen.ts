export interface AsRecord {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  postalCode: string;
  address: string;
  addressDetail: string;
  productGroup: "스마트폰" | "노트북";
  modelName: string;
  serial: string;
  purchasedAt: string;
  symptom: string;
  symptomDetail: string;
  memo: string;
  receiveMethod: "방문" | "택배";
  receptionist: string;
  technician: string;
  status: string;
  receivedAt: string;
  assignedAt: string;
  portalToken: string;
}

export interface RepairLine {
  id: string;
  kind: "증상" | "작업" | "부품";
  name: string;
  quantityLabel: string;
  unitPriceLabel: string;
  amount: number;
  indent?: boolean;
}

export interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  postalCode: string;
  address: string;
  registeredAt: string;
}

export interface MemberRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  address: string;
}

export interface PaymentRecord {
  orderId: string;
  asId: string;
  customerName: string;
  productName: string;
  symptom: string;
  amount: number;
  status: "결제 대기" | "결제 완료";
  method: string;
  virtualAccount?: string;
  dueAt?: string;
  cardNumber?: string;
  paidAt?: string;
}

export interface ShipmentRecord {
  no: number;
  asId: string;
  method: "택배" | "방문 수령";
  receiver: string;
  phone: string;
  carrier: string;
  trackingNo: string;
  status: string;
  startedAt: string;
}

export interface EmailRecord {
  id: string;
  sentAt: string;
  customerName: string;
  email: string;
  asId: string;
  subject: string;
  summary: string;
  body: string;
  status: "성공" | "실패";
  channel: string;
  failReason: string;
}

export interface ProductRecord {
  id: string;
  modelName: string;
  productName: string;
  group: "스마트폰" | "노트북";
  warrantyMonths: 12 | 24;
  status: "사용" | "단종";
}

export interface PartRecord {
  id: string;
  name: string;
  code: string;
  price: number | null;
  stock: number;
  status: "사용" | "재고 부족" | "단종";
}

export interface CostRecord {
  id: string;
  product: "스마트폰" | "노트북";
  category: "공임비" | "점검비";
  amountLabel: string;
}

export interface PresetRecord {
  id: string;
  kind: "증상" | "수리";
  name: string;
  symptom: string;
  minutes: number;
  parts: string;
  description: string;
}

export interface HistoryRow {
  id: string;
  at: string;
  asId: string;
  customerName: string;
  modelName: string;
  category: string;
  before: string;
  after: string;
  actor: string;
  reason: string;
  status: string;
}
