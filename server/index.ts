import express from "express";
import cors from "cors";
import zlib from "zlib";
import { parseXmlTv } from "./xmltv";

const app = express();
app.use(express.json({ limit: "40mb" }));
app.use(cors());

const port = 3000;

const defaultUserAgent =
  "Mozilla/5.0 (Linux; Android 10; MAG 250) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

function assertUrl(u: string) {
  const url = new URL(u);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid URL protocol");
  return url;
}

function normalizePortalBase(raw: string) {
  const u = new URL(raw);
  const p = u.pathname || "";
  if (p.includes("/stalker_portal")) {
    const base = p.split("/stalker_portal")[0] + "/stalker_portal";
    u.pathname = base;
    u.search = "";
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  }
  u.pathname = "";
  u.search = "";
  u.hash = "";
  return u.toString().replace(/\/$/, "");
}

function apiUrl(portalBase: string, params: Record<string, string>) {
  const u = new URL(portalBase + "/server/load.php");
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}

function stbHeaders(portalBase: string, userAgent?: string, referer?: string) {
  const ua = userAgent || defaultUserAgent;
  const ref = referer || portalBase + "/c/";
  return {
    "User-Agent": ua,
    "X-User-Agent": "STB: MAG",
    Accept: "application/json, text/plain, */*",
    Referer: ref,
    Origin: portalBase
  } as Record<string, string>;
}

function stbCookie(mac: string, token?: string, stb_lang?: string, timezone?: string) {
  const lang = stb_lang || "en";
  const tz = timezone || "Europe/London";
  const parts = [`mac=${encodeURIComponent(mac)}`, `stb_lang=${lang}`, `timezone=${tz}`];
  if (token) parts.push(`token=${token}`);
  return parts.join("; ");
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const ac = new AbortController();
  const id = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, redirect: "follow", signal: ac.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

app.get("/health", (_, res) => res.send("OK"));

app.get("/api/proxy", async (req, res) => {
  try {
    const u = String(req.query.u || "");
    const method = String(req.query.m || "GET").toUpperCase();
    const timeoutMs = Math.max(3000, Math.min(120000, Number(req.query.t || 60000)));

    const url = assertUrl(u);

    const hdr: Record<string, string> = {};
    const ua = req.headers["user-agent"];
    if (ua) hdr["User-Agent"] = String(ua);
    const referer = req.headers["referer"];
    if (referer) hdr["Referer"] = String(referer);

    const range = req.headers["range"];
    if (range) hdr["Range"] = String(range);

    const cookie = req.headers["cookie"];
    if (cookie) hdr["Cookie"] = String(cookie);

    const accept = req.headers["accept"];
    if (accept) hdr["Accept"] = String(accept);

    const target = await fetchWithTimeout(url.toString(), { method, headers: hdr }, timeoutMs);

    res.status(target.status);

    const pass = ["content-type", "content-length", "accept-ranges", "content-range", "location"];
    target.headers.forEach((v, k) => {
      if (pass.includes(k.toLowerCase())) res.setHeader(k, v);
    });

    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Accept-Ranges", "bytes");

    if (!target.body) {
      res.end();
      return;
    }

    const reader = target.body.getReader();
    res.on("close", () => {
      try {
        reader.cancel();
      } catch {}
    });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) res.write(Buffer.from(value));
    }
    res.end();
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.post("/api/m3u/import", async (req, res) => {
  try {
    const url = String(req.body?.url || "");
    const userAgent = String(req.body?.userAgent || defaultUserAgent);
    const referer = String(req.body?.referer || "");
    assertUrl(url);

    const headers: Record<string, string> = {
      "User-Agent": userAgent,
      Accept: "*/*"
    };
    if (referer) headers["Referer"] = referer;

    const r = await fetchWithTimeout(url, { headers }, 90000);
    if (!r.ok) throw new Error(`M3U fetch failed: ${r.status}`);

    const text = await r.text();
    const channels = parseM3u(text);

    res.json({ count: channels.length, channels });
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.post("/api/epg/import", async (req, res) => {
  try {
    const url = String(req.body?.url || "");
    const userAgent = String(req.body?.userAgent || defaultUserAgent);
    const referer = String(req.body?.referer || "");
    assertUrl(url);

    const headers: Record<string, string> = {
      "User-Agent": userAgent,
      Accept: "*/*"
    };
    if (referer) headers["Referer"] = referer;

    const r = await fetchWithTimeout(url, { headers }, 90000);
    if (!r.ok) throw new Error(`EPG fetch failed: ${r.status}`);

    const ct = String(r.headers.get("content-type") || "");
    const ab = await r.arrayBuffer();
    let buf = Buffer.from(new Uint8Array(ab));

    const isGz =
      url.toLowerCase().endsWith(".gz") ||
      /gzip|x-gzip|application\/gzip|application\/x-gzip/i.test(ct);

    if (isGz) {
      try {
        buf = zlib.gunzipSync(buf);
      } catch {
        buf = zlib.inflateSync(buf);
      }
    }

    const xml = buf.toString("utf8");
    const parsed = await parseXmlTv(xml);

    res.json({
      channelCount: parsed.channels.length,
      programmeCount: parsed.programmes.length,
      channels: parsed.channels
    });
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.post("/api/stb/connect", async (req, res) => {
  try {
    const portal = String(req.body?.portal || "");
    const mac = String(req.body?.mac || "");
    const stb_lang = String(req.body?.stb_lang || "en");
    const timezone = String(req.body?.timezone || "Europe/London");
    const userAgent = String(req.body?.userAgent || defaultUserAgent);
    const referer = String(req.body?.referer || "");

    if (!portal || !mac) throw new Error("portal and mac required");

    const base = normalizePortalBase(portal);
    const h = stbHeaders(base, userAgent, referer);
    const cookie = stbCookie(mac, undefined, stb_lang, timezone);

    const url = apiUrl(base, {
      type: "stb",
      action: "handshake",
      mac,
      JsHttpRequest: "1-xml"
    });

    const j = await stbJson(url, { ...h, Cookie: cookie }, 60000);

    const token =
      String(j?.js?.token || j?.js?.api_token || j?.js?.token_key || "").trim();

    if (!token) throw new Error("handshake returned no token");

    res.json({ base, token });
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.post("/api/stb/channels", async (req, res) => {
  try {
    const portal = String(req.body?.portal || "");
    const mac = String(req.body?.mac || "");
    const token = String(req.body?.token || "");
    const stb_lang = String(req.body?.stb_lang || "en");
    const timezone = String(req.body?.timezone || "Europe/London");
    const userAgent = String(req.body?.userAgent || defaultUserAgent);
    const referer = String(req.body?.referer || "");

    if (!portal || !mac || !token) throw new Error("portal, mac, token required");

    const base = normalizePortalBase(portal);
    const h = stbHeaders(base, userAgent, referer);
    const cookie = stbCookie(mac, token, stb_lang, timezone);

    const url = apiUrl(base, {
      type: "itv",
      action: "get_all_channels",
      mac,
      JsHttpRequest: "1-xml"
    });

    const j = await stbJson(
      url,
      { ...h, Cookie: cookie, Authorization: `Bearer ${token}` },
      90000
    );

    res.json({ raw: j });
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.post("/api/stb/create_link", async (req, res) => {
  try {
    const portal = String(req.body?.portal || "");
    const mac = String(req.body?.mac || "");
    const token = String(req.body?.token || "");
    const cmd = String(req.body?.cmd || "");
    const stb_lang = String(req.body?.stb_lang || "en");
    const timezone = String(req.body?.timezone || "Europe/London");
    const userAgent = String(req.body?.userAgent || defaultUserAgent);
    const referer = String(req.body?.referer || "");

    if (!portal || !mac || !token || !cmd) throw new Error("portal, mac, token, cmd required");

    const base = normalizePortalBase(portal);
    const h = stbHeaders(base, userAgent, referer);
    const cookie = stbCookie(mac, token, stb_lang, timezone);

    const url = apiUrl(base, {
      type: "itv",
      action: "create_link",
      cmd,
      mac,
      JsHttpRequest: "1-xml"
    });

    const j = await stbJson(
      url,
      { ...h, Cookie: cookie, Authorization: `Bearer ${token}` },
      90000
    );

    res.json({ raw: j });
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

async function stbJson(url: string, headers: Record<string, string>, timeoutMs: number) {
  const r = await fetchWithTimeout(url, { headers }, timeoutMs);
  if (!r.ok) throw new Error(`STB request failed: ${r.status}`);
  const t = await r.text();
  try {
    return JSON.parse(t);
  } catch {
    return { rawText: t };
  }
}

type M3uChannel = {
  name: string;
  url: string;
  tvgId?: string;
  tvgName?: string;
  logo?: string;
  group?: string;
};

function parseM3u(text: string): M3uChannel[] {
  const lines = text.split(/\r?\n/).map((x) => x.trim());
  const out: M3uChannel[] = [];
  let current: Partial<M3uChannel> | null = null;

  const pickAttr = (line: string, key: string) => {
    const re = new RegExp(`${key}="([^"]*)"`, "i");
    const m = line.match(re);
    return m ? m[1] : undefined;
  };

  for (const l of lines) {
    if (!l) continue;
    if (l.startsWith("#EXTINF")) {
      current = {};
      current.tvgId = pickAttr(l, "tvg-id");
      current.tvgName = pickAttr(l, "tvg-name");
      current.logo = pickAttr(l, "tvg-logo");
      current.group = pickAttr(l, "group-title");
      const nm = l.match(/,(.*)$/);
      current.name = (nm ? nm[1] : "").trim();
      continue;
    }
    if (current && !l.startsWith("#")) {
      current.url = l;
      if (current.name && current.url) out.push(current as M3uChannel);
      current = null;
    }
  }
  return out;
}

app.listen(port, () => {
  process.stdout.write(`Apex Live backend http://localhost:${port}\n`);
});
