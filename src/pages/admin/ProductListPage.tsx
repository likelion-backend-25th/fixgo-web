import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { compareText } from "@/lib/guards";
import { includesText } from "@/lib/format";
import { products } from "@/mocks/screenData";
import { useSessionStore } from "@/stores/useSessionStore";
import type { ProductRecord } from "@/types/screen";

export function ProductListPage() {
  const isAdmin = useSessionStore((state) => state.user?.role) === "ADMIN";
  const [rows, setRows] = useState(products);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [editing, setEditing] = useState<ProductRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");
  const visible = useMemo(() => {
    const filtered = rows.filter((row) => includesText(`${row.modelName} ${row.productName}`, query));
    if (sortKey === "") {
      return filtered;
    }
    return [...filtered].sort((left, right) => {
      const result = compareText(valueOf(left, sortKey), valueOf(right, sortKey));
      return sortDir === "asc" ? result : -result;
    });
  }, [query, rows, sortDir, sortKey]);
  const columns: Column<ProductRecord>[] = [
    { key: "modelName", header: "모델명", sortable: true, render: (row) => row.modelName },
    { key: "productName", header: "제품명", sortable: true, render: (row) => row.productName },
    { key: "group", header: "제품군", sortable: true, render: (row) => row.group },
    { key: "warranty", header: "보증", sortable: true, render: (row) => `${row.warrantyMonths}개월` },
    {
      key: "status",
      header: "상태",
      sortable: true,
      render: (row) => <span className={cn(row.status === "사용" ? "text-green-600" : "text-red-600")}>{row.status}</span>,
    },
    ...(isAdmin
      ? [{
          key: "edit",
          header: "",
          render: (row: ProductRecord) => <Button variant="outline" onClick={() => setEditing(row)}>수정</Button>,
        } satisfies Column<ProductRecord>]
      : []),
  ];

  function save(next: ProductRecord) {
    setRows((current) => {
      const exists = current.some((row) => row.id === next.id);
      return exists ? current.map((row) => (row.id === next.id ? next : row)) : [...current, next];
    });
    setCreating(false);
    setEditing(null);
    setNotice(editing === null ? "지원 모델을 등록했습니다." : "지원 모델을 수정했습니다.");
  }

  return (
    <div>
      {notice !== "" && <Notice>{notice}</Notice>}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TextField value={query} onChange={setQuery} placeholder="모델명, 제품명" className="w-64" />
        {isAdmin && <Button className="ml-auto" onClick={() => setCreating(true)}>모델 등록</Button>}
      </div>
      <DataTable
        columns={columns}
        rows={visible}
        rowKey={(row) => row.id}
        sortKey={sortKey === "" ? undefined : sortKey}
        sortDir={sortDir}
        onSort={(key) => {
          if (sortKey === key) {
            setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
            return;
          }
          setSortKey(key);
          setSortDir("asc");
        }}
      />
      {(creating || editing !== null) && (
        <ModelModal
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

function valueOf(row: ProductRecord, key: string): string {
  if (key === "productName") return row.productName;
  if (key === "group") return row.group;
  if (key === "warranty") return String(row.warrantyMonths);
  if (key === "status") return row.status;
  return row.modelName;
}

function ModelModal({
  initial,
  onClose,
  onSave,
}: {
  initial: ProductRecord | null;
  onClose: () => void;
  onSave: (row: ProductRecord) => void;
}) {
  const [modelName, setModelName] = useState(initial?.modelName ?? "");
  const [productName, setProductName] = useState(initial?.productName ?? "");
  const [group, setGroup] = useState<ProductRecord["group"]>(initial?.group ?? "스마트폰");
  const [warranty, setWarranty] = useState<ProductRecord["warrantyMonths"]>(initial?.warrantyMonths ?? 12);
  const [status, setStatus] = useState<ProductRecord["status"]>(initial?.status ?? "사용");
  const [error, setError] = useState("");

  return (
    <Modal title={initial === null ? "모델 등록" : "모델 수정"} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (modelName.trim() === "" || productName.trim() === "") {
            setError("모델명과 제품명을 입력해 주세요.");
            return;
          }
          onSave({
            id: initial?.id ?? modelName.trim(),
            modelName: modelName.trim(),
            productName: productName.trim(),
            group,
            warrantyMonths: warranty,
            status,
          });
        }}
      >
        <p className="text-sm text-neutral-500">지원 품목 목록에 모델을 추가합니다.</p>
        <div className="space-y-4">
          <TextField label="모델명" value={modelName} onChange={setModelName} />
          <TextField label="제품명" value={productName} onChange={setProductName} />
          <Radios label="제품군" value={group} options={["스마트폰", "노트북"]} onChange={(value) => setGroup(value as ProductRecord["group"])} />
          <Radios label="보증" value={String(warranty)} options={["12", "24"]} labels={["12개월", "24개월"]} onChange={(value) => setWarranty(value === "24" ? 24 : 12)} />
          <Radios label="상태" value={status} options={["사용", "단종"]} onChange={(value) => setStatus(value as ProductRecord["status"])} />
        </div>
        {error !== "" && <Notice tone="error">{error}</Notice>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button type="submit">{initial === null ? "등록" : "수정"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function Radios({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  labels?: string[];
  onChange: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm">{label}</legend>
      <div className="flex gap-4 text-sm">
        {options.map((option, index) => (
          <label key={option} className="flex items-center gap-1.5">
            <input type="radio" name={label} checked={value === option} onChange={() => onChange(option)} />
            {labels?.[index] ?? option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
