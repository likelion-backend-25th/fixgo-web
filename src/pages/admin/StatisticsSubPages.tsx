import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SelectBox, TextField } from "@/components/ui/Field";
import { won } from "@/lib/format";
import { includesText } from "@/lib/format";
import {
  depositRows,
  incompleteRows,
  modelStats,
  repairCostSeries,
  symptomBars,
  technicianStats,
} from "@/mocks/screenData";

export function DepositWaitingPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("전체");
  const rows = depositRows.filter((row) => includesText(row.customerName, query) && (status === "전체" || row.status === status));
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  return (
    <div>
      <Back />
      <div className="mb-4 flex flex-wrap gap-2">
        <TextField value={query} onChange={setQuery} placeholder="고객명 검색" className="w-52" />
        <SelectBox value={status} onChange={setStatus} options={["전체", "입금 대기", "연체"].map((value) => ({ value, label: value }))} />
      </div>
      <DataTable
        columns={[
          { key: "as", header: "접수번호", render: (row) => row.asId },
          { key: "customer", header: "고객", render: (row) => row.customerName },
          { key: "model", header: "모델", render: (row) => row.modelName },
          { key: "amount", header: "견적 금액", render: (row) => won(row.amount) },
          { key: "billed", header: "청구일", render: (row) => row.billedAt },
          { key: "elapsed", header: "경과일", render: (row) => `${row.elapsed}일` },
          { key: "status", header: "상태", render: (row) => row.status },
        ]}
        rows={rows}
        rowKey={(row) => row.asId}
      />
      <p className="mt-3 text-right text-sm font-semibold">합계 {won(total)}</p>
    </div>
  );
}

export function TechnicianStatsPage() {
  return (
    <div>
      <Back />
      <DataTable
        columns={[
          { key: "name", header: "기사명", render: (row) => row.name },
          { key: "assigned", header: "배정", render: (row) => row.assigned },
          { key: "done", header: "완료", render: (row) => row.done },
          { key: "doing", header: "진행", render: (row) => row.doing },
          { key: "avg", header: "평균 소요", render: (row) => `${row.avgDays}일` },
          { key: "sales", header: "매출", render: (row) => won(row.sales) },
        ]}
        rows={technicianStats}
        rowKey={(row) => row.name}
      />
    </div>
  );
}

export function ModelStatsPage() {
  return (
    <div>
      <Back />
      <DataTable
        columns={[
          { key: "model", header: "모델명", render: (row) => row.modelName },
          { key: "group", header: "제품군", render: (row) => row.group },
          { key: "received", header: "접수", render: (row) => row.received },
          { key: "done", header: "완료", render: (row) => row.done },
          { key: "doing", header: "진행", render: (row) => row.doing },
          {
            key: "symptom",
            header: "주요증상",
            render: (row) => <Link className="text-blue-600" to={`/admin/statistics/models/${row.id}`}>{row.symptom}</Link>,
          },
        ]}
        rows={modelStats}
        rowKey={(row) => row.id}
      />
    </div>
  );
}

export function SymptomStatsPage() {
  const { modelId = "" } = useParams();
  const model = modelStats.find((row) => row.id === modelId);
  const bars = symptomBars[modelId] ?? [];
  const max = Math.max(...bars.map((bar) => bar.count), 1);
  return (
    <div>
      <Back />
      <p className="mb-4 text-sm text-neutral-600">{model?.modelName ?? modelId} 고장 증상 분포</p>
      <ul className="space-y-3">
        {bars.map((bar) => (
          <li key={bar.label}>
            <div className="mb-1 flex justify-between text-sm"><span>{bar.label}</span><span>{bar.count}건</span></div>
            <div className="h-3 rounded bg-neutral-100"><div className="h-3 rounded bg-blue-600" style={{ width: `${(bar.count / max) * 100}%` }} /></div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RepairCostPage() {
  const rows = repairCostSeries.map((point, index) => ({
    ...point,
    cumulative: repairCostSeries.slice(0, index + 1).reduce((sum, item) => sum + item.amount, 0),
  }));
  const total = rows.at(-1)?.cumulative ?? 0;
  const peak = repairCostSeries.reduce((best, point) => (point.amount > best.amount ? point : best));
  return (
    <div>
      <Back />
      <p className="mb-3 text-sm text-neutral-600">
        2026년 10월 수납 합계 {won(total)} · 최고 {peak.date} {won(peak.amount)}
      </p>
      <RepairCostChart />
      <div className="mt-4">
        <DataTable
          columns={[
            { key: "date", header: "일자", render: (row) => `2026-${row.date.replace("/", "-")}` },
            { key: "amount", header: "수납액", render: (row) => won(row.amount) },
            { key: "cumulative", header: "누적 수납", render: (row) => won(row.cumulative) },
          ]}
          rows={rows}
          rowKey={(row) => row.date}
        />
      </div>
    </div>
  );
}

function RepairCostChart() {
  const width = 640;
  const height = 300;
  const padLeft = 58;
  const padRight = 28;
  const padTop = 36;
  const padBottom = 36;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;
  const yMax = 2_500_000;
  const yTicks = [0, 500_000, 1_000_000, 1_500_000, 2_000_000, 2_500_000];
  const xAt = (index: number) => padLeft + (index / (repairCostSeries.length - 1)) * plotWidth;
  const yAt = (amount: number) => padTop + (1 - amount / yMax) * plotHeight;
  const baseline = padTop + plotHeight;
  const points = repairCostSeries.map((point, index) => `${xAt(index)},${yAt(point.amount)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full rounded-xl border border-neutral-200 bg-white shadow-sm" role="img" aria-label="2026년 10월 수리비 수납 추이">
      {yTicks.map((tick) => (
        <g key={tick}>
          <line x1={padLeft} y1={yAt(tick)} x2={width - padRight} y2={yAt(tick)} stroke="#e5e5e5" />
          <text x={padLeft - 8} y={yAt(tick) + 4} textAnchor="end" fontSize="11" fill="#737373">
            {tick === 0 ? "0" : tick / 10_000}
          </text>
        </g>
      ))}
      <line x1={padLeft} y1={padTop} x2={padLeft} y2={baseline} stroke="#404040" strokeWidth="1.5" />
      <line x1={padLeft} y1={baseline} x2={width - padRight} y2={baseline} stroke="#404040" strokeWidth="1.5" />
      <text x={padLeft} y="16" fontSize="11" fill="#525252">수납액(만원)</text>
      <polyline fill="none" stroke="#2563eb" strokeWidth="2" points={points} />
      {repairCostSeries.map((point, index) => {
        const last = index === repairCostSeries.length - 1;
        const anchor = index === 0 ? "start" : last ? "end" : "middle";
        return (
          <g key={point.date}>
            <line x1={xAt(index)} y1={baseline} x2={xAt(index)} y2={baseline + 4} stroke="#404040" />
            <text x={xAt(index)} y={baseline + 18} textAnchor={anchor} fontSize="11" fill="#737373">{point.date}</text>
            <circle cx={xAt(index)} cy={yAt(point.amount)} r="3.5" fill="#ffffff" stroke="#2563eb" strokeWidth="2" />
            <text x={xAt(index)} y={yAt(point.amount) - 10} textAnchor={anchor} fontSize="11" fill="#1d4ed8">
              {(point.amount / 10_000).toLocaleString("ko-KR")}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function IncompletePage() {
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState("전체");
  const [status, setStatus] = useState("전체");
  const rows = useMemo(
    () =>
      incompleteRows.filter((row) => {
        const matchedElapsed = elapsed === "전체" || (elapsed === "14" ? row.elapsed >= 14 : row.elapsed >= 21);
        return matchedElapsed && (status === "전체" || row.status === status);
      }),
    [elapsed, status],
  );
  const columns: Column<(typeof incompleteRows)[number]>[] = [
    { key: "as", header: "접수번호", render: (row) => row.asId },
    { key: "customer", header: "고객명", render: (row) => row.customerName },
    { key: "model", header: "모델", render: (row) => row.modelName },
    { key: "status", header: "현재 상태", render: (row) => row.status },
    { key: "tech", header: "담당 기사", render: (row) => row.technician },
    { key: "elapsed", header: "경과일", render: (row) => `${row.elapsed}일` },
    { key: "last", header: "최근 활동일", render: (row) => row.lastAction },
  ];
  return (
    <div>
      <Back />
      <div className="mb-4 flex gap-2">
        <SelectBox value={elapsed} onChange={setElapsed} options={[{ value: "전체", label: "경과일 전체" }, { value: "14", label: "14일 이상" }, { value: "21", label: "21일 이상" }]} />
        <SelectBox value={status} onChange={setStatus} options={["전체", "점검 중", "수리 거부"].map((value) => ({ value, label: value }))} />
      </div>
      <DataTable columns={columns} rows={rows} rowKey={(row) => row.asId} onRowClick={(row) => navigate(`/as/details/${row.asId}`)} />
    </div>
  );
}

function Back() {
  return (
    <p className="mb-4">
      <Link to="/admin/statistics" className="text-sm text-blue-600">통계/리포트로 돌아가기</Link>
    </p>
  );
}
