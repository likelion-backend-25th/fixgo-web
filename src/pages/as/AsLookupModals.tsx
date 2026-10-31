import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { includesText } from "@/lib/format";
import { addresses, customers, serials, technicians } from "@/mocks/screenData";

export type LookupKind = "customer" | "serial" | "tech" | "post" | "ai" | null;

interface ApplyPatch {
  customerName?: string;
  phone?: string;
  email?: string;
  postalCode?: string;
  address?: string;
  serial?: string;
  productGroup?: string;
  modelName?: string;
  purchasedAt?: string;
  technician?: string;
}

interface AsLookupModalsProps {
  kind: LookupKind;
  onClose: () => void;
  onApply: (patch: ApplyPatch) => void;
}

export function AsLookupModals({ kind, onClose, onApply }: AsLookupModalsProps) {
  if (kind === null) {
    return null;
  }
  if (kind === "customer") {
    return <CustomerLookup onClose={onClose} onApply={onApply} />;
  }
  if (kind === "serial") {
    return <SerialLookup onClose={onClose} onApply={onApply} />;
  }
  if (kind === "tech") {
    return <TechnicianLookup onClose={onClose} onApply={onApply} />;
  }
  if (kind === "post") {
    return <PostLookup onClose={onClose} onApply={onApply} />;
  }
  return <AiLookup onClose={onClose} onApply={onApply} />;
}

function CustomerLookup({ onClose, onApply }: Omit<AsLookupModalsProps, "kind">) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const rows = customers.filter((row) => includesText(`${row.name} ${row.phone} ${row.email}`, query));
  const columns: Column<(typeof customers)[number]>[] = [
    { key: "name", header: "고객명", render: (row) => row.name },
    { key: "phone", header: "연락처", render: (row) => row.phone },
    { key: "email", header: "이메일", render: (row) => row.email },
    { key: "address", header: "주소", render: (row) => row.address },
  ];
  return (
    <Modal title="고객정보 조회" wide onClose={onClose}>
      <TextField value={query} onChange={setQuery} placeholder="고객명, 연락처 검색" className="mb-3 w-64" />
      <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} selectedKey={selected} onRowClick={(row) => setSelected(row.id)} />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>취소</Button>
        <Button
          onClick={() => {
            const row = customers.find((item) => item.id === selected);
            if (row === undefined) return;
            onApply({
              customerName: row.name,
              phone: row.phone,
              email: row.email,
              postalCode: row.postalCode,
              address: row.address,
            });
            onClose();
          }}
        >
          적용
        </Button>
      </div>
    </Modal>
  );
}

function SerialLookup({ onClose, onApply }: Omit<AsLookupModalsProps, "kind">) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const rows = serials.filter((row) => includesText(row.serial, query));
  const columns: Column<(typeof serials)[number]>[] = [
    { key: "serial", header: "시리얼번호", render: (row) => row.serial },
    { key: "group", header: "제품군", render: (row) => row.group },
    { key: "model", header: "모델명", render: (row) => row.modelName },
    { key: "date", header: "생산일", render: (row) => row.producedAt },
  ];
  return (
    <Modal title="시리얼번호 조회" wide onClose={onClose}>
      <TextField value={query} onChange={setQuery} placeholder="시리얼번호 검색" className="mb-3 w-64" />
      <DataTable columns={columns} rows={rows} rowKey={(row) => row.serial} selectedKey={selected} onRowClick={(row) => setSelected(row.serial)} />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>취소</Button>
        <Button
          onClick={() => {
            const row = serials.find((item) => item.serial === selected);
            if (row === undefined) return;
            onApply({ serial: row.serial, productGroup: row.group, modelName: row.modelName });
            onClose();
          }}
        >
          적용
        </Button>
      </div>
    </Modal>
  );
}

function TechnicianLookup({ onClose, onApply }: Omit<AsLookupModalsProps, "kind">) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const rows = technicians.filter((row) => includesText(row.name, query));
  const columns: Column<(typeof technicians)[number]>[] = [
    { key: "name", header: "이름", render: (row) => row.name },
    { key: "email", header: "이메일", render: (row) => row.email },
    { key: "waiting", header: "점검 대기", render: (row) => `${row.waiting}건` },
    { key: "repairing", header: "수리 진행", render: (row) => `${row.repairing}건` },
    { key: "hours", header: "예상 소요", render: (row) => `${row.hours}시간` },
    { key: "status", header: "상태", render: (row) => row.status },
  ];
  return (
    <Modal title="A/S 기사 목록" wide onClose={onClose}>
      <TextField value={query} onChange={setQuery} placeholder="기사 이름 검색" className="mb-3 w-64" />
      <DataTable columns={columns} rows={rows} rowKey={(row) => row.email} selectedKey={selected} onRowClick={(row) => setSelected(row.email)} />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>취소</Button>
        <Button
          onClick={() => {
            const row = technicians.find((item) => item.email === selected);
            if (row === undefined) return;
            onApply({ technician: row.name });
            onClose();
          }}
        >
          적용하기
        </Button>
      </div>
    </Modal>
  );
}

function PostLookup({ onClose, onApply }: Omit<AsLookupModalsProps, "kind">) {
  const [query, setQuery] = useState("");
  const rows = useMemo(
    () => addresses.filter((row) => includesText(`${row.postalCode} ${row.road} ${row.lot} ${row.building}`, query)),
    [query],
  );
  return (
    <Modal title="우편번호 찾기" wide onClose={onClose}>
      <TextField value={query} onChange={setQuery} placeholder="도로명, 지번, 건물명, 우편번호" className="mb-3" />
      <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200">
        {rows.map((row) => (
          <li key={row.postalCode}>
            <button
              type="button"
              className="w-full px-3 py-3 text-left text-sm hover:bg-neutral-50"
              onClick={() => {
                onApply({ postalCode: row.postalCode, address: row.road });
                onClose();
              }}
            >
              <span className="mr-2 font-medium text-blue-600">{row.postalCode}</span>
              {row.road}
              <span className="mt-1 block text-neutral-500">{row.lot} · {row.building}</span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

function AiLookup({ onClose, onApply }: Omit<AsLookupModalsProps, "kind">) {
  const [preview, setPreview] = useState("");
  const [group, setGroup] = useState("");
  const [modelName, setModelName] = useState("");
  const [purchasedAt, setPurchasedAt] = useState("");
  const [message, setMessage] = useState("");

  return (
    <Modal title="이미지 기반 자동 입력" onClose={onClose}>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="mb-2 grid h-40 place-items-center overflow-hidden rounded border border-dashed border-neutral-300 bg-neutral-50 text-sm text-neutral-500">
            {preview === "" ? "영수증 미리보기" : <img src={preview} alt="영수증 미리보기" className="h-full w-full object-contain" />}
          </div>
          <label className="text-sm text-blue-600">
            이미지 변경
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file === undefined) return;
                setPreview(URL.createObjectURL(file));
                setGroup("스마트폰");
                setModelName("SZ-P24");
                setPurchasedAt("2025-05-14");
                setMessage("영수증에서 제품군, 모델명, 구매일을 인식했습니다. 틀린 값은 수정할 수 있습니다.");
              }}
            />
          </label>
        </div>
        <div className="space-y-3">
          <TextField label="제품군" value={group} onChange={setGroup} />
          <TextField label="모델명" value={modelName} onChange={setModelName} />
          <TextField label="구매일" value={purchasedAt} onChange={setPurchasedAt} />
        </div>
      </div>
      {message !== "" && <div className="mt-3"><Notice>{message}</Notice></div>}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>취소</Button>
        <Button
          onClick={() => {
            onApply({ productGroup: group, modelName, purchasedAt });
            onClose();
          }}
        >
          적용하기
        </Button>
      </div>
    </Modal>
  );
}
