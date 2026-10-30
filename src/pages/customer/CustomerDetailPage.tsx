import { useState } from "react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice, Panel } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { won } from "@/lib/format";
import { usePageSlice } from "@/lib/usePageSlice";
import { customers, pastRepairs } from "@/mocks/screenData";

export function CustomerDetailPage() {
  const { customerId } = useParams();
  const customer = customers.find((row) => row.id === customerId);
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const history = pastRepairs(customer?.name ?? "");
  const table = usePageSlice(history);

  if (customer === undefined) {
    return <Notice tone="error">고객 정보를 찾을 수 없습니다.</Notice>;
  }

  const columns: Column<(typeof history)[number]>[] = [
    { key: "id", header: "접수번호", render: (row) => <Link className="text-blue-600" to={`/as/details/${row.id}`}>{row.id}</Link> },
    { key: "date", header: "접수일", render: (row) => row.receivedAt },
    { key: "model", header: "모델명", render: (row) => row.modelName },
    { key: "symptom", header: "고장증상", render: (row) => row.symptom },
    { key: "status", header: "수리상태", render: (row) => row.status },
    { key: "tech", header: "담당기사", render: (row) => row.technician },
    { key: "amount", header: "수리금액", render: (row) => (row.amount === 0 ? "-" : won(row.amount)) },
  ];

  return (
    <div className="space-y-4">
      {notice !== "" && <Notice>{notice}</Notice>}
      <Panel
        title="고객 정보"
        action={<Button variant="outline" onClick={() => setEditing(true)}>수정</Button>}
      >
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <p>이름 {customer.name}</p>
          <p>연락처 {phone}</p>
          <p>이메일 {email}</p>
          <p>주소 {address}</p>
        </div>
      </Panel>
      <h2 className="text-sm font-semibold">이전 수리 내역</h2>
      <DataTable columns={columns} rows={table.slice} rowKey={(row) => row.id} />
      <Pagination page={table.page} pageCount={table.pageCount} onPageChange={table.setPage} />
      {editing && (
        <Modal title="고객 정보 수정" onClose={() => setEditing(false)}>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              setEditing(false);
              setNotice("고객 연락처 정보를 수정했습니다.");
            }}
          >
            <TextField label="연락처" value={phone} onChange={setPhone} />
            <TextField label="이메일" value={email} onChange={setEmail} />
            <TextField label="주소" value={address} onChange={setAddress} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(false)}>취소</Button>
              <Button type="submit">저장</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
