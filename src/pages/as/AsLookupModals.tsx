import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { isAbortError } from "@/lib/apiClient";
import { categoryLabel, searchCustomers, searchProductBySerial, searchTechnicians } from "@/lib/asReceptionApi";
import { formatDate, includesText } from "@/lib/format";
import { addresses } from "@/mocks/screenData";
import type { CustomerSummary, ProductSummary, TechnicianSummary } from "@/types/asReception";

export type LookupKind = "customer" | "serial" | "tech" | "post" | "ai" | null;

interface ApplyPatch {
  customerId?: number | null;
  customerName?: string;
  phone?: string;
  email?: string;
  postalCode?: string;
  address?: string;
  addressDetail?: string;
  productId?: number | null;
  serial?: string;
  productGroup?: string;
  modelName?: string;
  purchasedAt?: string;
  technicianId?: number | null;
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
  const [selected, setSelected] = useState<number | null>(null);
  const [rows, setRows] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const columns: Column<CustomerSummary>[] = [
    { key: "name", header: "고객명", render: (row) => row.name },
    { key: "phone", header: "연락처", render: (row) => row.phone },
    { key: "email", header: "이메일", render: (row) => row.email },
    { key: "address", header: "주소", render: (row) => row.basicAddress ?? "-" },
  ];

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === "") {
      setRows([]);
      setError("");
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      searchCustomers(trimmed, controller.signal)
        .then((items) => {
          if (!controller.signal.aborted) {
            setRows(items);
          }
        })
        .catch((cause: unknown) => {
          if (controller.signal.aborted || isAbortError(cause)) {
            return;
          }
          setRows([]);
          setError(cause instanceof Error ? cause.message : "고객을 조회하지 못했습니다.");
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        });
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <Modal title="고객정보 조회" wide onClose={onClose}>
      <TextField value={query} onChange={setQuery} placeholder="고객명, 연락처, 이메일 검색" className="mb-3 w-64" />
      {error !== "" && <div className="mb-3"><Notice tone="error">{error}</Notice></div>}
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.id)}
        selectedKey={selected === null ? undefined : String(selected)}
        onRowClick={(row) => setSelected(row.id)}
        emptyText={query.trim() === "" ? "고객명, 연락처, 이메일을 입력해 주세요." : loading ? "고객을 조회하는 중입니다." : "조회 결과가 없습니다."}
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>취소</Button>
        <Button
          onClick={() => {
            const row = rows.find((item) => item.id === selected);
            if (row === undefined) return;
            onApply({
              customerId: row.id,
              customerName: row.name,
              phone: row.phone,
              email: row.email,
              postalCode: row.zipcode ?? "",
              address: row.basicAddress ?? "",
              addressDetail: row.detailAddress ?? "",
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
  const [selected, setSelected] = useState<number | null>(null);
  const [rows, setRows] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const columns: Column<ProductSummary>[] = [
    { key: "serial", header: "시리얼번호", render: (row) => row.serialNumber },
    { key: "group", header: "제품군", render: (row) => categoryLabel(row.category) },
    { key: "model", header: "모델명", render: (row) => row.modelName },
    { key: "date", header: "구매일", render: (row) => formatDate(row.purchasedAt) },
  ];

  useEffect(() => {
    const serial = query.trim();
    if (serial === "") {
      setRows([]);
      setError("");
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      searchProductBySerial(serial, controller.signal)
        .then((item) => {
          if (!controller.signal.aborted) {
            setRows(item === null ? [] : [item]);
          }
        })
        .catch((cause: unknown) => {
          if (controller.signal.aborted || isAbortError(cause)) {
            return;
          }
          setRows([]);
          setError(cause instanceof Error ? cause.message : "제품을 조회하지 못했습니다.");
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        });
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <Modal title="시리얼번호 조회" wide onClose={onClose}>
      <TextField value={query} onChange={setQuery} placeholder="시리얼번호 전체 입력" className="mb-3 w-64" />
      {error !== "" && <div className="mb-3"><Notice tone="error">{error}</Notice></div>}
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.id)}
        selectedKey={selected === null ? undefined : String(selected)}
        onRowClick={(row) => setSelected(row.id)}
        emptyText={query.trim() === "" ? "시리얼번호를 입력해 주세요." : loading ? "제품을 조회하는 중입니다." : "조회 결과가 없습니다."}
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>취소</Button>
        <Button
          onClick={() => {
            const row = rows.find((item) => item.id === selected);
            if (row === undefined) return;
            onApply({
              productId: row.id,
              serial: row.serialNumber,
              productGroup: categoryLabel(row.category),
              modelName: row.modelName,
              purchasedAt: row.purchasedAt === null ? "" : row.purchasedAt.slice(0, 10),
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

function TechnicianLookup({ onClose, onApply }: Omit<AsLookupModalsProps, "kind">) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [rows, setRows] = useState<TechnicianSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const columns: Column<TechnicianSummary>[] = [
    { key: "name", header: "이름", render: (row) => row.name },
    { key: "email", header: "이메일", render: (row) => row.email },
    { key: "status", header: "상태", render: (row) => (row.status === "ACTIVE" ? "근무" : "비활성") },
  ];

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      searchTechnicians(query, controller.signal)
        .then((items) => {
          if (!controller.signal.aborted) {
            setRows(items);
          }
        })
        .catch((cause: unknown) => {
          if (controller.signal.aborted || isAbortError(cause)) {
            return;
          }
          setRows([]);
          setError(cause instanceof Error ? cause.message : "기사 목록을 불러오지 못했습니다.");
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        });
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <Modal title="A/S 기사 목록" wide onClose={onClose}>
      <TextField value={query} onChange={setQuery} placeholder="기사 이름 검색" className="mb-3 w-64" />
      {error !== "" && <div className="mb-3"><Notice tone="error">{error}</Notice></div>}
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.id)}
        selectedKey={selected === null ? undefined : String(selected)}
        onRowClick={(row) => setSelected(row.id)}
        emptyText={loading ? "기사 목록을 불러오는 중입니다." : "조회 결과가 없습니다."}
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>취소</Button>
        <Button
          onClick={() => {
            const row = rows.find((item) => item.id === selected);
            if (row === undefined) return;
            onApply({ technicianId: row.id, technician: row.name });
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
                setPurchasedAt("2025-05-14");
                setMessage("영수증에서 구매일을 인식했습니다. 틀린 값은 수정할 수 있습니다.");
              }}
            />
          </label>
        </div>
        <div className="space-y-3">
          <TextField label="구매일" value={purchasedAt} onChange={setPurchasedAt} />
        </div>
      </div>
      {message !== "" && <div className="mt-3"><Notice>{message}</Notice></div>}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>취소</Button>
        <Button
          onClick={() => {
            onApply({ purchasedAt });
            onClose();
          }}
        >
          적용하기
        </Button>
      </div>
    </Modal>
  );
}
