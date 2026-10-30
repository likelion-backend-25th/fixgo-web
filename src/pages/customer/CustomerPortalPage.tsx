import { useState, type ReactNode } from "react";
import { useParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { won } from "@/lib/format";

type Stage = "received" | "inspecting" | "estimate" | "repairing" | "pay" | "paid" | "rejected";

const steps = [
  { id: "received", label: "접수" },
  { id: "inspecting", label: "점검" },
  { id: "repairing", label: "수리" },
  { id: "pay", label: "결제" },
] as const;

export function CustomerPortalPage() {
  const { token = "" } = useParams();
  const [stage, setStage] = useState<Stage>("received");
  const [payOpen, setPayOpen] = useState(false);
  const [paper, setPaper] = useState("");

  if (token === "expired" || token.length < 6) {
    return (
      <PortalFrame>
        <p className="text-center text-sm text-neutral-600">안내 링크가 만료되었거나 유효하지 않습니다. A/S가 끝나면 링크는 사용할 수 없습니다.</p>
      </PortalFrame>
    );
  }

  const stepIndex = stage === "received" ? 0 : stage === "inspecting" || stage === "estimate" || stage === "rejected" ? 1 : stage === "repairing" ? 2 : 3;
  const meta = stageMeta(stage);

  return (
    <PortalFrame>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-neutral-500">A/S 진행</p>
          <p className="font-semibold">{meta.asId}</p>
        </div>
        <span className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">{meta.badge}</span>
      </div>
      <p className="text-sm text-neutral-600">사자전자 방문 접수 건 · fixgo/{token}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-xs text-neutral-500">고객</dt><dd>한소희</dd></div>
        <div><dt className="text-xs text-neutral-500">연락처</dt><dd>010-5555-1212</dd></div>
        <div><dt className="text-xs text-neutral-500">제품</dt><dd>사자폰 SZ-P24</dd></div>
        <div><dt className="text-xs text-neutral-500">증상</dt><dd>스피커 불량</dd></div>
      </dl>
      <ol className="mt-6 flex justify-between">
        {steps.map((step, index) => (
          <li key={step.id} className="flex flex-1 flex-col items-center">
            <button
              type="button"
              onClick={() => setStage(step.id === "inspecting" ? "inspecting" : step.id === "pay" ? "pay" : step.id)}
              className={cn("grid size-7 place-items-center rounded-full text-xs", index <= stepIndex ? "bg-blue-600 text-white" : "bg-neutral-200 text-neutral-500")}
            >
              {index + 1}
            </button>
            <span className="mt-1 text-xs">{step.label}</span>
          </li>
        ))}
      </ol>
      <StageBody stage={stage} onStage={setStage} onPay={() => setPayOpen(true)} onPaper={setPaper} />
      {payOpen && (
        <PayModal
          amount={stage === "rejected" ? 15000 : 45000}
          onClose={() => setPayOpen(false)}
          onPaid={() => {
            setPayOpen(false);
            setStage("paid");
          }}
        />
      )}
      {paper !== "" && (
        <Modal title={paper} onClose={() => setPaper("")}>
          <p className="text-sm text-neutral-700">{paper} 미리보기입니다. 접수번호 {meta.asId}, 고객 한소희.</p>
          <div className="mt-4 text-right"><Button onClick={() => window.print()}>인쇄</Button></div>
        </Modal>
      )}
    </PortalFrame>
  );
}

function PortalFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-100 px-4 py-8">
      <div className="mx-auto w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <p className="mb-4 text-center text-lg font-semibold text-blue-600">FixGo</p>
        {children}
      </div>
    </div>
  );
}

function stageMeta(stage: Stage): { asId: string; badge: string } {
  if (stage === "received") return { asId: "AS-2026-1112", badge: "접수" };
  if (stage === "inspecting") return { asId: "AS-2026-1108", badge: "점검중" };
  if (stage === "estimate") return { asId: "AS-2026-1081", badge: "견적 승인 대기" };
  if (stage === "rejected") return { asId: "AS-2026-1081", badge: "견적 거부" };
  if (stage === "repairing") return { asId: "AS-2026-1094", badge: "수리중" };
  return { asId: "AS-2026-1076", badge: stage === "paid" ? "결제완료" : "결제 대기" };
}

function StageBody({
  stage,
  onStage,
  onPay,
  onPaper,
}: {
  stage: Stage;
  onStage: (stage: Stage) => void;
  onPay: () => void;
  onPaper: (title: string) => void;
}) {
  if (stage === "received") {
    return (
      <div className="mt-6 space-y-3 text-sm">
        <p>접수가 완료되었습니다. 점검을 준비 중입니다.</p>
        <Button variant="outline" onClick={() => onPaper("접수증")}>접수증 보기</Button>
        <p className="text-xs text-neutral-500">2026-10-23 10:12 접수</p>
      </div>
    );
  }
  if (stage === "inspecting") {
    return (
      <div className="mt-6 space-y-3 text-sm">
        <p>점검 중 충전 단자를 점검 중입니다.</p>
        <Button variant="outline" onClick={() => onStage("estimate")}>견적 보기</Button>
      </div>
    );
  }
  if (stage === "estimate" || stage === "rejected") {
    const rejected = stage === "rejected";
    return (
      <div className="mt-6 space-y-3 text-sm">
        {rejected ? (
          <p>견적 거부 기준 점검비만 결제하면 됩니다.</p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded border border-neutral-300">
            <li className="flex justify-between px-3 py-2"><span>정비비</span><span>20,000원</span></li>
            <li className="flex justify-between px-3 py-2"><span>공임비</span><span>40,000원</span></li>
            <li className="flex justify-between px-3 py-2"><span>배터리</span><span>35,000원</span></li>
          </ul>
        )}
        <p className="text-right font-semibold">합계 {won(rejected ? 15000 : 95000)}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => onPaper(rejected ? "점검 내역" : "견적서")}>{rejected ? "점검비 안내" : "견적서 보기"}</Button>
          {!rejected && <Button onClick={() => onStage("repairing")}>견적 승인</Button>}
          {!rejected && <Button variant="ghost" onClick={() => onStage("rejected")}>견적 거부</Button>}
          {rejected && <Button onClick={onPay}>점검비 결제</Button>}
        </div>
      </div>
    );
  }
  if (stage === "repairing") {
    return (
      <div className="mt-6 space-y-3 text-sm">
        <p>수리 중 키보드 불량 수리를 진행하고 있습니다.</p>
        <Button variant="outline" onClick={() => onPaper("수리내역서")}>수리내역서 보기</Button>
        <Button onClick={() => onStage("pay")}>결제 단계로</Button>
      </div>
    );
  }
  return (
    <div className="mt-6 space-y-3 text-sm">
      <p>{stage === "paid" ? "결제가 완료되었습니다." : "결제가 완료되지 않았습니다."}</p>
      <p>수리비 {won(45000)} · {stage === "paid" ? "카드" : "미결제"}</p>
      <Button variant="outline" onClick={() => onPaper("수리내역서")}>수리내역서 보기</Button>
      {stage === "paid" ? (
        <Button variant="outline" onClick={() => onPaper("결제내역서")}>결제내역서 보기</Button>
      ) : (
        <Button onClick={onPay}>결제하기</Button>
      )}
    </div>
  );
}

function PayModal({ amount, onClose, onPaid }: { amount: number; onClose: () => void; onPaid: () => void }) {
  const [card, setCard] = useState("");
  const [expiry, setExpiry] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  return (
    <Modal title="카드 결제" onClose={onClose}>
      <p className="mb-3 text-sm">결제 금액 {won(amount)}</p>
      <div className="space-y-3">
        <TextField label="카드번호" value={card} onChange={setCard} placeholder="0000-0000-0000-0000" />
        <TextField label="유효기간" value={expiry} onChange={setExpiry} placeholder="MM/YY" />
        <TextField label="비밀번호 앞 2자리" value={password} onChange={setPassword} />
      </div>
      {error !== "" && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-4 text-right">
        <Button
          onClick={() => {
            if (card.replaceAll("-", "").length < 12) {
              setError("카드번호를 입력해 주세요.");
              return;
            }
            onPaid();
          }}
        >
          결제하기
        </Button>
      </div>
    </Modal>
  );
}
