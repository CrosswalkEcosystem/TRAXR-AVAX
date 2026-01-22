import { NextRequest } from "next/server";

import { getPoolTrend } from "@/lib/traxrTrendService";
import { getTopPools, getTraxrScore } from "@/lib/traxrService";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status });

const notFound = (message = "Not found") =>
  json({ error: message }, 404);

function decodeSlug(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug?: string[] }> },
) {
  const { slug = [] } = await context.params;
  const [resource, id] = slug;

  if (!resource) {
    return notFound("Missing endpoint");
  }

  try {
    switch (resource) {
      case "score": {
        const mintA = request.nextUrl.searchParams.get("mintA");
        const mintB = request.nextUrl.searchParams.get("mintB");

        if (!mintA || !mintB) {
          return json(
            { error: "mintA and mintB are required" },
            400,
          );
        }

        const score = await getTraxrScore(mintA, mintB);
        if (!score) {
          return notFound("No AVAX pool found for pair");
        }
        return json(score);
      }
      case "pools": {
        if (id) {
          const poolId = decodeSlug(id);
          const pools = await getTopPools();
          const pool = pools.find((item) => item.poolId === poolId);
          if (!pool) return notFound("Pool not found");
          return json(pool);
        }

        const pools = await getTopPools();
        return json(pools);
      }
      case "pool-trend": {
        const poolId = request.nextUrl.searchParams.get("poolId") || "";
        if (!poolId) {
          return json({ error: "Missing poolId" }, 400);
        }

        const trend = getPoolTrend(poolId);
        return json(trend);
      }
      case "alerts": {
        const pools = await getTopPools();
        const alerts = pools
          .filter((pool) => pool.warnings?.length)
          .map((pool) => ({
            poolId: pool.poolId,
            score: pool.score,
            ctsNodes: pool.ctsNodes,
            warnings: pool.warnings,
            tokenAName: pool.tokenAName,
            tokenASymbol: pool.tokenASymbol,
            tokenBName: pool.tokenBName,
            tokenBSymbol: pool.tokenBSymbol,
            updatedAt: pool.updatedAt,
          }));

        return json({ count: alerts.length, alerts });
      }
      default:
        return notFound("Unknown endpoint");
    }
  } catch (e) {
    console.error("[TRAXR] API error", e);
    return json({ error: "Internal error" }, 500);
  }
}
