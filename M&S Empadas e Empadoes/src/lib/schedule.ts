import { STORE } from "./config";
import { toISODate } from "./format";

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const toHHMM = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** Todos os horários do dia, respeitando abertura/fecho. */
export function allSlots(): string[] {
  const out: string[] = [];
  for (let t = toMinutes(STORE.openingTime); t <= toMinutes(STORE.closingTime); t += STORE.slotMinutes) {
    out.push(toHHMM(t));
  }
  return out;
}

/** Momento mais cedo possível para a encomenda (agora + antecedência). */
export function earliestMoment(now = new Date()) {
  return new Date(now.getTime() + STORE.leadTimeHours * 3600_000);
}

export function isClosedDay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return (STORE.closedWeekdays as readonly number[]).includes(new Date(y, m - 1, d).getDay());
}

/** Limites para o <input type="date">. */
export function dateBounds(now = new Date()) {
  const min = earliestMoment(now);
  const max = new Date(now);
  max.setDate(max.getDate() + STORE.maxDaysAhead);
  return { min: toISODate(min), max: toISODate(max) };
}

/** Horários disponíveis num dia específico, tendo em conta a antecedência mínima. */
export function availableSlots(iso: string, now = new Date()): string[] {
  if (!iso || isClosedDay(iso)) return [];
  const earliest = earliestMoment(now);
  const [y, m, d] = iso.split("-").map(Number);
  return allSlots().filter((slot) => {
    const [h, min] = slot.split(":").map(Number);
    return new Date(y, m - 1, d, h, min) >= earliest;
  });
}
