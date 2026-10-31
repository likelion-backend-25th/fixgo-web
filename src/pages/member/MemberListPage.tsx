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

const issueRoles = [
  { value: "관리자", label: "관리자" },
  { value: "접수담당자", label: "접수담당자" },
  { value: "수리기사", label: "A/S 기사" },
  { value: "매니저", label: "매니저" },
];

function IssueAccountModal({ onClose, onIssued }: { onClose: () => void; onIssued: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("접수담당자");
  const [photo, setPhoto] = useState("");
  const [error, setError] = useState("");

  return (
    <Modal title="계정 발급" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (email.trim() === "" || password.trim() === "" || name.trim() === "" || phone.trim() === "") {
            setError("이메일, 초기 비밀번호, 이름, 연락처를 입력해 주세요.");
            return;
          }
          onIssued();
        }}
      >
        <TextField label="이메일" value={email} onChange={setEmail} />
        <TextField label="초기 비밀번호" type="password" value={password} onChange={setPassword} />
        <TextField label="이름" value={name} onChange={setName} />
        <TextField label="연락처" value={phone} onChange={setPhone} />
        <fieldset>
          <legend className="sr-only">역할</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {issueRoles.map((option) => (
              <label key={option.value} className="flex items-center gap-1.5">
                <input type="radio" name="issue-role" checked={role === option.value} onChange={() => setRole(option.value)} />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <p className="mb-2 text-sm">프로필 사진</p>
          <div className="flex items-center gap-4">
            <label className="flex w-28 cursor-pointer flex-col items-center rounded border border-dashed border-neutral-300 px-2 py-3 text-center">
              {photo !== "" ? (
                <img src={photo} alt="" className="size-14 rounded-full object-cover" />
              ) : (
                <span className="grid size-14 place-items-center rounded-full border border-neutral-300 text-2xl text-neutral-400">+</span>
              )}
              <span className="mt-2 text-xs">사진 등록</span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file !== undefined) {
                    setPhoto(URL.createObjectURL(file));
                  }
                }}
              />
            </label>
            <p className="text-sm text-neutral-500">직원의 프로필 사진을 등록합니다.</p>
          </div>
        </div>
        {error !== "" && <Notice tone="error">{error}</Notice>}
        <div className="flex justify-end">
          <Button type="submit">계정 발급</Button>
        </div>
      </form>
    </Modal>
  );
}
