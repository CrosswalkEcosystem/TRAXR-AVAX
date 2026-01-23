import fs from "fs";
import path from "path";

import { buildWarnings, toScoreResult } from "./scoringAdapter";
import { TraxrTrendPoint } from "./types";
import { normalizePool } from "./traxrService";

const LOCAL_POOLS_DIR = path.join(process.cwd(), "data");

type TrendCache = {
  signature: string;
  byPool: Map<string, TraxrTrendPoint[]>;
};

let trendCache: TrendCache | null = null;

function parseTimestampFromName(
  name: string,
  mtimeMs: number,
): { timestamp: string; source: "filename" | "mtime" } {
  const geckoMatch = name.match(
    /avaxPools_(?:gecko_)?(\d{4}-\d{2}-\d{2}T\d{6}\d{3}Z)/i,
  );
  if (geckoMatch) {
    const raw = geckoMatch[1];
    const iso =
      `${raw.slice(0, 4)}-${raw.slice(5, 7)}-${raw.slice(8, 10)}` +
      `T${raw.slice(11, 13)}:${raw.slice(13, 15)}:${raw.slice(15, 17)}.` +
      `${raw.slice(17, 20)}Z`;
    const date = new Date(iso);
    if (!Number.isNaN(date.getTime())) {
      return { timestamp: date.toISOString(), source: "filename" };
    }
  }

  const match = name.match(/avaxPools_(\d{8})_(\d{6})Z\.json/i);
  if (match) {
    const [yyyymmdd, hhmmss] = [match[1], match[2]];
    const yyyy = yyyymmdd.slice(0, 4);
    const mm = yyyymmdd.slice(4, 6);
    const dd = yyyymmdd.slice(6, 8);
    const hh = hhmmss.slice(0, 2);
    const min = hhmmss.slice(2, 4);
    const ss = hhmmss.slice(4, 6);
    const iso = `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}Z`;
    const date = new Date(iso);
    if (!Number.isNaN(date.getTime())) {
      return { timestamp: date.toISOString(), source: "filename" };
    }
  }
  return { timestamp: new Date(mtimeMs).toISOString(), source: "mtime" };
}

function listSnapshotFiles() {
  try {
    const files = fs.readdirSync(LOCAL_POOLS_DIR);
    return files
      .filter((name) => /^avaxPools_.*\.json$/i.test(name))
      .map((name) => {
        const fullPath = path.join(LOCAL_POOLS_DIR, name);
        const stat = fs.statSync(fullPath);
        const parsed = parseTimestampFromName(name, stat.mtimeMs);
        return {
          name,
          fullPath,
          mtimeMs: stat.mtimeMs,
          timestamp: parsed.timestamp,
          timestampSource: parsed.source,
        };
      })
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  } catch {
    return [];
  }
}

function buildTrendIndex(): TrendCache {
  const files = listSnapshotFiles();
  const signature = files.map((f) => `${f.name}:${f.mtimeMs}`).join("|");

  if (trendCache && trendCache.signature === signature) return trendCache;

  const byPool = new Map<string, TraxrTrendPoint[]>();

  for (const file of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(file.fullPath, "utf8"));
      if (!Array.isArray(raw)) continue;

      let snapshotTimestamp = file.timestamp;
      if (file.timestampSource === "mtime") {
        const candidate = raw.find((entry) => entry?.poolUpdatedAt)?.poolUpdatedAt;
        const parsed = candidate ? new Date(candidate) : null;
        if (parsed && !Number.isNaN(parsed.getTime())) {
          snapshotTimestamp = parsed.toISOString();
        }
      }

      for (const entry of raw) {
        const normalized = normalizePool(entry);
        const { score, nodes, ctsNodes } = toScoreResult(normalized);
        const warnings = buildWarnings(normalized, nodes);

        const point: TraxrTrendPoint = {
          timestamp: snapshotTimestamp,
          score,
          ctsNodes,
          nodes,
          warnings,
          metrics: normalized,
        };

        const list = byPool.get(normalized.poolId) ?? [];
        list.push(point);
        byPool.set(normalized.poolId, list);
      }
    } catch (e) {
      console.warn("[TRAXR-AVAX] trend snapshot parse failed", file.name, e);
    }
  }

  for (const [key, series] of byPool.entries()) {
    series.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    byPool.set(key, series);
  }

  trendCache = { signature, byPool };
  return trendCache;
}

export function getPoolTrend(poolId: string): TraxrTrendPoint[] {
  if (!poolId) return [];
  const cache = buildTrendIndex();
  return cache.byPool.get(poolId) ?? [];
}
