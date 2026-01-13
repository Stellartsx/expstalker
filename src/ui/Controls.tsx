
import type { ReactNode } from "react";

type Tone = "default" | "primary" | "danger";

const toneClass: Record<Tone, string> = {
  default: "bg-white/10 hover:bg-white/15 border-white/10 text-white",
  primary: "bg-white text-black hover:bg-white/90 border-white/10",
  danger: "bg-red-500/80 hover:bg-red-500 border-red-500/30 text-white"
};

export function Btn(props: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { children, tone = "default", className = "", ...rest } = props;

  return (
    <button
      {...rest}
      className={[
        "px-3 py-2 rounded-xl border text-sm font-medium transition",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        toneClass[tone],
        className
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function Field(props: { label?: string; children: ReactNode; className?: string }) {
  const { label, children, className = "" } = props;
  return (
    <label className={["block", className].join(" ")}>
      {label ? <div className="text-xs opacity-70 mb-1">{label}</div> : null}
      {children}
    </label>
  );
}

export function Input(
  props: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }
) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={[
        "w-full px-3 py-2 rounded-xl border border-white/10 bg-black/25",
        "text-sm outline-none focus:border-white/25",
        className
      ].join(" ")}
    />
  );
}

export function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { className?: string }
) {
  const { className = "", children, ...rest } = props;
  return (
    <select
      {...rest}
      className={[
        "w-full px-3 py-2 rounded-xl border border-white/10 bg-black/25",
        "text-sm outline-none focus:border-white/25",
        className
      ].join(" ")}
    >
      {children}
    </select>
  );
}
