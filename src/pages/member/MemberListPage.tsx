import { useEffect, useMemo, useState } from "react";
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
import { fetchMembers, issueMember, memberRoleLabel, memberRoles, memberStatusLabel, parseMemberRole, type MemberRole, type MemberSummary } from "@/lib/memberApi";
import { useSessionStore } from "@/stores/useSessionStore";

export function MemberListPage() {
  const navigate = useNavigate();
  const role = useSessionStore((state) => state.user?.role);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<MemberRole | "">("");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetchMembers(controller.signal)
      .then((rows) => { if (!controller.signal.aborted) setMembers(rows); })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "직원 목록을 불러오지 못했습니다.");
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const filtered = useMemo(() => {
    const rows = members.filter((row) => {
      const matched = includesText(row.name, query) || includesText(row.email, query);
      const matchedRole = roleFilter === "" || row.role === roleFilter;
      return matched && matchedRole;
    });
    return [...rows].sort((left, right) => {
      const result = compareText(textOf(left, sortKey), textOf(right, sortKey));
      return sortDir === "asc" ? result : -result;
    });
  }, [members, query, roleFilter, sortDir, sortKey]);
  const table = usePageSlice(filtered);

  const columns: Column<MemberSummary>[] = [
    { key: "name", header: "이름", sortable: true, render: (row) => row.name },
    { key: "email", header: "이메일", sortable: true, render: (row) => row.email },
    { key: "role", header: "역할", sortable: true, render: (row) => memberRoleLabel(row.role) },
    { key: "status", header: "상태", sortable: true, render: (row) => memberStatusLabel(row.status) },
  ];

  return (
    <div>
      {notice !== "" && <Notice>{notice}</Notice>}
      {error !== "" && <Notice tone="error">{error}</Notice>}
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
            setRoleFilter(parseMemberRole(value) ?? "");
            table.setPage(1);
          }}
          options={[{ value: "", label: "역할 전체" }, ...memberRoles]}
        />
        {role === "ADMIN" && (
          <Button className="ml-auto" disabled={loading} onClick={() => setOpen(true)}>
            계정 발급
          </Button>
        )}
      </div>
      <DataTable
        columns={columns}
        rows={table.slice}
        rowKey={(row) => String(row.id)}
        emptyText={loading ? "직원 목록을 불러오는 중입니다." : error !== "" ? "직원 목록을 불러오지 못했습니다." : "조회 결과가 없습니다."}
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
          onIssued={(member) => {
            setMembers((rows) => [...rows.filter((row) => row.id !== member.id), member]);
            setOpen(false);
            setNotice("계정이 발급되었습니다.");
          }}
        />
      )}
    </div>
  );
}

function textOf(row: MemberSummary, key: string): string {
  if (key === "email") return row.email;
  if (key === "role") return memberRoleLabel(row.role);
  if (key === "status") return memberStatusLabel(row.status);
  return row.name;
}

function IssueAccountModal({ onClose, onIssued }: { onClose: () => void; onIssued: (member: MemberSummary) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [role, setRole] = useState<MemberRole>("ROLE_RECEPTIONIST");
  const [profileImgUrl, setProfileImgUrl] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function issue() {
    if (email.trim() === "" || password.trim() === "" || name.trim() === "" || phone.trim() === "") {
      setError("이메일, 초기 비밀번호, 이름, 연락처를 입력해 주세요.");
      return;
    }
    setPending(true);
    setError("");
    try {
      onIssued(await issueMember({
        email: email.trim(), password, name: name.trim(), phone: phone.trim(),
        address: address.trim(), role, profileImgUrl: profileImgUrl.trim(),
      }));
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "계정을 발급하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal title="계정 발급" onClose={() => { if (!pending) onClose(); }}>
      <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void issue(); }}>
        <TextField label="이메일" type="email" value={email} onChange={setEmail} />
        <TextField label="초기 비밀번호" type="password" value={password} onChange={setPassword} />
        <TextField label="이름" value={name} onChange={setName} />
        <TextField label="연락처" value={phone} onChange={setPhone} />
        <TextField label="주소" value={address} onChange={setAddress} />
        <SelectBox aria-label="역할" value={role} options={[...memberRoles]}
          onChange={(value) => { const next = parseMemberRole(value); if (next !== undefined) setRole(next); }} />
        <TextField label="프로필 사진 URL" type="url" value={profileImgUrl} onChange={setProfileImgUrl} />
        {error !== "" && <Notice tone="error">{error}</Notice>}
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>{pending ? "발급 중…" : "계정 발급"}</Button>
        </div>
      </form>
    </Modal>
  );
}
