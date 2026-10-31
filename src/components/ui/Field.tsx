import type { ReactNode, SelectHTMLAttributes } from "react";
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

export function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-xs font-medium text-neutral-600">{children}</span>;
}
