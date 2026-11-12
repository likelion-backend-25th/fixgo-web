import { jsx as _jsx } from "react/jsx-runtime";
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
    { path: "/", element: _jsx(HomeRedirect, {}) },
    { path: "/login", element: _jsx(LoginPage, {}) },
    {
        element: _jsx(RootLayout, {}),
        children: [
            { path: "/member/me", element: _jsx(MyPage, {}) },
            { path: "/member/list", element: _jsx(MemberListPage, {}) },
            { path: "/member/:memberId", element: _jsx(MemberDetailPage, {}) },
            { path: "/as/list", element: _jsx(AsListPage, {}) },
            { path: "/as/new", element: _jsx(AsNewPage, {}) },
            { path: "/as/details/:asRequestId", element: _jsx(AsDetailPage, {}) },
            { path: "/as/:receptionId/inspection", element: _jsx(InspectionPage, {}) },
            { path: "/as/:receptionId/repair", element: _jsx(RepairPage, {}) },
            { path: "/preset/list", element: _jsx(PresetListPage, {}) },
            { path: "/customer", element: _jsx(CustomerListPage, {}) },
            { path: "/customer/:customerId", element: _jsx(CustomerDetailPage, {}) },
            { path: "/payment/list", element: _jsx(PaymentListPage, {}) },
            { path: "/payment/:billId", element: _jsx(PaymentDetailPage, {}) },
            { path: "/shipment/list", element: _jsx(ShipmentListPage, {}) },
            { path: "/notification_service", element: _jsx(NotificationServicePage, {}) },
            { path: "/notification/list", element: _jsx(NotificationListPage, {}) },
            { path: "/admin/products/list", element: _jsx(ProductListPage, {}) },
            { path: "/admin/parts/list", element: _jsx(PartListPage, {}) },
            { path: "/admin/costs", element: _jsx(CostListPage, {}) },
            { path: "/admin/statistics", element: _jsx(StatisticsPage, {}) },
            { path: "/admin/statistics/deposits/waiting", element: _jsx(DepositWaitingPage, {}) },
            { path: "/admin/statistics/technicians", element: _jsx(TechnicianStatsPage, {}) },
            { path: "/admin/statistics/models", element: _jsx(ModelStatsPage, {}) },
            { path: "/admin/statistics/models/:modelId", element: _jsx(SymptomStatsPage, {}) },
            { path: "/admin/statistics/repair_cost", element: _jsx(RepairCostPage, {}) },
            { path: "/admin/statistics/shipments", element: _jsx(ShipmentStatsPage, {}) },
            { path: "/admin/statistics/incomplete", element: _jsx(IncompletePage, {}) },
            { path: "/admin/allocation_history", element: _jsx(AllocationHistoryPage, {}) },
            { path: "/admin/status_change_history", element: _jsx(StatusHistoryPage, {}) },
        ],
    },
    { path: "/portal/:token", element: _jsx(CustomerPortalPage, {}) },
    { path: "/portal/:token/success", element: _jsx(PortalPaymentSuccessPage, {}) },
    { path: "/portal/:token/fail", element: _jsx(PortalPaymentFailPage, {}) },
]);
