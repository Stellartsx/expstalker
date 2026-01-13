import type { EpgSource, M3uChannel, M3uSource, PortalSource, StbSession } from "./types";

const API_BASE = (import.meta as any).env?.VITE_API_BASE || "/api";

function j(body: any) {
  return JSON.stringify(body ?? {});
}

async function post<T>(path: string, body: any): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: j(body)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(String((data as any)?.error || `Request failed ${r.status}`));
  return data as T;
}

export function proxiedUrl(target: string) {
  const u = new URL(`${API_BASE}/proxy`, window.location.origin);
  u.searchParams.set("u", target);
  return u.toString();
}

export async function importM3u(src: M3uSource) {
  return post<{ count: number; channels: M3uChannel[] }>("/m3u/import", {
    url: src.url,
    userAgent: src.userAgent,
    referer: src.referer
  });
}

export async function importEpg(src: EpgSource) {
  return post<{
    channelCount: number;
    programmeCount: number;
    channels: { id: string; name: string }[];
    programmes: { channel: string; start: string; stop: string; title: string; desc?: string }[];
  }>("/epg/import", {
    url: src.url,
    userAgent: src.userAgent,
    referer: src.referer,
    includeProgrammes: true,
    maxProgrammes: 1200000
  });
}

export async function stbConnect(src: PortalSource): Promise<StbSession> {
  return post<StbSession>("/stb/connect", {
    portal: src.portal,
    mac: src.mac,
    stb_lang: src.stb_lang,
    timezone: src.timezone,
    userAgent: src.userAgent,
    referer: src.referer
  });
}

export async function stbChannels(src: PortalSource, session: StbSession) {
  return post<{ raw: any }>("/stb/channels", {
    portal: src.portal,
    mac: src.mac,
    token: session.token,
    stb_lang: src.stb_lang,
    timezone: src.timezone,
    userAgent: src.userAgent,
    referer: src.referer
  });
}

export async function stbCreateLink(src: PortalSource, session: StbSession, cmd: string) {
  return post<{ raw: any }>("/stb/create_link", {
    portal: src.portal,
    mac: src.mac,
    token: session.token,
    cmd,
    stb_lang: src.stb_lang,
    timezone: src.timezone,
    userAgent: src.userAgent,
    referer: src.referer
  });
}
