import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { usePageSlice } from "@/lib/usePageSlice";
import {
  createRepairPreset,
  fetchRepairPresets,
  searchRepairPresets,
  fetchSymptomPresets,
  searchSymptomPresets,
} from "@/lib/repair";
import type {
  RepairPreset,
  RepairPresetRequest,
  SymptomPreset,
} from "@/lib/repair";
import { PresetFormModal } from "./PresetFormModal";

type PresetTab = "symptom" | "repair";

const presetTabs: { value: PresetTab; label: string }[] = [
  { value: "symptom", label: "고장 증상 프리셋" },
  { value: "repair", label: "수리 프리셋" },
];

function tabClass(selected: boolean): string {
  return selected
    ? "-mb-px border-b-[3px] border-[#005A9C] px-1 pb-2 text-sm font-semibold text-[#005A9C]"
    : "-mb-px border-b-[3px] border-transparent px-1 pb-2 text-sm text-[#64748B]";
}

function formatPresetDate(value: string): string {
  const matched = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (matched === null) {
    return value;
  }
  return `${matched[1]}-${matched[2]}-${matched[3]}`;
}

export function PresetListPage() {
  const [tab, setTab] = useState<PresetTab>("repair"); // 와이어프레임 기본: 수리 프리셋
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [repairPresets, setRepairPresets] = useState<RepairPreset[]>([]);
  const [symptomPresets, setSymptomPresets] = useState<SymptomPreset[]>([]);
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
        } else {
          const result = keyword
            ? await searchSymptomPresets(keyword, controller.signal)
            : await fetchSymptomPresets(controller.signal);
          setSymptomPresets(result);
        }
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error
            ? err.message
            : "프리셋 목록을 불러오지 못했습니다.",
        );
      } finally {
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

  const repairColumns: Column<RepairPreset>[] = [
    {
      key: "name",
      header: "작업명",
      width: "25%",
      className: "px-4 text-left",
      render: (row) => <span className="text-[#005A9C]">{row.name}</span>,
    },
    {
      key: "description",
      header: "작업 설명",
      width: "32%",
      className: "px-4 text-left",
      render: (row) => row.description || "-",
    },
    {
      key: "estimatedMinutes",
      header: "표준 작업시간",
      width: "13%",
      className: "px-4 text-right",
      render: (row) => `${row.estimatedMinutes.toLocaleString("ko-KR")}분`,
    },
    {
      key: "basePrice",
      header: "기본 부품 금액",
      width: "17%",
      className: "px-4 text-right",
      render: (row) => `${row.basePrice.toLocaleString("ko-KR")}원`,
    },
    {
      key: "updatedAt",
      header: "최종 수정일",
      width: "13%",
      className: "px-4 text-right",
      render: (row) => formatPresetDate(row.updatedAt),
    },
  ];

  const symptomColumns: Column<SymptomPreset>[] = [
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

  const handleTabChange = (next: PresetTab) => {
    if (next === tab) return;

    setTab(next);
    setQuery(""); // 탭을 바꾸면 검색어 초기화
    setNotice("");
    setError("");
  };

  const handleCreate = async (request: RepairPresetRequest) => {
    await createRepairPreset(request);

    setOpen(false);
    setNotice("수리 프리셋이 등록되었습니다.");
    setReloadKey((key) => key + 1); // useEffect가 목록을 다시 조회
  };

  return (
    <div>
      {notice !== "" && <Notice>{notice}</Notice>}

      {error !== "" && <Notice tone="error">{error}</Notice>}

      <div className="mb-4 border-b border-neutral-200">
        <div className="flex gap-6">
          {presetTabs.map((item) => (
            <button
              key={item.value}
              type="button"
              className={tabClass(tab === item.value)}
              onClick={() => handleTabChange(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TextField
          value={query}
          onChange={setQuery}
          placeholder={
            tab === "repair" ? "프리셋명 검색" : "증상명, 제품군 검색"
          }
          className="w-64"
        />

        {/* 증상 프리셋 등록 API가 아직 없어서 수리 프리셋 탭에서만 노출 */}
        {tab === "repair" && (
          <Button className="ml-auto" onClick={() => setOpen(true)}>
            프리셋 등록
          </Button>
        )}
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-neutral-500">
          프리셋 목록을 불러오는 중입니다.
        </div>
      ) : tab === "repair" ? (
        <>
          <DataTable
            columns={repairColumns}
            rows={repairTable.slice}
            rowKey={(row) => row.id.toString()}
          />

          <Pagination
            page={repairTable.page}
            pageCount={repairTable.pageCount}
            onPageChange={repairTable.setPage}
          />
        </>
      ) : (
        <>
          <DataTable
            columns={symptomColumns}
            rows={symptomTable.slice}
            rowKey={(row) => row.id.toString()}
          />

          <Pagination
            page={symptomTable.page}
            pageCount={symptomTable.pageCount}
            onPageChange={symptomTable.setPage}
          />
        </>
      )}

      {open && (
        <PresetFormModal
          onClose={() => setOpen(false)}
          onSave={handleCreate}
        />
      )}
    </div>
  );
}
