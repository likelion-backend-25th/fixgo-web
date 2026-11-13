import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { isAbortError } from "@/lib/apiClient";
import { formatDate, won } from "@/lib/format";
import { fetchLaborRates, updateLaborRate, type LaborRateItem, type RateType } from "@/lib/laborRateApi";
import { categoryToLabel } from "@/lib/productModelApi";

export function CostListPage() {
  const [rows, setRows] = useState<LaborRateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<LaborRateItem | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchLaborRates(controller.signal)
      .then((result) => {
        setRows(result);
        setError("");
      })
      .catch((cause: unknown) => {
        if (isAbortError(cause)) {
          return;
        }
        setRows([]);
        setError(cause instanceof Error ? cause.message : "공임비·점검비 목록을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="space-y-4">
      {notice !== "" && <Notice>{notice}</Notice>}
      {error !== "" && <Notice tone="error">{error}</Notice>}
      <RateTable title="공임비" rateType="LABOR_RATE" rows={rows} loading={loading} onSelect={setEditing} />
      <RateTable title="점검비" rateType="INSPECTION_COST" rows={rows} loading={loading} onSelect={setEditing} />
      {editing !== null && (
        <CostEditModal
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setRows((current) => current.map((row) => (row.id === updated.id ? updated : row)));
            setEditing(null);
            setError("");
            setNotice(updated.rateType === "LABOR_RATE" ? "공임비를 수정했습니다." : "점검비를 수정했습니다.");
          }}
        />
      )}
    </div>
  );
}

function RateTable({
  title,
  rateType,
  rows,
  loading,
  onSelect,
}: {
  title: string;
  rateType: RateType;
  rows: LaborRateItem[];
  loading: boolean;
  onSelect: (row: LaborRateItem) => void;
}) {
  const visible = rows.filter((row) => row.rateType === rateType);
  const columns: Column<LaborRateItem>[] = [
    { key: "no", header: "번호", render: (row) => visible.findIndex((item) => item.id === row.id) + 1 },
    { key: "product", header: "제품", render: (row) => categoryToLabel(row.productCategory) },
    { key: "amount", header: "금액", render: (row) => won(row.cost) },
    { key: "effectiveDate", header: "적용일", render: (row) => formatDate(row.effectiveDate) },
  ];

  return (
    <section>
      <h2 className="section-title mb-3">{title}</h2>
      <DataTable
        columns={columns}
        rows={visible}
        rowKey={(row) => String(row.id)}
        onRowClick={onSelect}
        emptyText={loading ? "불러오는 중입니다." : "등록된 기준이 없습니다."}
      />
    </section>
  );
}

function CostEditModal({
  row,
  onClose,
  onSaved,
}: {
  row: LaborRateItem;
  onClose: () => void;
  onSaved: (updated: LaborRateItem) => void;
}) {
  const [cost, setCost] = useState(String(row.cost));
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const labor = row.rateType === "LABOR_RATE";

  async function save() {
    const trimmed = cost.trim();
    if (!/^\d+$/.test(trimmed)) {
      setError("금액은 0 이상의 정수로 입력해 주세요.");
      return;
    }
    const amount = Number(trimmed);
    setPending(true);
    setError("");
    try {
      onSaved(await updateLaborRate(row.id, amount));
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "금액을 수정하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal title={labor ? "공임비 수정" : "점검비 수정"} onClose={() => { if (!pending) onClose(); }}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <p className="text-sm text-[#1E293B]">{categoryToLabel(row.productCategory)}</p>
        <TextField label="금액" value={cost} onChange={setCost} placeholder="0" />
        {labor && <p className="text-xs text-[#64748B]">10분당 금액입니다.</p>}
        {error !== "" && <Notice tone="error">{error}</Notice>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" disabled={pending} onClick={onClose}>취소</Button>
          <Button type="submit" disabled={pending}>{pending ? "저장 중…" : "저장"}</Button>
        </div>
      </form>
    </Modal>
  );
}
