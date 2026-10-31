import { useState } from "react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { TextField } from "@/components/ui/Field";
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
        <EditMemberModal
          name={name}
          email={email}
          phone={phone}
          role={role}
          status={status}
          onClose={() => setEditing(false)}
          onSave={(next) => {
            setName(next.name);
            setEmail(next.email);
            setPhone(next.phone);
            setRole(next.role);
            setStatus(next.status);
            setEditing(false);
            setNotice("직원 정보를 저장했습니다.");
          }}
        />
      )}
    </div>
  );
}

const roleChoices = [
  { value: "관리자", label: "관리자" },
  { value: "접수담당자", label: "접수담당자" },
  { value: "수리기사", label: "A/S 기사" },
  { value: "매니저", label: "매니저" },
];

function EditMemberModal({
  name,
  email,
  phone,
  role,
  status,
  onClose,
  onSave,
}: {
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  onClose: () => void;
  onSave: (next: { name: string; email: string; phone: string; role: string; status: string }) => void;
}) {
  const [nextName, setNextName] = useState(name);
  const [nextEmail, setNextEmail] = useState(email);
  const [nextPhone, setNextPhone] = useState(phone);
  const [nextRole, setNextRole] = useState(role);
  const [nextStatus, setNextStatus] = useState(status);
  const [photo, setPhoto] = useState("");
  const [error, setError] = useState("");

  return (
    <Modal title="직원 정보 수정" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (nextName.trim() === "" || nextEmail.trim() === "" || nextPhone.trim() === "") {
            setError("이름, 이메일, 전화번호를 입력해 주세요.");
            return;
          }
          onSave({
            name: nextName.trim(),
            email: nextEmail.trim(),
            phone: nextPhone.trim(),
            role: nextRole,
            status: nextStatus,
          });
        }}
      >
        <p className="text-sm text-neutral-500">이름, 이메일, 전화번호, 역할, 상태를 수정합니다.</p>
        <PhotoField
          letter={nextName.slice(0, 1)}
          preview={photo}
          action="사진 변경"
          hint="프로필 사진을 변경할 수 있습니다."
          onPick={setPhoto}
        />
        <TextField label="이름" value={nextName} onChange={setNextName} />
        <TextField label="이메일" value={nextEmail} onChange={setNextEmail} />
        <TextField label="전화번호" value={nextPhone} onChange={setNextPhone} />
        <ChoiceGroup label="역할" value={nextRole} options={roleChoices} onChange={setNextRole} />
        <ChoiceGroup
          label="상태"
          value={nextStatus}
          options={["사용", "휴가", "삭제"].map((value) => ({ value, label: value }))}
          onChange={setNextStatus}
        />
        {error !== "" && <Notice tone="error">{error}</Notice>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button type="submit">저장</Button>
        </div>
      </form>
    </Modal>
  );
}

function ChoiceGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm">{label}</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-1.5">
            <input type="radio" name={label} checked={value === option.value} onChange={() => onChange(option.value)} />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function PhotoField({
  letter,
  preview,
  action,
  hint,
  onPick,
}: {
  letter: string;
  preview: string;
  action: string;
  hint: string;
  onPick: (url: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm">프로필 사진</p>
      <div className="flex items-center gap-4">
        <label className="flex w-28 cursor-pointer flex-col items-center rounded border border-dashed border-neutral-300 px-2 py-3 text-center">
          {preview !== "" ? (
            <img src={preview} alt="" className="size-14 rounded-full object-cover" />
          ) : letter !== "" ? (
            <span className="grid size-14 place-items-center rounded-full bg-blue-600 text-lg font-semibold text-white">{letter}</span>
          ) : (
            <span className="grid size-14 place-items-center rounded-full border border-neutral-300 text-2xl text-neutral-400">+</span>
          )}
          <span className="mt-2 text-xs">{action}</span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file !== undefined) {
                onPick(URL.createObjectURL(file));
              }
            }}
          />
        </label>
        <p className="text-sm text-neutral-500">{hint}</p>
      </div>
    </div>
  );
}
