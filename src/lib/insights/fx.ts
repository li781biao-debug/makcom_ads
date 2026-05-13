import { prisma } from "@/lib/db";

/**
 * Returns a per-request memoised FX-rate lookup. Each `await fx(code)` call
 * caches the result for subsequent calls within the same request, so a batch
 * with N rows in one currency only hits the DB once.
 *
 * Missing rates default to 1.0 (no conversion). USD always returns 1.
 */
export function makeFxLookup() {
  const cache = new Map<string, number>();
  cache.set("USD", 1);

  return async function fx(currency?: string | null): Promise<number> {
    const code = (currency || "USD").toUpperCase();
    if (cache.has(code)) return cache.get(code)!;
    const row = await prisma.fxRate.findUnique({ where: { currency: code } });
    const rate = row ? Number(row.rateToUsd) : 1;
    cache.set(code, rate);
    return rate;
  };
}

/** Multiply a decimal-as-string (or null) by rate, returning the same shape. */
export function mulMoney(v: string | null | undefined, rate: number): string {
  if (v == null) return "0";
  if (rate === 1) return v;
  return (Number(v) * rate).toFixed(4);
}

/** Multiply a decimal-as-string (or null) by rate, keeping null when input is null. */
export function mulMoneyOpt(v: string | null | undefined, rate: number): string | null {
  if (v == null) return null;
  if (rate === 1) return v;
  return (Number(v) * rate).toFixed(4);
}
