import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SelectBox, TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice, Panel } from "@/components/ui/Panel";
import { fetchReceptions, receptionStatusLabel } from "@/lib/asReceptionApi";
import {
  deleteMember, fetchMember, memberRoleLabel, memberRoles, memberStatusLabel, memberStatuses,
  parseMemberRole, parseMemberStatus, updateMemberProfile, updateMemberRole, updateMemberStatus,
  type MemberDetail, type MemberSummary,
} from "@/lib/memberApi";
import { useSessionStore } from "@/stores/useSessionStore";
import type { AsReceptionListItem } from "@/types/asReception";

export function MemberDetailPage() {
  const { memberId } = useParams();
  const id = Number(memberId);
  if (!Number.isSafeInteger(id) || id < 1) return <Notice tone="error">올바른 직원 ID가 아닙니다.</Notice>;
  return <MemberDetails key={id} id={id} />;
}

function MemberDetails({ id }: { id: number }) {
  const isAdmin = useSessionStore((state) => state.user?.role) === "ADMIN";
  const currentMemberId = useSessionStore((state) => state.memberId);
  const logout = useSessionStore((state) => state.logout);
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchMember(id, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setMember(result); })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "직원 정보를 불러오지 못했습니다.");
        }
      });
    return () => controller.abort();
  }, [id]);

  if (member === null) {
    return error === "" ? <Notice>직원 정보를 불러오는 중입니다.</Notice> : <Notice tone="error">{error}</Notice>;
  }
  const record = member;
  const deleted = record.status === "DELETED";

  async function applyChange(request: () => Promise<MemberSummary | void>, message: string) {
    setPending(true);
    setError("");
    setNotice("");
    try {
      const updated = await request();
      setMember(updated === undefined ? { ...record, status: "DELETED" } : { ...record, ...updated });
      setNotice(message);
      if (currentMemberId === id && (
        updated === undefined || updated.status !== "ACTIVE" || updated.role !== record.role
      )) logout();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "계정 변경에 실패했습니다.");
    } finally {
      setConfirmDelete(false);
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {notice !== "" && <Notice>{notice}</Notice>}
      {error !== "" && <Notice tone="error">{error}</Notice>}
      <Panel title="직원 정보">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {record.profileImgUrl === "" ? (
              <span className="grid size-16 place-items-center rounded-full bg-blue-600 text-xl font-semibold text-white">
                {record.name.slice(0, 1)}
              </span>
            ) : <img src={record.profileImgUrl} alt="" className="size-16 rounded-full object-cover" />}
            <div className="text-sm leading-7">
              <p className="text-lg font-semibold">{record.name}</p>
              <p>{record.email} · {record.phone}</p>
              <p>{record.address || "-"}</p>
              <p>{memberRoleLabel(record.role)} · {memberStatusLabel(record.status)}</p>
            </div>
          </div>
          {isAdmin && !deleted && (
            <div className="flex gap-2">
              <Button variant="outline" disabled={pending} onClick={() => setEditing(true)}>정보 수정</Button>
              <Button variant="ghost" disabled={pending} onClick={() => setConfirmDelete(true)}>직원 삭제</Button>
            </div>
          )}
        </div>
        {isAdmin && (
          <AccountControls key={`${record.role}:${record.status}`} member={record} pending={pending}
            onStatus={(status) => void applyChange(() => updateMemberStatus(record.email, status), "직원 상태를 변경했습니다.")}
            onRole={(role) => void applyChange(() => updateMemberRole(record.email, role), "직원 역할을 변경했습니다.")}
          />
        )}
      </Panel>
      <AssignedReceptions memberId={id} />
      {editing && (
        <EditProfile member={record} onClose={() => setEditing(false)} onSaved={(updated) => {
          setMember(updated);
          setEditing(false);
          setError("");
          setNotice("직원 정보를 저장했습니다.");
        }} />
      )}
      {confirmDelete && (
        <Modal title="직원 삭제" compact onClose={() => { if (!pending) setConfirmDelete(false); }}>
          <p className="mb-4 text-sm">{record.name} 직원의 계정을 삭제하시겠습니까?</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" disabled={pending} onClick={() => setConfirmDelete(false)}>취소</Button>
            <Button disabled={pending} onClick={() => void applyChange(() => deleteMember(id), "직원 계정을 삭제했습니다.")}>삭제</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AccountControls({ member, pending, onStatus, onRole }: {
  member: MemberDetail;
  pending: boolean;
  onStatus: (status: MemberSummary["status"]) => void;
  onRole: (role: MemberSummary["role"]) => void;
}) {
  const [status, setStatus] = useState(member.status);
  const [role, setRole] = useState(member.role);
  const deleted = member.status === "DELETED";
  return (
    <div className="mt-4 flex flex-wrap gap-3 border-t border-neutral-200 pt-4">
      {!deleted && (
        <div className="flex items-center gap-2">
          <SelectBox aria-label="직원 역할" value={role} options={[...memberRoles]} disabled={pending}
            onChange={(value) => { const next = parseMemberRole(value); if (next !== undefined) setRole(next); }} />
          <Button variant="outline" disabled={pending || role === member.role} onClick={() => onRole(role)}>역할 변경</Button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <SelectBox aria-label="직원 상태" value={status} disabled={pending}
          options={memberStatuses.filter((option) => option.value === "ACTIVE"
            || (deleted ? option.value === "DELETED" : option.value === "INACTIVE"))}
          onChange={(value) => { const next = parseMemberStatus(value); if (next !== undefined) setStatus(next); }} />
        <Button variant="outline" disabled={pending || status === member.status} onClick={() => onStatus(status)}>상태 변경</Button>
      </div>
    </div>
  );
}

const receptionColumns: Column<AsReceptionListItem>[] = [
  { key: "receptionNumber", header: "접수번호", render: (row) => (
    <Link className="text-blue-600" to={`/as/details/${row.id}`}>{row.receptionNumber}</Link>
  ) },
  { key: "customer", header: "고객명", render: (row) => row.customerName },
  { key: "model", header: "모델명", render: (row) => row.modelName ?? "-" },
  { key: "status", header: "상태", render: (row) => receptionStatusLabel(row.receptionStatus) },
];

function AssignedReceptions({ memberId }: { memberId: number }) {
  const [rows, setRows] = useState<AsReceptionListItem[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetchReceptions({ keyword: "", status: null, technicianId: memberId, page: 1, size: 10, sort: "createdAt,desc" }, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setRows(result.items); })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "배정된 A/S 목록을 불러오지 못했습니다.");
        }
      });
    return () => controller.abort();
  }, [memberId]);
  return (
    <Panel title="최근 배정된 A/S">
      {error !== "" ? <Notice tone="error">{error}</Notice> : (
        <DataTable columns={receptionColumns} rows={rows ?? []} rowKey={(row) => String(row.id)}
          emptyText={rows === null ? "배정 이력을 불러오는 중입니다." : "배정된 A/S가 없습니다."} />
      )}
    </Panel>
  );
}

function EditProfile({ member, onClose, onSaved }: {
  member: MemberDetail;
  onClose: () => void;
  onSaved: (member: MemberDetail) => void;
}) {
  const [form, setForm] = useState(member);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function save() {
    if (form.name.trim() === "" || form.phone.trim() === "") {
      setError("이름과 전화번호를 입력해 주세요.");
      return;
    }
    setPending(true);
    setError("");
    try {
      onSaved(await updateMemberProfile({
        email: form.email, name: form.name.trim(), phone: form.phone.trim(),
        address: form.address.trim(), profileImgUrl: form.profileImgUrl.trim(),
      }));
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "직원 정보를 저장하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }
  return (
    <Modal title="직원 정보 수정" onClose={() => { if (!pending) onClose(); }}>
      <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <TextField label="이메일" value={form.email} readOnly onChange={() => {}} />
        <TextField label="이름" value={form.name} onChange={(name) => setForm({ ...form, name })} />
        <TextField label="전화번호" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
        <TextField label="주소" value={form.address} onChange={(address) => setForm({ ...form, address })} />
        <TextField label="프로필 사진 URL" value={form.profileImgUrl}
          onChange={(profileImgUrl) => setForm({ ...form, profileImgUrl })} />
        {error !== "" && <Notice tone="error">{error}</Notice>}
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>{pending ? "저장 중…" : "저장"}</Button>
        </div>
      </form>
    </Modal>
  );
}
