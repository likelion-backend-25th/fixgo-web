import { Link } from "react-router";
import { technicianStats } from "@/mocks/screenData";

const months = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월"];
const received = [62, 58, 70, 84, 96, 120, 142, 128, 118, 128];
const done = [48, 50, 61, 72, 80, 98, 110, 102, 96, 104];

export function StatisticsPage() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500">2026년 10월</p>
      <div className="grid gap-3 md:grid-cols-5">
        <Kpi label="이번 달 접수" value="128건" hint="지난달 대비 +12%" />
        <Kpi label="처리 완료" value="96건" hint="완료율 75%" />
        <Link to="/admin/statistics/incomplete" className="rounded-xl border border-neutral-200 bg-white shadow-sm p-4 hover:border-blue-400">
          <p className="text-sm text-neutral-500">미처리</p>
          <p className="mt-2 text-2xl font-semibold text-blue-600">32건</p>
          <p className="mt-1 text-xs text-neutral-500">경과일 14일 이상 5건</p>
        </Link>
        <Kpi label="평균 수리 기간" value="3.2일" hint="접수 → 완료" />
        <Link to="/admin/statistics/deposits/waiting" className="rounded-xl border border-neutral-200 bg-white shadow-sm p-4 hover:border-blue-400">
          <p className="text-sm text-neutral-500">미수금</p>
          <p className="mt-2 text-2xl font-semibold text-blue-600">520,000원</p>
          <p className="mt-1 text-xs text-neutral-500">대기 3건</p>
        </Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <section className="rounded-xl border border-neutral-200 bg-white shadow-sm p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <p className="font-medium">월별 수리 건수 추이</p>
            <p><span className="mr-3 text-blue-600">■ 접수</span><span className="text-green-600">■ 완료</span></p>
          </div>
          <TrendChart />
        </section>
        <section className="rounded-xl border border-neutral-200 bg-white shadow-sm p-4">
          <p className="mb-4 text-sm font-medium">수리 유형 분포</p>
          <div className="flex items-center gap-4">
            <div className="grid size-36 place-items-center rounded-full" style={{ background: "conic-gradient(#2563eb 0 45%, #f97316 45% 83%, #9ca3af 83% 100%)" }}>
              <div className="grid size-20 place-items-center rounded-full bg-white text-sm font-semibold">45%</div>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="text-blue-600">보증 수리 45%</li>
              <li className="text-orange-500">유상 수리 38%</li>
              <li className="text-neutral-500">점검만 17%</li>
            </ul>
          </div>
        </section>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Link to="/admin/statistics/technicians" className="rounded-xl border border-neutral-200 bg-white shadow-sm p-4 hover:border-blue-400">
          <p className="mb-3 text-sm font-medium">기사별 처리 현황</p>
          <ul className="space-y-3">
            {technicianStats.map((row) => (
              <li key={row.name}>
                <div className="mb-1 flex justify-between text-sm"><span>{row.name}</span><span>{row.assigned}건</span></div>
                <div className="h-2 rounded bg-neutral-100"><div className="h-2 rounded bg-blue-500" style={{ width: `${row.assigned * 2}%` }} /></div>
              </li>
            ))}
          </ul>
        </Link>
        <Link to="/admin/statistics/models" className="rounded-xl border border-neutral-200 bg-white shadow-sm p-4 hover:border-blue-400">
          <p className="mb-3 text-sm font-medium">제품 모델별 고장 건수</p>
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-100"><tr>{["모델", "접수", "완료", "평균일", "주요 증상"].map((header) => <th key={header} className="px-2 py-1">{header}</th>)}</tr></thead>
            <tbody>
              <tr className="border-t"><td className="px-2 py-2">Galaxy S24</td><td>32</td><td>28</td><td>2.8일</td><td>배터리</td></tr>
              <tr className="border-t"><td className="px-2 py-2">iPhone 15</td><td>27</td><td>24</td><td>3.1일</td><td>액정</td></tr>
              <tr className="border-t"><td className="px-2 py-2">Galaxy Book4</td><td>18</td><td>14</td><td>4.5일</td><td>키보드</td></tr>
            </tbody>
          </table>
        </Link>
      </div>
      <Link to="/admin/statistics/repair_cost" className="block rounded-xl border border-neutral-200 bg-white shadow-sm p-4 text-sm hover:border-blue-400">
        당월 수리비 수납 현황 · 수납 18,400,000원 · 미수 520,000원 · 수납률 97%
      </Link>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm p-4">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-blue-600">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{hint}</p>
    </div>
  );
}

function TrendChart() {
  const width = 520;
  const height = 180;
  const toPoint = (values: number[], index: number) => {
    const x = (index / (values.length - 1)) * (width - 20) + 10;
    const y = height - 20 - (values[index] ?? 0) / 160 * (height - 30);
    return `${x},${y}`;
  };
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full">
      <polyline fill="none" stroke="#2563eb" strokeWidth="2" points={received.map((_, index) => toPoint(received, index)).join(" ")} />
      <polyline fill="none" stroke="#16a34a" strokeWidth="2" points={done.map((_, index) => toPoint(done, index)).join(" ")} />
      {months.map((month, index) => (
        <text key={month} x={(index / (months.length - 1)) * (width - 20) + 10} y={height - 4} fontSize="10" textAnchor="middle" fill="#737373">{month}</text>
      ))}
    </svg>
  );
}
