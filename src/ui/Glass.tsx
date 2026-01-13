import { ReactNode } from "react";

export default function Glass(props: { className?: string; children: ReactNode }) {
  return <div className={`glass rounded-2xl ${props.className || ""}`}>{props.children}</div>;
}
