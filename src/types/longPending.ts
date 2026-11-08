import type { AsReceptionStatus } from "@/types/asReception";

export interface LongPendingReception {
  receptionId: number;
  receptionNumber: string;
  customerName: string;
  modelName: string;
  status: AsReceptionStatus;
  technicianName: string | null;
  elapsedDays: number;
  lastActivityAt: string;
}
