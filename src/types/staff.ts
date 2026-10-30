export type StaffRole = "ADMIN" | "RECEPTIONIST" | "TECHNICIAN" | "MANAGER";

export interface SessionUser {
  loginId: string;
  password: string;
  name: string;
  role: StaffRole;
  email: string;
  phone: string;
  address: string;
  workStatus: string;
}

export const ROLE_LABEL: Record<StaffRole, string> = {
  ADMIN: "전체 권한",
  RECEPTIONIST: "접수담당자",
  TECHNICIAN: "A/S기사",
  MANAGER: "매니저",
};
