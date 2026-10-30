import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { includesText, won } from "@/lib/format";
import { parts, presets } from "@/mocks/screenData";
import type { RepairLine } from "@/types/screen";

interface PartPick {
  name: string;
  code: string;
  qty: number;
  price: number;
}

export function PresetPickerModal({
  onClose,
  onApply,
}: {
  onClose: () => void;
  onApply: (lines: RepairLine[]) => void;
}) {
  const symptoms = presets.filter((row) => row.kind === "증상");
  const [query, setQuery] = useState("");
  const [symptom, setSymptom] = useState("충전 안됨");
  const [presetId, setPresetId] = useState("pr-charge");
  const [picked, setPicked] = useState<PartPick[]>([
    { name: "USB 포트", code: "P-USB", qty: 1, price: 15000 },
    { name: "충전 보드", code: "P-CHG", qty: 1, price: 25000 },
  ]);
  const [workName, setWorkName] = useState("");
  const [partName, setPartName] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("1");

  const visibleSymptoms = symptoms.filter((row) => includesText(row.name, query));
  const repairPresets = useMemo(
    () => presets.filter((row) => row.kind === "수리" && row.symptom === symptom),
    [symptom],
  );
  const selected = repairPresets.find((row) => row.id === presetId) ?? repairPresets[0];
  const total = picked.reduce((sum, row) => sum + row.price * row.qty, 0) + (selected === undefined ? 0 : Math.round(selected.minutes / 10) * 6000);

  function chooseSymptom(name: string) {
    setSymptom(name);
    const next = presets.find((row) => row.kind === "수리" && row.symptom === name);
    setPresetId(next?.id ?? "");
    if (name === "충전 안됨") {
      setPicked([
        { name: "USB 포트", code: "P-USB", qty: 1, price: 15000 },
        { name: "충전 보드", code: "P-CHG", qty: 1, price: 25000 },
      ]);
      return;
    }
    const linked = parts.find((part) => next?.parts.includes(part.name));
    setPicked(linked === undefined ? [] : [{ name: linked.name, code: linked.code, qty: 1, price: linked.price }]);
  }

  return (
    <Modal title="수리 프리셋 불러오기" wide onClose={onClose}>
      <div className="grid gap-4 lg:grid-cols-3">
        <section>
          <TextField value={query} onChange={setQuery} placeholder="증상 검색" className="mb-2" />
          <ul className="max-h-52 overflow-auto rounded border border-neutral-300">
            {visibleSymptoms.map((row) => (
              <li key={row.id}>
                <button type="button" className={`w-full px-3 py-2 text-left text-sm ${symptom === row.name ? "bg-blue-50 text-blue-700" : ""}`} onClick={() => chooseSymptom(row.name)}>
                  {row.name}
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <p className="mb-2 text-sm font-medium">수리 프리셋</p>
          {repairPresets.length === 0 ? (
            <p className="rounded border border-dashed border-neutral-300 p-4 text-sm text-neutral-500">연결된 수리 프리셋이 없습니다. 직접 입력해 주세요.</p>
          ) : (
            <ul className="space-y-2">
              {repairPresets.map((row) => (
                <li key={row.id}>
                  <button type="button" className={`w-full rounded border px-3 py-2 text-left text-sm ${selected?.id === row.id ? "border-blue-500" : "border-neutral-300"}`} onClick={() => setPresetId(row.id)}>
                    <span className="block font-medium">{row.name}</span>
                    <span className="text-neutral-500">{row.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <p className="mb-2 text-sm font-medium">부품 및 비용</p>
          <ul className="space-y-2 text-sm">
            {picked.map((row) => (
              <li key={row.code} className="flex items-center justify-between gap-2">
                <span>{row.name}</span>
                <input
                  type="number"
                  min={1}
                  value={row.qty}
                  className="w-16 rounded border border-neutral-300 px-2 py-1"
                  onChange={(event) => {
                    const nextQty = Number(event.target.value);
                    setPicked((current) => current.map((item) => (item.code === row.code ? { ...item, qty: nextQty } : item)));
                  }}
                />
                <span>{won(row.price * row.qty)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-right text-sm font-medium">예상 수리비 {won(total)}</p>
        </section>
      </div>
      <div className="mt-4 grid gap-2 border-t border-neutral-200 pt-4 md:grid-cols-5">
        <TextField label="작업명" value={workName} onChange={setWorkName} />
        <TextField label="부품명" value={partName} onChange={setPartName} />
        <TextField label="단가" value={price} onChange={setPrice} />
        <TextField label="수량" value={qty} onChange={setQty} />
        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={() => {
              const amount = Number(price);
              if (partName.trim() === "" || Number.isNaN(amount)) return;
              setPicked((current) => [...current, { name: partName, code: `custom-${current.length}`, qty: Number(qty) || 1, price: amount }]);
              setPartName("");
              setPrice("");
            }}
          >
            추가
          </Button>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>취소</Button>
        <Button
          onClick={() => {
            const lines: RepairLine[] = [];
            if (selected !== undefined) {
              lines.push({
                id: `work-${selected.id}`,
                kind: "작업",
                name: workName.trim() === "" ? selected.name : workName,
                quantityLabel: `${selected.minutes}분`,
                unitPriceLabel: "6,000/10분",
                amount: Math.round(selected.minutes / 10) * 6000,
              });
            }
            picked.forEach((row) => {
              lines.push({
                id: row.code,
                kind: "부품",
                name: row.name,
                quantityLabel: String(row.qty),
                unitPriceLabel: row.price.toLocaleString("ko-KR"),
                amount: row.price * row.qty,
                indent: true,
              });
            });
            onApply(lines);
            onClose();
          }}
        >
          적용하기
        </Button>
      </div>
    </Modal>
  );
}
