import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea, TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel"; // 가정: { id, name, unitPrice, standardMinutes, stockQuantity }
import type { RepairPresetRequest } from "@/lib/repair";
import { won } from "@/lib/format";
import { fetchParts, type Part } from "@/lib/part";

interface SelectedPart {
  part: Part;
  quantity: number;
}

interface Props {
  onClose: () => void;
  onSave: (request: RepairPresetRequest) => Promise<void>;
}

export function PresetFormModal({ onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [allParts, setAllParts] = useState<Part[]>([]);
  const [selected, setSelected] = useState<SelectedPart[]>([]);
  const [pickId, setPickId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 부품 목록 조회
  useEffect(() => {
    const controller = new AbortController();

    fetchParts(controller.signal)
      .then(setAllParts)
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(
          err instanceof Error ? err.message : "부품 목록을 불러오지 못했습니다.",
        );
      });

    return () => controller.abort();
  }, []);

  // 이미 추가한 부품은 선택지에서 제외
  const availableParts = allParts.filter(
    (part) => !selected.some((item) => item.part.id === part.id),
  );

  const handleAddPart = () => {
    const part = allParts.find((p) => p.id === Number(pickId));
    if (!part) return;

    setSelected((current) => [...current, { part, quantity: 1 }]);
    setPickId("");
  };

  const handleQuantity = (partId: number, delta: number) => {
    setSelected((current) =>
      current.map((item) =>
        item.part.id === partId
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item,
      ),
    );
  };

  const handleRemove = (partId: number) => {
    setSelected((current) => current.filter((item) => item.part.id !== partId));
  };

  const totalPrice = selected.reduce(
    (sum, item) => sum + item.part.unitPrice * item.quantity,
    0,
  );
  const totalMinutes = selected.reduce(
    (sum, item) => sum + item.part.standardMinutes * item.quantity,
    0,
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (name.trim() === "") {
      setError("작업명을 입력해 주세요.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await onSave({
        name: name.trim(),
        description: description.trim(),
        parts: selected.map((item) => ({
          partId: item.part.id,
          quantity: item.quantity,
        })),
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "프리셋 등록에 실패했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="프리셋 등록" wide onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <TextField label="작업명" value={name} onChange={setName} />

        <TextArea
          label="작업 설명"
          value={description}
          onChange={setDescription}
        />

        {/* 기본 부품 */}
        <section className="space-y-2">
          <p className="text-sm font-medium">기본 부품</p>

          <div className="flex gap-2">
            <select
              value={pickId}
              onChange={(e) => setPickId(e.target.value)}
              className="flex-1 rounded border border-neutral-300 p-2 text-sm"
            >
              <option value="">부품을 선택하세요.</option>
              {availableParts.map((part) => (
                <option key={part.id} value={part.id}>
                  {part.name} ({won(part.unitPrice)})
                </option>
              ))}
            </select>

            <Button
              type="button"
              variant="ghost"
              onClick={handleAddPart}
              disabled={pickId === ""}
            >
              + 부품 추가
            </Button>
          </div>

          {selected.length === 0 ? (
            <p className="rounded border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-400">
              추가된 부품이 없습니다.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-neutral-500">
                <tr>
                  <th className="py-1">부품명</th>
                  <th>수량</th>
                  <th>재고</th>
                  <th>단위 시간</th>
                  <th className="text-right">단가</th>
                  <th className="text-right">금액</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {selected.map(({ part, quantity }) => (
                  <tr key={part.id} className="border-t border-neutral-200">
                    <td className="py-2">{part.name}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => handleQuantity(part.id, -1)}>-</button>
                        <span>{quantity}</span>
                        <button type="button" onClick={() => handleQuantity(part.id, 1)}>+</button>
                      </div>
                    </td>
                    <td>{part.stockQuantity}</td>
                    <td>{part.standardMinutes}분</td>
                    <td className="text-right">{won(part.unitPrice)}</td>
                    <td className="text-right">{won(part.unitPrice * quantity)}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="text-red-500"
                        onClick={() => handleRemove(part.id)}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selected.length > 0 && (
            <p className="text-right text-sm font-semibold text-blue-700">
              표준 작업시간 {totalMinutes}분 · 기본 부품 금액 {won(totalPrice)}
            </p>
          )}
        </section>

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
            {submitting ? "등록 중..." : "등록"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}