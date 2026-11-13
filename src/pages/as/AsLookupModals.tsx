import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { isAbortError } from "@/lib/apiClient";
import { categoryLabel, fetchAssignableTechnicians, searchProductsBySerialPage } from "@/lib/asReceptionApi";
import { searchCustomersPage } from "@/lib/customerApi";
import { formatDurationMinutes } from "@/lib/format";
import { embedDaumPostcode, selectedAddress } from "@/lib/daumPostcode";
import type { AssignableTechnician, CustomerSummary, ProductSummary, TechnicianSort } from "@/types/asReception";

export type LookupKind = "customer" | "serial" | "tech" | "post" | null;

interface ApplyPatch {
  customerId?: number | null;
  customerName?: string;
  phone?: string;
  email?: string;
  postalCode?: string;
  address?: string;
  addressDetail?: string;
  productId?: number | null;
  productModelId?: number | null;
  serial?: string;
  productGroup?: string;
  modelName?: string;
  purchasedAt?: string;
  purchasedAtLocked?: boolean;
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
  return <PostLookup onClose={onClose} onApply={onApply} />;
}

function CustomerLookup({ onClose, onApply }: Pick<AsLookupModalsProps, "onClose" | "onApply">) {
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const [rows, setRows] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const columns: Column<CustomerSummary>[] = [
    { key: "name", header: "고객명", render: (row) => row.name },
    { key: "phone", header: "연락처", render: (row) => row.phone },
    { key: "email", header: "이메일", render: (row) => row.email },
    { key: "address", header: "주소", render: (row) => row.basicAddress ?? "-" },
  ];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = query.trim();
      setApplied((current) => {
        if (current === next) {
          return current;
        }
        setPage(1);
        setSelected(null);
        return next;
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    searchCustomersPage({ keyword: applied, page, size: 20 }, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) {
          return;
        }
        setRows(result.items);
        setPageCount(Math.max(1, result.totalPages));
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || isAbortError(cause)) {
          return;
        }
        setRows([]);
        setPageCount(1);
        setError(cause instanceof Error ? cause.message : "고객을 조회하지 못했습니다.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [applied, page]);

  function apply(row: CustomerSummary) {
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
  }

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
        onRowDoubleClick={apply}
        emptyText={loading ? "고객을 조회하는 중입니다." : "조회 결과가 없습니다."}
      />
      <Pagination page={page} pageCount={pageCount} onPageChange={(next) => {
        setSelected(null);
        setPage(next);
      }} />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>취소</Button>
        <Button
          onClick={() => {
            const row = rows.find((item) => item.id === selected);
            if (row === undefined) return;
            apply(row);
          }}
        >
          적용
        </Button>
      </div>
    </Modal>
  );
}

function SerialLookup({ onClose, onApply }: Pick<AsLookupModalsProps, "onClose" | "onApply">) {
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const [rows, setRows] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const columns: Column<ProductSummary>[] = [
    { key: "serial", header: "시리얼번호", render: (row) => row.serialNumber },
    { key: "group", header: "제품군", render: (row) => categoryLabel(row.category) },
    { key: "model", header: "모델명", render: (row) => row.modelName },
  ];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = query.trim();
      setApplied((current) => {
        if (current === next) {
          return current;
        }
        setPage(1);
        setSelected(null);
        return next;
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    searchProductsBySerialPage(applied, page, 20, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) {
          return;
        }
        setRows(result.items);
        setPageCount(Math.max(1, result.totalPages));
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || isAbortError(cause)) {
          return;
        }
        setRows([]);
        setPageCount(1);
        setError(cause instanceof Error ? cause.message : "제품을 조회하지 못했습니다.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [applied, page]);

  function apply(row: ProductSummary) {
    const purchasedAt = row.purchasedAt?.slice(0, 10) ?? "";
    onApply({
      productId: row.id,
      productModelId: row.productModelId,
      serial: row.serialNumber,
      productGroup: categoryLabel(row.category),
      modelName: row.modelName,
      // 저장된 구매일이 있으면 채우고 수정을 막는다. 없으면 직접 입력할 수 있게 연다.
      purchasedAt,
      purchasedAtLocked: purchasedAt !== "",
    });
    onClose();
  }

  return (
    <Modal title="시리얼번호 조회" wide onClose={onClose}>
      <TextField value={query} onChange={setQuery} placeholder="시리얼번호 일부 입력" className="mb-3 w-64" />
      {error !== "" && <div className="mb-3"><Notice tone="error">{error}</Notice></div>}
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.id)}
        selectedKey={selected === null ? undefined : String(selected)}
        onRowClick={(row) => setSelected(row.id)}
        onRowDoubleClick={apply}
        emptyText={loading ? "제품을 조회하는 중입니다." : "조회 결과가 없습니다."}
      />
      <Pagination page={page} pageCount={pageCount} onPageChange={(next) => {
        setSelected(null);
        setPage(next);
      }} />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>취소</Button>
        <Button
          onClick={() => {
            const row = rows.find((item) => item.id === selected);
            if (row === undefined) return;
            apply(row);
          }}
        >
          적용
        </Button>
      </div>
    </Modal>
  );
}

type TechnicianSortKey = "name" | "inspectionWaitingCount" | "repairInProgressCount" | "estimatedDurationMinutes";

function technicianSortBy(key: TechnicianSortKey): TechnicianSort {
  if (key === "inspectionWaitingCount") {
    return "INSPECTION_WAITING_COUNT";
  }
  if (key === "repairInProgressCount") {
    return "REPAIR_IN_PROGRESS_COUNT";
  }
  if (key === "estimatedDurationMinutes") {
    return "ESTIMATED_DURATION_MINUTES";
  }
  return "NAME";
}

function isTechnicianSortKey(value: string): value is TechnicianSortKey {
  return value === "name"
    || value === "inspectionWaitingCount"
    || value === "repairInProgressCount"
    || value === "estimatedDurationMinutes";
}

function TechnicianLookup({ onClose, onApply }: Pick<AsLookupModalsProps, "onClose" | "onApply">) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [rows, setRows] = useState<AssignableTechnician[]>([]);
  const [sortKey, setSortKey] = useState<TechnicianSortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const columns: Column<AssignableTechnician>[] = [
    { key: "name", header: "이름", sortable: true, render: (row) => row.name },
    { key: "email", header: "이메일", render: (row) => row.email },
    { key: "inspectionWaitingCount", header: "점검 대기", sortable: true, render: (row) => `${row.inspectionWaitingCount}건` },
    { key: "repairInProgressCount", header: "수리 진행", sortable: true, render: (row) => `${row.repairInProgressCount}건` },
    {
      key: "estimatedDurationMinutes",
      header: "예상 소요시간",
      sortable: true,
      render: (row) => formatDurationMinutes(row.estimatedDurationMinutes),
    },
  ];

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      fetchAssignableTechnicians(query, technicianSortBy(sortKey), sortDir === "asc" ? "ASC" : "DESC", controller.signal)
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
  }, [query, sortDir, sortKey]);

  function onSort(key: string) {
    if (!isTechnicianSortKey(key)) {
      return;
    }
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "name" ? "asc" : "desc");
  }

  function apply(row: AssignableTechnician) {
    onApply({ technicianId: row.id, technician: row.name });
    onClose();
  }

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
        onRowDoubleClick={apply}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
        emptyText={loading ? "기사 목록을 불러오는 중입니다." : "조회 결과가 없습니다."}
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>취소</Button>
        <Button
          onClick={() => {
            const row = rows.find((item) => item.id === selected);
            if (row === undefined) return;
            apply(row);
          }}
        >
          적용하기
        </Button>
      </div>
    </Modal>
  );
}

function PostLookup({ onClose, onApply }: Pick<AsLookupModalsProps, "onClose" | "onApply">) {
  const frameRef = useRef<HTMLDivElement>(null);
  const onApplyRef = useRef(onApply);
  const onCloseRef = useRef(onClose);
  const [error, setError] = useState("");
  onApplyRef.current = onApply;
  onCloseRef.current = onClose;

  useEffect(() => {
    const frame = frameRef.current;
    if (frame === null) {
      return;
    }
    let cancelled = false;
    embedDaumPostcode(frame, {
      width: "100%",
      height: "100%",
      oncomplete: (data) => {
        onApplyRef.current({
          postalCode: data.zonecode,
          address: selectedAddress(data),
        });
        onCloseRef.current();
      },
    })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "카카오 우편번호 서비스를 불러오지 못했습니다.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Modal title="우편번호 찾기" wide onClose={onClose}>
      {error !== "" && <Notice tone="error">{error}</Notice>}
      <div ref={frameRef} className="h-[460px] overflow-hidden rounded-xl border border-neutral-200" />
      <p className="mt-3 text-xs text-neutral-500">주소를 고르면 우편번호와 기본 주소가 입력됩니다. 상세 주소는 직접 입력합니다.</p>
    </Modal>
  );
}

