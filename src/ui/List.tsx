import { ReactNode } from "react";
import Glass from "./Glass";

export function Card(props: { children: ReactNode; className?: string }) {
  return <Glass className={`p-4 ${props.className || ""}`}>{props.children}</Glass>;
}

export function Row(props: { left: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-white/8 last:border-b-0">
      <div className="min-w-0">{props.left}</div>
      <div className="shrink-0">{props.right}</div>
    </div>
  );
}
