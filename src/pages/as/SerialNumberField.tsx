import { useEffect, useState } from "react";
import { TextField } from "@/components/ui/Field";
import { isAbortError } from "@/lib/apiClient";
import { searchProductsBySerial } from "@/lib/asReceptionApi";
import type { ProductSummary } from "@/types/asReception";

interface SerialNumberFieldProps {
  value: string;
  invalid?: boolean;
  onChange: (serial: string) => void;
  onPick: (product: ProductSummary) => void;
}

export function SerialNumberField({ value, invalid = false, onChange, onPick }: SerialNumberFieldProps) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<ProductSummary[]>([]);

  useEffect(() => {
    const keyword = value.trim();
    if (!open || keyword === "") {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      // 시리얼번호 일부만 넘겨도 서버가 포함된 제품을 돌려준다.
      searchProductsBySerial(keyword, controller.signal)
        .then((items) => {
          if (!controller.signal.aborted) {
            setSuggestions(items.slice(0, 8));
          }
        })
        .catch((cause: unknown) => {
          if (controller.signal.aborted || isAbortError(cause)) {
            return;
          }
          setSuggestions([]);
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, value]);

  function pick(product: ProductSummary) {
    setOpen(false);
    setSuggestions([]);
    onPick(product);
  }

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <TextField
        label="시리얼번호"
        value={value}
        invalid={invalid}
        placeholder="일부를 입력하면 등록된 시리얼번호가 나옵니다"
        onChange={(serial) => {
          setOpen(true);
          onChange(serial);
        }}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-neutral-300 bg-white py-1 shadow-sm">
          {suggestions.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-neutral-50"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(product)}
              >
                <span>{product.serialNumber}</span>
                <span className="text-neutral-500">{product.modelName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
