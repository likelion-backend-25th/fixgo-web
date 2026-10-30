import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { ROLE_LABEL } from "@/types/staff";
import { useSessionStore } from "@/stores/useSessionStore";

export function MyPage() {
  const user = useSessionStore((state) => state.user);
  const [open, setOpen] = useState(false);
  if (user === null) {
    return null;
  }

  return (
    <div>
      <section className="max-w-4xl rounded border border-neutral-300 p-5">
        <div className="flex flex-wrap gap-8">
          <div className="flex items-center gap-4">
            <span className="grid size-16 place-items-center rounded-full bg-blue-600 text-xl font-semibold text-white">
              {user.name.slice(0, 1)}
            </span>
            <div>
              <p className="text-lg font-semibold">{user.name}</p>
              <p className="text-sm text-neutral-500">{ROLE_LABEL[user.role]}</p>
              <p className="text-sm text-neutral-500">{user.workStatus}</p>
            </div>
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-[80px_1fr]">
            <dt className="text-neutral-500">연락처</dt>
            <dd>{user.phone}</dd>
            <dt className="text-neutral-500">이메일</dt>
            <dd>{user.email}</dd>
            <dt className="text-neutral-500">주소</dt>
            <dd className="whitespace-pre-line">{user.address}</dd>
          </dl>
        </div>
      </section>
      <Button variant="outline" className="mt-4" onClick={() => setOpen(true)}>
        비밀번호 변경
      </Button>
      {open && <PasswordModal onClose={() => setOpen(false)} />}
    </div>
  );
}

function PasswordModal({ onClose }: { onClose: () => void }) {
  const user = useSessionStore((state) => state.user);
  const updatePassword = useSessionStore((state) => state.updatePassword);
  const logout = useSessionStore((state) => state.logout);
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function submit() {
    if (user === null || currentPassword !== user.password) {
      setError("기존 비밀번호가 일치하지 않습니다.");
      return;
    }
    if (nextPassword.length < 4) {
      setError("새 비밀번호는 4자 이상이어야 합니다.");
      return;
    }
    if (nextPassword !== confirmPassword) {
      setError("새 비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    updatePassword(nextPassword);
    setDone(true);
    setError("");
  }

  return (
    <Modal title="비밀번호 변경" onClose={onClose}>
      {done ? (
        <div className="space-y-4">
          <Notice>비밀번호가 변경되었습니다. 다시 로그인해 주세요.</Notice>
          <div className="flex justify-end">
            <Button
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              확인
            </Button>
          </div>
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <TextField label="기존 비밀번호" type="password" value={currentPassword} onChange={setCurrentPassword} />
          <TextField label="새 비밀번호" type="password" value={nextPassword} onChange={setNextPassword} />
          <TextField label="새 비밀번호 확인" type="password" value={confirmPassword} onChange={setConfirmPassword} />
          {error !== "" && <Notice tone="error">{error}</Notice>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              취소
            </Button>
            <Button type="submit">변경</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
