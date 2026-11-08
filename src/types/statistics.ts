export interface StatisticsPeriod {
  startDate: string;
  endDate: string;
}

export interface ReceptionStatistics extends StatisticsPeriod {
  receivedCount: number;
  completedCount: number;
  completionRate: number;
}

export interface TechnicianStatistics {
  technicianId: number;
  technicianName: string;
  assignedCount: number;
  completedCount: number;
  inProgressCount: number;
  averageDurationMinutes: number | null;
  revenue: number;
}

export interface ModelStatistics {
  modelId: number;
  modelName: string;
  productGroup: string;
  receptionCount: number;
  completedCount: number;
  inProgressCount: number;
  mainSymptom: string | null;
}

export interface ModelSymptomStatistics {
  symptomName: string;
  count: number;
  percentage: number;
}

export interface PaymentStatistics extends StatisticsPeriod {
  totalPaidAmount: number;
  totalRefundAmount: number;
  netCollectedAmount: number;
  unpaidCount: number;
}

export interface ShipmentStatistics extends StatisticsPeriod {
  readyCount: number;
  shippingCount: number;
  completedCount: number;
}
