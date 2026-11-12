import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { usePageSlice } from "@/lib/usePageSlice";
import { createRepairPreset, fetchRepairPresets, searchRepairPresets, fetchSymptomPresets, searchSymptomPresets, } from "@/lib/repair";
import { PresetFormModal } from "./PresetFormModal";
export function PresetListPage() {
    const [tab, setTab] = useState("repair"); // 와이어프레임 기본: 수리 프리셋
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [notice, setNotice] = useState("");
    const [error, setError] = useState("");
    const [repairPresets, setRepairPresets] = useState([]);
    const [symptomPresets, setSymptomPresets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reloadKey, setReloadKey] = useState(0); // 등록 후 재조회용
    // 탭별 프리셋 목록 조회 및 이름 검색
    useEffect(() => {
        const controller = new AbortController();
        const loadPresets = async () => {
            try {
                setLoading(true);
                setError("");
                const keyword = query.trim();
                if (tab === "repair") {
                    const result = keyword
                        ? await searchRepairPresets(keyword, controller.signal)
                        : await fetchRepairPresets(controller.signal);
                    setRepairPresets(result);
                }
                else {
                    const result = keyword
                        ? await searchSymptomPresets(keyword, controller.signal)
                        : await fetchSymptomPresets(controller.signal);
                    setSymptomPresets(result);
                }
            }
            catch (err) {
                if (controller.signal.aborted)
                    return;
                setError(err instanceof Error
                    ? err.message
                    : "프리셋 목록을 불러오지 못했습니다.");
            }
            finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };
        loadPresets();
        return () => controller.abort();
    }, [tab, query, reloadKey]);
    // 탭마다 페이지 상태를 따로 유지
    const repairTable = usePageSlice(repairPresets);
    const symptomTable = usePageSlice(symptomPresets);
    const repairColumns = [
        {
            key: "name",
            header: "작업명",
            render: (row) => row.name,
        },
        {
            key: "description",
            header: "작업 설명",
            render: (row) => row.description || "-",
        },
        {
            key: "estimatedMinutes",
            header: "표준 작업시간",
            render: (row) => `${row.estimatedMinutes}분`,
        },
        {
            key: "basePrice",
            header: "기본 부품 금액",
            render: (row) => `${row.basePrice.toLocaleString("ko-KR")}원`,
        },
        {
            key: "updatedAt",
            header: "최종 수정일",
            render: (row) => new Date(row.updatedAt).toLocaleDateString("ko-KR"),
        },
    ];
    const symptomColumns = [
        {
            key: "productCategory",
            header: "제품군",
            render: (row) => row.productCategory,
        },
        {
            key: "name",
            header: "증상명",
            render: (row) => row.name,
        },
    ];
    const handleTabChange = (next) => {
        if (next === tab)
            return;
        setTab(next);
        setQuery(""); // 탭을 바꾸면 검색어 초기화
        setNotice("");
        setError("");
    };
    const handleCreate = async (request) => {
        await createRepairPreset(request);
        setOpen(false);
        setNotice("수리 프리셋이 등록되었습니다.");
        setReloadKey((key) => key + 1); // useEffect가 목록을 다시 조회
    };
    return (_jsxs("div", { children: [notice !== "" && _jsx(Notice, { children: notice }), error !== "" && _jsx(Notice, { tone: "error", children: error }), _jsxs("div", { className: "mb-4 flex flex-wrap items-center gap-2", children: [_jsx(Button, { variant: tab === "symptom" ? undefined : "ghost", onClick: () => handleTabChange("symptom"), children: "\uACE0\uC7A5 \uC99D\uC0C1 \uD504\uB9AC\uC14B" }), _jsx(Button, { variant: tab === "repair" ? undefined : "ghost", onClick: () => handleTabChange("repair"), children: "\uC218\uB9AC \uD504\uB9AC\uC14B" }), _jsx(TextField, { value: query, onChange: setQuery, placeholder: tab === "repair" ? "프리셋명 검색" : "증상명, 제품군 검색", className: "w-64" }), tab === "repair" && (_jsx(Button, { className: "ml-auto", onClick: () => setOpen(true), children: "\uD504\uB9AC\uC14B \uB4F1\uB85D" }))] }), loading ? (_jsx("div", { className: "py-8 text-center text-sm text-neutral-500", children: "\uD504\uB9AC\uC14B \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4." })) : tab === "repair" ? (_jsxs(_Fragment, { children: [_jsx(DataTable, { columns: repairColumns, rows: repairTable.slice, rowKey: (row) => row.id.toString() }), _jsx(Pagination, { page: repairTable.page, pageCount: repairTable.pageCount, onPageChange: repairTable.setPage })] })) : (_jsxs(_Fragment, { children: [_jsx(DataTable, { columns: symptomColumns, rows: symptomTable.slice, rowKey: (row) => row.id.toString() }), _jsx(Pagination, { page: symptomTable.page, pageCount: symptomTable.pageCount, onPageChange: symptomTable.setPage })] })), open && (_jsx(PresetFormModal, { onClose: () => setOpen(false), onSave: handleCreate }))] }));
}
