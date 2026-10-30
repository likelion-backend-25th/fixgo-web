import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SelectBox, TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { compareText } from "@/lib/guards";
import { includesText } from "@/lib/format";
import { products } from "@/mocks/screenData";
import { useSessionStore } from "@/stores/useSessionStore";
import type { ProductRecord } from "@/types/screen";

export function ProductListPage() {
  const isAdmin = useSessionStore((state) => state.user?.role) === "ADMIN";
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("modelName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const rows = useMemo(() => {
    const filtered = products.filter((row) => includesText(`${row.modelName} ${row.productName}`, query));
    return [...filtered].sort((left, right) => {
      const result = compareText(left.modelName, right.modelName);
      return sortDir === "asc" ? result : -result;
    });
  }, [query, sortDir]);
  const columns: Column<ProductRecord>[] = [
    { key: "modelName", header: "모델명", sortable: true, render: (row) => row.modelName },
    { key: "productName", header: "제품명", sortable: true, render: (row) => row.productName },
    { key: "group", header: "제품군", render: (row) => row.group },
    { key: "warranty", header: "보증", render: (row) => `${row.warrantyMonths}개월` },
    { key: "supported", header: "수리 지원", render: (row) => (row.supported ? "지원" : "미지원") },
  ];

  return (
    <div>
      {notice !== "" && <Notice>{notice}</Notice>}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TextField value={query} onChange={setQuery} placeholder="모델명, 제품명 검색" className="w-64" />
        {isAdmin && (
          <Button className="ml-auto" onClick={() => setOpen(true)}>모델 등록</Button>
        )}
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={(key) => {
          setSortKey(key);
          setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
        }}
      />
      {open && (
        <ModelModal
          onClose={() => setOpen(false)}
          onSave={() => {
            setOpen(false);
            setNotice("지원 모델을 등록했습니다.");
          }}
        />
      )}
    </div>
  );
}

function ModelModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [modelName, setModelName] = useState("");
  const [productName, setProductName] = useState("");
  const [group, setGroup] = useState("스마트폰");
  const [warranty, setWarranty] = useState(true);
  const [status, setStatus] = useState("지원");
  const [error, setError] = useState("");

  return (
    <Modal title="모델 등록" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (modelName.trim() === "" || productName.trim() === "") {
            setError("모델명과 제품명을 입력해 주세요.");
            return;
          }
          onSave();
        }}
      >
        <TextField label="모델명" value={modelName} onChange={setModelName} />
        <TextField label="제품명" value={productName} onChange={setProductName} />
        <label className="block text-sm">
          <span className="mb-1 block">제품군</span>
          <SelectBox value={group} onChange={setGroup} options={[{ value: "스마트폰", label: "스마트폰" }, { value: "노트북", label: "노트북" }]} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={warranty} onChange={(event) => setWarranty(event.target.checked)} />
          보증 적용
        </label>
        <label className="block text-sm">
          <span className="mb-1 block">상태</span>
          <SelectBox value={status} onChange={setStatus} options={[{ value: "지원", label: "지원" }, { value: "미지원", label: "미지원" }]} />
        </label>
        {error !== "" && <Notice tone="error">{error}</Notice>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button type="submit">등록</Button>
        </div>
      </form>
    </Modal>
  );
}
