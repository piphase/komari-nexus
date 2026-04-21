import { useEffect, useState } from "react";

import { useRPC2Call } from "@/contexts/RPC2Context";

interface PingRecord {
  client: string;
  task_id: number;
  time: string;
  value: number;
}

interface TaskInfo {
  id: number;
  name: string;
  interval: number;
  loss: number;
  p99?: number;
  p50?: number;
  p99_p50_ratio?: number;
}

interface PingStats {
  avgLoss: number;
  avgVolatility: number;
  hasData: boolean;
}

interface UsePingStatsOptions {
  enabled?: boolean;
}

const EMPTY_PING_STATS: PingStats = {
  avgLoss: 0,
  avgVolatility: 0,
  hasData: false,
};

const pingStatsCache = new Map<string, PingStats>();
const pingStatsInflight = new Map<string, Promise<PingStats>>();

function getPingStatsCacheKey(uuid: string, hours: number) {
  return `${uuid}:${hours}`;
}

function normalizePingStats(
  result:
    | {
        records?: PingRecord[];
        tasks?: TaskInfo[];
        basic_info?: TaskInfo[];
      }
    | null
    | undefined,
): PingStats {
  const records = result?.records || [];
  const tasks = result?.tasks || result?.basic_info || [];

  if (records.length === 0 || tasks.length === 0) {
    return EMPTY_PING_STATS;
  }

  const totalLoss = tasks.reduce((sum, task) => sum + (task.loss || 0), 0);
  const avgLoss = tasks.length > 0 ? totalLoss / tasks.length : 0;

  const volatilityValues = tasks
    .filter((task) => task.p99_p50_ratio !== undefined && task.p99_p50_ratio > 0)
    .map((task) => task.p99_p50_ratio!);

  const avgVolatility =
    volatilityValues.length > 0
      ? volatilityValues.reduce((sum, value) => sum + value, 0) / volatilityValues.length
      : 0;

  return {
    avgLoss,
    avgVolatility,
    hasData: true,
  };
}

export function usePingStats(
  uuid: string,
  hours: number = 24,
  options: UsePingStatsOptions = {},
): PingStats {
  const { call } = useRPC2Call();
  const enabled = options.enabled ?? true;
  const cacheKey = getPingStatsCacheKey(uuid, hours);
  const [stats, setStats] = useState<PingStats>(() => pingStatsCache.get(cacheKey) ?? EMPTY_PING_STATS);

  useEffect(() => {
    if (!uuid) {
      setStats(EMPTY_PING_STATS);
      return;
    }

    if (!enabled) {
      return;
    }

    const cachedStats = pingStatsCache.get(cacheKey);
    if (cachedStats) {
      setStats(cachedStats);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        type RpcResp = {
          count: number;
          records: PingRecord[];
          tasks?: TaskInfo[];
          basic_info?: TaskInfo[];
          from?: string;
          to?: string;
        };

        let request = pingStatsInflight.get(cacheKey);
        if (!request) {
          request = call<any, RpcResp>("common:getRecords", {
            uuid,
            type: "ping",
            hours,
          })
            .then((result) => {
              const normalized = normalizePingStats(result);
              pingStatsCache.set(cacheKey, normalized);
              return normalized;
            })
            .catch(() => EMPTY_PING_STATS)
            .finally(() => {
              pingStatsInflight.delete(cacheKey);
            });

          pingStatsInflight.set(cacheKey, request);
        }

        const nextStats = await request;
        if (!cancelled) {
          setStats(nextStats);
        }
      } catch {
        if (!cancelled) {
          setStats(EMPTY_PING_STATS);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, call, enabled, hours, uuid]);

  return stats;
}
