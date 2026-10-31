import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SelectBox, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { compareText, readNotice } from "@/lib/guards";
import { includesText } from "@/lib/format";
import { usePageSlice } from "@/lib/usePageSlice";
import { asRecords } from "@/mocks/screenData";
import { useSessionStore } from "@/stores/useSessionStore";
import type { AsRecord } from "@/types/screen";

const statusOptions = ["전체", "접수", "점검 중", "견적 승인 대기", "수리 중", "완료", "수리 거부"].map(
  (value) => ({ value, label: value === "전체" ? "상태 전체" : value }),
);

export function AsListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSessionStore((state) => state.user);
  const isTechnician = user?.role === "TECHNICIAN";
  const canCreate = user?.role === "ADMIN" || user?.role === "RECEPTIONIST" || user?.role === "MANAGER";
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("전체");
  const [assignee, setAssignee] = useState("전체");
  const [group, setGroup] = useState("전체");
  const [mineOnly, setMineOnly] = useState(false);
  const [sortKey, setSortKey] = useState("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const notice = readNotice(location.state);

  const filtered = useMemo(() => {
    const rows = asRecords.filter((row) => {
      const matchedQuery =
        includesText(row.id, query) || includesText(row.customerName, query) || includesText(row.symptom, query);
      const matchedStatus = status === "전체" || row.status === status;
      const matchedAssignee = assignee === "전체" || row.technician === assignee;
      const matchedGroup = group === "전체" || row.productGroup === group;
      const matchedMine = !mineOnly || row.technician === user?.name;
      return matchedQuery && matchedStatus && matchedAssignee && matchedGroup && matchedMine;
    });
    return [...rows].sort((left, right) => {
      const result = compareText(valueOf(left, sortKey), valueOf(right, sortKey));
      return sortDir === "asc" ? result : -result;
    });
  }, [assignee, group, mineOnly, query, sortDir, sortKey, status, user?.name]);

  const table = usePageSlice(filtered);
  const columns: Column<AsRecord>[] = isTechnician ? technicianColumns : deskColumns;

  function onSort(key: string) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  return (
    <div>
      {notice !== null && <Notice>{notice}</Notice>}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TextField
          value={query}
          onChange={(value) => {
            setQuery(value);
            table.setPage(1);
          }}
          placeholder={isTechnician ? "접수번호, 고객명 검색" : "접수번호, 고객명, 증상 검색"}
          className="w-64"
        />
        <SelectBox
          value={status}
          onChange={(value) => {
            setStatus(value);
            table.setPage(1);
          }}
          options={statusOptions}
        />
        {isTechnician ? (
          <SelectBox
            value={group}
            onChange={(value) => {
              setGroup(value);
              table.setPage(1);
            }}
            options={[
              { value: "전체", label: "제품군 전체" },
              { value: "스마트폰", label: "스마트폰" },
              { value: "노트북", label: "노트북" },
            ]}
          />
        ) : (
          <SelectBox
            value={assignee}
            onChange={(value) => {
              setAssignee(value);
              table.setPage(1);
            }}
            options={[
              { value: "전체", label: "담당 전체" },
              { value: "김철수", label: "김철수" },
              { value: "박철수", label: "박철수" },
            ]}
          />
        )}
        {isTechnician && (
          <label className="ml-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={mineOnly}
              onChange={(event) => setMineOnly(event.target.checked)}
            />
            내 담당 A/S 목록만 보기
          </label>
        )}
        {canCreate && (
          <Button className="ml-auto" onClick={() => navigate("/as/new")}>
            새 접수
          </Button>
        )}
      </div>
      <DataTable
        columns={columns}
        rows={table.slice}
        rowKey={(row) => row.id}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
        onRowClick={(row) => {
          if (isTechnician) {
            const repair = row.status === "수리 중" || row.status === "완료" || row.status === "수리 거부";
            navigate(repair ? `/as/${row.id}/repair` : `/as/${row.id}/inspection`);
            return;
          }
          navigate(`/as/details/${row.id}`);
        }}
      />
      <Pagination page={table.page} pageCount={table.pageCount} onPageChange={table.setPage} />
    </div>
  );
}

function valueOf(row: AsRecord, key: string): string {
  if (key === "id") return row.id;
  if (key === "customerName") return row.customerName;
  if (key === "phone") return row.phone;
  if (key === "modelName") return row.modelName;
  if (key === "status") return row.status;
  if (key === "technician") return row.technician;
  if (key === "symptom") return row.symptom;
  if (key === "receivedAt") return row.receivedAt;
  return row.assignedAt;
}

const deskColumns: Column<AsRecord>[] = [
  { key: "id", header: "접수번호", sortable: true, render: (row) => row.id },
  { key: "customerName", header: "고객", sortable: true, render: (row) => row.customerName },
  { key: "phone", header: "연락처", sortable: true, render: (row) => row.phone },
  { key: "modelName", header: "모델", sortable: true, render: (row) => row.modelName },
  { key: "status", header: "상태", sortable: true, render: (row) => row.status },
  { key: "technician", header: "담당", sortable: true, render: (row) => row.technician },
];

const technicianColumns: Column<AsRecord>[] = [
  { key: "id", header: "접수번호", sortable: true, render: (row) => row.id },
  { key: "customerName", header: "고객", sortable: true, render: (row) => row.customerName },
  { key: "technician", header: "담당 기사", sortable: true, render: (row) => row.technician },
  { key: "modelName", header: "모델명", sortable: true, render: (row) => row.modelName },
  { key: "symptom", header: "증상", sortable: true, render: (row) => row.symptom },
  { key: "status", header: "상태", sortable: true, render: (row) => row.status },
  { key: "assignedAt", header: "배정일", sortable: true, render: (row) => row.assignedAt },
];
