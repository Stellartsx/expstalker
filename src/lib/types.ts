export type SourceKind = "portal" | "m3u" | "epg";

export type PortalSource = {
  id: string;
  kind: "portal";
  name: string;
  portal: string;
  mac: string;
  stb_lang: string;
  timezone: string;
  userAgent: string;
  referer: string;
  refreshSec: number;
  enabled: boolean;
};

export type M3uSource = {
  id: string;
  kind: "m3u";
  name: string;
  url: string;
  userAgent: string;
  referer: string;
  refreshSec: number;
  enabled: boolean;
};

export type EpgSource = {
  id: string;
  kind: "epg";
  name: string;
  url: string;
  userAgent: string;
  referer: string;
  refreshSec: number;
  enabled: boolean;
};

export type AnySource = PortalSource | M3uSource | EpgSource;

export type M3uChannel = {
  name: string;
  url: string;
  tvgId?: string;
  tvgName?: string;
  logo?: string;
  group?: string;
};

export type StbSession = {
  base: string;
  token: string;
};

export type LiveChannel = {
  id: string;
  name: string;
  logo?: string;
  group?: string;
  cmd?: string;
  sourceId: string;
  sourceKind: SourceKind;
  streamUrl?: string;
};
