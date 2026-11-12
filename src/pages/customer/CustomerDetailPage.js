import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice, Panel } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { isAbortError } from "@/lib/apiClient";
import { fetchReceptions, receptionStatusLabel } from "@/lib/asReceptionApi";
import { loadDaumPostcode, selectedAddress } from "@/lib/daumPostcode";
import { repairStatusLabel } from "@/lib/repair";
import { fetchCustomer, updateCustomer } from "@/lib/customerApi";
import { formatDate } from "@/lib/format";
const HISTORY_PAGE_SIZE = 10;
export function CustomerDetailPage() {
    const { customerId } = useParams();
    const id = Number(customerId);
    const [customer, setCustomer] = useState(null);
    const [history, setHistory] = useState([]);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyPageCount, setHistoryPageCount] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [editing, setEditing] = useState(false);
    const [postLookup, setPostLookup] = useState(false);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [zipcode, setZipcode] = useState("");
    const [basicAddress, setBasicAddress] = useState("");
    const [detailAddress, setDetailAddress] = useState("");
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        if (!Number.isInteger(id) || id <= 0) {
            setCustomer(null);
            setLoading(false);
            setError("고객 정보를 찾을 수 없습니다.");
            return;
        }
        const controller = new AbortController();
        setLoading(true);
        setError("");
        fetchCustomer(id, controller.signal)
            .then((detail) => {
            if (controller.signal.aborted)
                return;
            setCustomer(detail);
            setName(detail.name);
            setPhone(detail.phone);
            setEmail(detail.email);
            setZipcode(detail.zipcode ?? "");
            setBasicAddress(detail.basicAddress ?? "");
            setDetailAddress(detail.detailAddress ?? "");
        })
            .catch((cause) => {
            if (controller.signal.aborted || isAbortError(cause))
                return;
            setCustomer(null);
            setError(cause instanceof Error ? cause.message : "고객 정보를 불러오지 못했습니다.");
        })
            .finally(() => {
            if (!controller.signal.aborted)
                setLoading(false);
        });
        return () => controller.abort();
    }, [id]);
    useEffect(() => {
        if (customer === null) {
            setHistory([]);
            setHistoryPageCount(1);
            return;
        }
        const controller = new AbortController();
        fetchReceptions({
            keyword: customer.phone,
            status: null,
            technicianId: null,
            page: historyPage,
            size: HISTORY_PAGE_SIZE,
            sort: "createdAt,desc",
        }, controller.signal)
            .then((result) => {
            if (controller.signal.aborted)
                return;
            setHistory(result.items);
            setHistoryPageCount(Math.max(1, result.totalPages));
        })
            .catch((cause) => {
            if (controller.signal.aborted || isAbortError(cause))
                return;
            setHistory([]);
            setHistoryPageCount(1);
            setError(cause instanceof Error ? cause.message : "수리 이력을 불러오지 못했습니다.");
        });
        return () => controller.abort();
    }, [customer, historyPage]);
    if (loading) {
        return _jsx(Notice, { children: "\uACE0\uAC1D \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4." });
    }
    if (customer === null) {
        return _jsx(Notice, { tone: "error", children: error === "" ? "고객 정보를 찾을 수 없습니다." : error });
    }
    const address = [customer.zipcode, customer.basicAddress, customer.detailAddress]
        .filter((part) => part !== null && part !== "")
        .join(" ");
    const historyColumns = [
        {
            key: "id",
            header: "접수번호",
            render: (row) => (_jsx(Link, { className: "text-blue-600", to: `/as/details/${row.id}`, children: row.receptionNumber })),
        },
        { key: "date", header: "접수일", render: (row) => formatDate(row.createdAt) },
        { key: "model", header: "모델명", render: (row) => row.modelName ?? "-" },
        { key: "status", header: "접수상태", render: (row) => receptionStatusLabel(row.receptionStatus) },
        {
            key: "repair",
            header: "수리 상태",
            render: (row) => (row.repairStatus === null ? "-" : repairStatusLabel(row.repairStatus)),
        },
        { key: "tech", header: "담당기사", render: (row) => row.technicianName ?? "-" },
    ];
    return (_jsxs("div", { className: "space-y-4", children: [notice !== "" && _jsx(Notice, { children: notice }), error !== "" && _jsx(Notice, { tone: "error", children: error }), _jsx(Panel, { title: "\uACE0\uAC1D \uC815\uBCF4", action: _jsx(Button, { variant: "outline", onClick: () => setEditing(true), children: "\uC218\uC815" }), children: _jsxs("div", { className: "grid gap-3 text-sm sm:grid-cols-2", children: [_jsxs("p", { children: ["\uC774\uB984 ", customer.name] }), _jsxs("p", { children: ["\uC5F0\uB77D\uCC98 ", customer.phone] }), _jsxs("p", { children: ["\uC774\uBA54\uC77C ", customer.email] }), _jsxs("p", { children: ["\uC8FC\uC18C ", address === "" ? "-" : address] })] }) }), _jsx("h2", { className: "section-title", children: "\uC774\uC804 \uC218\uB9AC \uB0B4\uC5ED" }), _jsx(DataTable, { columns: historyColumns, rows: history, rowKey: (row) => String(row.id), emptyText: "\uC774\uC804 \uC218\uB9AC \uB0B4\uC5ED\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." }), _jsx(Pagination, { page: historyPage, pageCount: historyPageCount, onPageChange: setHistoryPage }), editing && !postLookup && (_jsx(Modal, { title: "\uACE0\uAC1D \uC815\uBCF4 \uC218\uC815", onClose: () => {
                    setEditing(false);
                    setPostLookup(false);
                }, children: _jsxs("form", { className: "space-y-3", onSubmit: (event) => {
                        event.preventDefault();
                        setSaving(true);
                        setError("");
                        void updateCustomer(customer.id, {
                            name: name.trim(),
                            phone: phone.trim(),
                            email: email.trim(),
                            zipcode: zipcode.trim(),
                            basicAddress: basicAddress.trim(),
                            detailAddress: detailAddress.trim(),
                        })
                            .then((updated) => {
                            setCustomer(updated);
                            setEditing(false);
                            setPostLookup(false);
                            setNotice("고객 정보를 수정했습니다.");
                        })
                            .catch((cause) => {
                            setError(cause instanceof Error ? cause.message : "고객 정보를 수정하지 못했습니다.");
                        })
                            .finally(() => setSaving(false));
                    }, children: [_jsx(TextField, { label: "\uC774\uB984", value: name, onChange: setName }), _jsx(TextField, { label: "\uC5F0\uB77D\uCC98", value: phone, onChange: setPhone }), _jsx(TextField, { label: "\uC774\uBA54\uC77C", value: email, onChange: setEmail }), _jsx(TextField, { label: "\uC6B0\uD3B8\uBC88\uD638", value: zipcode, onChange: setZipcode, readOnly: true }), _jsx(TextField, { label: "\uAE30\uBCF8 \uC8FC\uC18C", value: basicAddress, onChange: setBasicAddress }), _jsxs("div", { className: "flex items-end gap-2", children: [_jsx(TextField, { className: "flex-1", label: "\uC0C1\uC138 \uC8FC\uC18C", value: detailAddress, onChange: setDetailAddress }), _jsx(Button, { type: "button", variant: "outline", onClick: () => setPostLookup(true), children: "\uC6B0\uD3B8\uBC88\uD638 \uCC3E\uAE30" })] }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "ghost", onClick: () => {
                                        setEditing(false);
                                        setPostLookup(false);
                                    }, disabled: saving, children: "\uCDE8\uC18C" }), _jsx(Button, { type: "submit", disabled: saving, children: "\uC800\uC7A5" })] })] }) })), postLookup && (_jsx(CustomerPostLookup, { onClose: () => setPostLookup(false), onApply: ({ postalCode, address }) => {
                    setZipcode(postalCode);
                    setBasicAddress(address);
                    setPostLookup(false);
                } }))] }));
}
function CustomerPostLookup({ onClose, onApply, }) {
    const frameRef = useRef(null);
    const onApplyRef = useRef(onApply);
    const onCloseRef = useRef(onClose);
    const [lookupError, setLookupError] = useState("");
    onApplyRef.current = onApply;
    onCloseRef.current = onClose;
    useEffect(() => {
        const frame = frameRef.current;
        if (frame === null) {
            return;
        }
        let cancelled = false;
        loadDaumPostcode()
            .then((Postcode) => {
            if (cancelled) {
                return;
            }
            frame.replaceChildren();
            new Postcode({
                width: "100%",
                height: "100%",
                oncomplete: (data) => {
                    onApplyRef.current({
                        postalCode: data.zonecode,
                        address: selectedAddress(data),
                    });
                    onCloseRef.current();
                },
            }).embed(frame);
        })
            .catch((cause) => {
            if (!cancelled) {
                setLookupError(cause instanceof Error ? cause.message : "카카오 우편번호 서비스를 불러오지 못했습니다.");
            }
        });
        return () => {
            cancelled = true;
        };
    }, []);
    return (_jsxs(Modal, { title: "\uC6B0\uD3B8\uBC88\uD638 \uCC3E\uAE30", wide: true, onClose: onClose, children: [lookupError !== "" && _jsx(Notice, { tone: "error", children: lookupError }), _jsx("div", { ref: frameRef, className: "h-[460px] overflow-hidden rounded-xl border border-neutral-200" }), _jsx("p", { className: "mt-3 text-xs text-neutral-500", children: "\uC8FC\uC18C\uB97C \uACE0\uB974\uBA74 \uC6B0\uD3B8\uBC88\uD638\uC640 \uAE30\uBCF8 \uC8FC\uC18C\uAC00 \uC785\uB825\uB429\uB2C8\uB2E4. \uC0C1\uC138 \uC8FC\uC18C\uB294 \uC9C1\uC811 \uC785\uB825\uD569\uB2C8\uB2E4." })] }));
}
