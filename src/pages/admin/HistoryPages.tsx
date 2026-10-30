import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SelectBox, TextField } from "@/components/ui/Field";
import { includesText } from "@/lib/format";
import { allocationHistory, statusHistory } from "@/mocks/screenData";
import type { HistoryRow } from "@/types/screen";

export function AllocationHistoryPage() {
  const [query, setQuery] = useState("");
  const rows = useMemo(
    () => allocationHistory.filter((row) => includesText(`${row.asId} ${row.customerName} ${row.after} ${row.reason}`, query)),
    [query],
  );
  return (
    <div>
      <TextField value={query} onChange={setQuery} placeholder="접수번호, 고객, 기사, 사유 검색" className="mb-4 w-72" />
      <HistoryTable rows={rows} kind="allocation" />
    </div>
  );
}

export function StatusHistoryPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("전체");
  const [query, setQuery] = useState("");
  const rows = useMemo(
    () =>
      statusHistory.filter((row) => {
        const matched = includesText(`${row.asId} ${row.customerName}`, query);
        return matched && (status === "전체" || row.after === status);
      }),
    [query, status],
  );
  return (
    <div>
      <div className="mb-4 flex gap-2">
        <TextField value={query} onChange={setQuery} placeholder="접수번호, 고객명 검색" className="w-64" />
        <SelectBox value={status} onChange={setStatus} options={["전체", "점검 중", "수리 중", "수리 거부"].map((value) => ({ value, label: value }))} />
      </div>
      <HistoryTable rows={rows} kind="status" onRowClick={(row) => navigate(`/as/details/${row.asId}`)} />
    </div>
  );
}

function HistoryTable({
  rows,
  kind,
  onRowClick,
}: {
  rows: HistoryRow[];
  kind: "allocation" | "status";
  onRowClick?: (row: HistoryRow) => void;
}) {
  const columns: Column<HistoryRow>[] =
    kind === "allocation"
      ? [
          { key: "at", header: "일시", render: (row) => row.at },
          { key: "as", header: "접수번호", render: (row) => row.asId },
          { key: "category", header: "구분", render: (row) => row.category },
          { key: "before", header: "이전 기사", render: (row) => row.before },
          { key: "after", header: "변경 기사", render: (row) => row.after },
          { key: "actor", header: "변경자", render: (row) => row.actor },
          { key: "reason", header: "사유", render: (row) => row.reason },
        ]
      : [
          { key: "at", header: "일시", render: (row) => row.at },
          { key: "as", header: "접수번호", render: (row) => row.asId },
          { key: "customer", header: "고객명", render: (row) => row.customerName },
          { key: "model", header: "모델", render: (row) => row.modelName },
          { key: "before", header: "이전 상태", render: (row) => row.before },
          { key: "after", header: "변경 상태", render: (row) => row.after },
          { key: "actor", header: "변경자", render: (row) => row.actor },
          { key: "reason", header: "사유", render: (row) => row.reason },
        ];
  return <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} onRowClick={onRowClick} />;
}
