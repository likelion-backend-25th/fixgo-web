import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { isAbortError } from "@/lib/apiClient";
import { categoryLabel, fetchAssignableTechnicians, searchProductsBySerialPage } from "@/lib/asReceptionApi";
import { searchCustomersPage } from "@/lib/customerApi";
import { formatDurationMinutes } from "@/lib/format";
import { embedDaumPostcode, selectedAddress } from "@/lib/daumPostcode";
export function AsLookupModals({ kind, onClose, onApply }) {
    if (kind === null) {
        return null;
    }
    if (kind === "customer") {
        return _jsx(CustomerLookup, { onClose: onClose, onApply: onApply });
    }
    if (kind === "serial") {
        return _jsx(SerialLookup, { onClose: onClose, onApply: onApply });
    }
    if (kind === "tech") {
        return _jsx(TechnicianLookup, { onClose: onClose, onApply: onApply });
    }
    return _jsx(PostLookup, { onClose: onClose, onApply: onApply });
}
function CustomerLookup({ onClose, onApply }) {
    const [query, setQuery] = useState("");
    const [applied, setApplied] = useState("");
    const [page, setPage] = useState(1);
    const [pageCount, setPageCount] = useState(1);
    const [selected, setSelected] = useState(null);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const columns = [
        { key: "name", header: "고객명", render: (row) => row.name },
        { key: "phone", header: "연락처", render: (row) => row.phone },
        { key: "email", header: "이메일", render: (row) => row.email },
        { key: "address", header: "주소", render: (row) => row.basicAddress ?? "-" },
    ];
    useEffect(() => {
        const timer = window.setTimeout(() => {
            const next = query.trim();
            setApplied((current) => {
                if (current === next) {
                    return current;
                }
                setPage(1);
                setSelected(null);
                return next;
            });
        }, 300);
        return () => window.clearTimeout(timer);
    }, [query]);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError("");
        searchCustomersPage({ keyword: applied, page, size: 20 }, controller.signal)
            .then((result) => {
            if (controller.signal.aborted) {
                return;
            }
            setRows(result.items);
            setPageCount(Math.max(1, result.totalPages));
        })
            .catch((cause) => {
            if (controller.signal.aborted || isAbortError(cause)) {
                return;
            }
            setRows([]);
            setPageCount(1);
            setError(cause instanceof Error ? cause.message : "고객을 조회하지 못했습니다.");
        })
            .finally(() => {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        });
        return () => controller.abort();
    }, [applied, page]);
    function apply(row) {
        onApply({
            customerId: row.id,
            customerName: row.name,
            phone: row.phone,
            email: row.email,
            postalCode: row.zipcode ?? "",
            address: row.basicAddress ?? "",
            addressDetail: row.detailAddress ?? "",
        });
        onClose();
    }
    return (_jsxs(Modal, { title: "\uACE0\uAC1D\uC815\uBCF4 \uC870\uD68C", wide: true, onClose: onClose, children: [_jsx(TextField, { value: query, onChange: setQuery, placeholder: "\uACE0\uAC1D\uBA85, \uC5F0\uB77D\uCC98, \uC774\uBA54\uC77C \uAC80\uC0C9", className: "mb-3 w-64" }), error !== "" && _jsx("div", { className: "mb-3", children: _jsx(Notice, { tone: "error", children: error }) }), _jsx(DataTable, { columns: columns, rows: rows, rowKey: (row) => String(row.id), selectedKey: selected === null ? undefined : String(selected), onRowClick: (row) => setSelected(row.id), onRowDoubleClick: apply, emptyText: loading ? "고객을 조회하는 중입니다." : "조회 결과가 없습니다." }), _jsx(Pagination, { page: page, pageCount: pageCount, onPageChange: (next) => {
                    setSelected(null);
                    setPage(next);
                } }), _jsxs("div", { className: "mt-4 flex justify-end gap-2", children: [_jsx(Button, { variant: "ghost", onClick: onClose, children: "\uCDE8\uC18C" }), _jsx(Button, { onClick: () => {
                            const row = rows.find((item) => item.id === selected);
                            if (row === undefined)
                                return;
                            apply(row);
                        }, children: "\uC801\uC6A9" })] })] }));
}
function SerialLookup({ onClose, onApply }) {
    const [query, setQuery] = useState("");
    const [applied, setApplied] = useState("");
    const [page, setPage] = useState(1);
    const [pageCount, setPageCount] = useState(1);
    const [selected, setSelected] = useState(null);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const columns = [
        { key: "serial", header: "시리얼번호", render: (row) => row.serialNumber },
        { key: "group", header: "제품군", render: (row) => categoryLabel(row.category) },
        { key: "model", header: "모델명", render: (row) => row.modelName },
    ];
    useEffect(() => {
        const timer = window.setTimeout(() => {
            const next = query.trim();
            setApplied((current) => {
                if (current === next) {
                    return current;
                }
                setPage(1);
                setSelected(null);
                return next;
            });
        }, 300);
        return () => window.clearTimeout(timer);
    }, [query]);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError("");
        searchProductsBySerialPage(applied, page, 20, controller.signal)
            .then((result) => {
            if (controller.signal.aborted) {
                return;
            }
            setRows(result.items);
            setPageCount(Math.max(1, result.totalPages));
        })
            .catch((cause) => {
            if (controller.signal.aborted || isAbortError(cause)) {
                return;
            }
            setRows([]);
            setPageCount(1);
            setError(cause instanceof Error ? cause.message : "제품을 조회하지 못했습니다.");
        })
            .finally(() => {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        });
        return () => controller.abort();
    }, [applied, page]);
    function apply(row) {
        const purchasedAt = row.purchasedAt?.slice(0, 10) ?? "";
        onApply({
            productId: row.id,
            productModelId: row.productModelId,
            serial: row.serialNumber,
            productGroup: categoryLabel(row.category),
            modelName: row.modelName,
            // 저장된 구매일이 있으면 채우고 수정을 막는다. 없으면 직접 입력할 수 있게 연다.
            purchasedAt,
            purchasedAtLocked: purchasedAt !== "",
        });
        onClose();
    }
    return (_jsxs(Modal, { title: "\uC2DC\uB9AC\uC5BC\uBC88\uD638 \uC870\uD68C", wide: true, onClose: onClose, children: [_jsx(TextField, { value: query, onChange: setQuery, placeholder: "\uC2DC\uB9AC\uC5BC\uBC88\uD638 \uC77C\uBD80 \uC785\uB825", className: "mb-3 w-64" }), error !== "" && _jsx("div", { className: "mb-3", children: _jsx(Notice, { tone: "error", children: error }) }), _jsx(DataTable, { columns: columns, rows: rows, rowKey: (row) => String(row.id), selectedKey: selected === null ? undefined : String(selected), onRowClick: (row) => setSelected(row.id), onRowDoubleClick: apply, emptyText: loading ? "제품을 조회하는 중입니다." : "조회 결과가 없습니다." }), _jsx(Pagination, { page: page, pageCount: pageCount, onPageChange: (next) => {
                    setSelected(null);
                    setPage(next);
                } }), _jsxs("div", { className: "mt-4 flex justify-end gap-2", children: [_jsx(Button, { variant: "ghost", onClick: onClose, children: "\uCDE8\uC18C" }), _jsx(Button, { onClick: () => {
                            const row = rows.find((item) => item.id === selected);
                            if (row === undefined)
                                return;
                            apply(row);
                        }, children: "\uC801\uC6A9" })] })] }));
}
function technicianSortBy(key) {
    if (key === "inspectionWaitingCount") {
        return "INSPECTION_WAITING_COUNT";
    }
    if (key === "repairInProgressCount") {
        return "REPAIR_IN_PROGRESS_COUNT";
    }
    if (key === "estimatedDurationMinutes") {
        return "ESTIMATED_DURATION_MINUTES";
    }
    return "NAME";
}
function isTechnicianSortKey(value) {
    return value === "name"
        || value === "inspectionWaitingCount"
        || value === "repairInProgressCount"
        || value === "estimatedDurationMinutes";
}
function TechnicianLookup({ onClose, onApply }) {
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState(null);
    const [rows, setRows] = useState([]);
    const [sortKey, setSortKey] = useState("name");
    const [sortDir, setSortDir] = useState("asc");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const columns = [
        { key: "name", header: "이름", sortable: true, render: (row) => row.name },
        { key: "email", header: "이메일", render: (row) => row.email },
        { key: "inspectionWaitingCount", header: "점검 대기", sortable: true, render: (row) => `${row.inspectionWaitingCount}건` },
        { key: "repairInProgressCount", header: "수리 진행", sortable: true, render: (row) => `${row.repairInProgressCount}건` },
        {
            key: "estimatedDurationMinutes",
            header: "예상 소요시간",
            sortable: true,
            render: (row) => formatDurationMinutes(row.estimatedDurationMinutes),
        },
    ];
    useEffect(() => {
        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            setLoading(true);
            setError("");
            fetchAssignableTechnicians(query, technicianSortBy(sortKey), sortDir === "asc" ? "ASC" : "DESC", controller.signal)
                .then((items) => {
                if (!controller.signal.aborted) {
                    setRows(items);
                }
            })
                .catch((cause) => {
                if (controller.signal.aborted || isAbortError(cause)) {
                    return;
                }
                setRows([]);
                setError(cause instanceof Error ? cause.message : "기사 목록을 불러오지 못했습니다.");
            })
                .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });
        }, 300);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [query, sortDir, sortKey]);
    function onSort(key) {
        if (!isTechnicianSortKey(key)) {
            return;
        }
        if (sortKey === key) {
            setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
            return;
        }
        setSortKey(key);
        setSortDir(key === "name" ? "asc" : "desc");
    }
    function apply(row) {
        onApply({ technicianId: row.id, technician: row.name });
        onClose();
    }
    return (_jsxs(Modal, { title: "A/S \uAE30\uC0AC \uBAA9\uB85D", wide: true, onClose: onClose, children: [_jsx(TextField, { value: query, onChange: setQuery, placeholder: "\uAE30\uC0AC \uC774\uB984 \uAC80\uC0C9", className: "mb-3 w-64" }), error !== "" && _jsx("div", { className: "mb-3", children: _jsx(Notice, { tone: "error", children: error }) }), _jsx(DataTable, { columns: columns, rows: rows, rowKey: (row) => String(row.id), selectedKey: selected === null ? undefined : String(selected), onRowClick: (row) => setSelected(row.id), onRowDoubleClick: apply, sortKey: sortKey, sortDir: sortDir, onSort: onSort, emptyText: loading ? "기사 목록을 불러오는 중입니다." : "조회 결과가 없습니다." }), _jsxs("div", { className: "mt-4 flex justify-end gap-2", children: [_jsx(Button, { variant: "ghost", onClick: onClose, children: "\uCDE8\uC18C" }), _jsx(Button, { onClick: () => {
                            const row = rows.find((item) => item.id === selected);
                            if (row === undefined)
                                return;
                            apply(row);
                        }, children: "\uC801\uC6A9\uD558\uAE30" })] })] }));
}
function PostLookup({ onClose, onApply }) {
    const frameRef = useRef(null);
    const onApplyRef = useRef(onApply);
    const onCloseRef = useRef(onClose);
    const [error, setError] = useState("");
    onApplyRef.current = onApply;
    onCloseRef.current = onClose;
    useEffect(() => {
        const frame = frameRef.current;
        if (frame === null) {
            return;
        }
        let cancelled = false;
        embedDaumPostcode(frame, {
            width: "100%",
            height: "100%",
            oncomplete: (data) => {
                onApplyRef.current({
                    postalCode: data.zonecode,
                    address: selectedAddress(data),
                });
                onCloseRef.current();
            },
        })
            .catch((cause) => {
            if (!cancelled) {
                setError(cause instanceof Error ? cause.message : "카카오 우편번호 서비스를 불러오지 못했습니다.");
            }
        });
        return () => {
            cancelled = true;
        };
    }, []);
    return (_jsxs(Modal, { title: "\uC6B0\uD3B8\uBC88\uD638 \uCC3E\uAE30", wide: true, onClose: onClose, children: [error !== "" && _jsx(Notice, { tone: "error", children: error }), _jsx("div", { ref: frameRef, className: "h-[460px] overflow-hidden rounded-xl border border-neutral-200" }), _jsx("p", { className: "mt-3 text-xs text-neutral-500", children: "\uC8FC\uC18C\uB97C \uACE0\uB974\uBA74 \uC6B0\uD3B8\uBC88\uD638\uC640 \uAE30\uBCF8 \uC8FC\uC18C\uAC00 \uC785\uB825\uB429\uB2C8\uB2E4. \uC0C1\uC138 \uC8FC\uC18C\uB294 \uC9C1\uC811 \uC785\uB825\uD569\uB2C8\uB2E4." })] }));
}
