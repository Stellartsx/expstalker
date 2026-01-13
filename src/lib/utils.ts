export function uid(prefix = "s") {
  const a = crypto.getRandomValues(new Uint8Array(16));
  const b = Array.from(a)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}_${b}`;
}

export function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function safeJsonParse<T>(s: string, fallback: T) {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export function nowMs() {
  return Date.now();
}

export function formatHhMm(ts: number) {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
