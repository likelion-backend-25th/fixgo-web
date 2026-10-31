import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SelectBox, TextArea, TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { includesText } from "@/lib/format";
import { parts } from "@/mocks/screenData";
import type { PartRecord } from "@/types/screen";

export function PartListPage() {
  const [rows, setRows] = useState(parts);
  const [query, setQuery] = useState("");
  const [inbound, setInbound] = useState(false);
  const [editing, setEditing] = useState<PartRecord | null>(null);
  const [notice, setNotice] = useState("");
  const visible = useMemo(() => rows.filter((row) => includesText(row.name, query)), [query, rows]);
  const columns: Column<PartRecord>[] = [
    { key: "no", header: "번호", render: (row) => rows.findIndex((item) => item.id === row.id) + 1 },
    { key: "name", header: "부품명", render: (row) => row.name },
    { key: "price", header: "단가", render: (row) => (row.price === null ? "-" : row.price.toLocaleString("ko-KR")) },
    { key: "stock", header: "재고", render: (row) => row.stock },
    { key: "status", header: "상태", render: (row) => <span className={statusClass(row.status)}>{row.status}</span> },
    {
      key: "manage",
      header: "관리",
      render: (row) => (
        <span className="flex gap-2">
          <Button variant="outline" onClick={() => setEditing(row)}>수정</Button>
          <Button
            variant="outline"
            className="border-red-600 text-red-600 hover:bg-red-50"
            onClick={() => {
              setRows((current) => current.filter((item) => item.id !== row.id));
              setNotice("부품을 삭제했습니다.");
            }}
          >
            삭제
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div>
      {notice !== "" && <Notice>{notice}</Notice>}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TextField value={query} onChange={setQuery} placeholder="부품명" className="w-64" />
        <Button className="ml-auto" onClick={() => setInbound(true)}>입고 등록</Button>
      </div>
      <DataTable columns={columns} rows={visible} rowKey={(row) => row.id} />
      {inbound && (
        <StockModal
          parts={rows}
          onClose={() => setInbound(false)}
          onSave={(id, qty) => {
            setRows((current) => current.map((row) => (row.id === id ? { ...row, stock: row.stock + qty } : row)));
            setInbound(false);
            setNotice("입고 수량을 반영했습니다.");
          }}
        />
      )}
      {editing !== null && (
        <PartEditModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(next) => {
            setRows((current) => current.map((row) => (row.id === next.id ? next : row)));
            setEditing(null);
            setNotice("부품 정보를 수정했습니다.");
          }}
        />
      )}
    </div>
  );
}

function statusClass(status: PartRecord["status"]): string {
  if (status === "사용") return "text-green-600";
  if (status === "재고 부족") return "text-orange-500";
  return cn("text-red-600");
}

function StockModal({
  parts: catalog,
  onClose,
  onSave,
}: {
  parts: PartRecord[];
  onClose: () => void;
  onSave: (id: string, qty: number) => void;
}) {
  const [partId, setPartId] = useState(catalog.find((row) => row.code === "P-CHG-002")?.id ?? catalog[0]?.id ?? "");
  const [picking, setPicking] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [changeType, setChangeType] = useState("입고");
  const [qty, setQty] = useState("20");
  const [reason, setReason] = useState("공급사 정기 입고");
  const [error, setError] = useState("");
  const part = catalog.find((row) => row.id === partId);
  const found = catalog.filter((row) => includesText(`${row.name} ${row.code}`, keyword));

  return (
    <Modal title="입고 등록" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          const count = Number(qty);
          if (part === undefined || !Number.isInteger(count) || count <= 0 || reason.trim() === "") {
            setError("부품, 입고 수량, 사유를 확인해 주세요.");
            return;
          }
          if (changeType === "출고" && count > part.stock) {
            setError("출고 수량이 현재 재고보다 많습니다.");
            return;
          }
          onSave(part.id, changeType === "출고" ? -count : count);
        }}
      >
        <div>
          <span className="mb-1 block text-sm">부품</span>
          <div className="flex gap-2">
            <TextField className="flex-1" value={part === undefined ? "" : `${part.name}  ·  ${part.code}`} onChange={() => undefined} readOnly />
            <Button variant="outline" onClick={() => setPicking((open) => !open)}>검색</Button>
          </div>
          {picking && (
            <ul className="mt-2 max-h-40 overflow-auto rounded border border-neutral-300 text-sm">
              <li className="border-b border-neutral-200 p-2">
                <TextField value={keyword} onChange={setKeyword} placeholder="부품명, 코드" />
              </li>
              {found.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-blue-50"
                    onClick={() => {
                      setPartId(row.id);
                      setPicking(false);
                    }}
                  >
                    {row.name} · {row.code}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <label className="block text-sm">
          <span className="mb-1 block">변동 유형</span>
          <SelectBox className="w-full" value={changeType} onChange={setChangeType} options={["입고", "출고"].map((value) => ({ value, label: value }))} />
        </label>
        <TextField label="현재 재고" value={String(part?.stock ?? 0)} onChange={() => undefined} readOnly />
        <TextField label="입고 수량" value={qty} onChange={setQty} />
        <TextArea label="사유" value={reason} onChange={setReason} rows={3} />
        {error !== "" && <Notice tone="error">{error}</Notice>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button type="submit">등록</Button>
        </div>
      </form>
    </Modal>
  );
}

function PartEditModal({
  initial,
  onClose,
  onSave,
}: {
  initial: PartRecord;
  onClose: () => void;
  onSave: (row: PartRecord) => void;
}) {
  const [name, setName] = useState(initial.name);
  const [price, setPrice] = useState(initial.price === null ? "" : String(initial.price));
  const [status, setStatus] = useState(initial.status);
  const [error, setError] = useState("");

  return (
    <Modal title="부품 수정" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim() === "") {
            setError("부품명을 입력해 주세요.");
            return;
          }
          const parsed = price.trim() === "" || price.trim() === "-" ? null : Number(price.replace(/[^\d]/g, ""));
          if (parsed !== null && Number.isNaN(parsed)) {
            setError("단가는 숫자로 입력해 주세요.");
            return;
          }
          onSave({ ...initial, name: name.trim(), price: parsed, status });
        }}
      >
        <TextField label="부품명" value={name} onChange={setName} />
        <TextField label="단가" value={price} onChange={setPrice} placeholder="없으면 -" />
        <label className="block text-sm">
          <span className="mb-1 block">상태</span>
          <SelectBox className="w-full" value={status} onChange={(value) => setStatus(value as PartRecord["status"])} options={["사용", "재고 부족", "단종"].map((value) => ({ value, label: value }))} />
        </label>
        {error !== "" && <Notice tone="error">{error}</Notice>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button type="submit">수정</Button>
        </div>
      </form>
    </Modal>
  );
}
