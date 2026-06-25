interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
  return (
    <label
      className={`flex items-start gap-3 py-2.5 ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      }`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked
            ? 'bg-ink dark:bg-paper'
            : 'bg-ink/20 dark:bg-paper/25'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-paper shadow transition-transform dark:bg-ink ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
      <div className="flex-1 select-none">
        <div className="text-sm font-medium leading-tight">{label}</div>
        {description ? (
          <div className="text-xs text-muted dark:text-paper/60">{description}</div>
        ) : null}
      </div>
    </label>
  );
}
