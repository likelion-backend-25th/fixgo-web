import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { isAbortError } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { compareText } from "@/lib/guards";
import {
  categoryToLabel,
  createProductModel,
  fetchProductModels,
  productModelStatusLabel,
  updateProductModel,
} from "@/lib/productModelApi";
import { useSessionStore } from "@/stores/useSessionStore";
import type { ProductCategory } from "@/types/asReception";
import type { ProductModel } from "@/types/productModel";

const PAGE_SIZE = 20;

export function ProductListPage() {
  const isAdmin = useSessionStore((state) => state.user?.role) === "ADMIN";
  const [query, setQuery] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ProductModel[]>([]);
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<ProductModel | null>(null);
  const [creating, setCreating] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = query.trim();
      setAppliedKeyword((current) => {
        if (current === next) return current;
        setPage(1);
        return next;
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetchProductModels({ keyword: appliedKeyword, page, size: PAGE_SIZE }, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setRows(result.items);
        setPageCount(Math.max(1, result.totalPages));
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || isAbortError(cause)) return;
        setRows([]);
        setPageCount(1);
        setError(cause instanceof Error ? cause.message : "지원 품목 목록을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [appliedKeyword, page, reloadKey]);

  const visible = useMemo(() => {
    if (sortKey === "") {
      return rows;
    }
    return [...rows].sort((left, right) => {
      const result = compareText(valueOf(left, sortKey), valueOf(right, sortKey));
      return sortDir === "asc" ? result : -result;
    });
  }, [rows, sortDir, sortKey]);

  const columns: Column<ProductModel>[] = [
    {
      key: "modelName",
      header: "모델명",
      sortable: true,
      render: (row) => <span className="text-[#005A9C]">{row.modelName}</span>,
    },
    { key: "productName", header: "제품명", sortable: true, render: (row) => row.name },
    { key: "group", header: "제품군", sortable: true, render: (row) => categoryToLabel(row.category) },
    { key: "warranty", header: "보증", sortable: true, render: (row) => `${row.warrantyMonths}개월` },
    {
      key: "status",
      header: "상태",
      sortable: true,
      render: (row) => (
        <span className={cn(row.isActive ? "text-green-600" : "text-red-600")}>
          {productModelStatusLabel(row.isActive)}
        </span>
      ),
    },
    ...(isAdmin
      ? [{
          key: "edit",
          header: "",
          render: (row: ProductModel) => (
            <Button variant="outline" onClick={() => setEditing(row)}>수정</Button>
          ),
        } satisfies Column<ProductModel>]
      : []),
  ];

  async function save(input: {
    name: string;
    modelName: string;
    category: ProductCategory;
    warrantyMonths: number;
    isActive: boolean;
  }) {
    if (editing === null) {
      await createProductModel({
        name: input.name,
        modelName: input.modelName,
        category: input.category,
        warrantyMonths: input.warrantyMonths,
      });
      setNotice("지원 모델을 등록했습니다.");
    } else {
      await updateProductModel(editing.id, input);
      setNotice("지원 모델을 수정했습니다.");
    }
    setCreating(false);
    setEditing(null);
    setReloadKey((value) => value + 1);
  }

  return (
    <div>
      {notice !== "" && <div className="mb-3"><Notice transient onDismiss={() => setNotice("")}>{notice}</Notice></div>}
      {error !== "" && <div className="mb-3"><Notice tone="error">{error}</Notice></div>}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TextField value={query} onChange={setQuery} placeholder="모델명, 제품명" className="w-64" />
        {isAdmin && <Button className="ml-auto" onClick={() => setCreating(true)}>모델 등록</Button>}
      </div>
      <DataTable
        columns={columns}
        rows={visible}
        rowKey={(row) => String(row.id)}
        emptyText={loading ? "지원 품목을 불러오는 중입니다." : "조회 결과가 없습니다."}
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
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
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

function valueOf(row: ProductModel, key: string): string {
  if (key === "productName") return row.name;
  if (key === "group") return categoryToLabel(row.category);
  if (key === "warranty") return String(row.warrantyMonths);
  if (key === "status") return productModelStatusLabel(row.isActive);
  return row.modelName;
}

function ModelModal({
  initial,
  onClose,
  onSave,
}: {
  initial: ProductModel | null;
  onClose: () => void;
  onSave: (input: {
    name: string;
    modelName: string;
    category: ProductCategory;
    warrantyMonths: number;
    isActive: boolean;
  }) => Promise<void>;
}) {
  const [modelName, setModelName] = useState(initial?.modelName ?? "");
  const [productName, setProductName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<ProductCategory>(initial?.category ?? "PHONE");
  const [warranty, setWarranty] = useState(initial?.warrantyMonths ?? 12);
  const warrantyChoices = warranty === 12 || warranty === 24 ? [12, 24] : [warranty, 12, 24];
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

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
          setPending(true);
          setError("");
          void onSave({
            name: productName.trim(),
            modelName: modelName.trim(),
            category,
            warrantyMonths: warranty,
            isActive,
          })
            .catch((cause: unknown) => {
              setError(cause instanceof Error ? cause.message : "저장하지 못했습니다.");
            })
            .finally(() => setPending(false));
        }}
      >
        <p className="text-sm text-neutral-500">지원 품목 목록에 모델을 추가합니다.</p>
        <div className="space-y-4">
          <TextField label="모델명" value={modelName} onChange={setModelName} />
          <TextField label="제품명" value={productName} onChange={setProductName} />
          <Radios
            label="제품군"
            value={category}
            options={["PHONE", "LAPTOP"]}
            labels={["스마트폰", "노트북"]}
            onChange={(value) => setCategory(value as ProductCategory)}
          />
          <Radios
            label="보증"
            value={String(warranty)}
            options={warrantyChoices.map(String)}
            labels={warrantyChoices.map((months) => `${months}개월`)}
            onChange={(value) => setWarranty(Number(value))}
          />
          <Radios
            label="상태"
            value={isActive ? "사용" : "단종"}
            options={["사용", "단종"]}
            onChange={(value) => setIsActive(value === "사용")}
          />
        </div>
        {error !== "" && <Notice tone="error">{error}</Notice>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={pending}>취소</Button>
          <Button type="submit" disabled={pending}>{initial === null ? "등록" : "수정"}</Button>
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
