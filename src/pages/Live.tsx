import { useEffect, useMemo, useState } from "react";
import ReactPlayer from "react-player";
import { loadState, saveState } from "../lib/storage";
import type { AnySource, LiveChannel, PortalSource, StbSession } from "../lib/types";
import { Btn, Field, Input, Select } from "../ui/Controls";
import { Card, Row } from "../ui/List";
import { proxiedUrl, stbConnect, stbCreateLink } from "../lib/api";

export default function Live() {
  const [state, setState] = useState(() => loadState());
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const sources = useMemo(() => state.sources.filter((s) => s.enabled), [state.sources]);

  const channels = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = state.live.channels || [];
    if (!q) return list;
    return list.filter((c) => (c.name || "").toLowerCase().includes(q));
  }, [state.live.channels, filter]);

  const active = useMemo(() => {
    const id = state.live.activeId;
    return channels.find((c) => c.id === id) || (id ? state.live.channels.find((c) => c.id === id) : undefined);
  }, [channels, state.live.activeId, state.live.channels]);

  const setActive = (c: LiveChannel) => {
    const next = { ...state, live: { ...state.live, activeId: c.id } };
    setState(next);
    saveState(next);
  };

  const play = async () => {
    setMsg("");
    const c = active;
    if (!c) return;
    if (c.sourceKind === "m3u") {
      const playUrl = proxiedUrl(c.streamUrl || c.id);
      const next = { ...state, live: { ...state.live, playingUrl: playUrl } };
      setState(next);
      saveState(next);
      return;
    }
    if (c.sourceKind === "portal") {
      setBusy(true);
      try {
        const src = sources.find((x) => x.kind === "portal" && x.id === c.sourceId) as PortalSource | undefined;
        if (!src) throw new Error("Portal source not found");
        const session = await stbConnect(src);
        const link = await stbCreateLink(src, session as StbSession, c.cmd || "");
        const url = resolveCreateLink(link.raw);
        if (!url) throw new Error("create_link returned no url");
        const playUrl = proxiedUrl(url);
        const next = { ...state, live: { ...state.live, playingUrl: playUrl } };
        setState(next);
        saveState(next);
      } catch (e: any) {
        setMsg(String(e?.message || e));
      } finally {
        setBusy(false);
      }
    }
  };

  useEffect(() => {
    if (!state.live.channels || state.live.channels.length === 0) {
      const seeded = seedFromM3u(state, sources);
      if (seeded !== state) {
        setState(seeded);
        saveState(seeded);
      }
    }
  }, []);

  return (
    <div className="grid lg:grid-cols-[420px_1fr] gap-4 h-full">
      <Card className="h-full overflow-hidden">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Field label="Search channels">
              <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search..." />
            </Field>
          </div>
          <Btn tone="primary" onClick={play}>
            {busy ? "Working..." : "Play"}
          </Btn>
        </div>

        {msg ? <div className="text-sm opacity-85 mt-2">{msg}</div> : null}

        <div className="mt-4 overflow-auto max-h-[calc(100vh-260px)] pr-1">
          {channels.map((c) => (
            <div key={c.id} className="cursor-pointer" onClick={() => setActive(c)}>
              <Row
                left={
                  <div className="flex items-center gap-3">
                    {c.logo ? (
                      <img
                        src={proxiedUrl(c.logo)}
                        className="w-10 h-10 rounded-xl object-cover border border-white/10"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-white/6 border border-white/10" />
                    )}
                    <div className="min-w-0">
                      <div className="font-medium truncate">{c.name}</div>
                      <div className="text-xs opacity-70">{c.sourceKind.toUpperCase()}</div>
                    </div>
                  </div>
                }
                right={
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      state.live.activeId === c.id ? "bg-white/70" : "bg-white/15"
                    }`}
                  />
                }
              />
            </div>
          ))}
        </div>
      </Card>

      <Card className="h-full overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-semibold truncate">{active?.name || "No channel selected"}</div>
            <div className="text-xs opacity-70">Playback via inbuilt proxy to avoid CORS.</div>
          </div>
          <div className="flex gap-2">
            <Btn
              onClick={() => {
                const next = { ...state, live: { ...state.live, playingUrl: undefined } };
                setState(next);
                saveState(next);
              }}
            >
              Stop
            </Btn>
          </div>
        </div>

        <div className="mt-4 w-full h-[calc(100vh-260px)] rounded-2xl overflow-hidden border border-white/10 bg-black/35">
          {state.live.playingUrl ? (
            <ReactPlayer url={state.live.playingUrl} width="100%" height="100%" controls playing />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm opacity-75">
              Select a channel and press Play.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function resolveCreateLink(raw: any): string | null {
  const js = raw?.js ?? raw;
  const u = js?.cmd || js?.url || js?.link || js?.tmp || js?.stream;
  if (typeof u === "string" && u.startsWith("http")) return u;
  if (typeof js?.cmd === "string" && js.cmd.includes("http")) {
    const m = js.cmd.match(/(https?:\/\/[^\s'"]+)/);
    return m ? m[1] : null;
  }
  return null;
}

function seedFromM3u(state: any, sources: AnySource[]) {
  const m3u = sources.filter((s) => s.kind === "m3u");
  if (m3u.length === 0) return state;
  const cache = state.m3uCache || {};
  const live: LiveChannel[] = [...(state.live.channels || [])];

  for (const src of m3u as any[]) {
    const c = cache[src.id];
    if (!c?.channels?.length) continue;
    for (let i = 0; i < c.channels.length; i++) {
      const ch = c.channels[i];
      const id = `m3u_${src.id}_${i}`;
      live.push({
        id,
        name: ch.name || `Channel ${i + 1}`,
        logo: ch.logo,
        group: ch.group,
        sourceId: src.id,
        sourceKind: "m3u",
        streamUrl: ch.url
      });
    }
  }

  const uniq = new Map<string, LiveChannel>();
  for (const c of live) uniq.set(c.id, c);

  return { ...state, live: { ...state.live, channels: Array.from(uniq.values()) } };
}
