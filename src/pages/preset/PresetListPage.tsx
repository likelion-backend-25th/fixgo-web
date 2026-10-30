import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { TextArea, TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice, Panel } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { cn } from "@/lib/cn";
import { includesText } from "@/lib/format";
import { usePageSlice } from "@/lib/usePageSlice";
import { presets } from "@/mocks/screenData";
import type { PresetRecord } from "@/types/screen";

export function PresetListPage() {
  const [kind, setKind] = useState<"증상" | "수리">("수리");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const rows = useMemo(
    () => presets.filter((row) => row.kind === kind && includesText(`${row.name} ${row.symptom} ${row.parts}`, query)),
    [kind, query],
  );
  const table = usePageSlice(rows);
  const columns: Column<PresetRecord>[] = [
    { key: "name", header: kind === "수리" ? "작업명" : "증상명", render: (row) => row.name },
    { key: "symptom", header: "증상", render: (row) => row.symptom },
    { key: "minutes", header: "표준 시간", render: (row) => `${row.minutes}분` },
    { key: "parts", header: "기본 부품", render: (row) => row.parts },
  ];

  return (
    <div>
      {notice !== "" && <Notice>{notice}</Notice>}
      <Panel className="mb-4">
        <p className="text-sm text-blue-700">10분 당 공임</p>
        <div className="mt-3 flex gap-16 text-sm">
          <p>스마트폰 6000원</p>
          <p>노트북 10000원</p>
        </div>
      </Panel>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" className={cn("rounded border px-3 py-2 text-sm", kind === "증상" ? "border-blue-600 bg-blue-600 text-white" : "border-neutral-300")} onClick={() => setKind("증상")}>고장 증상 프리셋</button>
        <button type="button" className={cn("rounded border px-3 py-2 text-sm", kind === "수리" ? "border-blue-600 bg-blue-600 text-white" : "border-neutral-300")} onClick={() => setKind("수리")}>수리 프리셋</button>
        <TextField value={query} onChange={setQuery} placeholder="프리셋명, 증상, 기본 부품 검색" className="w-64" />
        <Button className="ml-auto" onClick={() => setOpen(true)}>프리셋 등록</Button>
      </div>
      <DataTable columns={columns} rows={table.slice} rowKey={(row) => row.id} />
      <p className="mt-2 text-xs text-neutral-500">표준 시간에 제품군 공임을 곱하고 부품비를 더해 수리비를 계산합니다.</p>
      <Pagination page={table.page} pageCount={table.pageCount} onPageChange={table.setPage} />
      {open && (
        <PresetFormModal
          onClose={() => setOpen(false)}
          onSave={() => {
            setOpen(false);
            setNotice("프리셋을 등록했습니다. 화면 구성용이라 목록에는 추가되지 않습니다.");
          }}
        />
      )}
    </div>
  );
}

function PresetFormModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [name, setName] = useState("");
  const [symptom, setSymptom] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [enabled, setEnabled] = useState(true);
  const [description, setDescription] = useState("");
  const [partsText, setPartsText] = useState("");
  const [error, setError] = useState("");

  return (
    <Modal title="프리셋 등록" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim() === "" || symptom.trim() === "") {
            setError("작업명과 증상을 입력해 주세요.");
            return;
          }
          onSave();
        }}
      >
        <TextField label="작업명" value={name} onChange={setName} />
        <TextField label="증상" value={symptom} onChange={setSymptom} />
        <TextField label="표준작업시간(분)" value={minutes} onChange={setMinutes} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
          사용
        </label>
        <TextArea label="작업 설명" value={description} onChange={setDescription} />
        <TextField label="기본 부품 및 수량" value={partsText} onChange={setPartsText} placeholder="USB 포트 1" />
        {error !== "" && <Notice tone="error">{error}</Notice>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button type="submit">등록</Button>
        </div>
      </form>
    </Modal>
  );
}
