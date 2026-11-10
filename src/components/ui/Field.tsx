import { useRef, type ReactNode, SelectHTMLAttributes } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/cn";

const controlClass =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15";

interface TextFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  invalid?: boolean;
  readOnly?: boolean;
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
  className,
}: TextFieldProps) {
  return (
    <label className={cn("block text-sm", className)}>
      {label !== undefined && <span className="mb-1.5 block text-xs font-medium text-neutral-600">{label}</span>}
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
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
  className?: string;
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  readOnly = false,
  className,
}: TextAreaProps) {
  return (
    <label className={cn("block text-sm", className)}>
      {label !== undefined && <span className="mb-1.5 block text-xs font-medium text-neutral-600">{label}</span>}
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
  className?: string;
}

export function DateField({ label, value, onChange, className }: DateFieldProps) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const iso = toIsoDate(value);

  return (
    <label className={cn("block text-sm", className)}>
      {label !== undefined && <span className="mb-1.5 block text-xs font-medium text-neutral-600">{label}</span>}
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          placeholder="YYYY/MM/DD"
          value={formatDateInput(value)}
          onChange={(event) => onChange(commitDateInput(event.target.value))}
          className={cn(controlClass, "pr-10")}
        />
        <button
          type="button"
          aria-label="달력에서 날짜 선택"
          className="absolute top-1/2 right-2 -translate-y-1/2 text-neutral-500"
          onClick={() => openDatePicker(pickerRef.current)}
        >
          <Calendar className="size-4" />
        </button>
        <input
          ref={pickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden
          value={iso}
          onChange={(event) => onChange(event.target.value)}
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
  return <span className="mb-1.5 block text-xs font-medium text-neutral-600">{children}</span>;
}
