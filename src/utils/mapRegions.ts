import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import type { LiveData } from "@/types/LiveData";
import { resolveFlagCode } from "@/utils/flag";
import { emojiToRegionMap } from "@/utils/regionHelper";

type RegionStatus = "online" | "offline" | "partial";

type RegionMeta = {
  key: string;
  label: string;
  mapName: string;
  flagCode: string;
};

const regionCountryMetaByFlagCode: Record<string, RegionMeta> = {
  US: { key: "US", label: "United States", mapName: "United States of America", flagCode: "US" },
  CA: { key: "CA", label: "Canada", mapName: "Canada", flagCode: "CA" },
  BR: { key: "BR", label: "Brazil", mapName: "Brazil", flagCode: "BR" },
  GB: { key: "GB", label: "United Kingdom", mapName: "United Kingdom", flagCode: "GB" },
  FR: { key: "FR", label: "France", mapName: "France", flagCode: "FR" },
  DE: { key: "DE", label: "Germany", mapName: "Germany", flagCode: "DE" },
  NL: { key: "NL", label: "Netherlands", mapName: "Netherlands", flagCode: "NL" },
  ES: { key: "ES", label: "Spain", mapName: "Spain", flagCode: "ES" },
  IT: { key: "IT", label: "Italy", mapName: "Italy", flagCode: "IT" },
  TR: { key: "TR", label: "Turkey", mapName: "Turkey", flagCode: "TR" },
  RU: { key: "RU", label: "Russia", mapName: "Russia", flagCode: "RU" },
  IN: { key: "IN", label: "India", mapName: "India", flagCode: "IN" },
  SG: { key: "SG", label: "Singapore", mapName: "Singapore", flagCode: "SG" },
  HK: { key: "HK", label: "Hong Kong", mapName: "Hong Kong", flagCode: "HK" },
  MO: { key: "MO", label: "Macau", mapName: "Macao", flagCode: "MO" },
  CN: { key: "CN", label: "China", mapName: "China", flagCode: "CN" },
  TW: { key: "TW", label: "Taiwan", mapName: "Taiwan", flagCode: "TW" },
  JP: { key: "JP", label: "Japan", mapName: "Japan", flagCode: "JP" },
  KR: { key: "KR", label: "South Korea", mapName: "South Korea", flagCode: "KR" },
  AU: { key: "AU", label: "Australia", mapName: "Australia", flagCode: "AU" },
  ZA: { key: "ZA", label: "South Africa", mapName: "South Africa", flagCode: "ZA" },
};

export interface MapRegionSummary {
  emoji: string;
  key: string;
  label: string;
  mapName: string;
  flagCode: string;
  total: number;
  online: number;
  offline: number;
  status: RegionStatus;
  nodes: NodeBasicInfo[];
}

export interface MapViewSummary {
  regions: MapRegionSummary[];
  totalNodes: number;
  onlineNodes: number;
  offlineNodes: number;
  unmappedNodes: NodeBasicInfo[];
}

function getRegionStatus(online: number, offline: number): RegionStatus {
  if (online === 0) {
    return "offline";
  }

  if (offline === 0) {
    return "online";
  }

  return "partial";
}

function resolveRegionMeta(region: string): RegionMeta | null {
  const flagCode = resolveFlagCode(region);
  const predefined = regionCountryMetaByFlagCode[flagCode];
  if (predefined) {
    return predefined;
  }

  const regionInfo = emojiToRegionMap[region];
  if (!regionInfo) {
    return null;
  }

  return {
    key: flagCode,
    label: regionInfo.en,
    mapName: regionInfo.en,
    flagCode,
  };
}

export function buildMapViewSummary(
  nodes: NodeBasicInfo[],
  liveData: LiveData
): MapViewSummary {
  const onlineSet = new Set(liveData?.online ?? []);
  const regionMap = new Map<string, MapRegionSummary>();
  const unmappedNodes: NodeBasicInfo[] = [];

  for (const node of nodes) {
    const regionMeta = resolveRegionMeta(node.region);

    if (!regionMeta) {
      unmappedNodes.push(node);
      continue;
    }

    const existing = regionMap.get(regionMeta.key);

    if (existing) {
      existing.nodes.push(node);
      existing.total += 1;
      if (onlineSet.has(node.uuid)) {
        existing.online += 1;
      } else {
        existing.offline += 1;
      }
      existing.status = getRegionStatus(existing.online, existing.offline);
      continue;
    }

    regionMap.set(regionMeta.key, {
      emoji: node.region,
      key: regionMeta.key,
      label: regionMeta.label,
      mapName: regionMeta.mapName,
      flagCode: regionMeta.flagCode,
      total: 1,
      online: onlineSet.has(node.uuid) ? 1 : 0,
      offline: onlineSet.has(node.uuid) ? 0 : 1,
      status: onlineSet.has(node.uuid) ? "online" : "offline",
      nodes: [node],
    });
  }

  const regions = Array.from(regionMap.values()).sort((left, right) => {
    if (right.total !== left.total) {
      return right.total - left.total;
    }

    if (right.online !== left.online) {
      return right.online - left.online;
    }

    return left.label.localeCompare(right.label);
  });

  const onlineNodes = nodes.filter((node) => onlineSet.has(node.uuid)).length;
  const offlineNodes = nodes.length - onlineNodes;

  return {
    regions,
    totalNodes: nodes.length,
    onlineNodes,
    offlineNodes,
    unmappedNodes,
  };
}
