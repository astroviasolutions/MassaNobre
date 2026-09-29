import type { LucideIcon } from "lucide-react";

export function Section({ n, title, subtitle, children }: { n: number; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="card p-6 sm:p-7">
      <header className="mb-5 flex items-start gap-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-full border border-gold-500/60 font-serif text-sm font-semibold text-gold-700">
          {n}
        </span>
        <div>
          <h2 className="font-serif text-lg font-semibold tracking-wide text-wood-900">{title}</h2>
          {subtitle && <p className="text-sm text-wood-500">{subtitle}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

export function ChoiceCard({
  checked,
  onSelect,
  icon: Icon,
  title,
  hint,
}: {
  checked: boolean;
  onSelect: () => void;
  icon: LucideIcon;
  title: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition ${
        checked
          ? "border-gold-500 bg-gold-300/20 ring-2 ring-gold-400/40"
          : "border-cream-300 bg-white/70 hover:border-gold-400"
      }`}
    >
      <Icon className={`size-5 shrink-0 ${checked ? "text-gold-700" : "text-wood-500"}`} strokeWidth={1.6} />
      <span>
        <span className="block text-sm font-semibold text-wood-900">{title}</span>
        {hint && <span className="block text-xs text-wood-500">{hint}</span>}
      </span>
    </button>
  );
}

export function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs font-medium text-red-600" role="alert">{msg}</p>;
}
