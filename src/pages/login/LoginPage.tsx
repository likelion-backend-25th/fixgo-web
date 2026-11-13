import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Panel";
import { useHydratedSession } from "@/hooks/useHydratedSession";
import { loginWithPassword } from "@/lib/authApi";
import { useSessionStore } from "@/stores/useSessionStore";

const demoAccounts = [
  { role: "기사", email: "technician001@fixgo.com" },
  { role: "접수", email: "receptionist001@fixgo.com" },
  { role: "관리자", email: "admin001@fixgo.com" },
] as const;

const demoPassword = "password123";

export function LoginPage() {
  const { user, ready } = useHydratedSession();
  const loginWithApi = useSessionStore((state) => state.loginWithApi);
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  if (!ready) {
    return null;
  }
  if (user !== null) {
    return <Navigate to="/as/list" replace />;
  }

  async function submit() {
    const id = loginId.trim();
    if (id === "" || password.trim() === "") {
      setError("아이디와 비밀번호를 입력해 주세요.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const session = await loginWithPassword(id, password);
      loginWithApi(session.user, session.accessToken, session.refreshToken, session.memberId);
      navigate("/as/list");
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "로그인에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-neutral-50 px-4 py-10">
      <div className="w-full max-w-md">
      <div className="rounded-2xl border border-neutral-200 bg-white px-8 py-10 shadow-sm">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-blue-600 text-lg font-bold text-white">F</div>
        <h1 className="mt-4 text-center text-3xl font-semibold tracking-tight text-blue-600">FixGo</h1>
        <p className="mt-3 text-center text-xl">로그인</p>
        <p className="mt-3 text-center text-sm leading-6 text-neutral-500">
          본 시스템은 FixGo A/S 관리 직원 전용 서비스입니다.
          <br />
          아이디와 비밀번호를 확인 후 로그인해 주세요.
        </p>
        <form
          className="mt-8 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <TextField label="아이디" value={loginId} onChange={setLoginId} placeholder="이메일" />
          <TextField label="비밀번호" type="password" value={password} onChange={setPassword} />
          {error !== "" && <Notice tone="error">{error}</Notice>}
          <Button type="submit" className="w-full py-2.5" disabled={pending}>
            {pending ? "로그인 중" : "로그인"}
          </Button>
        </form>
        <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm">
          <p className="font-medium text-neutral-800">테스트 계정</p>
          <p className="mt-1 text-neutral-500">비밀번호 {demoPassword}</p>
          <ul className="mt-2 space-y-1">
            {demoAccounts.map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  className="text-left text-blue-600 hover:underline"
                  onClick={() => {
                    setLoginId(account.email);
                    setPassword(demoPassword);
                    setError("");
                  }}
                >
                  {account.role} {account.email}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      </div>
    </div>
  );
}
