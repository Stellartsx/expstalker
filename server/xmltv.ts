import { parseString } from "xml2js";

export type XmlTvChannel = { id: string; name: string };
export type XmlTvProgramme = {
  channel: string;
  start: string;
  stop: string;
  title: string;
  desc?: string;
};

export function xmlToJson(xml: string): Promise<any> {
  return new Promise((resolve, reject) => {
    parseString(
      xml,
      { explicitArray: false, mergeAttrs: true, trim: true },
      (err: Error | null, res: any) => {
        if (err) reject(err);
        else resolve(res);
      }
    );
  });
}

function pickText(v: any): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && typeof v._ === "string") return v._;
  if (Array.isArray(v) && v.length > 0) return pickText(v[0]);
  return "";
}

export async function parseXmlTv(xml: string) {
  const root = await xmlToJson(xml);
  const tv = root?.tv ?? {};
  const ch = ([] as any[]).concat(tv.channel ?? []);
  const pr = ([] as any[]).concat(tv.programme ?? []);
  const channels: XmlTvChannel[] = ch
    .map((c) => ({
      id: String(c.id ?? ""),
      name: pickText(c["display-name"] ?? c.name ?? "")
    }))
    .filter((x) => x.id && x.name);

  const programmes: XmlTvProgramme[] = pr
    .map((p) => ({
      channel: String(p.channel ?? ""),
      start: String(p.start ?? ""),
      stop: String(p.stop ?? ""),
      title: pickText(p.title ?? ""),
      desc: pickText(p.desc ?? "") || undefined
    }))
    .filter((x) => x.channel && x.start && x.stop && x.title);

  return { channels, programmes };
}
