import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SelectBox, TextArea, TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { includesText, won } from "@/lib/format";
import { parts } from "@/mocks/screenData";
import type { PartRecord } from "@/types/screen";

export function PartListPage() {
  const [query, setQuery] = useState("");
  const [stock, setStock] = useState("전체");
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const rows = useMemo(
    () =>
      parts.filter((row) => {
        const matched = includesText(`${row.name} ${row.code}`, query);
        const matchedStock = stock === "전체" || (stock === "품절" ? row.stock === 0 : row.stock > 0);
        return matched && matchedStock;
      }),
    [query, stock],
  );
  const columns: Column<PartRecord>[] = [
    { key: "name", header: "부품명", render: (row) => row.name },
    { key: "code", header: "코드", render: (row) => row.code },
    { key: "price", header: "단가", render: (row) => won(row.price) },
    { key: "stock", header: "재고", render: (row) => row.stock },
    { key: "status", header: "상태", render: (row) => row.status },
  ];

  return (
    <div>
      {notice !== "" && <Notice>{notice}</Notice>}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TextField value={query} onChange={setQuery} placeholder="부품명, 코드 검색" className="w-64" />
        <SelectBox
          value={stock}
          onChange={setStock}
          options={[
            { value: "전체", label: "재고 전체" },
            { value: "보유", label: "재고 있음" },
            { value: "품절", label: "품절" },
          ]}
        />
        <Button className="ml-auto" onClick={() => setOpen(true)}>입고 등록</Button>
      </div>
      <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />
      {open && (
        <StockModal
          onClose={() => setOpen(false)}
          onSave={() => {
            setOpen(false);
            setNotice("입고 수량을 반영했습니다.");
          }}
        />
      )}
    </div>
  );
}

function StockModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [partId, setPartId] = useState(parts[0]?.id ?? "");
  const [qty, setQty] = useState("1");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const part = parts.find((row) => row.id === partId);

  return (
    <Modal title="입고 등록" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (Number(qty) <= 0 || reason.trim() === "") {
            setError("입고 수량과 사유를 입력해 주세요.");
            return;
          }
          onSave();
        }}
      >
        <label className="block text-sm">
          <span className="mb-1 block">부품</span>
          <SelectBox value={partId} onChange={setPartId} options={parts.map((row) => ({ value: row.id, label: row.name }))} />
        </label>
        <p className="text-sm text-neutral-600">현재 재고 {part?.stock ?? 0}</p>
        <TextField label="입고 수량" value={qty} onChange={setQty} />
        <TextArea label="사유" value={reason} onChange={setReason} rows={3} />
        {error !== "" && <Notice tone="error">{error}</Notice>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button type="submit">입고 등록</Button>
        </div>
      </form>
    </Modal>
  );
}
