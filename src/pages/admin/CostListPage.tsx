import { useEffect, useState } from "react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Notice } from "@/components/ui/Panel";
import { isAbortError } from "@/lib/apiClient";
import { formatDate, won } from "@/lib/format";
import { fetchLaborRates, type LaborRateItem, type RateType } from "@/lib/laborRateApi";
import { categoryToLabel } from "@/lib/productModelApi";

export function CostListPage() {
  const [rows, setRows] = useState<LaborRateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      {error !== "" && <Notice tone="error">{error}</Notice>}
      <RateTable title="공임비" rateType="LABOR_RATE" rows={rows} loading={loading} />
      <RateTable title="점검비" rateType="INSPECTION_COST" rows={rows} loading={loading} />
    </div>
  );
}

function RateTable({
  title,
  rateType,
  rows,
  loading,
}: {
  title: string;
  rateType: RateType;
  rows: LaborRateItem[];
  loading: boolean;
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
        emptyText={loading ? "불러오는 중입니다." : "등록된 기준이 없습니다."}
      />
    </section>
  );
}
