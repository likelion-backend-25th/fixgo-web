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
import { loadDaumPostcode, selectedAddress } from "@/lib/daumPostcode";
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
      return;
    }
    const controller = new AbortController();
    fetchReceptions(
      {
        keyword: customer.phone,
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
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || isAbortError(cause)) return;
        setHistory([]);
        setHistoryPageCount(1);
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

  const address = [customer.zipcode, customer.basicAddress, customer.detailAddress]
    .filter((part) => part !== null && part !== "")
    .join(" ");

  const historyColumns: Column<AsReceptionListItem>[] = [
    {
      key: "id",
      header: "접수번호",
      render: (row) => (
        <Link className="text-blue-600" to={`/as/details/${row.id}`}>
          {row.receptionNumber}
        </Link>
      ),
    },
    { key: "date", header: "접수일", render: (row) => formatDate(row.createdAt) },
    { key: "model", header: "모델명", render: (row) => row.modelName ?? "-" },
    { key: "status", header: "접수상태", render: (row) => receptionStatusLabel(row.receptionStatus) },
    {
      key: "repair",
      header: "수리 상태",
      render: (row) => (row.repairStatus === null ? "-" : repairStatusLabel(row.repairStatus)),
    },
    { key: "tech", header: "담당기사", render: (row) => row.technicianName ?? "-" },
  ];

  return (
    <div className="space-y-4">
      {notice !== "" && <Notice>{notice}</Notice>}
      {error !== "" && <Notice tone="error">{error}</Notice>}
      <Panel
        title="고객 정보"
        action={<Button variant="outline" onClick={() => setEditing(true)}>수정</Button>}
      >
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <p>이름 {customer.name}</p>
          <p>연락처 {customer.phone}</p>
          <p>이메일 {customer.email}</p>
          <p>주소 {address === "" ? "-" : address}</p>
        </div>
      </Panel>

      <h2 className="text-sm font-semibold">이전 수리 내역</h2>
      <DataTable
        columns={historyColumns}
        rows={history}
        rowKey={(row) => String(row.id)}
        emptyText="이전 수리 내역이 없습니다."
      />
      <Pagination page={historyPage} pageCount={historyPageCount} onPageChange={setHistoryPage} />

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
            <TextField label="우편번호" value={zipcode} onChange={setZipcode} />
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
    loadDaumPostcode()
      .then((Postcode) => {
        if (cancelled) {
          return;
        }
        frame.replaceChildren();
        new Postcode({
          width: "100%",
          height: "100%",
          oncomplete: (data) => {
            onApplyRef.current({
              postalCode: data.zonecode,
              address: selectedAddress(data),
            });
            onCloseRef.current();
          },
        }).embed(frame);
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
