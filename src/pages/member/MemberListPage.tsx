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
import { useListParams } from "@/hooks/useListParams";
import { fetchMembers, issueMember, memberRoleLabel, memberRoles, memberStatusLabel, parseMemberRole, type MemberRole, type MemberSummary } from "@/lib/memberApi";
import { useSessionStore } from "@/stores/useSessionStore";

export function MemberListPage() {
  const navigate = useNavigate();
  const filters = useListParams();
  const role = useSessionStore((state) => state.user?.role);
  const query = filters.text("q");
  const roleFilter = parseMemberRole(filters.text("role")) ?? "";
  const sortKey = filters.text("sort", "name");
  const sortDir = filters.text("dir") === "desc" ? "desc" : "asc";
  const page = filters.page();
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
  const pageCount = Math.max(1, Math.ceil(filtered.length / 20));
  const safePage = Math.min(page, pageCount);
  const slice = filtered.slice((safePage - 1) * 20, safePage * 20);

  const columns: Column<MemberSummary>[] = [
    {
      key: "name",
      header: "이름",
      sortable: true,
      className: "px-4 text-left",
      render: (row) => <span className="text-[#005A9C]">{row.name}</span>,
    },
    { key: "email", header: "이메일", sortable: true, className: "px-4 text-left", render: (row) => row.email },
    {
      key: "role",
      header: "역할",
      sortable: true,
      className: "px-4 text-center",
      render: (row) => <span className="text-[#1E293B]">{memberRoleLabel(row.role)}</span>,
    },
    {
      key: "status",
      header: "상태",
      sortable: true,
      className: "px-4 text-center",
      render: (row) => <span className={statusColor(row.status)}>{memberStatusLabel(row.status)}</span>,
    },
  ];

  return (
    <div className="member-list-page">
      {notice !== "" && <Notice transient onDismiss={() => setNotice("")}>{notice}</Notice>}
      {error !== "" && <Notice tone="error">{error}</Notice>}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TextField
          value={query}
          onChange={(value) => filters.replace({ q: value, page: null })}
          placeholder="이름, 이메일 검색"
          className="w-64"
        />
        <SelectBox
          value={roleFilter}
          onChange={(value) => filters.replace({ role: parseMemberRole(value) ?? null, page: null })}
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
        rows={slice}
        rowKey={(row) => String(row.id)}
        emptyText={loading ? "직원 목록을 불러오는 중입니다." : error !== "" ? "직원 목록을 불러오지 못했습니다." : "조회 결과가 없습니다."}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={(key) => {
          const nextDir = sortKey === key ? (sortDir === "asc" ? "desc" : "asc") : "asc";
          filters.replace({
            sort: key === "name" ? null : key,
            dir: nextDir === "asc" ? null : nextDir,
            page: null,
          });
        }}
        onRowClick={(row) => navigate(`/member/${row.id}`)}
      />
      <Pagination page={safePage} pageCount={pageCount} onPageChange={filters.setPage} />
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

function statusColor(status: MemberSummary["status"]): string {
  return status === "ACTIVE" ? "text-[#15803D]" : "text-[#DC2626]";
}

function IssueAccountModal({ onClose, onIssued }: { onClose: () => void; onIssued: (member: MemberSummary) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [role, setRole] = useState<MemberRole>("ROLE_RECEPTIONIST");
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
        address: address.trim(), role, profileImgUrl: "",
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
        {error !== "" && <Notice tone="error">{error}</Notice>}
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>{pending ? "발급 중…" : "계정 발급"}</Button>
        </div>
      </form>
    </Modal>
  );
}
