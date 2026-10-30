import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SelectBox, TextField } from "@/components/ui/Field";
import { Pagination } from "@/components/ui/Pagination";
import { includesText, won } from "@/lib/format";
import { usePageSlice } from "@/lib/usePageSlice";
import { payments } from "@/mocks/screenData";
import type { PaymentRecord } from "@/types/screen";

export function PaymentListPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("전체");
  const rows = useMemo(
    () =>
      payments.filter((row) => {
        const matched = includesText(`${row.orderId} ${row.customerName}`, query);
        return matched && (status === "전체" || row.status === status);
      }),
    [query, status],
  );
  const table = usePageSlice(rows);
  const columns: Column<PaymentRecord>[] = [
    { key: "order", header: "청구번호", render: (row) => row.orderId },
    { key: "as", header: "접수번호", render: (row) => row.asId },
    { key: "customer", header: "고객", render: (row) => row.customerName },
    { key: "amount", header: "금액", render: (row) => won(row.amount) },
    { key: "status", header: "상태", render: (row) => row.status },
    { key: "method", header: "수단", render: (row) => row.method },
    {
      key: "detail",
      header: "",
      render: (row) => (
        <Button variant={row.status === "결제 대기" ? "primary" : "outline"} onClick={() => navigate(`/payment/${row.orderId}`)}>
          상세
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <TextField value={query} onChange={setQuery} placeholder="청구번호, 고객명 검색" className="w-64" />
        <SelectBox
          value={status}
          onChange={setStatus}
          options={[
            { value: "전체", label: "상태 전체" },
            { value: "결제 대기", label: "결제 대기" },
            { value: "결제 완료", label: "결제 완료" },
          ]}
        />
      </div>
      <DataTable columns={columns} rows={table.slice} rowKey={(row) => row.orderId} />
      <Pagination page={table.page} pageCount={table.pageCount} onPageChange={table.setPage} />
    </div>
  );
}
