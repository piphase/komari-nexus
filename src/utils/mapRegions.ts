import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import type { LiveData } from "@/types/LiveData";
import { emojiToRegionMap } from "@/utils/regionHelper";

type RegionStatus = "online" | "offline" | "partial";

type RegionPosition = {
  x: number;
  y: number;
};

const mapRegionPositions: Record<string, RegionPosition> = {
  "🇺🇸": { x: 20, y: 35 },
  "🇨🇦": { x: 20, y: 22 },
  "🇧🇷": { x: 31, y: 66 },
  "🇬🇧": { x: 46, y: 28 },
  "🇫🇷": { x: 47, y: 34 },
  "🇩🇪": { x: 50, y: 31 },
  "🇳🇱": { x: 49, y: 30 },
  "🇪🇸": { x: 45, y: 39 },
  "🇮🇹": { x: 52, y: 39 },
  "🇷🇺": { x: 66, y: 23 },
  "🇹🇷": { x: 57, y: 40 },
  "🇮🇳": { x: 68, y: 50 },
  "🇸🇬": { x: 76, y: 63 },
  "🇭🇰": { x: 79, y: 48 },
  "🇲🇴": { x: 78.5, y: 49.5 },
  "🇨🇳": { x: 75, y: 43 },
  "🇹🇼": { x: 81, y: 49 },
  "🇯🇵": { x: 84, y: 40 },
  "🇰🇷": { x: 81, y: 41 },
  "🇦🇺": { x: 84, y: 77 },
  "🇳🇿": { x: 93, y: 84 },
  "🇿🇦": { x: 54, y: 79 },
  "🇦🇪": { x: 62, y: 48 },
};

export interface MapRegionSummary {
  emoji: string;
  key: string;
  label: string;
  x: number;
  y: number;
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

export function buildMapViewSummary(
  nodes: NodeBasicInfo[],
  liveData: LiveData
): MapViewSummary {
  const onlineSet = new Set(liveData?.online ?? []);
  const regionMap = new Map<string, MapRegionSummary>();
  const unmappedNodes: NodeBasicInfo[] = [];

  for (const node of nodes) {
    const regionInfo = emojiToRegionMap[node.region];
    const position = mapRegionPositions[node.region];

    if (!regionInfo || !position) {
      unmappedNodes.push(node);
      continue;
    }

    const regionKey = regionInfo.en;
    const existing = regionMap.get(regionKey);

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

    regionMap.set(regionKey, {
      emoji: node.region,
      key: regionKey,
      label: regionInfo.en,
      x: position.x,
      y: position.y,
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
