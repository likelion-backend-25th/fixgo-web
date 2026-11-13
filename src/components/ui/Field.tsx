import { useEffect, useRef, useState, type ReactNode, type SelectHTMLAttributes } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/cn";

const controlClass =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15";

function FieldCaption({ label, required = false }: { label: string; required?: boolean }) {
  return (
    <span className="form-label mb-1.5 block">
      {label}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </span>
  );
}

interface TextFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  invalid?: boolean;
  readOnly?: boolean;
  required?: boolean;
  className?: string;
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  invalid = false,
  readOnly = false,
  required = false,
  className,
}: TextFieldProps) {
  // 주소 필터가 다시 그려져도 조합 중인 한글이 끊기지 않게 입력값은 로컬에 둔다.
  const [text, setText] = useState(value);
  const composing = useRef(false);

  useEffect(() => {
    if (!composing.current) {
      setText(value);
    }
  }, [value]);

  function publish(next: string) {
    setText(next);
    onChange(next);
  }

  return (
    <label className={cn("block text-sm", className)}>
      {label !== undefined && <FieldCaption label={label} required={required} />}
      <input
        type={type}
        value={text}
        readOnly={readOnly}
        placeholder={placeholder}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={(event) => {
          composing.current = false;
          publish(event.currentTarget.value);
        }}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          // nativeEvent는 Event라서 isComposing은 InputEvent일 때만 있다.
          const nativeEvent = event.nativeEvent;
          const stillComposing =
            nativeEvent instanceof InputEvent && nativeEvent.isComposing;
          if (!composing.current && !stillComposing) {
            onChange(next);
          }
        }}
        className={cn(
          controlClass,
          invalid && "border-red-300 bg-red-50",
          readOnly && "bg-neutral-50 text-neutral-700",
        )}
      />
    </label>
  );
}

interface TextAreaProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  readOnly?: boolean;
  required?: boolean;
  className?: string;
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  readOnly = false,
  required = false,
  className,
}: TextAreaProps) {
  return (
    <label className={cn("block text-sm", className)}>
      {label !== undefined && <FieldCaption label={label} required={required} />}
      <textarea
        value={value}
        readOnly={readOnly}
        rows={rows}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn(controlClass, "resize-y", readOnly && "bg-neutral-50 text-neutral-700")}
      />
    </label>
  );
}

interface SelectOption {
  value: string;
  label: string;
}

interface SelectBoxProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value"> {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
}

export function SelectBox({ value, onChange, options, className, ...props }: SelectBoxProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(controlClass, "h-9 w-auto", className)}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

interface DateFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  required?: boolean;
  className?: string;
}

export function DateField({ label, value, onChange, readOnly = false, required = false, className }: DateFieldProps) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const iso = toIsoDate(value);

  return (
    <label className={cn("block text-sm", className)}>
      {label !== undefined && <FieldCaption label={label} required={required} />}
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          placeholder="YYYY/MM/DD"
          value={formatDateInput(value)}
          readOnly={readOnly}
          onChange={(event) => {
            if (!readOnly) {
              onChange(commitDateInput(event.target.value));
            }
          }}
          className={cn(controlClass, "pr-10", readOnly && "bg-neutral-50 text-neutral-700")}
        />
        <button
          type="button"
          aria-label="달력에서 날짜 선택"
          disabled={readOnly}
          className={cn(
            "absolute top-1/2 right-2 -translate-y-1/2 text-neutral-500",
            readOnly && "cursor-not-allowed text-neutral-300",
          )}
          onClick={() => {
            if (!readOnly) {
              openDatePicker(pickerRef.current);
            }
          }}
        >
          <Calendar className="size-4" />
        </button>
        <input
          ref={pickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden
          disabled={readOnly}
          value={iso}
          onChange={(event) => {
            if (!readOnly) {
              onChange(event.target.value);
            }
          }}
          className="pointer-events-none absolute size-0 opacity-0"
        />
      </div>
    </label>
  );
}

function formatDateInput(value: string): string {
  return joinYearMonthDay(value.replace(/\D/g, "").slice(0, 8));
}

function commitDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length === 8) {
    return toIsoDate(digits);
  }
  return joinYearMonthDay(digits);
}

function toIsoDate(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8) {
    return "";
  }
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function joinYearMonthDay(digits: string): string {
  const year = digits.slice(0, 4);
  const month = digits.slice(4, 6);
  const day = digits.slice(6, 8);
  return [year, month, day].filter((part) => part.length > 0).join("/");
}

function openDatePicker(input: HTMLInputElement | null) {
  if (input === null) {
    return;
  }
  try {
    input.showPicker();
  } catch {
    input.click();
  }
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="form-label mb-1.5 block">{children}</span>;
}
