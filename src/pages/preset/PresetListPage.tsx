import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { TextArea, TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { usePageSlice } from "@/lib/usePageSlice";
import {
  createRepairPreset,
  deleteRepairPreset,
  fetchRepairPresets,
  searchRepairPresets,
  fetchSymptomPresets,
  searchSymptomPresets,
  updateRepairPreset,
} from "@/lib/repair";
import type {
  RepairPreset,
  RepairPresetRequest,
  SymptomPreset,
} from "@/lib/repair";
import { PresetFormModal } from "./PresetFormModal";

type PresetTab = "symptom" | "repair";

export function PresetListPage() {
  const [tab, setTab] = useState<PresetTab>("repair"); // 와이어프레임 기본: 수리 프리셋
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RepairPreset | null>(null);
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
      render: (row) =>
        new Date(row.updatedAt).toLocaleDateString("ko-KR"),
    },
    {
      key: "manage",
      header: "관리",
      render: (row) => (
        <span className="flex gap-2">
          <Button variant="outline" onClick={() => setEditing(row)}>수정</Button>
          <Button
            variant="outline"
            className="border-red-600 text-red-600 hover:bg-red-50"
            onClick={() => void remove(row.id)}
          >
            삭제
          </Button>
        </span>
      ),
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

  async function remove(id: number) {
    setError("");
    try {
      await deleteRepairPreset(id);
      setNotice("수리 프리셋을 삭제했습니다.");
      setReloadKey((key) => key + 1);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "수리 프리셋을 삭제하지 못했습니다.");
    }
  }

  return (
    <div>
      {notice !== "" && <Notice>{notice}</Notice>}

      {error !== "" && <Notice tone="error">{error}</Notice>}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          variant={tab === "symptom" ? undefined : "ghost"}
          onClick={() => handleTabChange("symptom")}
        >
          고장 증상 프리셋
        </Button>

        <Button
          variant={tab === "repair" ? undefined : "ghost"}
          onClick={() => handleTabChange("repair")}
        >
          수리 프리셋
        </Button>

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
      {editing !== null && (
        <PresetEditModal
          preset={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setNotice("수리 프리셋을 수정했습니다.");
            setError("");
            setReloadKey((key) => key + 1);
          }}
        />
      )}
    </div>
  );
}

function PresetEditModal({
  preset,
  onClose,
  onSaved,
}: {
  preset: RepairPreset;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(preset.name);
  const [description, setDescription] = useState(preset.description ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (name.trim() === "") {
      setError("작업명을 입력해 주세요.");
      return;
    }
    setSaving(true);
    try {
      await updateRepairPreset(preset.id, { name: name.trim(), description: description.trim() });
      onSaved();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "수리 프리셋을 수정하지 못했습니다.");
      setSaving(false);
    }
  }

  return (
    <Modal title="프리셋 수정" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <TextField label="작업명" value={name} onChange={setName} />
        <TextArea label="작업 설명" value={description} onChange={setDescription} />
        {error !== "" && <Notice tone="error">{error}</Notice>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>취소</Button>
          <Button type="submit" disabled={saving}>수정</Button>
        </div>
      </form>
    </Modal>
  );
}