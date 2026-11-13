import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice, Panel } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { isAbortError } from "@/lib/apiClient";
import { fetchReceptions, receptionStatusLabel } from "@/lib/asReceptionApi";
import { embedDaumPostcode, selectedAddress } from "@/lib/daumPostcode";
import { repairStatusLabel } from "@/lib/repair";
import { fetchCustomer, updateCustomer } from "@/lib/customerApi";
import { formatDate } from "@/lib/format";
import type { AsReceptionListItem } from "@/types/asReception";
import type { CustomerDetail } from "@/types/customer";

const HISTORY_PAGE_SIZE = 10;

export function CustomerDetailPage() {
  const { customerId } = useParams();
  const id = Number(customerId);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [history, setHistory] = useState<AsReceptionListItem[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageCount, setHistoryPageCount] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(false);
  const [postLookup, setPostLookup] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [zipcode, setZipcode] = useState("");
  const [basicAddress, setBasicAddress] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!Number.isInteger(id) || id <= 0) {
      setCustomer(null);
      setLoading(false);
      setError("고객 정보를 찾을 수 없습니다.");
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetchCustomer(id, controller.signal)
      .then((detail) => {
        if (controller.signal.aborted) return;
        setCustomer(detail);
        setName(detail.name);
        setPhone(detail.phone);
        setEmail(detail.email);
        setZipcode(detail.zipcode ?? "");
        setBasicAddress(detail.basicAddress ?? "");
        setDetailAddress(detail.detailAddress ?? "");
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || isAbortError(cause)) return;
        setCustomer(null);
        setError(cause instanceof Error ? cause.message : "고객 정보를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (customer === null) {
      setHistory([]);
      setHistoryPageCount(1);
      setHistoryTotal(0);
      return;
    }
    const controller = new AbortController();
    fetchReceptions(
      {
        keyword: "",
        customerId: customer.id,
        status: null,
        technicianId: null,
        page: historyPage,
        size: HISTORY_PAGE_SIZE,
        sort: "createdAt,desc",
      },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        setHistory(result.items);
        setHistoryPageCount(Math.max(1, result.totalPages));
        setHistoryTotal(result.totalElements);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || isAbortError(cause)) return;
        setHistory([]);
        setHistoryPageCount(1);
        setHistoryTotal(0);
        setError(cause instanceof Error ? cause.message : "수리 이력을 불러오지 못했습니다.");
      });
    return () => controller.abort();
  }, [customer, historyPage]);

  if (loading) {
    return <Notice>고객 정보를 불러오는 중입니다.</Notice>;
  }

  if (customer === null) {
    return <Notice tone="error">{error === "" ? "고객 정보를 찾을 수 없습니다." : error}</Notice>;
  }

  const historyColumns: Column<AsReceptionListItem>[] = [
    {
      key: "id",
      header: "접수번호",
      render: (row) => (
        <Link className="text-[#005A9C]" to={`/as/details/${row.id}`}>
          {row.receptionNumber}
        </Link>
      ),
    },
    { key: "date", header: "접수일", render: (row) => formatDate(row.createdAt) },
    { key: "model", header: "모델명", render: (row) => row.modelName ?? "-" },
    { key: "status", header: "접수 상태", render: (row) => receptionStatusLabel(row.receptionStatus) },
    {
      key: "repair",
      header: "수리 상태",
      render: (row) => (row.repairStatus === null ? "-" : repairStatusLabel(row.repairStatus)),
    },
    { key: "tech", header: "담당 기사", render: (row) => row.technicianName ?? "-" },
  ];

  return (
    <div className="space-y-4">
      {notice !== "" && <Notice transient onDismiss={() => setNotice("")}>{notice}</Notice>}
      {error !== "" && <Notice tone="error">{error}</Notice>}
      <Panel
        title="고객 정보"
        className="p-6"
        action={<Button variant="outline" onClick={() => setEditing(true)}>수정</Button>}
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <InfoItem label="고객명" value={customer.name} />
          <InfoItem label="연락처" value={customer.phone} />
          <InfoItem label="이메일" value={customer.email} />
        </div>
        <div className="my-6 border-t border-neutral-200" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <InfoItem label="우편번호" value={customer.zipcode ?? ""} />
          <InfoItem label="기본 주소" value={customer.basicAddress ?? ""} />
          <InfoItem label="상세 주소" value={customer.detailAddress ?? ""} />
        </div>
      </Panel>

      <div className="flex items-center justify-between gap-3">
        <h2 className="section-title">이전 수리 내역</h2>
        <p className="text-sm text-[#64748B]">전체 {historyTotal}건</p>
      </div>
      <DataTable
        columns={historyColumns}
        rows={history}
        rowKey={(row) => String(row.id)}
        emptyText={(
          <span className="block text-center">
            <span className="block">이전 수리 내역이 없습니다.</span>
            <span className="mt-1 block text-xs">A/S 접수 후 해당 고객의 수리 내역을 확인할 수 있습니다.</span>
          </span>
        )}
      />
      {historyTotal > 0 && (
        <Pagination page={historyPage} pageCount={historyPageCount} onPageChange={setHistoryPage} />
      )}

      {editing && !postLookup && (
        <Modal
          title="고객 정보 수정"
          onClose={() => {
            setEditing(false);
            setPostLookup(false);
          }}
        >
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              setSaving(true);
              setError("");
              void updateCustomer(customer.id, {
                name: name.trim(),
                phone: phone.trim(),
                email: email.trim(),
                zipcode: zipcode.trim(),
                basicAddress: basicAddress.trim(),
                detailAddress: detailAddress.trim(),
              })
                .then((updated) => {
                  setCustomer(updated);
                  setEditing(false);
                  setPostLookup(false);
                  setNotice("고객 정보를 수정했습니다.");
                })
                .catch((cause: unknown) => {
                  setError(cause instanceof Error ? cause.message : "고객 정보를 수정하지 못했습니다.");
                })
                .finally(() => setSaving(false));
            }}
          >
            <TextField label="이름" value={name} onChange={setName} />
            <TextField label="연락처" value={phone} onChange={setPhone} />
            <TextField label="이메일" value={email} onChange={setEmail} />
            <TextField label="우편번호" value={zipcode} onChange={setZipcode} readOnly />
            <TextField label="기본 주소" value={basicAddress} onChange={setBasicAddress} />
            <div className="flex items-end gap-2">
              <TextField
                className="flex-1"
                label="상세 주소"
                value={detailAddress}
                onChange={setDetailAddress}
              />
              <Button type="button" variant="outline" onClick={() => setPostLookup(true)}>
                우편번호 찾기
              </Button>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setPostLookup(false);
                }}
                disabled={saving}
              >
                취소
              </Button>
              <Button type="submit" disabled={saving}>저장</Button>
            </div>
          </form>
        </Modal>
      )}

      {postLookup && (
        <CustomerPostLookup
          onClose={() => setPostLookup(false)}
          onApply={({ postalCode, address }) => {
            setZipcode(postalCode);
            setBasicAddress(address);
            setPostLookup(false);
          }}
        />
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-[#64748B]">{label}</p>
      <p className="mt-1.5 text-sm break-words text-[#1E293B]">{value === "" ? "-" : value}</p>
    </div>
  );
}

function CustomerPostLookup({
  onClose,
  onApply,
}: {
  onClose: () => void;
  onApply: (result: { postalCode: string; address: string }) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const onApplyRef = useRef(onApply);
  const onCloseRef = useRef(onClose);
  const [lookupError, setLookupError] = useState("");
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
          setLookupError(
            cause instanceof Error ? cause.message : "카카오 우편번호 서비스를 불러오지 못했습니다.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Modal title="우편번호 찾기" wide onClose={onClose}>
      {lookupError !== "" && <Notice tone="error">{lookupError}</Notice>}
      <div ref={frameRef} className="h-[460px] overflow-hidden rounded-xl border border-neutral-200" />
      <p className="mt-3 text-xs text-neutral-500">
        주소를 고르면 우편번호와 기본 주소가 입력됩니다. 상세 주소는 직접 입력합니다.
      </p>
    </Modal>
  );
}
