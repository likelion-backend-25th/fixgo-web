import { useEffect, useState } from "react";
import { TextField } from "@/components/ui/Field";
import { isAbortError } from "@/lib/apiClient";
import { searchCustomers } from "@/lib/asReceptionApi";
import type { CustomerSummary } from "@/types/asReception";

interface CustomerNameFieldProps {
  value: string;
  invalid?: boolean;
  onChange: (name: string) => void;
  onPick: (customer: CustomerSummary) => void;
}

export function CustomerNameField({ value, invalid = false, onChange, onPick }: CustomerNameFieldProps) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<CustomerSummary[]>([]);

  useEffect(() => {
    const keyword = value.trim();
    if (!open || keyword === "") {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      // 이름 일부만 넘겨도 서버가 포함된 고객을 돌려준다.
      searchCustomers(keyword, controller.signal)
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

  function pick(customer: CustomerSummary) {
    setOpen(false);
    setSuggestions([]);
    onPick(customer);
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
        label="고객명"
        value={value}
        invalid={invalid}
        placeholder="이름 일부를 입력하면 등록 고객이 나옵니다"
        onChange={(name) => {
          setOpen(true);
          onChange(name);
        }}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-neutral-300 bg-white py-1 shadow-sm">
          {suggestions.map((customer) => (
            <li key={customer.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-neutral-50"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(customer)}
              >
                <span>{customer.name}</span>
                <span className="text-neutral-500">{customer.phone}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
