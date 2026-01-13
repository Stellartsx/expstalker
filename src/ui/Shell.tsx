import { ReactNode } from "react";
import Smoke from "./Smoke";
import Glass from "./Glass";

export default function Shell(props: {
  route: string;
  onRoute: (r: any) => void;
  children: ReactNode;
}) {
  return (
    <div className="relative w-screen h-screen">
      <div className="glow" />
      <div className="noise" />
      <Smoke />

      <div className="relative z-10 w-full h-full p-5 md:p-8">
        <div className="max-w-7xl mx-auto h-full flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <div className="text-2xl md:text-3xl font-semibold tracking-wide">Apex Live</div>
              <div className="text-xs opacity-75">support t.me/apexservers • dev t.me/x_ifeelram [ Stellar ]</div>
            </div>
            <div className="flex gap-2">
              <NavButton onClick={() => props.onRoute("home")} active={props.route === "home"}>
                Home
              </NavButton>
              <NavButton onClick={() => props.onRoute("sources")} active={props.route === "sources"}>
                Sources
              </NavButton>
              <NavButton onClick={() => props.onRoute("live")} active={props.route === "live"}>
                Live
              </NavButton>
              <NavButton onClick={() => props.onRoute("storage")} active={props.route === "storage"}>
                Storage
              </NavButton>
            </div>
          </div>

          <Glass className="flex-1 overflow-hidden">
            <div className="h-full w-full p-4 md:p-6 overflow-auto">{props.children}</div>
          </Glass>
        </div>
      </div>
    </div>
  );
}

function NavButton(props: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={props.onClick}
      className={`px-3 py-2 rounded-xl text-sm transition border ${
        props.active
          ? "bg-white/10 border-white/18"
          : "bg-black/20 border-white/10 hover:bg-white/8 hover:border-white/14"
      }`}
    >
      {props.children}
    </button>
  );
}
