import type { StaffRole } from "@/types/staff";

export interface NavItem {
  label: string;
  to: string;
  roles: StaffRole[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

const all: StaffRole[] = ["ADMIN", "RECEPTIONIST", "TECHNICIAN", "MANAGER"];
const desk: StaffRole[] = ["ADMIN", "RECEPTIONIST", "MANAGER"];
const floor: StaffRole[] = ["ADMIN", "TECHNICIAN", "MANAGER"];

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "A/S",
    items: [
      { label: "A/S 목록", to: "/as/list", roles: all },
      { label: "A/S 접수 등록", to: "/as/new", roles: ["RECEPTIONIST", "MANAGER"] },
    ],
  },
  {
    label: "운영",
    items: [
      { label: "A/S 지원 품목", to: "/admin/products/list", roles: desk },
      { label: "결제 관리", to: "/payment/list", roles: desk },
      { label: "배송 관리", to: "/shipment/list", roles: desk },
      { label: "고객 관리", to: "/customer", roles: desk },
      { label: "이메일 발송", to: "/notification_service", roles: desk },
      { label: "이메일 발송 내역", to: "/notification/list", roles: desk },
    ],
  },
  {
    label: "조직",
    items: [
      { label: "직원 목록", to: "/member/list", roles: ["RECEPTIONIST", "TECHNICIAN", "MANAGER"] },
      { label: "직원 관리", to: "/member/list", roles: ["ADMIN"] },
    ],
  },
  {
    label: "관리",
    items: [
      { label: "통계/리포트", to: "/admin/statistics", roles: ["ADMIN"] },
      { label: "부품 관리", to: "/admin/parts/list", roles: ["ADMIN"] },
      { label: "비용 관리", to: "/admin/costs", roles: ["ADMIN"] },
      { label: "프리셋 관리", to: "/preset/list", roles: floor },
      { label: "기사 배정 이력", to: "/admin/allocation_history", roles: ["ADMIN"] },
      { label: "A/S 상태 변경 이력", to: "/admin/status_change_history", roles: ["ADMIN"] },
    ],
  },
];

export function isNavActive(pathname: string, to: string): boolean {
  if (to === "/member/list") {
    return pathname.startsWith("/member/") && pathname !== "/member/me";
  }
  if (to === "/customer") {
    return pathname === "/customer" || pathname.startsWith("/customer/");
  }
  if (to === "/payment/list") {
    return pathname.startsWith("/payment/");
  }
  if (to === "/admin/statistics") {
    return pathname.startsWith("/admin/statistics");
  }
  if (to === "/admin/products/list") {
    return pathname.startsWith("/admin/products");
  }
  if (to === "/admin/parts/list") {
    return pathname.startsWith("/admin/parts");
  }
  if (to === "/notification/list") {
    return pathname.startsWith("/notification/");
  }
  if (to === "/as/list") {
    return pathname === "/as/list";
  }
  return pathname === to;
}

export function resolveHeading(pathname: string, role: StaffRole): { title: string; meta?: string } {
  if (pathname === "/member/me") return { title: "마이페이지" };
  if (pathname === "/member/list") return { title: role === "ADMIN" ? "직원 관리" : "직원 목록" };
  if (pathname.startsWith("/member/")) return { title: "직원 상세" };
  if (pathname === "/as/list") return { title: "A/S 목록" };
  if (pathname === "/as/new") return { title: "A/S 접수 등록" };
  if (pathname.startsWith("/as/details/")) {
    return { title: "접수 상세", meta: decodeURIComponent(pathname.split("/").at(-1) ?? "") };
  }
  if (/^\/as\/[^/]+\/(inspection|repair)$/.test(pathname)) {
    const id = pathname.split("/")[2] ?? "";
    return { title: "A/S 진행 상세", meta: decodeURIComponent(id) };
  }
  if (pathname === "/preset/list") return { title: "프리셋 관리" };
  if (pathname === "/customer") return { title: "고객 관리" };
  if (pathname.startsWith("/customer/")) return { title: "고객 상세" };
  if (pathname === "/payment/list") return { title: "결제 관리" };
  if (pathname.startsWith("/payment/")) return { title: "결제 상세" };
  if (pathname === "/shipment/list") return { title: "배송 관리" };
  if (pathname === "/notification_service") return { title: "이메일 발송" };
  if (pathname === "/notification/list") return { title: "이메일 발송 내역" };
  if (pathname.startsWith("/admin/products")) return { title: "지원 품목" };
  if (pathname.startsWith("/admin/parts")) return { title: "부품 관리" };
  if (pathname === "/admin/costs") return { title: "비용 관리" };
  if (pathname === "/admin/statistics") return { title: "통계/리포트" };
  if (pathname === "/admin/statistics/deposits/waiting") return { title: "입금 대기 내역" };
  if (pathname === "/admin/statistics/technicians") return { title: "기사별 수리 현황" };
  if (pathname === "/admin/statistics/repair_cost") return { title: "수리비 추이" };
  if (pathname === "/admin/statistics/incomplete") return { title: "장기 미처리" };
  if (pathname.startsWith("/admin/statistics/models/")) return { title: "고장 증상 분포" };
  if (pathname === "/admin/statistics/models") return { title: "제품 모델별 수리 건수" };
  if (pathname === "/admin/allocation_history") return { title: "기사 배정 이력" };
  if (pathname === "/admin/status_change_history") return { title: "A/S 상태 변경 이력" };
  return { title: "FixGo" };
}
