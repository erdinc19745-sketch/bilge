import { differenceInDays, parseISO } from "date-fns";

/** Completed local days; invalid dates retain date-fns' NaN behavior. */
export function ageDays(birthISO: string, now: number): number {
  return differenceInDays(now, parseISO(birthISO));
}

export function ageMonths(birthISO: string, now: number): number {
  return ageDays(birthISO, now) / 30.4375;
}
