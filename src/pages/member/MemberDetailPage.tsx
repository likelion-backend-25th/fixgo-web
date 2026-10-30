import { useState } from "react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SelectBox, TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { asRecords, members } from "@/mocks/screenData";
import { useSessionStore } from "@/stores/useSessionStore";

export function MemberDetailPage() {
  const { memberId } = useParams();
  const source = members.find((row) => row.id === memberId);
  const isAdmin = useSessionStore((state) => state.user?.role) === "ADMIN";
  const [status, setStatus] = useState(source?.status ?? "사용");
  const [name, setName] = useState(source?.name ?? "");
  const [email, setEmail] = useState(source?.email ?? "");
  const [phone, setPhone] = useState(source?.phone ?? "");
  const [role, setRole] = useState(source?.role ?? "접수담당자");
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");

  if (source === undefined) {
    return <Notice tone="error">직원 정보를 찾을 수 없습니다.</Notice>;
  }

  const recent = asRecords.filter((row) => row.receptionist === source.name || row.technician === source.name);
  const columns: Column<(typeof recent)[number]>[] = [
    { key: "id", header: "접수번호", render: (row) => <Link className="text-blue-600" to={`/as/details/${row.id}`}>{row.id}</Link> },
    { key: "customer", header: "고객명", render: (row) => row.customerName },
    { key: "model", header: "제품명", render: (row) => row.modelName },
    { key: "symptom", header: "고장 증상", render: (row) => row.symptom },
    { key: "date", header: "접수일", render: (row) => row.receivedAt },
  ];

  return (
    <div className="space-y-4">
      {notice !== "" && <Notice>{notice}</Notice>}
      {status === "삭제" && <Notice tone="error">이 직원은 삭제 상태입니다. 기존 A/S 이력은 유지됩니다.</Notice>}
      <section className="rounded border border-neutral-300 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid size-16 place-items-center rounded-full bg-blue-600 text-xl font-semibold text-white">
              {name.slice(0, 1)}
            </span>
            <div className="text-sm leading-7">
              <p className="text-lg font-semibold">{name}</p>
              <p>{email}</p>
              <p>{phone}</p>
              <p>역할 {role}</p>
              <p>상태 {status}</p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditing(true)}>
                정보 수정
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setStatus("삭제");
                  setNotice("직원 상태를 삭제로 변경했습니다. 접수 이력은 그대로 둡니다.");
                }}
              >
                직원 삭제
              </Button>
            </div>
          )}
        </div>
      </section>
      <h2 className="text-sm font-semibold text-neutral-700">최근 접수한 A/S</h2>
      <DataTable columns={columns} rows={recent} rowKey={(row) => row.id} emptyText="최근 접수 이력이 없습니다." />
      {editing && (
        <Modal title="직원 정보 수정" onClose={() => setEditing(false)}>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              setEditing(false);
              setNotice("직원 정보를 저장했습니다.");
            }}
          >
            <TextField label="이름" value={name} onChange={setName} />
            <TextField label="이메일" value={email} onChange={setEmail} />
            <TextField label="전화번호" value={phone} onChange={setPhone} />
            <label className="block text-sm">
              <span className="mb-1 block">역할</span>
              <SelectBox
                value={role}
                onChange={setRole}
                options={["관리자", "접수담당자", "수리기사", "매니저"].map((value) => ({ value, label: value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block">상태</span>
              <SelectBox
                value={status}
                onChange={setStatus}
                options={["사용", "휴가", "중지", "삭제"].map((value) => ({ value, label: value }))}
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(false)}>
                취소
              </Button>
              <Button type="submit">저장</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
