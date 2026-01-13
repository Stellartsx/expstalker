import { useEffect, useMemo, useState } from "react";
import { loadState, saveState } from "../lib/storage";
import type { AppState } from "../lib/storage";
import type { AnySource, EpgSource, M3uSource, PortalSource } from "../lib/types";
import { clamp, uid } from "../lib/utils";
import { Btn, Field, Input, Select } from "../ui/Controls";
import { Card, Row } from "../ui/List";
import { importEpg, importM3u, stbChannels, stbConnect } from "../lib/api";
import { startScheduler } from "../lib/scheduler";

const defaultUA =
  "Mozilla/5.0 (Linux; Android 10; MAG 250) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

export default function Sources() {
  const [state, setState] = useState(() => loadState());
  const [kind, setKind] = useState<AnySource["kind"]>("portal");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string>("");

  const sources = useMemo(() => state.sources, [state.sources]);

  const add = () => {
    if (kind === "portal") {
      const s: PortalSource = {
        id: uid("p"),
        kind: "portal",
        name: "New Portal",
        portal: "",
        mac: "",
        stb_lang: "en",
        timezone: "Europe/London",
        userAgent: defaultUA,
        referer: "",
        refreshSec: 900,
        enabled: true
      };
      const next = { ...state, sources: [s, ...state.sources] };
      setState(next);
      saveState(next);
      return;
    }
    if (kind === "m3u") {
      const s: M3uSource = {
        id: uid("m"),
        kind: "m3u",
        name: "New M3U",
        url: "",
        userAgent: defaultUA,
        referer: "",
        refreshSec: 900,
        enabled: true
      };
      const next = { ...state, sources: [s, ...state.sources] };
      setState(next);
      saveState(next);
      return;
    }
    const s: EpgSource = {
      id: uid("e"),
      kind: "epg",
      name: "New EPG",
      url: "",
      userAgent: defaultUA,
      referer: "",
      refreshSec: 3600,
      enabled: true
    };
    const next = { ...state, sources: [s, ...state.sources] };
    setState(next);
    saveState(next);
  };

  const update = (id: string, patch: Partial<AnySource>) => {
    const nextSources = state.sources.map((s) => (s.id === id ? ({ ...s, ...patch } as AnySource) : s));
    const next = { ...state, sources: nextSources };
    setState(next);
    saveState(next);
  };

  const remove = (id: string) => {
    const next = { ...state, sources: state.sources.filter((s) => s.id !== id) };
    setState(next);
    saveState(next);
  };

  const refreshOne = async (s: AnySource) => {
    setMsg("");
    setBusyId(s.id);
    try {
      if (s.kind === "m3u") {
        const r = await importM3u(s);
        const next: AppState = {
          ...state,
          m3uCache: { ...state.m3uCache, [s.id]: { fetchedAt: Date.now(), channels: r.channels } }
        };
        setState(next);
        saveState(next);
        setMsg(`M3U imported: ${r.count} channels`);
      } else if (s.kind === "epg") {
        const r = await importEpg(s);
        const next: AppState = {
          ...state,
          epgCache: {
            ...state.epgCache,
            [s.id]: { fetchedAt: Date.now(), channels: r.channels, programmes: r.programmes }
          }
        };
        setState(next);
        saveState(next);
        setMsg(`EPG imported: ${r.channelCount} channels, ${r.programmeCount} programmes`);
      } else {
        const session = await stbConnect(s);
        const r = await stbChannels(s, session);
        const rows = normalizeStbChannels(r.raw, s.id);
        const next: AppState = {
          ...state,
          live: { ...state.live, channels: mergeLiveChannels(state.live.channels, rows) }
        };
        setState(next);
        saveState(next);
        setMsg(`Portal synced: ${rows.length} channels`);
      }
    } catch (e: any) {
      setMsg(String(e?.message || e));
    } finally {
      setBusyId(null);
    }
  };

  useEffect(() => {
    const handle = startScheduler(state.sources, async (src) => {
      if (!src.enabled) return;
      await refreshOne(src);
    });
    return () => handle.stop();
  }, [state.sources]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px]">
          <Field label="Add source type">
            <Select value={kind} onChange={(e) => setKind(e.target.value as any)}>
              <option value="portal">Portal (STB)</option>
              <option value="m3u">M3U (remote)</option>
              <option value="epg">EPG (XML / XML.GZ)</option>
            </Select>
          </Field>
        </div>
        <Btn tone="primary" onClick={add}>
          Add
        </Btn>
        {msg ? <div className="text-sm opacity-85">{msg}</div> : null}
      </div>

      <div className="grid gap-4">
        {sources.length === 0 ? (
          <Card>
            <div className="text-sm opacity-80">No sources yet. Add a Portal, M3U, or EPG.</div>
          </Card>
        ) : (
          sources.map((s) => (
            <Card key={s.id}>
              <Row
                left={
                  <div className="flex flex-col">
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-xs opacity-70">
                      {s.kind.toUpperCase()} • refresh {s.refreshSec}s • {s.enabled ? "enabled" : "disabled"}
                    </div>
                  </div>
                }
                right={
                  <div className="flex gap-2">
                    <Btn onClick={() => refreshOne(s)} tone="primary">
                      {busyId === s.id ? "Working..." : "Refresh"}
                    </Btn>
                    <Btn onClick={() => remove(s.id)} tone="danger">
                      Remove
                    </Btn>
                  </div>
                }
              />

              <div className="grid md:grid-cols-2 gap-3 mt-3">
                <Field label="Name">
                  <Input value={s.name} onChange={(e) => update(s.id, { name: e.target.value } as any)} />
                </Field>

                <Field label="Enabled">
                  <Select
                    value={String(s.enabled)}
                    onChange={(e) => update(s.id, { enabled: e.target.value === "true" } as any)}
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </Select>
                </Field>

                <Field label="Refresh seconds">
                  <Input
                    type="number"
                    value={s.refreshSec}
                    onChange={(e) => update(s.id, { refreshSec: clamp(Number(e.target.value || 0), 15, 86400) } as any)}
                  />
                </Field>

                <Field label="User-Agent">
                  <Input
                    value={(s as any).userAgent}
                    onChange={(e) => update(s.id, { userAgent: e.target.value } as any)}
                  />
                </Field>

                <Field label="Referer (optional)">
                  <Input value={(s as any).referer} onChange={(e) => update(s.id, { referer: e.target.value } as any)} />
                </Field>

                {s.kind === "portal" ? (
                  <>
                    <Field label="Portal URL">
                      <Input value={s.portal} onChange={(e) => update(s.id, { portal: e.target.value } as any)} />
                    </Field>
                    <Field label="MAC">
                      <Input value={s.mac} onChange={(e) => update(s.id, { mac: e.target.value } as any)} />
                    </Field>
                    <Field label="stb_lang">
                      <Input value={s.stb_lang} onChange={(e) => update(s.id, { stb_lang: e.target.value } as any)} />
                    </Field>
                    <Field label="timezone">
                      <Input value={s.timezone} onChange={(e) => update(s.id, { timezone: e.target.value } as any)} />
                    </Field>
                  </>
                ) : (
                  <>
                    <Field label="Remote URL">
                      <Input value={(s as any).url} onChange={(e) => update(s.id, { url: e.target.value } as any)} />
                    </Field>
                  </>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function normalizeStbChannels(raw: any, sourceId: string) {
  const list = raw?.js?.data || raw?.js || raw?.data || raw;
  const arr = Array.isArray(list) ? list : Array.isArray(list?.data) ? list.data : [];
  const out = arr
    .map((x: any) => {
      const id = String(x.id ?? x.ch_id ?? x.number ?? "");
      const name = String(x.name ?? x.title ?? "");
      const logo = String(x.logo ?? x.logo_30 ?? x.logo_60 ?? x.picon ?? "");
      const group = String(x.tv_genre_id ?? x.genre_id ?? x.category_id ?? "");
      const cmd = String(x.cmd ?? x.command ?? "");
      if (!id || !name || !cmd) return null;
      return {
        id: `portal_${sourceId}_${id}`,
        name,
        logo: logo || undefined,
        group: group || undefined,
        cmd,
        sourceId,
        sourceKind: "portal" as const
      };
    })
    .filter(Boolean);
  return out as any[];
}

function mergeLiveChannels(existing: any[], incoming: any[]) {
  const map = new Map<string, any>();
  for (const c of existing) map.set(c.id, c);
  for (const c of incoming) map.set(c.id, { ...map.get(c.id), ...c });
  return Array.from(map.values());
}
