import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SelectBox, TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { compareText } from "@/lib/guards";
import { includesText } from "@/lib/format";
import { usePageSlice } from "@/lib/usePageSlice";
import { members } from "@/mocks/screenData";
import { useSessionStore } from "@/stores/useSessionStore";
import type { MemberRecord } from "@/types/screen";

export function MemberListPage() {
  const navigate = useNavigate();
  const role = useSessionStore((state) => state.user?.role);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("전체");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const filtered = useMemo(() => {
    const rows = members.filter((row) => {
      const matched = includesText(row.name, query) || includesText(row.email, query);
      const matchedRole = roleFilter === "전체" || row.role.includes(roleFilter);
      return matched && matchedRole;
    });
    return [...rows].sort((left, right) => {
      const result = compareText(textOf(left, sortKey), textOf(right, sortKey));
      return sortDir === "asc" ? result : -result;
    });
  }, [query, roleFilter, sortDir, sortKey]);
  const table = usePageSlice(filtered);

  const columns: Column<MemberRecord>[] = [
    { key: "name", header: "이름", sortable: true, render: (row) => row.name },
    { key: "email", header: "이메일", sortable: true, render: (row) => row.email },
    { key: "role", header: "역할", sortable: true, render: (row) => row.role },
    { key: "status", header: "상태", sortable: true, render: (row) => row.status },
  ];

  return (
    <div>
      {notice !== "" && <Notice>{notice}</Notice>}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TextField
          value={query}
          onChange={(value) => {
            setQuery(value);
            table.setPage(1);
          }}
          placeholder="이름, 이메일 검색"
          className="w-64"
        />
        <SelectBox
          value={roleFilter}
          onChange={(value) => {
            setRoleFilter(value);
            table.setPage(1);
          }}
          options={["전체", "관리자", "접수담당자", "수리기사", "매니저"].map((value) => ({
            value,
            label: value === "전체" ? "역할 전체" : value,
          }))}
        />
        {role === "ADMIN" && (
          <Button className="ml-auto" onClick={() => setOpen(true)}>
            계정 발급
          </Button>
        )}
      </div>
      <DataTable
        columns={columns}
        rows={table.slice}
        rowKey={(row) => row.id}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={(key) => {
          if (sortKey === key) {
            setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
            return;
          }
          setSortKey(key);
          setSortDir("asc");
        }}
        onRowClick={(row) => navigate(`/member/${row.id}`)}
      />
      <Pagination page={table.page} pageCount={table.pageCount} onPageChange={table.setPage} />
      {open && (
        <IssueAccountModal
          onClose={() => setOpen(false)}
          onIssued={() => {
            setOpen(false);
            setNotice("계정이 발급되었습니다. 화면 구성용이라 목록에는 반영되지 않습니다.");
          }}
        />
      )}
    </div>
  );
}

function textOf(row: MemberRecord, key: string): string {
  if (key === "email") return row.email;
  if (key === "role") return row.role;
  if (key === "status") return row.status;
  return row.name;
}

function IssueAccountModal({ onClose, onIssued }: { onClose: () => void; onIssued: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit() {
    if (name.trim() === "" || email.trim() === "" || password.trim() === "") {
      setError("이름, 이메일, 초기 비밀번호를 입력해 주세요.");
      return;
    }
    onIssued();
  }

  return (
    <Modal title="계정 발급" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <TextField label="이름" value={name} onChange={setName} />
        <TextField label="이메일" value={email} onChange={setEmail} />
        <TextField label="연락처" value={phone} onChange={setPhone} />
        <TextField label="초기 비밀번호" type="password" value={password} onChange={setPassword} />
        <label className="block text-sm">
          <span className="mb-1 block">프로필 사진</span>
          <input type="file" accept="image/*" className="text-sm" />
        </label>
        {error !== "" && <Notice tone="error">{error}</Notice>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button type="submit">계정 발급</Button>
        </div>
      </form>
    </Modal>
  );
}
