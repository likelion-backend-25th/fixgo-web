import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { categoryLabel, fetchProduct } from "@/lib/asReceptionApi";
import { won } from "@/lib/format";
import { fetchCompatiblePartIds } from "@/lib/partApi";
import {
  createRepairPreset,
  fetchRepairPresetParts,
  fetchRepairPresetsBySymptom,
  fetchSymptomPresets,
  type RepairPreset,
  type RepairPresetPart,
  type SymptomPreset,
} from "@/lib/repair";
import { PresetFormModal } from "@/pages/preset/PresetFormModal";

export interface InspectionPresetChoice {
  preset: RepairPreset;
  parts: RepairPresetPart[];
}

export interface InspectionPresetSelection {
  symptom: SymptomPreset;
  presets: InspectionPresetChoice[];
}

interface Props {
  productId: number;
  productModelId: number;
  onClose: () => void;
  onApply: (selection: InspectionPresetSelection) => void | Promise<void>;
}

export function PresetPickerModal({ productId, productModelId, onClose, onApply }: Props) {
  const [symptoms, setSymptoms] = useState<SymptomPreset[]>([]);
  const [symptomsLoading, setSymptomsLoading] = useState(true);
  const [productCategory, setProductCategory] = useState<string | null>(null);
  const [categoryReady, setCategoryReady] = useState(false);
  const [symptomQuery, setSymptomQuery] = useState("");
  const [selectedSymptomId, setSelectedSymptomId] = useState<number | null>(null);

  const [presets, setPresets] = useState<RepairPreset[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [presetQuery, setPresetQuery] = useState("");
  const [selectedPresetIds, setSelectedPresetIds] = useState<number[]>([]);
  const [partsByPresetId, setPartsByPresetId] = useState<Map<number, RepairPresetPart[]>>(new Map());
  const [partsLoadingIds, setPartsLoadingIds] = useState<number[]>([]);
  const [compatibleIds, setCompatibleIds] = useState<Set<number> | null>(null);
  const [compatibleReady, setCompatibleReady] = useState(false);
  const [deselectedPartKeys, setDeselectedPartKeys] = useState<Set<string>>(() => new Set());
  const [applying, setApplying] = useState(false);
  const [creating, setCreating] = useState(false);
  const [presetReloadKey, setPresetReloadKey] = useState(0);
  const [error, setError] = useState("");
  const loadedSymptomId = useRef<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchProduct(productId, controller.signal)
      .then((product) => setProductCategory(categoryLabel(product.category)))
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "제품군을 확인하지 못했습니다.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setCategoryReady(true);
      });

    return () => controller.abort();
  }, [productId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchCompatiblePartIds(productModelId, controller.signal)
      .then((ids) => {
        if (!controller.signal.aborted) setCompatibleIds(ids);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "호환 부품을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setCompatibleReady(true);
      });
    return () => controller.abort();
  }, [productModelId]);

  useEffect(() => {
    const controller = new AbortController();

    fetchSymptomPresets(controller.signal)
      .then(setSymptoms)
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "고장 증상을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setSymptomsLoading(false);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (selectedSymptomId === null) {
      setPresets([]);
      return;
    }

    const controller = new AbortController();
    setPresetsLoading(true);
    // 증상을 바꿀 때만 선택을 비운다. 등록 후 새로고침은 고른 프리셋을 유지한다.
    if (loadedSymptomId.current !== selectedSymptomId) {
      loadedSymptomId.current = selectedSymptomId;
      setPresets([]);
      setSelectedPresetIds([]);
      setPartsByPresetId(new Map());
      setPartsLoadingIds([]);
      setDeselectedPartKeys(new Set());
    }

    fetchRepairPresetsBySymptom(selectedSymptomId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setPresets(result);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "수리 프리셋을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setPresetsLoading(false);
      });

    return () => controller.abort();
  }, [selectedSymptomId, presetReloadKey]);

  const visibleSymptoms = useMemo(() => {
    const keyword = symptomQuery.trim().toLowerCase();
    return symptoms.filter(
      (symptom) =>
        (productCategory === null || symptom.productCategory === productCategory) &&
        symptom.name.toLowerCase().includes(keyword),
    );
  }, [productCategory, symptomQuery, symptoms]);

  const visiblePresets = useMemo(() => {
    const keyword = presetQuery.trim().toLowerCase();
    return presets.filter(
      (preset) =>
        preset.name.toLowerCase().includes(keyword) ||
        (preset.description ?? "").toLowerCase().includes(keyword),
    );
  }, [presetQuery, presets]);

  const selectedSymptom = symptoms.find((symptom) => symptom.id === selectedSymptomId);
  const selectedPresets = selectedPresetIds
    .map((id) => presets.find((preset) => preset.id === id))
    .filter((preset): preset is RepairPreset => preset !== undefined);
  const partsLoading = selectedPresetIds.some((id) => partsLoadingIds.includes(id));
  const partsTotal = selectedPresets.reduce((sum, preset) => {
    const parts = compatibleParts(partsByPresetId.get(preset.id), compatibleIds);
    return sum + parts.reduce((partSum, part) => (
      deselectedPartKeys.has(partKey(preset.id, part.partId)) ? partSum : partSum + part.unitPrice * part.quantity
    ), 0);
  }, 0);

  async function togglePreset(preset: RepairPreset) {
    setError("");
    if (selectedPresetIds.includes(preset.id)) {
      setSelectedPresetIds((current) => current.filter((id) => id !== preset.id));
      return;
    }

    setSelectedPresetIds((current) => [...current, preset.id]);
    if (partsByPresetId.has(preset.id)) return;

    setPartsLoadingIds((current) => [...current, preset.id]);
    try {
      const parts = await fetchRepairPresetParts(preset.id);
      setPartsByPresetId((current) => {
        const next = new Map(current);
        next.set(preset.id, parts);
        return next;
      });
    } catch (cause: unknown) {
      setSelectedPresetIds((current) => current.filter((id) => id !== preset.id));
      setError(cause instanceof Error ? cause.message : "소모 부품을 불러오지 못했습니다.");
    } finally {
      setPartsLoadingIds((current) => current.filter((id) => id !== preset.id));
    }
  }

  function togglePart(presetId: number, partId: number) {
    setDeselectedPartKeys((current) => {
      const next = new Set(current);
      const key = partKey(presetId, partId);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function apply() {
    if (selectedSymptom === undefined || selectedPresets.length === 0) {
      setError("고장 증상과 수리 프리셋을 선택해 주세요.");
      return;
    }
    if (partsLoading || !compatibleReady || compatibleIds === null) return;

    const choices = selectedPresets.map((preset) => ({
      preset,
      parts: compatibleParts(partsByPresetId.get(preset.id), compatibleIds)
        .filter((part) => !deselectedPartKeys.has(partKey(preset.id, part.partId))),
    }));

    setApplying(true);
    setError("");
    try {
      await onApply({ symptom: selectedSymptom, presets: choices });
      onClose();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "점검 항목을 반영하지 못했습니다.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <Modal title="수리 프리셋 불러오기" wide onClose={onClose}>
      <p className="mb-3 text-sm text-neutral-500">
        {`${productCategory === null ? "고장 증상" : `${productCategory} 고장 증상`}을 고른 뒤, 그 증상의 수리 프리셋을 여러 개 선택할 수 있습니다. 부품은 접수 모델과 호환되는 것만 보이며, 필요한 것만 골라 적용합니다.`}
      </p>
      <div className="grid gap-3 lg:grid-cols-3">
        <PickerColumn
          title="1. 고장 증상"
          search={<SearchBox value={symptomQuery} onChange={setSymptomQuery} placeholder="증상명 검색" />}
        >
          {symptomsLoading || !categoryReady ? (
            <EmptyText>불러오는 중입니다.</EmptyText>
          ) : visibleSymptoms.length === 0 ? (
            <EmptyText>이 제품군에 등록된 고장 증상이 없습니다.</EmptyText>
          ) : (
            visibleSymptoms.map((symptom) => (
              <ChoiceButton
                key={symptom.id}
                selected={symptom.id === selectedSymptomId}
                title={symptom.name}
                onClick={() => {
                  setError("");
                  setSelectedSymptomId(symptom.id);
                }}
              />
            ))
          )}
        </PickerColumn>
        <PickerColumn
          title="2. 수리 프리셋 (여러 개 선택)"
          search={<SearchBox value={presetQuery} onChange={setPresetQuery} placeholder="프리셋명 검색" />}
        >
          {selectedSymptomId === null ? (
            <EmptyText>고장 증상을 먼저 선택해 주세요.</EmptyText>
          ) : presetsLoading ? (
            <EmptyText>불러오는 중입니다.</EmptyText>
          ) : visiblePresets.length === 0 ? (
            <EmptyText>이 증상에 연결된 수리 프리셋이 없습니다.</EmptyText>
          ) : (
            visiblePresets.map((preset) => (
              <ChoiceButton
                key={preset.id}
                selected={selectedPresetIds.includes(preset.id)}
                title={preset.name}
                detail={preset.description || "설명 없음"}
                onClick={() => void togglePreset(preset)}
              />
            ))
          )}
        </PickerColumn>
        <PickerColumn title="3. 소모 부품 (선택)">
          {selectedPresets.length === 0 ? (
            <EmptyText>수리 프리셋을 선택하면 부품이 표시됩니다.</EmptyText>
          ) : (
            <>
              {selectedPresets.map((preset) => {
                const linked = partsByPresetId.get(preset.id);
                const parts = compatibleParts(linked, compatibleIds);
                return (
                  <div key={preset.id} className="space-y-2">
                    <p className="text-sm font-medium">{preset.name}</p>
                    {linked === undefined || !compatibleReady ? (
                      <EmptyText>불러오는 중입니다.</EmptyText>
                    ) : compatibleIds === null ? (
                      <EmptyText>호환 부품을 확인하지 못했습니다.</EmptyText>
                    ) : linked.length === 0 ? (
                      <EmptyText>이 프리셋에 등록된 부품이 없습니다.</EmptyText>
                    ) : parts.length === 0 ? (
                      <EmptyText>이 모델과 호환되는 부품이 없습니다.</EmptyText>
                    ) : (
                      parts.map((part) => {
                        const checked = !deselectedPartKeys.has(partKey(preset.id, part.partId));
                        return (
                          <label
                            key={part.partId}
                            className={`flex cursor-pointer gap-2 rounded-lg border px-3 py-2 text-sm ${checked ? "border-blue-500 bg-blue-50" : "border-neutral-200 bg-white"}`}
                          >
                            <input
                              type="checkbox"
                              className="mt-1 accent-blue-600"
                              checked={checked}
                              onChange={() => togglePart(preset.id, part.partId)}
                            />
                            <span>
                              <span className="block font-medium">{part.partName}</span>
                              <span className="mt-1 block text-neutral-500">
                                {part.quantity}개 · {won(part.unitPrice)} · {part.standardMinutes}분
                              </span>
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                );
              })}
              <p className="px-1 text-right text-sm font-semibold text-blue-700">부품 합계 {won(partsTotal)}</p>
            </>
          )}
        </PickerColumn>
      </div>
      {error !== "" && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-4 flex items-center justify-between gap-2">
        <Button variant="outline" onClick={() => setCreating(true)}>프리셋 등록</Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button
            onClick={() => void apply()}
            disabled={applying || partsLoading || !compatibleReady || compatibleIds === null || selectedSymptom === undefined || selectedPresets.length === 0}
          >
            {applying ? "반영 중…" : `점검 항목에 추가${selectedPresets.length > 1 ? ` (${selectedPresets.length})` : ""}`}
          </Button>
        </div>
      </div>
      {creating && (
        <PresetFormModal
          onClose={() => setCreating(false)}
          onSave={async (request) => {
            await createRepairPreset(request);
            setCreating(false);
            setPresetReloadKey((key) => key + 1);
          }}
        />
      )}
    </Modal>
  );
}

function partKey(presetId: number, partId: number): string {
  return `${presetId}:${partId}`;
}

function compatibleParts(
  parts: RepairPresetPart[] | undefined,
  compatibleIds: Set<number> | null,
): RepairPresetPart[] {
  if (parts === undefined || compatibleIds === null) return [];
  return parts.filter((part) => compatibleIds.has(part.partId));
}

function PickerColumn({
  title,
  search,
  children,
}: {
  title: string;
  search?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex h-96 flex-col rounded-xl border border-neutral-200 p-3">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {search}
      <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">{children}</div>
    </section>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
    />
  );
}

function ChoiceButton({
  selected,
  title,
  detail,
  onClick,
}: {
  selected: boolean;
  title: string;
  detail?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-left text-sm ${
        selected ? "border-blue-500 bg-blue-50" : "border-neutral-200 bg-white hover:border-blue-300"
      }`}
    >
      <span className="block font-medium">{title}</span>
      {detail !== undefined && <span className="mt-1 block text-xs text-neutral-500">{detail}</span>}
    </button>
  );
}

function EmptyText({ children }: { children: string }) {
  return <p className="py-8 text-center text-sm text-neutral-500">{children}</p>;
}
