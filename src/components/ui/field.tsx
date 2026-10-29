import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const fieldBase = [
  "w-full rounded-xl border bg-white/70 px-4 text-body text-ink",
  "placeholder:text-ink-soft/80",
  "transition-[border-color,box-shadow] duration-200 ease-page",
  "focus:border-leaf focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-leaf/25",
  "disabled:cursor-not-allowed disabled:opacity-60",
].join(" ");

type FieldShellProps = {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: (ids: { inputId: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
};

/** Label, hint and error, linked to the control with aria-describedby. */
export function Field({ label, hint, error, optional, children }: FieldShellProps) {
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-small font-medium text-ink">
        {label}
        {optional ? <span className="font-normal text-ink-soft"> (optional)</span> : null}
      </label>
      {children({ inputId, describedBy, invalid: Boolean(error) })}
      {hint ? (
        <p id={hintId} className="text-small text-ink-soft">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-small font-medium text-clay">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type TextInputProps = Omit<ComponentProps<"input">, "id"> & {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
};

export function TextInput({ label, hint, error, optional, className, ...props }: TextInputProps) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional}>
      {({ inputId, describedBy, invalid }) => (
        <input
          id={inputId}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(fieldBase, "h-12", invalid ? "border-clay" : "border-line", className)}
          {...props}
        />
      )}
    </Field>
  );
}

type TextAreaProps = Omit<ComponentProps<"textarea">, "id"> & {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
};

export function TextArea({ label, hint, error, optional, className, rows = 4, ...props }: TextAreaProps) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional}>
      {({ inputId, describedBy, invalid }) => (
        <textarea
          id={inputId}
          rows={rows}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(fieldBase, "py-3", invalid ? "border-clay" : "border-line", className)}
          {...props}
        />
      )}
    </Field>
  );
}

type SelectProps = Omit<ComponentProps<"select">, "id"> & {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
};

export function Select({ label, hint, error, optional, className, children, ...props }: SelectProps) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional}>
      {({ inputId, describedBy, invalid }) => (
        <div className="relative">
          <select
            id={inputId}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={cn(fieldBase, "h-12 appearance-none pr-10", invalid ? "border-clay" : "border-line", className)}
            {...props}
          >
            {children}
          </select>
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-ink-soft"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </Field>
  );
}

type CheckboxProps = Omit<ComponentProps<"input">, "id" | "type"> & { label: ReactNode; hint?: ReactNode };

export function Checkbox({ label, hint, className, ...props }: CheckboxProps) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={cn("mt-1 size-5 shrink-0 rounded border-line accent-leaf", className)}
        {...props}
      />
      <div>
        <label htmlFor={id} className="text-body text-ink">
          {label}
        </label>
        {hint ? (
          <p id={`${id}-hint`} className="text-small text-ink-soft">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
