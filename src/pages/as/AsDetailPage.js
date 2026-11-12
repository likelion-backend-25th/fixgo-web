import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { Notice, Panel } from "@/components/ui/Panel";
import { isAbortError } from "@/lib/apiClient";
import { categoryLabel, customerPortalUrl, fetchCustomerPortalLink, fetchMyReception, fetchProduct, fetchReception, fetchReceptionHistory, historyStatusLabel, receptionStatusLabel, returnMethodLabel, } from "@/lib/asReceptionApi";
import { formatDateTime, formatYearMonthDay } from "@/lib/format";
import { readNotice } from "@/lib/guards";
import { useHeadingMeta } from "@/layouts/RootLayout";
import { useSessionStore } from "@/stores/useSessionStore";
import { DocumentModal } from "@/pages/as/DocumentModal";
import { ReceptionEditPanel } from "@/pages/as/ReceptionEditPanel";
import { TechnicianAssignPanel } from "@/pages/as/TechnicianAssignPanel";
export function AsDetailPage() {
    const { asRequestId = "" } = useParams();
    const location = useLocation();
    const receptionId = Number(asRequestId);
    const validId = Number.isInteger(receptionId) && receptionId > 0;
    const [detail, setDetail] = useState(null);
    const [repair, setRepair] = useState(null);
    const [product, setProduct] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(validId);
    const [error, setError] = useState(validId ? "" : "접수 정보를 찾을 수 없습니다.");
    const [notice, setNotice] = useState(readNotice(location.state) ?? "");
    const [version, setVersion] = useState(0);
    const role = useSessionStore((state) => state.user?.role);
    const isTechnician = role === "TECHNICIAN";
    useHeadingMeta(detail?.receptionNumber);
    useEffect(() => {
        if (!validId) {
            return;
        }
        const controller = new AbortController();
        setLoading(true);
        setError("");
        // 상세와 이력을 같이 읽고, 모델명은 제품 API로 보완한다. 기사 화면은 이력을 쓰지 않는다.
        Promise.all([
            isTechnician
                ? fetchMyReception(receptionId, controller.signal)
                : fetchReception(receptionId, controller.signal).then((reception) => ({
                    reception,
                    repair: null,
                })),
            isTechnician ? Promise.resolve([]) : fetchReceptionHistory(receptionId, controller.signal),
        ])
            .then(async ([loaded, nextHistory]) => {
            if (controller.signal.aborted) {
                return;
            }
            setDetail(loaded.reception);
            setRepair(loaded.repair);
            setHistory(nextHistory);
            try {
                const nextProduct = await fetchProduct(loaded.reception.product.id, controller.signal);
                if (!controller.signal.aborted) {
                    setProduct(nextProduct);
                }
            }
            catch (cause) {
                if (!controller.signal.aborted && !isAbortError(cause)) {
                    setProduct(null);
                }
            }
        })
            .catch((cause) => {
            if (controller.signal.aborted || isAbortError(cause)) {
                return;
            }
            setDetail(null);
            setRepair(null);
            setHistory([]);
            setError(cause instanceof Error ? cause.message : "접수 정보를 불러오지 못했습니다.");
        })
            .finally(() => {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        });
        return () => controller.abort();
    }, [isTechnician, receptionId, validId, version]);
    if (loading && detail === null) {
        return _jsx(Notice, { children: "\uC811\uC218 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4." });
    }
    if (detail === null) {
        return _jsx(Notice, { tone: "error", children: error === "" ? "접수 정보를 찾을 수 없습니다." : error });
    }
    return (_jsxs("div", { className: "space-y-4", children: [notice !== "" && _jsx(Notice, { children: notice }), error !== "" && _jsx(Notice, { tone: "error", children: error }), isTechnician && repair?.status === "REJECTED"
                && (detail.status === "AWAITING_SHIPMENT" || detail.status === "AWAITING_PICKUP") && (_jsxs(Notice, { children: ["A/S\uB97C \uC911\uB2E8\uD588\uC2B5\uB2C8\uB2E4. ", detail.returnMethod === "PICKUP" ? "수령 대기" : "배송 대기", "\uB85C \uB118\uC5B4\uAC00 \uC810\uAC80\uC774 \uB05D\uB0AC\uC2B5\uB2C8\uB2E4."] })), isTechnician ? (_jsx(TechnicianSummary, { detail: detail, productName: product?.modelName ?? detail.modelName ?? "-" })) : (_jsx(Panel, { children: _jsx("div", { className: "space-y-4", children: _jsxs("div", { className: "grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-[max-content_max-content_minmax(0,1.3fr)_max-content_minmax(0,1.8fr)]", children: [_jsx(Field, { label: "\uACE0\uAC1D\uBA85", value: detail.customer.name }), _jsx(Field, { label: "\uC5F0\uB77D\uCC98", value: detail.customer.phone, nowrap: true }), _jsx(Field, { label: "\uC774\uBA54\uC77C", value: detail.customer.email }), _jsx(Field, { label: "\uC6B0\uD3B8\uBC88\uD638", value: detail.customer.zipcode ?? "-" }), _jsx(Field, { label: "\uC8FC\uC18C", value: `${detail.customer.basicAddress ?? ""} ${detail.customer.detailAddress ?? ""}`.trim() || "-" }), _jsx(Field, { label: "\uC81C\uD488\uAD70", value: product === null ? "-" : categoryLabel(product.category) }), _jsx(Field, { label: "\uBAA8\uB378\uBA85", value: product?.modelName ?? "-" }), _jsx(Field, { label: "\uC2DC\uB9AC\uC5BC\uBC88\uD638", value: detail.product.serialNumber }), _jsx(Field, { label: "\uAD6C\uB9E4\uC77C", value: formatYearMonthDay(product?.purchasedAt ?? detail.product.purchasedAt) }), _jsx(Field, { label: "\uC218\uB839 \uBC29\uC2DD", value: returnMethodLabel(detail.returnMethod) }), _jsx("div", { className: "lg:col-span-2", children: _jsx(Field, { label: "\uC99D\uC0C1 \uC694\uC57D", value: detail.symptom }) }), _jsx(Field, { label: "\uC811\uC218 \uC9C1\uC6D0", value: detail.receptionist?.name ?? "-" }), _jsx(Field, { label: "\uB2F4\uB2F9 \uAE30\uC0AC", value: detail.technician?.name ?? "-" }), _jsx(Field, { label: "\uC811\uC218 \uB0A0\uC9DC", value: formatDateTime(detail.createdAt) }), _jsxs("div", { className: "min-w-0 sm:col-span-2 lg:col-span-3", children: [_jsx("p", { className: "mb-1 text-xs text-neutral-500", children: "\uACE0\uC7A5 \uC99D\uC0C1 \uC0C1\uC138" }), _jsx("div", { className: "min-h-20 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm break-words", children: detail.symptomDetail })] }), _jsxs("div", { className: "min-w-0 lg:col-span-2", children: [_jsx("p", { className: "mb-1 text-xs text-neutral-500", children: "\uACE0\uAC1D \uC694\uCCAD \uC0AC\uD56D / \uBA54\uBAA8" }), _jsx("div", { className: "min-h-20 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm break-words", children: detail.memo ?? "-" })] })] }) }) })), _jsx(ReceptionEditPanel, { detail: detail, onSaved: (message) => {
                    setNotice(message);
                    setError("");
                    setVersion((current) => current + 1);
                } }), _jsx(TechnicianAssignPanel, { detail: detail, refreshKey: version, onReassigned: (message) => {
                    setNotice(message);
                    setError("");
                    setVersion((current) => current + 1);
                } }), !isTechnician && (_jsxs(_Fragment, { children: [(role === "ADMIN" || role === "MANAGER") && (_jsx(Link, { className: "text-sm font-medium text-blue-600 hover:underline", to: `/as/${detail.id}/repair`, children: "\uC218\uB9AC \uC9C4\uD589 \uBCF4\uAE30" })), _jsx(StatusPanel, { detail: detail, history: history }), _jsx(Panel, { title: "\uC0C1\uD0DC \uBCC0\uACBD \uC774\uB825", children: history.length === 0 ? (_jsx("p", { className: "text-sm text-neutral-500", children: "\uC0C1\uD0DC \uBCC0\uACBD \uC774\uB825\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." })) : (_jsx("ul", { className: "space-y-3", children: history.map((item) => (_jsxs("li", { className: "text-sm", children: [_jsxs("p", { className: "font-medium", children: [historyStatusLabel(item.fromStatus), " \u2192 ", historyStatusLabel(item.toStatus)] }), _jsxs("p", { className: "mt-1 text-neutral-500", children: [formatDateTime(item.createdAt), " \u00B7 ", item.changedBy ?? "-", " \u00B7 ", item.reason ?? "-"] })] }, item.id))) })) }), _jsx(CustomerLinkPanel, { receptionId: detail.id }), _jsx(DocumentSection, { detail: detail, product: product })] }))] }));
}
const STATUS_TRACK = [
    { label: "접수", statuses: ["RECEIVED"] },
    { label: "점검", statuses: ["INSPECTION", "WARRANTY_REVIEW"] },
    { label: "견적", statuses: ["AWAITING_QUOTE_APPROVAL"] },
    { label: "수리", statuses: ["AWAITING_REPAIR", "REPAIR_IN_PROGRESS"] },
    { label: "결제", statuses: ["AWAITING_PAYMENT"] },
    { label: "인도", statuses: ["AWAITING_SHIPMENT", "AWAITING_PICKUP"] },
    { label: "완료", statuses: ["COMPLETED"] },
];
const REPAIR_STEP_INDEX = STATUS_TRACK.findIndex((step) => step.label === "수리");
function statusTrackIndex(status) {
    const index = STATUS_TRACK.findIndex((step) => step.statuses.includes(status));
    return index === -1 ? 0 : index;
}
function StatusPanel({ detail, history }) {
    const current = statusTrackIndex(detail.status);
    // 견적 승인 대기에서 결제 대기로 바로 넘어가면 고객이 견적을 거부한 것이다.
    const repairSkipped = history.some((item) => item.fromStatus === "AWAITING_QUOTE_APPROVAL" && item.toStatus === "AWAITING_PAYMENT") && current > REPAIR_STEP_INDEX;
    const aborted = history.some((item) => (item.fromStatus === "INSPECTION" || item.fromStatus === "WARRANTY_REVIEW")
        && (item.toStatus === "AWAITING_SHIPMENT" || item.toStatus === "AWAITING_PICKUP"));
    const handoffLabel = detail.returnMethod === "PICKUP" ? "수령" : "배송";
    const inset = 50 / STATUS_TRACK.length;
    return (_jsx(Panel, { title: "\uC811\uC218 \uC0C1\uD0DC", children: _jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute top-[7px] h-px bg-neutral-300", style: { left: `${inset}%`, right: `${inset}%` } }), current > 0 && (_jsx("div", { className: "absolute top-[7px] h-px bg-blue-600", style: { left: `${inset}%`, width: `${(current / (STATUS_TRACK.length - 1)) * (100 - inset * 2)}%` } })), _jsx("ol", { className: "relative grid grid-cols-7", "aria-label": "\uC811\uC218 \uC9C4\uD589", children: STATUS_TRACK.map((step, index) => {
                        const skipped = (repairSkipped && index === REPAIR_STEP_INDEX)
                            || (aborted && (step.label === "견적" || step.label === "수리" || step.label === "결제"));
                        const reached = !skipped && index <= current;
                        const active = !skipped && index === current;
                        const label = step.statuses.includes("AWAITING_SHIPMENT") ? handoffLabel : step.label;
                        return (_jsxs("li", { className: "flex flex-col items-center gap-2", "aria-current": active ? "step" : undefined, children: [skipped ? (_jsx("span", { className: "relative z-10 flex h-3.5 w-3.5 items-center justify-center text-sm font-bold leading-none text-red-600", "aria-label": "\uAC74\uB108\uB700", children: "\u00D7" })) : (_jsx("span", { className: reached
                                        ? `relative z-10 h-3.5 w-3.5 rounded-full bg-blue-600 ${active ? "ring-2 ring-blue-200 ring-offset-2" : ""}`
                                        : "relative z-10 h-3.5 w-3.5 rounded-full bg-neutral-300" })), _jsx("span", { className: skipped
                                        ? "text-center text-[11px] leading-tight font-semibold text-red-600"
                                        : reached
                                            ? `text-center text-[11px] leading-tight ${active ? "font-semibold text-blue-600" : "text-blue-600"}`
                                            : "text-center text-[11px] leading-tight text-neutral-500", children: label })] }, step.label));
                    }) })] }) }));
}
function CustomerLinkPanel({ receptionId }) {
    const [link, setLink] = useState(null);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);
    useEffect(() => {
        const controller = new AbortController();
        setLink(null);
        setError("");
        setCopied(false);
        // 접수 시 발급된 토큰으로 고객 안내 주소를 만든다.
        fetchCustomerPortalLink(receptionId, controller.signal)
            .then((nextLink) => {
            if (!controller.signal.aborted) {
                setLink(nextLink);
            }
        })
            .catch((cause) => {
            if (controller.signal.aborted || isAbortError(cause)) {
                return;
            }
            setError(cause instanceof Error ? cause.message : "고객 안내 링크를 불러오지 못했습니다.");
        });
        return () => controller.abort();
    }, [receptionId]);
    const url = link === null ? "" : customerPortalUrl(link.token);
    async function copy() {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
        }
        catch {
            setCopied(false);
            setError("링크를 복사하지 못했습니다.");
        }
    }
    return (_jsxs(Panel, { title: "\uACE0\uAC1D \uC548\uB0B4 \uB9C1\uD06C", action: link === null ? undefined : _jsx(Button, { variant: "outline", onClick: () => void copy(), children: "\uBCF5\uC0AC" }), children: [link === null && error === "" && _jsx("p", { className: "text-sm text-neutral-500", children: "\uACE0\uAC1D \uC548\uB0B4 \uB9C1\uD06C\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4." }), error !== "" && _jsx(Notice, { tone: "error", children: error }), link !== null && (_jsxs("div", { children: [_jsx("a", { href: url, target: "_blank", rel: "noreferrer", className: "break-all text-sm text-blue-700 underline", children: url }), _jsxs("p", { className: "mt-2 text-xs text-neutral-500", children: ["\uB9CC\uB8CC ", formatDateTime(link.expiresAt)] }), copied && _jsx("p", { className: "mt-2 text-xs text-blue-700", children: "\uB9C1\uD06C\uB97C \uBCF5\uC0AC\uD588\uC2B5\uB2C8\uB2E4." })] }))] }));
}
function DocumentSection({ detail, product }) {
    const [documentKind, setDocumentKind] = useState(null);
    const record = toDocumentRecord(detail, product);
    return (_jsxs(Panel, { title: "\uC11C\uB958 \uBC1C\uAE09", children: [_jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Button, { onClick: () => setDocumentKind("receipt"), children: "\uC811\uC218\uC99D" }), _jsx(Button, { variant: "outline", onClick: () => setDocumentKind("estimate"), children: "\uACAC\uC801\uC11C" }), _jsx(Button, { variant: "outline", onClick: () => setDocumentKind("repair"), children: "\uC218\uB9AC \uB0B4\uC5ED\uC11C" })] }), _jsx("p", { className: "mt-3 text-xs text-neutral-500", children: "\uACAC\uC801\uC11C\uB294 \uC218\uB9AC\uBE44 \uD655\uC815 \uD6C4, \uC218\uB9AC\uB0B4\uC5ED\uC11C\uB294 \uC218\uB9AC \uC644\uB8CC \uD6C4 \uC870\uD68C\uB429\uB2C8\uB2E4." }), documentKind !== null && (_jsx(DocumentModal, { kind: documentKind, receptionId: detail.id, record: record, onClose: () => setDocumentKind(null) }))] }));
}
function toDocumentRecord(detail, product) {
    return {
        id: detail.receptionNumber,
        customerName: detail.customer.name,
        phone: detail.customer.phone,
        email: detail.customer.email,
        postalCode: detail.customer.zipcode ?? "",
        address: detail.customer.basicAddress ?? "",
        addressDetail: detail.customer.detailAddress ?? "",
        productGroup: product?.category === "LAPTOP" ? "노트북" : "스마트폰",
        modelName: product?.modelName ?? "",
        serial: detail.product.serialNumber,
        purchasedAt: formatYearMonthDay(product?.purchasedAt ?? detail.product.purchasedAt),
        symptom: detail.symptom,
        symptomDetail: detail.symptomDetail,
        memo: detail.memo ?? "",
        receiveMethod: detail.returnMethod === "PICKUP" ? "방문" : "택배",
        receptionist: detail.receptionist?.name ?? "",
        technician: detail.technician?.name ?? "",
        status: receptionStatusLabel(detail.status),
        receivedAt: formatDateTime(detail.createdAt),
        assignedAt: formatDateTime(detail.createdAt),
        portalToken: "",
    };
}
function TechnicianSummary({ detail, productName }) {
    return (_jsx(Panel, { children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-4 gap-x-6", children: [_jsx(Field, { label: "\uACE0\uAC1D\uBA85", value: detail.customer.name }), _jsx(Field, { label: "\uC5F0\uB77D\uCC98", value: detail.customer.phone, nowrap: true }), _jsx(Field, { label: "\uC81C\uD488", value: productName }), _jsx(Field, { label: "\uC2DC\uB9AC\uC5BC\uBC88\uD638", value: detail.product.serialNumber })] }), _jsxs("div", { className: "grid grid-cols-4 gap-x-6", children: [_jsx(Field, { label: "\uACE0\uC7A5 \uC99D\uC0C1", value: detail.symptom }), _jsx(Field, { label: "\uC218\uB839 \uBC29\uC2DD", value: returnMethodLabel(detail.returnMethod) }), _jsx(Field, { label: "\uC811\uC218\uC77C", value: formatDateTime(detail.createdAt) }), _jsx(Field, { label: "\uB2F4\uB2F9 \uAE30\uC0AC", value: detail.technician?.name ?? "-" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-x-6", children: [_jsx(Note, { label: "\uACE0\uC7A5 \uC99D\uC0C1 \uC0C1\uC138", value: detail.symptomDetail }), _jsx(Note, { label: "\uACE0\uAC1D \uC694\uCCAD \uC0AC\uD56D / \uBA54\uBAA8", value: detail.memo ?? "-" })] })] }) }));
}
function Note({ label, value }) {
    return (_jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "mb-1 text-xs text-neutral-500", children: label }), _jsx("div", { className: "min-h-20 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm break-words", children: value })] }));
}
function Field({ label, value, nowrap = false }) {
    return (_jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-xs text-neutral-500", children: label }), _jsx("p", { className: nowrap ? "mt-1 text-sm whitespace-nowrap" : "mt-1 text-sm break-words", children: value || "-" })] }));
}
