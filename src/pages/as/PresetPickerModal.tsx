import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { fetchRepairPresets } from "@/lib/repair";
import type { RepairPreset } from "@/lib/repair";
import { won } from "@/lib/format";

interface Props {
  onClose: () => void;
  onApply: (preset: RepairPreset, workName: string) => void | Promise<void>;
}

export function PresetPickerModal({ onClose, onApply }: Props) {
  const [presets, setPresets] = useState<RepairPreset[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [workName, setWorkName] = useState("");
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadPresets() {
      try {
        setLoading(true);
        const result = await fetchRepairPresets(controller.signal);

        setPresets(result);

        if (result.length > 0) {
          setSelectedId(result[0].id);
        }
      } catch (error) {
        if (controller.signal.aborted) return;

        setError(
          error instanceof Error
            ? error.message
            : "프리셋을 불러오지 못했습니다.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadPresets();

    return () => controller.abort();
  }, []);

  const visiblePresets = useMemo(
    () =>
      presets.filter(
        (preset) =>
          preset.name.toLowerCase().includes(query.toLowerCase()) ||
          (preset.description ?? "")
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [presets, query],
  );

  const selectedPreset = presets.find(
    (preset) => preset.id === selectedId,
  );

  async function handleApply() {
    if (selectedPreset === undefined) {
      setError("수리 프리셋을 선택해 주세요.");
      return;
    }

    try {
      setApplying(true);
      setError("");

      await onApply(
        selectedPreset,
        workName.trim() || selectedPreset.name,
      );

      onClose();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "수리 작업 등록에 실패했습니다.",
      );
    } finally {
      setApplying(false);
    }
  }

  return (
    <Modal title="수리 프리셋 불러오기" wide onClose={onClose}>
      <div className="space-y-4">
        <TextField
          value={query}
          onChange={setQuery}
          placeholder="프리셋 이름 또는 설명 검색"
        />

        {loading ? (
          <p className="py-8 text-center text-sm text-neutral-500">
            프리셋을 불러오는 중입니다.
          </p>
        ) : visiblePresets.length === 0 ? (
          <p className="rounded border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
            등록된 프리셋이 없습니다.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {visiblePresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setSelectedId(preset.id)}
                className={`rounded-xl border p-4 text-left ${
                  selectedId === preset.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-neutral-200 bg-white"
                }`}
              >
                <p className="font-medium">{preset.name}</p>

                <p className="mt-1 text-sm text-neutral-500">
                  {preset.description || "설명 없음"}
                </p>

                <p className="mt-3 text-sm font-semibold text-blue-700">
                  {won(preset.basePrice)}
                </p>
              </button>
            ))}
          </div>
        )}

        {selectedPreset && (
          <div className="rounded-lg bg-neutral-50 p-3 text-sm">
            <p className="font-medium">선택한 프리셋</p>
            <p className="mt-1">{selectedPreset.name}</p>
            <p className="mt-1 text-neutral-500">
              기본 가격: {won(selectedPreset.basePrice)}
            </p>
          </div>
        )}

        <TextField
          label="작업명"
          value={workName}
          onChange={setWorkName}
          placeholder="비워두면 프리셋 이름으로 등록됩니다."
        />

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>

          <Button
            onClick={handleApply}
            disabled={
              loading ||
              applying ||
              selectedPreset === undefined
            }
          >
            {applying ? "등록 중..." : "적용하기"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}