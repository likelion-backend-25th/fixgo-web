import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SelectBox } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { isAbortError } from "@/lib/apiClient";
import { won } from "@/lib/format";
import {
  fetchParts,
  isPartStatus,
  partStatusLabel,
  type PartItem,
  type PartStatus,
} from "@/lib/partApi";
import { fetchProductModels } from "@/lib/productModelApi";
import type { ProductCategory } from "@/types/asReception";
import type { ProductModel } from "@/types/productModel";

const PAGE_SIZE = 20;

interface Props {
  selectedIds: number[];
  onAdd: (part: PartItem) => void;
  onClose: () => void;
}

export function PartPickerModal({ selectedIds, onAdd, onClose }: Props) {
  const [name, setName] = useState("");
  const [appliedName, setAppliedName] = useState("");
  const [category, setCategory] = useState<"" | ProductCategory>("");
  const [modelId, setModelId] = useState("");
  const [status, setStatus] = useState<"" | PartStatus>("");
  const [models, setModels] = useState<ProductModel[]>([]);
  const [parts, setParts] = useState<PartItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAppliedName(name.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [name]);

  useEffect(() => {
    const controller = new AbortController();
    fetchProductModels({ keyword: "", page: 1, size: 200 }, controller.signal)
      .then((result) => setModels(result.items))
      .catch((cause: unknown) => {
        if (!isAbortError(cause)) {
          setModels([]);
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const parsedModelId = Number(modelId);
    setLoading(true);

    // 호환 제품군·모델·재고 상태는 서버 검색 조건으로 보낸다.
    fetchParts({
      partName: appliedName,
      status: status === "" ? null : status,
      category: category === "" ? null : category,
      productModelId: modelId !== "" && Number.isInteger(parsedModelId) ? parsedModelId : null,
      page,
      size: PAGE_SIZE,
    }, controller.signal)
      .then((result) => {
        setParts(result.content);
        setPageCount(Math.max(1, result.totalPages));
        setError("");
      })
      .catch((cause: unknown) => {
        if (isAbortError(cause)) {
          return;
        }
        setParts([]);
        setPageCount(1);
        setError(cause instanceof Error ? cause.message : "부품 목록을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [appliedName, category, modelId, status, page]);

  const modelOptions = useMemo(
    () => models.filter((model) => category === "" || model.category === category),
    [models, category],
  );

  function changeCategory(value: string) {
    const next = isCategory(value) ? value : "";
    setCategory(next);
    setModelId((current) => {
      if (current === "" || next === "") {
        return current;
      }
      const model = models.find((item) => String(item.id) === current);
      return model !== undefined && model.category === next ? current : "";
    });
    setPage(1);
  }

  return (
    <Modal title="부품 추가" wide onClose={onClose}>
      <div className="flex h-[520px] max-h-[calc(100vh-14rem)] min-h-0 flex-col">
        <div className="flex shrink-0 flex-wrap gap-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="부품명 검색"
            className="h-9 min-w-40 flex-1 rounded-lg border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
          />
          <SelectBox
            aria-label="호환 제품군"
            value={category}
            onChange={changeCategory}
            options={[
              { value: "", label: "호환 제품군 전체" },
              { value: "LAPTOP", label: "노트북" },
              { value: "PHONE", label: "스마트폰" },
            ]}
          />
          <SelectBox
            aria-label="모델"
            value={modelId}
            onChange={(value) => {
              setModelId(value);
              setPage(1);
            }}
            options={[
              { value: "", label: "모델 전체" },
              ...modelOptions.map((model) => ({
                value: String(model.id),
                label: `${model.modelName} · ${model.name}`,
              })),
            ]}
          />
          <SelectBox
            aria-label="재고 상태"
            value={status}
            onChange={(value) => {
              setStatus(isPartStatus(value) ? value : "");
              setPage(1);
            }}
            options={[
              { value: "", label: "재고 상태 전체" },
              { value: "ACTIVE", label: partStatusLabel("ACTIVE") },
              { value: "LOW_QUANTITY", label: partStatusLabel("LOW_QUANTITY") },
              { value: "DISCONTINUED", label: partStatusLabel("DISCONTINUED") },
            ]}
          />
        </div>

        {error !== "" && (
          <div className="mt-3 shrink-0">
            <Notice tone="error">{error}</Notice>
          </div>
        )}

        <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
          {loading ? (
            <p className="py-8 text-center text-sm text-neutral-400">불러오는 중입니다.</p>
          ) : parts.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-400">조건에 맞는 부품이 없습니다.</p>
          ) : (
            parts.map((part) => {
              const added = selectedIds.includes(part.id);
              return (
                <div
                  key={part.id}
                  className="flex items-center gap-3 border border-neutral-300 px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{part.name}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {partStatusLabel(part.status)} · 재고 {part.stockQuantity} · {won(part.unitPrice)}
                    </p>
                  </div>
                  <Button variant="outline" disabled={added} onClick={() => onAdd(part)}>
                    {added ? "추가됨" : "추가"}
                  </Button>
                </div>
              );
            })
          )}
        </div>

        <div className="shrink-0">
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </div>
      </div>
    </Modal>
  );
}

function isCategory(value: string): value is ProductCategory {
  return value === "LAPTOP" || value === "PHONE";
}
