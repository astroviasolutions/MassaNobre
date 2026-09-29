/** Divisor ornamental com espigas de trigo, inspirado no emblema. */
export function Ornament({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 text-gold-500 ${className}`} aria-hidden>
      <span className="h-px w-16 bg-linear-to-r from-transparent to-gold-500 sm:w-24" />
      <svg width="56" height="14" viewBox="0 0 56 14" fill="none" stroke="currentColor" strokeWidth="1">
        <path d="M2 7h10M44 7h10" />
        {[12, 16, 20].map((x) => (
          <path key={`l${x}`} d={`M${x} 7c1.5-3 3-3.5 4-3.5M${x} 7c1.5 3 3 3.5 4 3.5`} />
        ))}
        {[44, 40, 36].map((x) => (
          <path key={`r${x}`} d={`M${x} 7c-1.5-3-3-3.5-4-3.5M${x} 7c-1.5 3-3 3.5-4 3.5`} />
        ))}
        <path d="M28 3l2.2 4L28 11l-2.2-4z" fill="currentColor" stroke="none" />
      </svg>
      <span className="h-px w-16 bg-linear-to-l from-transparent to-gold-500 sm:w-24" />
    </div>
  );
}
