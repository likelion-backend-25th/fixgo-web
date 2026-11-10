import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice, Panel } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { isAbortError } from "@/lib/apiClient";
import { fetchReceptions, receptionStatusLabel } from "@/lib/asReceptionApi";
import { fetchCustomer, updateCustomer } from "@/lib/customerApi";
import { categoryLabel, listProductsByCustomer } from "@/lib/productApi";
import { formatDate } from "@/lib/format";
import type { AsReceptionListItem, ProductSummary } from "@/types/asReception";
import type { CustomerDetail } from "@/types/customer";

const HISTORY_PAGE_SIZE = 10;

export function CustomerDetailPage() {
  const { customerId } = useParams();
  const id = Number(customerId);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [history, setHistory] = useState<AsReceptionListItem[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageCount, setHistoryPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(false);
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
    Promise.all([
      fetchCustomer(id, controller.signal),
      listProductsByCustomer(id, controller.signal),
    ])
      .then(([detail, ownedProducts]) => {
        if (controller.signal.aborted) return;
        setCustomer(detail);
        setProducts(ownedProducts);
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

  const productColumns: Column<ProductSummary>[] = [
    { key: "model", header: "모델명", render: (row) => row.modelName },
    { key: "serial", header: "시리얼번호", render: (row) => row.serialNumber },
    { key: "group", header: "제품군", render: (row) => categoryLabel(row.category) },
    { key: "purchased", header: "구매일", render: (row) => formatDate(row.purchasedAt) },
  ];

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

      <h2 className="text-sm font-semibold">보유 제품</h2>
      <DataTable
        columns={productColumns}
        rows={products}
        rowKey={(row) => String(row.id)}
        emptyText="등록된 보유 제품이 없습니다."
      />

      <h2 className="text-sm font-semibold">이전 수리 내역</h2>
      <DataTable
        columns={historyColumns}
        rows={history}
        rowKey={(row) => String(row.id)}
        emptyText="이전 수리 내역이 없습니다."
      />
      <Pagination page={historyPage} pageCount={historyPageCount} onPageChange={setHistoryPage} />

      {editing && (
        <Modal title="고객 정보 수정" onClose={() => setEditing(false)}>
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
            <TextField label="상세 주소" value={detailAddress} onChange={setDetailAddress} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>취소</Button>
              <Button type="submit" disabled={saving}>저장</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
