import { createBrowserRouter } from "react-router";
import { RootLayout } from "@/layouts/RootLayout";
import { AllocationHistoryPage, StatusHistoryPage } from "@/pages/admin/HistoryPages";
import { CostListPage } from "@/pages/admin/CostListPage";
import { PartListPage } from "@/pages/admin/PartListPage";
import { ProductListPage } from "@/pages/admin/ProductListPage";
import { StatisticsPage } from "@/pages/admin/StatisticsPage";
import {
  DepositWaitingPage,
  IncompletePage,
  ModelStatsPage,
  RepairCostPage,
  SymptomStatsPage,
  TechnicianStatsPage,
} from "@/pages/admin/StatisticsSubPages";
import { AsDetailPage } from "@/pages/as/AsDetailPage";
import { AsListPage } from "@/pages/as/AsListPage";
import { AsNewPage } from "@/pages/as/AsNewPage";
import { InspectionPage } from "@/pages/as/InspectionPage";
import { RepairPage } from "@/pages/as/RepairPage";
import { CustomerDetailPage } from "@/pages/customer/CustomerDetailPage";
import { CustomerListPage } from "@/pages/customer/CustomerListPage";
import { CustomerPortalPage } from "@/pages/customer/CustomerPortalPage";
import { HomeRedirect } from "@/pages/HomeRedirect";
import { LoginPage } from "@/pages/login/LoginPage";
import { MemberDetailPage } from "@/pages/member/MemberDetailPage";
import { MemberListPage } from "@/pages/member/MemberListPage";
import { MyPage } from "@/pages/member/MyPage";
import { NotificationListPage } from "@/pages/notification/NotificationListPage";
import { NotificationServicePage } from "@/pages/notification/NotificationServicePage";
import { PaymentDetailPage } from "@/pages/payment/PaymentDetailPage";
import { PaymentListPage } from "@/pages/payment/PaymentListPage";
import { PresetListPage } from "@/pages/preset/PresetListPage";
import { ShipmentListPage } from "@/pages/shipment/ShipmentListPage";

export const router = createBrowserRouter([
  { path: "/", element: <HomeRedirect /> },
  { path: "/login", element: <LoginPage /> },
  {
    element: <RootLayout />,
    children: [
      { path: "/member/me", element: <MyPage /> },
      { path: "/member/list", element: <MemberListPage /> },
      { path: "/member/:memberId", element: <MemberDetailPage /> },
      { path: "/as/list", element: <AsListPage /> },
      { path: "/as/new", element: <AsNewPage /> },
      { path: "/as/details/:asRequestId", element: <AsDetailPage /> },
      { path: "/as/:repairId/inspection", element: <InspectionPage /> },
      { path: "/as/:repairId/repair", element: <RepairPage /> },
      { path: "/preset/list", element: <PresetListPage /> },
      { path: "/customer", element: <CustomerListPage /> },
      { path: "/customer/:customerId", element: <CustomerDetailPage /> },
      { path: "/payment/list", element: <PaymentListPage /> },
      { path: "/payment/:orderId", element: <PaymentDetailPage /> },
      { path: "/shipment/list", element: <ShipmentListPage /> },
      { path: "/notification_service", element: <NotificationServicePage /> },
      { path: "/notification/list", element: <NotificationListPage /> },
      { path: "/admin/products/list", element: <ProductListPage /> },
      { path: "/admin/parts/list", element: <PartListPage /> },
      { path: "/admin/costs", element: <CostListPage /> },
      { path: "/admin/statistics", element: <StatisticsPage /> },
      { path: "/admin/statistics/deposits/waiting", element: <DepositWaitingPage /> },
      { path: "/admin/statistics/technicians", element: <TechnicianStatsPage /> },
      { path: "/admin/statistics/models", element: <ModelStatsPage /> },
      { path: "/admin/statistics/models/:modelId", element: <SymptomStatsPage /> },
      { path: "/admin/statistics/repair_cost", element: <RepairCostPage /> },
      { path: "/admin/statistics/incomplete", element: <IncompletePage /> },
      { path: "/admin/allocation_history", element: <AllocationHistoryPage /> },
      { path: "/admin/status_change_history", element: <StatusHistoryPage /> },
    ],
  },
  // 고객 포탈은 /{token} 이다. 정적 경로가 같은 세그먼트의 동적 경로보다 우선한다.
  { path: "/:token", element: <CustomerPortalPage /> },
]);
