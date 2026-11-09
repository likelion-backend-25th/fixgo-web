import { createBrowserRouter } from "react-router";
import { RootLayout } from "@/layouts/RootLayout";
import { AllocationHistoryPage, StatusHistoryPage } from "@/pages/admin/HistoryPages";
import { CostListPage } from "@/pages/admin/CostListPage";
import { PartListPage } from "@/pages/admin/PartListPage";
import { ProductListPage } from "@/pages/admin/ProductListPage";
import { StatisticsPage } from "@/pages/admin/StatisticsPage";
import { IncompletePage } from "@/pages/admin/statistics/IncompletePage";
import { ModelStatsPage } from "@/pages/admin/statistics/ModelStatsPage";
import { DepositWaitingPage, RepairCostPage } from "@/pages/admin/statistics/PaymentStatsPages";
import { ShipmentStatsPage } from "@/pages/admin/statistics/ShipmentStatsPage";
import { SymptomStatsPage } from "@/pages/admin/statistics/SymptomStatsPage";
import { TechnicianStatsPage } from "@/pages/admin/statistics/TechnicianStatsPage";
import { AsDetailPage } from "@/pages/as/AsDetailPage";
import { AsListPage } from "@/pages/as/AsListPage";
import { AsNewPage } from "@/pages/as/AsNewPage";
import { RepairPage } from "@/pages/as/RepairPage";
import { CustomerDetailPage } from "@/pages/customer/CustomerDetailPage";
import { CustomerListPage } from "@/pages/customer/CustomerListPage";
import { HomeRedirect } from "@/pages/HomeRedirect";
import { LoginPage } from "@/pages/login/LoginPage";
import { MemberDetailPage } from "@/pages/member/MemberDetailPage";
import { MemberListPage } from "@/pages/member/MemberListPage";
import { MyPage } from "@/pages/member/MyPage";
import { NotificationListPage } from "@/pages/notification/NotificationListPage";
import { NotificationServicePage } from "@/pages/notification/NotificationServicePage";
import { PaymentDetailPage } from "@/pages/payment/PaymentDetailPage";
import { PaymentListPage } from "@/pages/payment/PaymentListPage";
import { CustomerPortalPage } from "@/pages/portal/CustomerPortalPage";
import { PortalPaymentFailPage } from "@/pages/portal/PortalPaymentFailPage";
import { PortalPaymentSuccessPage } from "@/pages/portal/PortalPaymentSuccessPage";
import { PresetListPage } from "@/pages/preset/PresetListPage";
import { ShipmentListPage } from "@/pages/shipment/ShipmentListPage";
import { InspectionPage } from "./pages/as/InspectionPage";

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
      { path: "/payment/:billId", element: <PaymentDetailPage /> },
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
      { path: "/admin/statistics/shipments", element: <ShipmentStatsPage /> },
      { path: "/admin/statistics/incomplete", element: <IncompletePage /> },
      { path: "/admin/allocation_history", element: <AllocationHistoryPage /> },
      { path: "/admin/status_change_history", element: <StatusHistoryPage /> },
    ],
  },
  { path: "/portal/:token", element: <CustomerPortalPage /> },
  { path: "/portal/:token/success", element: <PortalPaymentSuccessPage /> },
  { path: "/portal/:token/fail", element: <PortalPaymentFailPage /> },
]);
