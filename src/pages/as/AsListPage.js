import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { SelectBox, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { compareText, readNotice } from "@/lib/guards";
import { formatDateTime, won } from "@/lib/format";
import { isAbortError } from "@/lib/apiClient";
import { fetchReceptions, isReceptionStatus, receptionStatusLabel, searchTechnicians, } from "@/lib/asReceptionApi";
import { fetchMyRepairs, repairStatusLabel, warrantyResultLabel, } from "@/lib/repair";
import { useSessionStore } from "@/stores/useSessionStore";
import { AS_RECEPTION_STATUSES, } from "@/types/asReception";
const PAGE_SIZE = 20;
// ==============================
// 진입 컴포넌트: 역할별로 화면 분기
// ==============================
export function AsListPage() {
    const user = useSessionStore((state) => state.user);
    // 세션 로딩 전에는 역할을 알 수 없으므로 API 호출 없이 대기
    if (user === null || user === undefined) {
        return _jsx(Notice, { children: "\uC0AC\uC6A9\uC790 \uC815\uBCF4\uB97C \uD655\uC778\uD558\uB294 \uC911\uC785\uB2C8\uB2E4." });
    }
    if (user.role === "TECHNICIAN") {
        return _jsx(TechnicianAsListPage, {});
    }
    return _jsx(ReceptionAsListPage, {});
}
const REPAIR_STATUSES = [
    "REQUESTED",
    "APPROVED",
    "REJECTED",
    "DIAGNOSING",
    "REPAIRING",
    "COMPLETED",
];
const repairStatusOptions = [
    { value: "ALL", label: "상태 전체" },
    { value: "RECEIVED", label: "접수" },
    ...REPAIR_STATUSES.map((value) => ({ value, label: repairStatusLabel(value) })),
];
function isRepairStatusFilter(value) {
    return value === "ALL" || value === "RECEIVED" || REPAIR_STATUSES.some((item) => item === value);
}
function isTechSortKey(value) {
    return (value === "receptionNumber" ||
        value === "customerName" ||
        value === "modelName" ||
        value === "diagnosis" ||
        value === "warrantyResult" ||
        value === "status" ||
        value === "finalAmount" ||
        value === "createdAt");
}
function technicianStatusLabel(row) {
    if (isReturnWaiting(row.receptionStatus)) {
        return receptionStatusLabel(row.receptionStatus);
    }
    return row.repairStatus === null
        ? receptionStatusLabel(row.receptionStatus)
        : repairStatusLabel(row.repairStatus);
}
function technicianWarrantyLabel(row) {
    return row.repair === undefined ? "-" : warrantyResultLabel(row.repair.warrantyResult);
}
function compareRepair(a, b, key) {
    switch (key) {
        case "receptionNumber":
            return a.receptionNumber.localeCompare(b.receptionNumber);
        case "customerName":
            return a.customerName.localeCompare(b.customerName, "ko");
        case "modelName":
            return (a.modelName ?? "").localeCompare(b.modelName ?? "", "ko");
        case "diagnosis":
            return (a.repair?.diagnosis ?? "").localeCompare(b.repair?.diagnosis ?? "", "ko");
        case "warrantyResult":
            return technicianWarrantyLabel(a).localeCompare(technicianWarrantyLabel(b), "ko");
        case "status":
            return (a.repairStatus ?? a.receptionStatus).localeCompare(b.repairStatus ?? b.receptionStatus);
        case "finalAmount":
            return (a.repair?.finalAmount ?? -1) - (b.repair?.finalAmount ?? -1);
        case "createdAt":
            return a.createdAt.localeCompare(b.createdAt);
    }
}
async function loadTechnicianRows(signal) {
    const [repairs, receptions] = await Promise.all([
        fetchMyRepairs(signal),
        fetchMyReceptionSummaries(signal),
    ]);
    const repairsByReception = new Map(repairs.map((repair) => [repair.asReceptionId, repair]));
    return receptions.map((reception) => ({
        ...reception,
        repair: repairsByReception.get(reception.id),
    }));
}
async function fetchMyReceptionSummaries(signal) {
    const size = 100;
    const query = { keyword: "", status: null, technicianId: null, page: 1, size, sort: "createdAt,desc" };
    const first = await fetchReceptions(query, signal, true);
    const items = [...first.items];
    for (let page = 2; page <= first.totalPages; page += 1) {
        const next = await fetchReceptions({ ...query, page }, signal, true);
        items.push(...next.items);
    }
    return items;
}
function TechnicianAsListPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const notice = readNotice(location.state);
    const [items, setItems] = useState([]);
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState("ALL");
    const [sortKey, setSortKey] = useState("createdAt");
    const [sortDir, setSortDir] = useState("desc");
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    // 서버가 로그인한 기사에게 배정된 접수와 수리만 반환한다.
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError("");
        loadTechnicianRows(controller.signal)
            .then((result) => {
            if (!controller.signal.aborted) {
                setItems(result);
            }
        })
            .catch((cause) => {
            if (controller.signal.aborted || isAbortError(cause)) {
                return;
            }
            setItems([]);
            setError(cause instanceof Error ? cause.message : "내 담당 A/S 목록을 불러오지 못했습니다.");
        })
            .finally(() => {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        });
        return () => controller.abort();
    }, []);
    // 검색, 상태 필터, 정렬은 합쳐진 목록에 적용한다.
    const processed = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        const filtered = items.filter((item) => {
            const itemStatus = item.repairStatus ?? item.receptionStatus;
            if (status !== "ALL" && itemStatus !== status) {
                return false;
            }
            if (keyword === "") {
                return true;
            }
            return (item.receptionNumber.toLowerCase().includes(keyword) ||
                item.customerName.toLowerCase().includes(keyword) ||
                (item.modelName ?? "").toLowerCase().includes(keyword) ||
                (item.repair?.diagnosis ?? "").toLowerCase().includes(keyword) ||
                (item.repair?.workNote ?? "").toLowerCase().includes(keyword));
        });
        const direction = sortDir === "asc" ? 1 : -1;
        return [...filtered].sort((a, b) => compareRepair(a, b, sortKey) * direction);
    }, [items, query, status, sortKey, sortDir]);
    const pageCount = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
    const currentPage = Math.min(page, pageCount);
    const rows = processed.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    function onSort(key) {
        if (!isTechSortKey(key)) {
            return;
        }
        setPage(1);
        if (sortKey === key) {
            setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
            return;
        }
        setSortKey(key);
        setSortDir("asc");
    }
    const columns = [
        {
            key: "receptionNumber",
            header: "접수번호",
            sortable: true,
            render: (row) => row.receptionNumber,
        },
        {
            key: "customerName",
            header: "고객",
            sortable: true,
            render: (row) => row.customerName,
        },
        {
            key: "modelName",
            header: "모델명",
            sortable: true,
            render: (row) => row.modelName ?? "-",
        },
        {
            key: "diagnosis",
            header: "진단 내용",
            sortable: true,
            render: (row) => (_jsx("span", { className: "line-clamp-1 max-w-xs", children: row.repair?.diagnosis ?? "-" })),
        },
        {
            key: "warrantyResult",
            header: "보증",
            sortable: true,
            render: technicianWarrantyLabel,
        },
        {
            key: "status",
            header: "진행 상태",
            sortable: true,
            render: technicianStatusLabel,
        },
        {
            key: "finalAmount",
            header: "수리비",
            sortable: true,
            render: (row) => row.repair === undefined ? "-" : won(row.repair.finalAmount),
        },
        {
            key: "createdAt",
            header: "접수일",
            sortable: true,
            render: (row) => formatDateTime(row.createdAt),
        },
    ];
    return (_jsxs("div", { children: [notice !== null && _jsx(Notice, { children: notice }), error !== "" && _jsx(Notice, { tone: "error", children: error }), _jsxs("div", { className: "mb-4 flex flex-wrap items-center gap-2", children: [_jsx(TextField, { value: query, onChange: (value) => {
                            setQuery(value);
                            setPage(1);
                        }, placeholder: "\uC811\uC218\uBC88\uD638, \uACE0\uAC1D, \uC9C4\uB2E8 \uB0B4\uC6A9 \uAC80\uC0C9", className: "w-64" }), _jsx(SelectBox, { value: status, onChange: (value) => {
                            if (isRepairStatusFilter(value)) {
                                setStatus(value);
                                setPage(1);
                            }
                        }, options: repairStatusOptions }), _jsx("span", { className: "ml-2 text-sm text-neutral-500", children: "\uB0B4 \uB2F4\uB2F9 A/S\uB9CC \uD45C\uC2DC\uB429\uB2C8\uB2E4." })] }), _jsx(DataTable, { columns: columns, rows: rows, rowKey: (row) => String(row.id), sortKey: sortKey, sortDir: sortDir, onSort: onSort, emptyText: loading
                    ? "A/S 목록을 불러오는 중입니다."
                    : error !== ""
                        ? "A/S 목록을 불러오지 못했습니다."
                        : "조회 결과가 없습니다.", onRowClick: (row) => {
                    // 중단된 접수는 점검·수리 화면으로 다시 들어가지 않는다.
                    if (row.repairStatus === "REJECTED" && isReturnWaiting(row.receptionStatus)) {
                        navigate(`/as/details/${row.id}`);
                        return;
                    }
                    // 수리 진행 상태에 따라 점검 또는 수리 탭으로 이동한다. 주소의 id는 접수 ID다.
                    const status = row.repairStatus;
                    const goRepair = status === "APPROVED" || status === "REPAIRING" || status === "COMPLETED" || status === "REJECTED";
                    navigate(goRepair ? `/as/${row.id}/repair` : `/as/${row.id}/inspection`);
                } }), _jsx(Pagination, { page: currentPage, pageCount: pageCount, onPageChange: setPage })] }));
}
const statusOptions = [
    { value: "ALL", label: "상태 전체" },
    ...AS_RECEPTION_STATUSES.map((status) => ({
        value: status,
        label: receptionStatusLabel(status),
    })),
];
function ReceptionAsListPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = useSessionStore((state) => state.user);
    const isTechnician = user?.role === "TECHNICIAN";
    const canCreate = user?.role === "ADMIN" || user?.role === "RECEPTIONIST" || user?.role === "MANAGER";
    const notice = readNotice(location.state);
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState("ALL");
    const [assignee, setAssignee] = useState("ALL");
    const [technicians, setTechnicians] = useState([]);
    const [mineOnly, setMineOnly] = useState(false);
    const [sortKey, setSortKey] = useState("createdAt");
    const [sortDir, setSortDir] = useState("desc");
    const [page, setPage] = useState(1);
    const [applied, setApplied] = useState({ keyword: "", status: "ALL" });
    const showAssignedOnly = isTechnician && mineOnly;
    const technicianId = isTechnician || assignee === "ALL" ? null : Number(assignee);
    const filterKey = `${applied.keyword}:${applied.status}:${technicianId ?? ""}:${showAssignedOnly}:${sortKey}:${sortDir}`;
    const [seenFilter, setSeenFilter] = useState(filterKey);
    const [rows, setRows] = useState([]);
    const [modelSorted, setModelSorted] = useState(null);
    const [pageCount, setPageCount] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    if (seenFilter !== filterKey) {
        setSeenFilter(filterKey);
        setPage(1);
    }
    useEffect(() => {
        const timer = window.setTimeout(() => {
            const next = { keyword: query.trim(), status };
            setApplied((current) => {
                if (current.keyword === next.keyword && current.status === next.status) {
                    return current;
                }
                return next;
            });
        }, 300);
        return () => window.clearTimeout(timer);
    }, [query, status]);
    // 담당 기사 필터용 직원 목록 (이 컴포넌트는 기사 계정에서는 렌더링되지 않는다)
    useEffect(() => {
        const controller = new AbortController();
        searchTechnicians("", controller.signal)
            .then((items) => {
            if (!controller.signal.aborted) {
                setTechnicians(items);
            }
        })
            .catch(() => {
            if (!controller.signal.aborted) {
                setTechnicians([]);
            }
        });
        return () => controller.abort();
    }, []);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError("");
        setRows([]);
        if (sortKey !== "modelName") {
            setModelSorted(null);
        }
        const listQuery = {
            keyword: applied.keyword,
            status: applied.status === "ALL" ? null : applied.status,
            technicianId: typeof technicianId === "number" && Number.isInteger(technicianId)
                ? technicianId
                : null,
        };
        // 모델 정렬은 목록 API가 지원하지 않아, 조건에 맞는 접수를 모아 화면에서 정렬한다.
        const request = sortKey === "modelName"
            ? fetchReceptionsSortedByModel(listQuery, sortDir, controller.signal, showAssignedOnly)
            : fetchReceptions({
                ...listQuery,
                page,
                size: PAGE_SIZE,
                sort: `${sortField(sortKey)},${sortDir}`,
            }, controller.signal, showAssignedOnly).then((result) => ({ items: result.items, pageCount: Math.max(1, result.totalPages) }));
        request
            .then((result) => {
            if (controller.signal.aborted) {
                return;
            }
            if (sortKey === "modelName") {
                setModelSorted(result.items);
                setPageCount(result.pageCount);
                return;
            }
            setModelSorted(null);
            setRows(result.items);
            setPageCount(result.pageCount);
        })
            .catch((cause) => {
            if (controller.signal.aborted || isAbortError(cause)) {
                return;
            }
            setRows([]);
            setModelSorted(null);
            setPageCount(1);
            setError(cause instanceof Error ? cause.message : "A/S 목록을 불러오지 못했습니다.");
        })
            .finally(() => {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        });
        return () => controller.abort();
    }, [applied, page, showAssignedOnly, sortDir, sortKey, technicianId]);
    function onSort(key) {
        if (!isSortKey(key)) {
            return;
        }
        if (sortKey === key) {
            setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
            return;
        }
        setSortKey(key);
        setSortDir("asc");
    }
    return (_jsxs("div", { children: [notice !== null && _jsx(Notice, { children: notice }), error !== "" && _jsx(Notice, { tone: "error", children: error }), _jsxs("div", { className: "mb-4 flex flex-wrap items-center gap-2", children: [_jsx(TextField, { value: query, onChange: setQuery, placeholder: "\uC811\uC218\uBC88\uD638, \uACE0\uAC1D\uBA85, \uC99D\uC0C1 \uAC80\uC0C9", className: "w-64" }), _jsx(SelectBox, { value: status, onChange: (value) => {
                            if (isStatusFilter(value)) {
                                setStatus(value);
                            }
                        }, options: statusOptions }), !isTechnician && (_jsx(SelectBox, { value: assignee, onChange: setAssignee, options: [
                            { value: "ALL", label: "담당 전체" },
                            ...technicians.map((item) => ({ value: String(item.id), label: item.name })),
                        ] })), isTechnician && (_jsxs("label", { className: "ml-2 flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: mineOnly, onChange: (event) => setMineOnly(event.target.checked) }), "\uB0B4 \uB2F4\uB2F9 A/S \uBAA9\uB85D\uB9CC \uBCF4\uAE30"] })), canCreate && (_jsx(Button, { className: "ml-auto", onClick: () => navigate("/as/new"), children: "\uC0C8 \uC811\uC218" }))] }), _jsx(DataTable, { columns: deskColumns, rows: visibleRows(rows, modelSorted, page), rowKey: (row) => String(row.id), sortKey: sortKey, sortDir: sortDir, onSort: onSort, emptyText: tableMessage(loading, error), onRowClick: (row) => navigate(`/as/details/${row.id}`) }), _jsx(Pagination, { page: page, pageCount: pageCount, onPageChange: setPage })] }));
}
function sortField(key) {
    if (key === "customerName") {
        return "customer.name";
    }
    return key;
}
function visibleRows(rows, modelSorted, page) {
    if (modelSorted === null) {
        return rows;
    }
    const start = (page - 1) * PAGE_SIZE;
    return modelSorted.slice(start, start + PAGE_SIZE);
}
async function fetchReceptionsSortedByModel(query, sortDir, signal, mineOnly) {
    const size = 100;
    const first = await fetchReceptions({ ...query, page: 1, size, sort: "createdAt,desc" }, signal, mineOnly);
    const items = [...first.items];
    for (let page = 2; page <= first.totalPages; page += 1) {
        const next = await fetchReceptions({ ...query, page, size, sort: "createdAt,desc" }, signal, mineOnly);
        items.push(...next.items);
    }
    const direction = sortDir === "asc" ? 1 : -1;
    items.sort((left, right) => compareText(left.modelName ?? "", right.modelName ?? "") * direction);
    return {
        items,
        pageCount: Math.max(1, Math.ceil(items.length / PAGE_SIZE)),
    };
}
function tableMessage(loading, error) {
    if (loading) {
        return "A/S 목록을 불러오는 중입니다.";
    }
    if (error !== "") {
        return "A/S 목록을 불러오지 못했습니다.";
    }
    return "조회 결과가 없습니다.";
}
function isStatusFilter(value) {
    return value === "ALL" || isReceptionStatus(value);
}
function isSortKey(value) {
    return (value === "receptionNumber" ||
        value === "createdAt" ||
        value === "status" ||
        value === "customerName" ||
        value === "modelName");
}
function statusText(row) {
    if (row.repairStatus === "REJECTED" && !isReturnWaiting(row.receptionStatus)) {
        return "수리 거부";
    }
    return receptionStatusLabel(row.receptionStatus);
}
function isReturnWaiting(status) {
    return status === "AWAITING_SHIPMENT" || status === "AWAITING_PICKUP";
}
const deskColumns = [
    { key: "receptionNumber", header: "접수번호", sortable: true, render: (row) => row.receptionNumber },
    { key: "customerName", header: "고객", sortable: true, render: (row) => row.customerName },
    { key: "phone", header: "연락처", render: (row) => row.customerPhone },
    { key: "modelName", header: "모델", sortable: true, render: (row) => row.modelName ?? "-" },
    { key: "status", header: "상태", sortable: true, render: (row) => statusText(row) },
    { key: "technician", header: "담당", render: (row) => row.technicianName ?? "-" },
    { key: "createdAt", header: "접수일", sortable: true, render: (row) => formatDateTime(row.createdAt) },
];
