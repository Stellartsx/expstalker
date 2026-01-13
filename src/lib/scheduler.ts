import type { AnySource } from "./types";

export type TickFn = (source: AnySource) => Promise<void> | void;

type Handle = { stop: () => void };

export function startScheduler(
  sources: AnySource[],
  onTick: TickFn
): Handle {
  const timers = new Map<string, number>();
  const running = new Set<string>();

  const stop = () => {
    for (const id of timers.values()) window.clearInterval(id);
    timers.clear();
    running.clear();
  };

  const setup = () => {
    for (const s of sources) {
      if (!s.enabled) continue;
      const sec = Math.max(15, Math.floor(Number(s.refreshSec || 0)));
      const idKey = s.id;
      if (timers.has(idKey)) continue;

      const timer = window.setInterval(async () => {
        if (!s.enabled) return;
        if (running.has(idKey)) return;
        running.add(idKey);
        try {
          await onTick(s);
        } finally {
          running.delete(idKey);
        }
      }, sec * 1000);

      timers.set(idKey, timer);
    }

    for (const [idKey, timer] of Array.from(timers.entries())) {
      const s = sources.find((x) => x.id === idKey);
      if (!s || !s.enabled) {
        window.clearInterval(timer);
        timers.delete(idKey);
        running.delete(idKey);
      }
    }
  };

  setup();

  return {
    stop: () => stop()
  };
}
