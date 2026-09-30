"use client";

import { Minus, Plus } from "lucide-react";
import type { Unit } from "@/lib/menu";
import { formatQty } from "@/lib/format";

interface Props {
  quantity: number;
  unit: Unit;
  onIncrement: () => void;
  onDecrement: () => void;
  size?: "sm" | "md";
  /** Permite digitar o peso livremente (empadão). */
  onSet?: (qty: number) => void;
}

export function QuantityStepper({ quantity, unit, onIncrement, onDecrement, size = "md", onSet }: Props) {
  const btn = size === "sm" ? "size-8" : "size-10";
  return (
    <div className="inline-flex items-center rounded-full border border-gold-500/50 bg-cream-50">
      <button type="button" onClick={onDecrement} className={`${btn} grid place-items-center rounded-full text-wood-700 transition hover:bg-gold-300/25`} aria-label="Diminuir quantidade">
        <Minus className="size-4" />
      </button>
      {onSet && unit === "kg" ? (
        <label className="flex items-center text-sm font-semibold text-wood-900">
          <input
            type="number"
            step="0.1"
            min="0.1"
            key={quantity}
            defaultValue={quantity}
            onBlur={(e) => onSet(Math.max(0, Math.round(Number(e.target.value.replace(",", ".")) * 1000) / 1000))}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            className="w-14 bg-transparent text-center tabular-nums outline-none"
            aria-label="Peso em kg"
          />
          kg
        </label>
      ) : (
        <span className={`min-w-16 text-center font-semibold tabular-nums text-wood-900 ${size === "sm" ? "text-sm" : ""}`} aria-live="polite">
          {formatQty(quantity, unit)}
        </span>
      )}
      <button type="button" onClick={onIncrement} className={`${btn} grid place-items-center rounded-full text-wood-700 transition hover:bg-gold-300/25`} aria-label="Aumentar quantidade">
        <Plus className="size-4" />
      </button>
    </div>
  );
}
