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
}

export function QuantityStepper({ quantity, unit, onIncrement, onDecrement, size = "md" }: Props) {
  const btn = size === "sm" ? "size-8" : "size-10";
  return (
    <div className="inline-flex items-center rounded-full border border-gold-500/50 bg-cream-50">
      <button type="button" onClick={onDecrement} className={`${btn} grid place-items-center rounded-full text-wood-700 transition hover:bg-gold-300/25`} aria-label="Diminuir quantidade">
        <Minus className="size-4" />
      </button>
      <span className={`min-w-16 text-center font-semibold tabular-nums text-wood-900 ${size === "sm" ? "text-sm" : ""}`} aria-live="polite">
        {formatQty(quantity, unit)}
      </span>
      <button type="button" onClick={onIncrement} className={`${btn} grid place-items-center rounded-full text-wood-700 transition hover:bg-gold-300/25`} aria-label="Aumentar quantidade">
        <Plus className="size-4" />
      </button>
    </div>
  );
}
