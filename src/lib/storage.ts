import { createClient } from "@supabase/supabase-js";
import type { AnySource, LiveChannel } from "./types";
import { safeJsonParse } from "./utils";

const LS_KEY = "apex_live_state_v1";

export type EpgProgramme = {
  channel: string;
  start: string;
  stop: string;
  title: string;
  desc?: string;
};

export type AppState = {
  sources: AnySource[];
  m3uCache: Record<string, { fetchedAt: number; channels: any[] }>;
  epgCache: Record<
    string,
    { fetchedAt: number; channels: any[]; programmes: EpgProgramme[] }
  >;
  live: {
    channels: LiveChannel[];
    activeId?: string;
    playingUrl?: string;
  };
};

export function defaultState(): AppState {
  return {
    sources: [],
    m3uCache: {},
    epgCache: {},
    live: { channels: [], activeId: undefined, playingUrl: undefined }
  };
}

export function loadState(): AppState {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return defaultState();
  const parsed = safeJsonParse<AppState>(raw, defaultState());
  return {
    ...defaultState(),
    ...parsed,
    live: { ...defaultState().live, ...(parsed.live || {}) },
    m3uCache: parsed.m3uCache || {},
    epgCache: parsed.epgCache || {}
  };
}

export function saveState(state: AppState) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

export function supabaseClient() {
  const url = (import.meta as any).env?.VITE_SUPABASE_URL || "";
  const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function supabasePush(state: AppState, userKey: string) {
  const sb = supabaseClient();
  if (!sb) throw new Error("Supabase env not configured");
  const { error } = await sb
    .from("apex_live")
    .upsert({ key: userKey, payload: state }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}

export async function supabasePull(userKey: string) {
  const sb = supabaseClient();
  if (!sb) throw new Error("Supabase env not configured");
  const { data, error } = await sb
    .from("apex_live")
    .select("payload")
    .eq("key", userKey)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.payload) throw new Error("No data found for key");
  return data.payload as AppState;
}
