import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Panel";
import { useHydratedSession } from "@/hooks/useHydratedSession";
import { DEMO_ACCOUNTS, TEST_PASSWORD } from "@/mocks/accounts";
import { useSessionStore } from "@/stores/useSessionStore";
import { ROLE_LABEL, type StaffRole } from "@/types/staff";

const LOGIN_ROLE_LABEL: Record<StaffRole, string> = {
  ...ROLE_LABEL,
  ADMIN: "관리자",
};

export function LoginPage() {
  const { user, ready } = useHydratedSession();
  const login = useSessionStore((state) => state.login);
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (!ready) {
    return null;
  }
  if (user !== null) {
    return <Navigate to="/as/list" replace />;
  }

  function submit() {
    if (loginId.trim() === "" || password.trim() === "") {
      setError("아이디와 비밀번호를 입력해 주세요.");
      return;
    }
    const account = DEMO_ACCOUNTS.find(
      (item) => item.loginId === loginId.trim() && item.password === password,
    );
    if (account === undefined) {
      setError("아이디 또는 비밀번호가 올바르지 않습니다.");
      return;
    }
    login(account);
    navigate("/as/list");
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
            submit();
          }}
        >
          <TextField label="아이디" value={loginId} onChange={setLoginId} />
          <TextField label="비밀번호" type="password" value={password} onChange={setPassword} />
          {error !== "" && <Notice tone="error">{error}</Notice>}
          <Button type="submit" className="w-full py-2.5">
            로그인
          </Button>
        </form>
      </div>
      <div className="mt-4 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-xs text-neutral-600 shadow-sm">
        <p className="text-center">테스트 비밀번호는 모두 {TEST_PASSWORD} 입니다.</p>
        <ul className="mt-2 space-y-1">
          {DEMO_ACCOUNTS.map((account) => (
            <li key={account.loginId} className="flex items-center justify-between gap-3">
              <span>
                {LOGIN_ROLE_LABEL[account.role]} · {account.name}
              </span>
              <button
                type="button"
                className="rounded-md bg-neutral-50 px-2 py-1 font-medium text-neutral-800 hover:bg-neutral-100"
                onClick={() => {
                  login(account);
                  navigate("/as/list");
                }}
              >
                {account.loginId}
              </button>
            </li>
          ))}
        </ul>
      </div>
      </div>
    </div>
  );
}
