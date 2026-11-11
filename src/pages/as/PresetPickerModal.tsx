import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { categoryLabel, fetchProduct } from "@/lib/asReceptionApi";
import { won } from "@/lib/format";
import {
  fetchRepairPresetParts,
  fetchRepairPresetsBySymptom,
  fetchSymptomPresets,
  type RepairPreset,
  type RepairPresetPart,
  type SymptomPreset,
} from "@/lib/repair";

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
  onClose: () => void;
  onApply: (selection: InspectionPresetSelection) => void | Promise<void>;
}

export function PresetPickerModal({ productId, onClose, onApply }: Props) {
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
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");

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
    setPresets([]);
    setSelectedPresetIds([]);
    setPartsByPresetId(new Map());
    setPartsLoadingIds([]);

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
  }, [selectedSymptomId]);

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
    const parts = partsByPresetId.get(preset.id) ?? [];
    return sum + parts.reduce((partSum, part) => partSum + part.unitPrice * part.quantity, 0);
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

  async function apply() {
    if (selectedSymptom === undefined || selectedPresets.length === 0) {
      setError("고장 증상과 수리 프리셋을 선택해 주세요.");
      return;
    }
    if (partsLoading) return;

    const choices = selectedPresets.map((preset) => ({
      preset,
      parts: partsByPresetId.get(preset.id) ?? [],
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
        {`${productCategory === null ? "고장 증상" : `${productCategory} 고장 증상`}을 고른 뒤, 그 증상의 수리 프리셋을 여러 개 선택할 수 있습니다.`}
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
        <PickerColumn title="3. 소모 부품">
          {selectedPresets.length === 0 ? (
            <EmptyText>수리 프리셋을 선택하면 부품이 표시됩니다.</EmptyText>
          ) : (
            <>
              {selectedPresets.map((preset) => {
                const parts = partsByPresetId.get(preset.id);
                return (
                  <div key={preset.id} className="space-y-2">
                    <p className="text-sm font-medium">{preset.name}</p>
                    {parts === undefined ? (
                      <EmptyText>불러오는 중입니다.</EmptyText>
                    ) : parts.length === 0 ? (
                      <EmptyText>이 프리셋에 등록된 부품이 없습니다.</EmptyText>
                    ) : (
                      parts.map((part) => (
                        <div key={part.partId} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm">
                          <p className="font-medium">{part.partName}</p>
                          <p className="mt-1 text-neutral-500">
                            {part.quantity}개 · {won(part.unitPrice)} · {part.standardMinutes}분
                          </p>
                        </div>
                      ))
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
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>취소</Button>
        <Button
          onClick={() => void apply()}
          disabled={applying || partsLoading || selectedSymptom === undefined || selectedPresets.length === 0}
        >
          {applying ? "반영 중…" : `점검 항목에 추가${selectedPresets.length > 1 ? ` (${selectedPresets.length})` : ""}`}
        </Button>
      </div>
    </Modal>
  );
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
