import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SelectBox, TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { includesText } from "@/lib/format";
import { costRecords } from "@/mocks/screenData";
import type { CostRecord } from "@/types/screen";

const products = ["스마트폰", "노트북"] as const;
const categories = ["공임비", "점검비"] as const;

export function CostListPage() {
  const [rows, setRows] = useState(costRecords);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<CostRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");
  const visible = useMemo(
    () => rows.filter((row) => includesText(`${row.product} ${row.category}`, query)),
    [query, rows],
  );
  const columns: Column<CostRecord>[] = [
    { key: "no", header: "번호", render: (row) => rows.findIndex((item) => item.id === row.id) + 1 },
    { key: "product", header: "제품", render: (row) => row.product },
    { key: "category", header: "분류", render: (row) => row.category },
    { key: "amount", header: "금액", render: (row) => row.amountLabel },
    {
      key: "manage",
      header: "관리",
      render: (row) => (
        <span className="flex gap-2">
          <Button variant="outline" onClick={() => setEditing(row)}>수정</Button>
          <Button variant="outline" className="border-red-600 text-red-600 hover:bg-red-50" onClick={() => remove(row.id)}>삭제</Button>
        </span>
      ),
    },
  ];

  function remove(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
    setNotice("비용 기준을 삭제했습니다.");
  }

  function save(next: CostRecord) {
    setRows((current) => {
      const exists = current.some((row) => row.id === next.id);
      return exists ? current.map((row) => (row.id === next.id ? next : row)) : [...current, next];
    });
    setCreating(false);
    setEditing(null);
    setNotice(editing === null ? "비용 기준을 등록했습니다." : "비용 기준을 수정했습니다.");
  }

  return (
    <div>
      {notice !== "" && <Notice>{notice}</Notice>}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TextField value={query} onChange={setQuery} placeholder="제품, 분류" className="w-64" />
        <Button className="ml-auto" onClick={() => setCreating(true)}>비용 등록</Button>
      </div>
      <DataTable columns={columns} rows={visible} rowKey={(row) => row.id} />
      {(creating || editing !== null) && (
        <CostModal
          initial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSave={save}
        />
      )}
    </div>
  );
}

function CostModal({
  initial,
  onClose,
  onSave,
}: {
  initial: CostRecord | null;
  onClose: () => void;
  onSave: (row: CostRecord) => void;
}) {
  const [product, setProduct] = useState<CostRecord["product"]>(initial?.product ?? "스마트폰");
  const [category, setCategory] = useState<CostRecord["category"]>(initial?.category ?? "공임비");
  const [amount, setAmount] = useState(initial?.amountLabel ?? "6,000원");
  const [error, setError] = useState("");

  return (
    <Modal title={initial === null ? "비용 등록" : "비용 수정"} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          const amountLabel = formatAmount(category, amount);
          if (amountLabel === "") {
            setError("금액을 입력해 주세요.");
            return;
          }
          onSave({
            id: initial?.id ?? `${Date.now()}`,
            product,
            category,
            amountLabel,
          });
        }}
      >
        <p className="text-sm text-neutral-500">제품과 분류에 따른 비용 기준을 등록합니다.</p>
        <label className="block text-sm">
          <span className="mb-1 block">제품</span>
          <SelectBox className="w-full" value={product} onChange={(value) => setProduct(value as CostRecord["product"])} options={products.map((value) => ({ value, label: value }))} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block">분류</span>
          <SelectBox className="w-full" value={category} onChange={(value) => setCategory(value as CostRecord["category"])} options={categories.map((value) => ({ value, label: value }))} />
        </label>
        <TextField label="금액" value={amount} onChange={setAmount} />
        {error !== "" && <Notice tone="error">{error}</Notice>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button type="submit">{initial === null ? "등록" : "수정"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function formatAmount(category: CostRecord["category"], raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits === "") {
    return "";
  }
  const formatted = `${Number(digits).toLocaleString("ko-KR")}원`;
  return category === "공임비" ? `${formatted}/10분` : formatted;
}
