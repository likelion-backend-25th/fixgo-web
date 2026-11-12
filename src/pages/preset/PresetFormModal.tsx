import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import type {
  RepairPreset,
  RepairPresetRequest,
  SymptomPreset,
} from "@/lib/repair";
import {
  fetchRepairPresetParts,
  fetchRepairPresetsBySymptom,
  fetchSymptomPresets,
} from "@/lib/repair";
import { won } from "@/lib/format";
import type { PartItem } from "@/lib/partApi";
import { PartPickerModal } from "./PartPickerModal";

interface ChosenPart {
  id: number;
  name: string;
  unitPrice: number;
  standardMinutes: number;
  stockQuantity: number;
}

interface SelectedPart {
  part: ChosenPart;
  quantity: number;
}

interface Props {
  onClose: () => void;
  onSave: (request: RepairPresetRequest) => Promise<void>;
}

// "기타 (직접입력)" 선택 값
const ETC = "etc" as const;
type Selection = number | typeof ETC | null;

const safeNumber = (value: unknown): number => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export function PresetFormModal({ onClose, onSave }: Props) {
  // 서버 데이터
  const [allSymptoms, setAllSymptoms] = useState<SymptomPreset[]>([]);
  const [presets, setPresets] = useState<RepairPreset[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(false);

  // 1열: 고장 증상
  const [category, setCategory] = useState("");
  const [symptomSearch, setSymptomSearch] = useState("");
  const [selectedSymptom, setSelectedSymptom] = useState<Selection>(null);
  const [symptomEtc, setSymptomEtc] = useState("");

  // 2열: 수리 프리셋
  const [presetSearch, setPresetSearch] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<Selection>(null);
  const [presetEtc, setPresetEtc] = useState("");

  // 3열: 부품 목록 및 비용
  const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([]);
  const [partPickerOpen, setPartPickerOpen] = useState(false);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 고장 증상 조회
  useEffect(() => {
    const controller = new AbortController();

    fetchSymptomPresets(controller.signal)
      .then(setAllSymptoms)
      .catch((err) => {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error
            ? err.message
            : "고장 증상 목록을 불러오지 못했습니다.",
        );
      });

    return () => controller.abort();
  }, []);

  // 선택한 증상에 연결된 수리 프리셋 조회
  useEffect(() => {
    if (typeof selectedSymptom !== "number") {
      setPresets([]);
      return;
    }

    const controller = new AbortController();
    setPresetsLoading(true);

    fetchRepairPresetsBySymptom(selectedSymptom, controller.signal)
      .then(setPresets)
      .catch((err) => {
        if (controller.signal.aborted) return;

        setPresets([]);
        setError(
          err instanceof Error
            ? err.message
            : "해당 증상의 수리 프리셋을 불러오지 못했습니다.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setPresetsLoading(false);
      });

    return () => controller.abort();
  }, [selectedSymptom]);

  // 제품군 목록
  const categories = useMemo(
    () => Array.from(new Set(allSymptoms.map((s) => s.productCategory))),
    [allSymptoms],
  );

  // 고장 증상 검색 (제품군 + 증상명)
  const filteredSymptoms = useMemo(() => {
    const keyword = symptomSearch.trim().toLowerCase();

    return allSymptoms.filter(
      (symptom) =>
        (category === "" || symptom.productCategory === category) &&
        symptom.name.toLowerCase().includes(keyword),
    );
  }, [allSymptoms, category, symptomSearch]);

  // 수리 프리셋 검색
  const filteredPresets = useMemo(() => {
    const keyword = presetSearch.trim().toLowerCase();

    return presets.filter(
      (preset) =>
        preset.name.toLowerCase().includes(keyword) ||
        (preset.description ?? "").toLowerCase().includes(keyword),
    );
  }, [presets, presetSearch]);

  // 고장 증상 선택 -> 하위 선택 초기화
  const handleSelectSymptom = (symptom: Selection) => {
    setSelectedSymptom(symptom);
    setSelectedPreset(null);
    setPresetSearch("");
    setPresetEtc("");
    setSelectedParts([]);
    setPartPickerOpen(false);
    setError("");
  };

  // 수리 프리셋 선택 -> 프리셋에 포함된 부품 목록 불러오기
  const handleSelectPreset = async (preset: RepairPreset | typeof ETC) => {
    setError("");

    if (preset === ETC) {
      setSelectedPreset(ETC);
      setSelectedParts([]);
      return;
    }

    setSelectedPreset(preset.id);
    setSelectedParts([]);

    try {
      const presetParts = await fetchRepairPresetParts(preset.id);

      setSelectedParts(
        presetParts.map((item) => ({
          part: {
            id: item.partId,
            name: item.partName,
            unitPrice: item.unitPrice,
            standardMinutes: item.standardMinutes,
            stockQuantity: item.stockQuantity,
          },
          quantity: Math.max(1, item.quantity),
        })),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "수리 프리셋을 불러오지 못했습니다.",
      );
    }
  };

  // 부품 추가
  const handleAddPart = (part: PartItem) => {
    setSelectedParts((current) => {
      if (current.some((item) => item.part.id === part.id)) {
        return current;
      }

      return [...current, { part, quantity: 1 }];
    });
  };

  // 부품 수량 변경
  const handleQuantity = (partId: number, delta: number) => {
    setSelectedParts((current) =>
      current.map((item) =>
        item.part.id === partId
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item,
      ),
    );
  };

  // 프리셋 등록
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (selectedSymptom === null) {
      setError("고장 증상을 선택해 주세요.");
      return;
    }

    if (selectedSymptom === ETC && !symptomEtc.trim()) {
      setError("고장 증상을 직접 입력해 주세요.");
      return;
    }

    if (selectedPreset === null) {
      setError("수리 프리셋을 선택해 주세요.");
      return;
    }

    const presetBase =
      selectedPreset === ETC
        ? null
        : presets.find((preset) => preset.id === selectedPreset);

    const name =
      selectedPreset === ETC ? presetEtc.trim() : (presetBase?.name ?? "");

    if (!name) {
      setError("작업명을 입력해 주세요.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await onSave({
        name,
        description: presetBase?.description ?? "",
        parts: selectedParts.map((item) => ({
          partId: item.part.id,
          quantity: item.quantity,
        })),
        symptomIds: typeof selectedSymptom === "number" ? [selectedSymptom] : [],
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "프리셋 등록에 실패했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const sectionClass =
    "flex h-[520px] max-h-[calc(100vh-14rem)] min-h-0 min-w-0 flex-col overflow-hidden border border-neutral-300 p-3";
  const searchClass =
    "mb-3 w-full rounded border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-blue-500";

  return (
    <Modal title="수리 프리셋 등록" wide onClose={onClose}>
      <p className="mb-3 text-xs text-neutral-400">
        고장 증상을 선택하면 관련된 수리 프리셋과 부품 목록을 확인할 수 있습니다.
      </p>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[0.8fr_1fr_1.8fr]">
          {/* 1열: 고장 증상 */}
          <section className={sectionClass}>
            <div className="mb-3 flex shrink-0 items-center gap-2">
              <h3 className="shrink-0 text-sm font-semibold">고장 증상</h3>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="min-w-0 flex-1 rounded border border-neutral-300 px-2 py-1 text-xs outline-none focus:border-blue-500"
              >
                <option value="">--제품군 선택--</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <input
              type="text"
              value={symptomSearch}
              onChange={(event) => setSymptomSearch(event.target.value)}
              placeholder="고장 증상을 검색하세요."
              className={`${searchClass} shrink-0`}
            />

            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
              {filteredSymptoms.length === 0 ? (
                <p className="py-8 text-center text-sm text-neutral-400">
                  {allSymptoms.length === 0
                    ? "등록된 고장 증상이 없습니다."
                    : "검색 결과가 없습니다."}
                </p>
              ) : (
                filteredSymptoms.map((symptom) => {
                  const checked = selectedSymptom === symptom.id;

                  return (
                    <label
                      key={symptom.id}
                      className={`flex cursor-pointer items-center gap-2 border p-2 text-sm ${
                        checked
                          ? "border-blue-500 bg-blue-50"
                          : "border-transparent hover:bg-neutral-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="symptom"
                        checked={checked}
                        onChange={() => handleSelectSymptom(symptom.id)}
                        className="accent-blue-600"
                      />
                      <span className="flex-1">{symptom.name}</span>
                      <span className="text-neutral-400">&gt;</span>
                    </label>
                  );
                })
              )}
            </div>

            {/* 기타 직접입력 */}
            <label
              className={`mt-2 flex shrink-0 cursor-pointer items-center gap-2 border p-2 text-sm ${
                selectedSymptom === ETC
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-neutral-200"
              }`}
            >
              <input
                type="radio"
                name="symptom"
                checked={selectedSymptom === ETC}
                onChange={() => handleSelectSymptom(ETC)}
                className="accent-blue-600"
              />
              <span className="shrink-0">기타</span>
              <input
                type="text"
                value={symptomEtc}
                onChange={(event) => setSymptomEtc(event.target.value)}
                onFocus={() => {
                  if (selectedSymptom !== ETC) handleSelectSymptom(ETC);
                }}
                placeholder="직접입력"
                className="min-w-0 flex-1 rounded border border-neutral-300 bg-white px-2 py-1 text-xs outline-none focus:border-blue-500"
              />
              <span className="text-neutral-400">&gt;</span>
            </label>
          </section>

          {/* 2열: 수리 프리셋 */}
          <section className={sectionClass}>
            <h3 className="mb-3 shrink-0 text-sm font-semibold">수리 프리셋</h3>

            <input
              type="text"
              value={presetSearch}
              onChange={(event) => setPresetSearch(event.target.value)}
              placeholder="수리 프리셋을 검색하세요."
              className={`${searchClass} shrink-0`}
            />

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {selectedSymptom === null ? (
                <p className="py-8 text-center text-sm text-neutral-400">
                  고장 증상을 먼저 선택해 주세요.
                </p>
              ) : presetsLoading ? (
                <p className="py-8 text-center text-sm text-neutral-400">
                  불러오는 중...
                </p>
              ) : filteredPresets.length === 0 ? (
                <p className="py-8 text-center text-sm text-neutral-400">
                  {selectedSymptom === ETC
                    ? "아래 '기타'에서 직접 입력해 주세요."
                    : "연결된 수리 프리셋이 없습니다."}
                </p>
              ) : (
                filteredPresets.map((preset) => {
                  const checked = selectedPreset === preset.id;

                  return (
                    <label
                      key={preset.id}
                      className={`flex cursor-pointer items-start gap-2 border p-2 text-sm ${
                        checked
                          ? "border-blue-500 bg-blue-50"
                          : "border-neutral-300 hover:border-blue-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="preset"
                        checked={checked}
                        onChange={() => handleSelectPreset(preset)}
                        className="mt-1 accent-blue-600"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{preset.name}</span>
                        <span className="block text-xs text-neutral-400">
                          {preset.description}
                        </span>
                      </span>
                      <span className="text-neutral-400">&gt;</span>
                    </label>
                  );
                })
              )}
            </div>

            {/* 기타 직접입력 */}
            <label
              className={`mt-2 flex shrink-0 cursor-pointer items-start gap-2 border p-2 text-sm ${
                selectedPreset === ETC
                  ? "border-blue-500 bg-blue-50"
                  : "border-neutral-300"
              }`}
            >
              <input
                type="radio"
                name="preset"
                checked={selectedPreset === ETC}
                onChange={() => handleSelectPreset(ETC)}
                disabled={selectedSymptom === null}
                className="mt-1 accent-blue-600"
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="shrink-0">기타</span>
                  <input
                    type="text"
                    value={presetEtc}
                    onChange={(event) => setPresetEtc(event.target.value)}
                    onFocus={() => {
                      if (selectedSymptom !== null && selectedPreset !== ETC) {
                        handleSelectPreset(ETC);
                      }
                    }}
                    disabled={selectedSymptom === null}
                    placeholder="직접입력"
                    className="min-w-0 flex-1 rounded border border-neutral-300 bg-white px-2 py-1 text-xs outline-none focus:border-blue-500 disabled:bg-neutral-100"
                  />
                </span>
                <span className="mt-1 block text-xs text-neutral-400">
                  위 항목에 해당하지 않는 수리
                </span>
              </span>
            </label>
          </section>

          {/* 3열: 부품 목록 및 비용 */}
          <section className={sectionClass}>
            <h3 className="mb-1 shrink-0 text-sm font-semibold">부품 목록 및 비용</h3>

            <p className="mb-4 shrink-0 text-xs text-neutral-400">
              선택된 수리 프리셋에 포함된 부품 목록과 예상 비용입니다.
            </p>

            {selectedParts.length > 0 ? (
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead className="text-xs text-neutral-500">
                    <tr>
                      <th className="py-2 text-left font-normal">부품명</th>
                      <th className="text-center font-normal">수량</th>
                      <th className="text-center font-normal">재고</th>
                      <th className="text-center font-normal">단위 시간</th>
                      <th className="text-right font-normal">단가</th>
                      <th className="text-right font-normal">금액</th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedParts.map(({ part, quantity }) => {
                      const unitPrice = safeNumber(part.unitPrice);

                      return (
                        <tr key={part.id} className="border border-neutral-300">
                          <td className="px-2 py-3 font-medium">{part.name}</td>

                          <td>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleQuantity(part.id, -1)}
                                className="h-6 w-6 rounded border border-neutral-300"
                              >
                                -
                              </button>
                              <span className="min-w-5 text-center">
                                {quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleQuantity(part.id, 1)}
                                className="h-6 w-6 rounded bg-blue-600 text-white"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          <td className="text-center">
                            {safeNumber(part.stockQuantity)}
                          </td>

                          <td className="text-center">
                            {safeNumber(part.standardMinutes)}분
                          </td>

                          <td className="text-right">{won(unitPrice)}</td>

                          <td className="px-2 text-right font-medium">
                            {won(unitPrice * quantity)}
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 items-center justify-center border border-dashed border-neutral-300 text-sm text-neutral-400">
                부품이 선택되지 않았습니다.
              </div>
            )}

            {/* + 부품 추가 */}
            <button
              type="button"
              onClick={() => setPartPickerOpen(true)}
              className="mt-2 w-full shrink-0 border border-neutral-300 py-3 text-sm hover:bg-neutral-50"
            >
              + 부품 추가
            </button>

            <div className="mt-auto shrink-0 space-y-3 pt-4">
              {error !== "" && <Notice tone="error">{error}</Notice>}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  disabled={submitting}
                >
                  취소
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "등록 중..." : "프리셋으로 등록"}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </form>
      {partPickerOpen && (
        <PartPickerModal
          selectedIds={selectedParts.map((item) => item.part.id)}
          onAdd={handleAddPart}
          onClose={() => setPartPickerOpen(false)}
        />
      )}
    </Modal>
  );
}
