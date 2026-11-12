import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { DataTable } from "@/components/ui/DataTable";
import { Notice } from "@/components/ui/Panel";
import { isAbortError } from "@/lib/apiClient";
import { formatDate, won } from "@/lib/format";
import { fetchLaborRates } from "@/lib/laborRateApi";
import { categoryToLabel } from "@/lib/productModelApi";
export function CostListPage() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        fetchLaborRates(controller.signal)
            .then((result) => {
            setRows(result);
            setError("");
        })
            .catch((cause) => {
            if (isAbortError(cause)) {
                return;
            }
            setRows([]);
            setError(cause instanceof Error ? cause.message : "공임비·점검비 목록을 불러오지 못했습니다.");
        })
            .finally(() => {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        });
        return () => controller.abort();
    }, []);
    return (_jsxs("div", { className: "space-y-8", children: [error !== "" && _jsx(Notice, { tone: "error", children: error }), _jsx(RateTable, { title: "\uACF5\uC784\uBE44", rateType: "LABOR_RATE", rows: rows, loading: loading }), _jsx(RateTable, { title: "\uC810\uAC80\uBE44", rateType: "INSPECTION_COST", rows: rows, loading: loading })] }));
}
function RateTable({ title, rateType, rows, loading, }) {
    const visible = rows.filter((row) => row.rateType === rateType);
    const columns = [
        { key: "no", header: "번호", render: (row) => visible.findIndex((item) => item.id === row.id) + 1 },
        { key: "product", header: "제품", render: (row) => categoryToLabel(row.productCategory) },
        { key: "amount", header: "금액", render: (row) => won(row.cost) },
        { key: "effectiveDate", header: "적용일", render: (row) => formatDate(row.effectiveDate) },
    ];
    return (_jsxs("section", { children: [_jsx("h2", { className: "mb-3 text-lg font-semibold", children: title }), _jsx(DataTable, { columns: columns, rows: visible, rowKey: (row) => String(row.id), emptyText: loading ? "불러오는 중입니다." : "등록된 기준이 없습니다." })] }));
}
