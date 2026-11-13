import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useListParams } from "@/hooks/useListParams";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { isAbortError } from "@/lib/apiClient";
import {
  createCustomersBulk,
  downloadCustomerTemplate,
  searchCustomersPage,
  validateCustomerBulk,
} from "@/lib/customerApi";
import { formatDate } from "@/lib/format";
import type {
  CustomerBulkCreateItem,
  CustomerBulkRow,
  CustomerDetail,
} from "@/types/customer";

const PAGE_SIZE = 20;
const columnCell = "px-4 text-left";

export function CustomerListPage() {
  const navigate = useNavigate();
  const filters = useListParams();
  const query = filters.text("q");
  const page = filters.page();
  const [appliedKeyword, setAppliedKeyword] = useState(query.trim());
  const [rows, setRows] = useState<CustomerDetail[]>([]);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = query.trim();
      setAppliedKeyword((current) => {
        if (current === next) return current;
        return next;
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    searchCustomersPage(
      { keyword: appliedKeyword, page, size: PAGE_SIZE },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        setRows(result.items);
        setPageCount(Math.max(1, result.totalPages));
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || isAbortError(cause)) return;
        setRows([]);
        setPageCount(1);
        setError(cause instanceof Error ? cause.message : "고객 목록을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [appliedKeyword, page, reloadKey]);

  const columns: Column<CustomerDetail>[] = [
    {
      key: "name",
      header: "고객명",
      width: "18%",
      className: columnCell,
      render: (row) => <span className="text-[#005A9C]">{row.name}</span>,
    },
    { key: "phone", header: "연락처", width: "24%", className: columnCell, render: (row) => row.phone },
    { key: "email", header: "이메일", width: "38%", className: columnCell, render: (row) => row.email },
    { key: "date", header: "등록일", width: "20%", className: columnCell, render: (row) => formatDate(row.createdAt) },
  ];

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      {error !== "" && <div className="mb-3"><Notice tone="error">{error}</Notice></div>}
      <div className="mb-4 flex w-full items-center justify-between gap-2">
        <TextField value={query} onChange={(value) => filters.replace({ q: value, page: null })} placeholder="고객명, 연락처 검색" className="w-64 shrink-0" />
        <Button className="shrink-0" onClick={() => setOpen(true)}>엑셀 일괄 등록</Button>
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.id)}
        onRowClick={(row) => navigate(`/customer/${row.id}`)}
        emptyText={loading ? "고객을 조회하는 중입니다." : "조회 결과가 없습니다."}
      />
      <Pagination page={page} pageCount={pageCount} onPageChange={filters.setPage} />
      {open && (
        <ExcelModal
          onClose={() => setOpen(false)}
          onRegistered={() => {
            setReloadKey((value) => value + 1);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function ExcelModal({
  onClose,
  onRegistered,
}: {
  onClose: () => void;
  onRegistered: () => void;
}) {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<CustomerBulkRow[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleTemplate() {
    setError("");
    try {
      const blob = await downloadCustomerTemplate();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "customer_template.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "양식을 내려받지 못했습니다.");
    }
  }

  async function handleUpload(file: File | undefined) {
    if (file === undefined) return;
    setPending(true);
    setError("");
    setNotice("");
    setFileName(file.name);
    try {
      const result = await validateCustomerBulk(file);
      setRows(result.rows);
      setNotice(`검증 완료: 등록 가능 ${result.validCount}건 / 오류 ${result.invalidCount}건`);
    } catch (cause: unknown) {
      setRows([]);
      setError(cause instanceof Error ? cause.message : "엑셀 파일을 검증하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function handleBulkCreate() {
    const customers: CustomerBulkCreateItem[] = rows
      .filter((row) => row.registrable)
      .map((row) => ({
        rowNumber: row.rowNumber,
        name: row.name,
        phone: row.phone,
        email: row.email,
        zipcode: row.zipcode,
        basicAddress: row.basicAddress,
        detailAddress: row.detailAddress,
      }));
    if (customers.length === 0) {
      setError("등록 가능한 고객이 없습니다.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const result = await createCustomersBulk(customers);
      setNotice(`등록 완료: 성공 ${result.successCount}건 / 실패 ${result.failCount}건`);
      if (result.successCount > 0) onRegistered();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "고객을 일괄 등록하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal title="고객 엑셀 일괄 등록" onClose={onClose}>
      <div className="mb-3 flex gap-2">
        <Button variant="outline" onClick={() => void handleTemplate()} disabled={pending}>
          양식 다운로드
        </Button>
        <label className="inline-flex cursor-pointer items-center rounded border border-blue-600 px-4 py-2 text-sm text-blue-600">
          엑셀 업로드
          <input
            type="file"
            accept=".xlsx"
            className="sr-only"
            disabled={pending}
            onChange={(event) => {
              void handleUpload(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
      </div>
      {fileName !== "" && <p className="mb-2 text-sm">파일명 {fileName}</p>}
      {error !== "" && <div className="mb-3"><Notice tone="error">{error}</Notice></div>}
      {notice !== "" && <div className="mb-3"><Notice transient onDismiss={() => setNotice("")}>{notice}</Notice></div>}
      <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white text-sm shadow-sm">
        {rows.length === 0 ? (
          <li className="px-3 py-6 text-center text-neutral-500">검증된 행이 없습니다.</li>
        ) : (
          rows.map((row) => (
            <li key={row.rowNumber} className="flex justify-between gap-3 px-3 py-2">
              <span>{row.name || "(이름 없음)"} · {row.phone}</span>
              <span className={row.registrable ? "text-green-600" : "text-red-600"}>
                {row.registrable ? "등록 가능" : (row.reason ?? "형식 오류")}
              </span>
            </li>
          ))
        )}
      </ul>
      <div className="mt-4 text-right">
        <Button
          onClick={() => void handleBulkCreate()}
          disabled={pending || rows.every((row) => !row.registrable)}
        >
          고객 일괄 등록
        </Button>
      </div>
    </Modal>
  );
}
