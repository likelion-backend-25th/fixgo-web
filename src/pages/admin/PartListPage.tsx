import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SelectBox, TextArea, TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { isAbortError } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import {
  fetchParts,
  isPartStatus,
  partStatusLabel,
  updatePartMinutes,
  updatePartPrice,
  updatePartStock,
  type PartItem,
  type PartStatus,
  type StockMovement,
} from "@/lib/partApi";

const PAGE_SIZE = 20;

export function PartListPage() {
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const [status, setStatus] = useState<"" | PartStatus>("");
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [rows, setRows] = useState<PartItem[]>([]);
  const [inbound, setInbound] = useState(false);
  const [editing, setEditing] = useState<PartItem | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setApplied(query.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchParts({
      partName: applied,
      status: status === "" ? null : status,
      page,
      size: PAGE_SIZE,
    }, controller.signal)
      .then((result) => {
        setRows(result.content);
        setPageCount(Math.max(1, result.totalPages));
        setError("");
      })
      .catch((cause: unknown) => {
        if (isAbortError(cause)) {
          return;
        }
        setRows([]);
        setPageCount(1);
        setError(cause instanceof Error ? cause.message : "부품 목록을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [applied, status, page, reloadKey]);

  const columns: Column<PartItem>[] = [
    { key: "no", header: "번호", render: (row) => (page - 1) * PAGE_SIZE + rows.findIndex((item) => item.id === row.id) + 1 },
    { key: "name", header: "부품명", render: (row) => row.name },
    { key: "price", header: "단가", render: (row) => row.unitPrice.toLocaleString("ko-KR") },
    { key: "minutes", header: "표준 작업시간", render: (row) => `${row.standardMinutes}분` },
    { key: "stock", header: "재고", render: (row) => row.stockQuantity },
    { key: "status", header: "상태", render: (row) => <span className={statusClass(row.status)}>{partStatusLabel(row.status)}</span> },
    {
      key: "manage",
      header: "관리",
      render: (row) => <Button variant="outline" onClick={() => setEditing(row)}>수정</Button>,
    },
  ];

  return (
    <div>
      {notice !== "" && <Notice>{notice}</Notice>}
      {error !== "" && <Notice tone="error">{error}</Notice>}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TextField value={query} onChange={setQuery} placeholder="부품명" className="w-64" />
        <SelectBox
          value={status}
          onChange={(value) => {
            setStatus(isPartStatus(value) ? value : "");
            setPage(1);
          }}
          options={[
            { value: "", label: "상태 전체" },
            { value: "ACTIVE", label: "사용" },
            { value: "LOW_QUANTITY", label: "재고 부족" },
            { value: "DISCONTINUED", label: "단종" },
          ]}
        />
        <Button className="ml-auto" onClick={() => setInbound(true)}>입고 등록</Button>
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.id)}
        emptyText={loading ? "불러오는 중입니다." : "부품이 없습니다."}
      />
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
      {inbound && (
        <StockModal
          onClose={() => setInbound(false)}
          onSaved={() => {
            setInbound(false);
            setNotice("입고 수량을 반영했습니다.");
            setError("");
            setReloadKey((current) => current + 1);
          }}
        />
      )}
      {editing !== null && (
        <PartEditModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setNotice("부품 정보를 수정했습니다.");
            setError("");
            setReloadKey((current) => current + 1);
          }}
        />
      )}
    </div>
  );
}

function statusClass(status: PartStatus): string {
  if (status === "ACTIVE") return "text-green-600";
  if (status === "LOW_QUANTITY") return "text-orange-500";
  return cn("text-red-600");
}

function StockModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [keyword, setKeyword] = useState("");
  const [options, setOptions] = useState<PartItem[]>([]);
  const [part, setPart] = useState<PartItem | null>(null);
  const [picking, setPicking] = useState(false);
  const [changeType, setChangeType] = useState<StockMovement>("IN");
  const [qty, setQty] = useState("20");
  const [reason, setReason] = useState("공급사 정기 입고");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchParts({ partName: keyword.trim(), page: 1, size: 20 }, controller.signal)
      .then((result) => setOptions(result.content))
      .catch((cause: unknown) => {
        if (!isAbortError(cause)) {
          setOptions([]);
        }
      });
    return () => controller.abort();
  }, [keyword]);

  async function submit() {
    const count = Number(qty);
    if (part === null || !Number.isInteger(count) || count <= 0 || reason.trim() === "") {
      setError("부품, 입고 수량, 사유를 확인해 주세요.");
      return;
    }
    if (changeType === "OUT" && count > part.stockQuantity) {
      setError("출고 수량이 현재 재고보다 많습니다.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updatePartStock(part.id, changeType, count, reason.trim());
      onSaved();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "부품 재고를 수정하지 못했습니다.");
      setSaving(false);
    }
  }

  return (
    <Modal title="입고 등록" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div>
          <span className="mb-1 block text-sm">부품</span>
          <div className="flex gap-2">
            <TextField className="flex-1" value={part === null ? "" : part.name} onChange={() => undefined} readOnly />
            <Button variant="outline" onClick={() => setPicking((open) => !open)}>검색</Button>
          </div>
          {picking && (
            <ul className="mt-2 max-h-40 overflow-auto rounded border border-neutral-300 text-sm">
              <li className="border-b border-neutral-200 p-2">
                <TextField value={keyword} onChange={setKeyword} placeholder="부품명" />
              </li>
              {options.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-blue-50"
                    onClick={() => {
                      setPart(row);
                      setPicking(false);
                    }}
                  >
                    {row.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <label className="block text-sm">
          <span className="mb-1 block">변동 유형</span>
          <SelectBox
            className="w-full"
            value={changeType}
            onChange={(value) => setChangeType(value === "OUT" ? "OUT" : "IN")}
            options={[
              { value: "IN", label: "입고" },
              { value: "OUT", label: "출고" },
            ]}
          />
        </label>
        <TextField label="현재 재고" value={String(part?.stockQuantity ?? 0)} onChange={() => undefined} readOnly />
        <TextField label="입고 수량" value={qty} onChange={setQty} />
        <TextArea label="사유" value={reason} onChange={setReason} rows={3} />
        {error !== "" && <Notice tone="error">{error}</Notice>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button type="submit" disabled={saving}>등록</Button>
        </div>
      </form>
    </Modal>
  );
}

function PartEditModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: PartItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [price, setPrice] = useState(String(initial.unitPrice));
  const [minutes, setMinutes] = useState(String(initial.standardMinutes));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const parsed = Number(price.replace(/[^\d]/g, ""));
    const parsedMinutes = Number(minutes);
    if (!Number.isInteger(parsed) || parsed < 0) {
      setError("단가는 0 이상의 숫자로 입력해 주세요.");
      return;
    }
    if (!Number.isInteger(parsedMinutes) || parsedMinutes < 0) {
      setError("표준 작업시간은 0 이상의 숫자로 입력해 주세요.");
      return;
    }
    setSaving(true);
    try {
      await updatePartPrice(initial.id, parsed);
      await updatePartMinutes(initial.id, parsedMinutes);
      onSaved();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "부품 정보를 수정하지 못했습니다.");
      setSaving(false);
    }
  }

  return (
    <Modal title="부품 수정" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <TextField label="부품명" value={initial.name} onChange={() => undefined} readOnly />
        <TextField label="단가" value={price} onChange={setPrice} />
        <TextField label="표준 작업시간(분)" value={minutes} onChange={setMinutes} />
        <TextField label="상태" value={partStatusLabel(initial.status)} onChange={() => undefined} readOnly />
        {error !== "" && <Notice tone="error">{error}</Notice>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button type="submit" disabled={saving}>수정</Button>
        </div>
      </form>
    </Modal>
  );
}
