import { useEffect, useMemo, useRef } from "react";

type P = { x: number; y: number; r: number; vx: number; vy: number; a: number; da: number };

export default function Smoke() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const parts = useMemo<P[]>(() => {
    const n = 26;
    const arr: P[] = [];
    for (let i = 0; i < n; i++) {
      arr.push({
        x: Math.random(),
        y: 0.2 + Math.random() * 0.9,
        r: 0.08 + Math.random() * 0.18,
        vx: (Math.random() - 0.5) * 0.018,
        vy: (Math.random() - 0.5) * 0.012,
        a: 0.07 + Math.random() * 0.06,
        da: (Math.random() - 0.5) * 0.0006
      });
    }
    return arr;
  }, []);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const ctx = c.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;

    const resize = () => {
      const rect = c.getBoundingClientRect();
      w = Math.floor(rect.width * dpr);
      h = Math.floor(rect.height * dpr);
      c.width = w;
      c.height = h;
    };

    resize();
    window.addEventListener("resize", resize);

    let raf = 0;

    const step = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "screen";

      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.a += p.da;

        if (p.x < -0.2) p.x = 1.2;
        if (p.x > 1.2) p.x = -0.2;
        if (p.y < -0.2) p.y = 1.2;
        if (p.y > 1.2) p.y = -0.2;

        if (p.a < 0.02) p.a = 0.02;
        if (p.a > 0.18) p.a = 0.18;

        const gx = p.x * w;
        const gy = p.y * h;
        const gr = p.r * Math.min(w, h);

        const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
        g.addColorStop(0, `rgba(255,255,255,${p.a})`);
        g.addColorStop(1, `rgba(255,255,255,0)`);

        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(gx, gy, gr, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [parts]);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full opacity-70" />;
}
