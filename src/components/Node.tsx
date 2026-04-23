import React, { useMemo } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { TrendingUp, ArrowUp, ArrowDown, Activity } from "lucide-react";
import type { TFunction } from "i18next";

import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import type { LiveData, Record } from "../types/LiveData";
import { useIsMobile } from "@/hooks/use-mobile";
import { getOSImage, getOSName } from "@/utils";
import { formatBytes } from "@/utils/unitHelper";
import { useTheme } from "@/contexts/ThemeContext";
import { useDeferredVisibility } from "@/hooks/useDeferredVisibility";
import { usePingStats } from "@/hooks/usePingStats";
import { useProgressiveRender } from "@/hooks/useProgressiveRender";

import Flag from "./Flag";
import PriceTags from "./PriceTags";
import AdaptiveChart from "./AdaptiveChart";
import MiniPingChartFloat from "./MiniPingChartFloat";
import Tips from "./ui/tips";

// --- Helper Functions ---

/** Format seconds into readable uptime */
export function formatUptime(seconds: number, t: TFunction): string {
  if (!seconds || seconds < 0) return t("nodeCard.time_second", { val: 0 });
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d) parts.push(`${d} ${t("nodeCard.time_day")}`);
  if (h) parts.push(`${h} ${t("nodeCard.time_hour")}`);
  if (m) parts.push(`${m} ${t("nodeCard.time_minute")}`);
  if (s || parts.length === 0) parts.push(`${s} ${t("nodeCard.time_second")}`);
  return parts.join(" ");
}

function getTrafficUsed(totalUp: number, totalDown: number, type: "max" | "min" | "sum" | "up" | "down") {
  switch (type) {
    case "max":
      return Math.max(totalUp, totalDown);
    case "min":
      return Math.min(totalUp, totalDown);
    case "sum":
      return totalUp + totalDown;
    case "up":
      return totalUp;
    case "down":
      return totalDown;
    default:
      return 0;
  }
}

function formatTrafficPercentage(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0%";
  if (value >= 100) return `${value.toFixed(1)}%`;
  if (value >= 10) return `${value.toFixed(1)}%`;
  if (value >= 1) return `${value.toFixed(2)}%`;
  if (value >= 0.01) return `${value.toFixed(3)}%`;
  return "<0.01%";
}

function getTrafficRemaining(limit: number, used: number) {
  if (!Number.isFinite(limit) || limit <= 0) return 0;
  return Math.max(limit - used, 0);
}

function getTrafficRemainingPercentage(limit: number, remaining: number) {
  if (!Number.isFinite(limit) || limit <= 0) return 0;
  return (remaining / limit) * 100;
}

function getTrafficStatTypeLabel(type: "max" | "min" | "sum" | "up" | "down", t: TFunction) {
  switch (type) {
    case "up":
      return t("nodeCard.trafficStatTypeUp", { defaultValue: "仅上传" });
    case "down":
      return t("nodeCard.trafficStatTypeDown", { defaultValue: "仅下载" });
    case "max":
      return t("nodeCard.trafficStatTypeMax", { defaultValue: "取较大值" });
    case "min":
      return t("nodeCard.trafficStatTypeMin", { defaultValue: "取较小值" });
    case "sum":
    default:
      return t("nodeCard.trafficStatTypeSum", { defaultValue: "总量" });
  }
}

function getRemainingTrafficTone(remainingPercentage: number) {
  if (remainingPercentage > 70) {
    return {
      progressClassName: "bg-emerald-500",
      percentageClassName: "text-emerald-600 dark:text-emerald-400",
    };
  }

  if (remainingPercentage > 30) {
    return {
      progressClassName: "bg-amber-500",
      percentageClassName: "text-amber-600 dark:text-amber-400",
    };
  }

  return {
    progressClassName: "bg-rose-500",
    percentageClassName: "text-rose-600 dark:text-rose-400",
  };
}

// --- Components ---

interface NodeProps {
  basic: NodeBasicInfo;
  live: Record | undefined;
  online: boolean;
  onOpenNodeDetails?: (uuid: string) => void;
}

const Node = ({ basic, live, online, onOpenNodeDetails }: NodeProps) => {
  const [t] = useTranslation();
  const isMobile = useIsMobile();
  const { themeConfig } = useTheme();
  const [cardRef, enhancementsReady] = useDeferredVisibility<HTMLDivElement>();
  const pingStats = usePingStats(basic.uuid, 24, { enabled: enhancementsReady });
  const isClassicInteractive =
    themeConfig.cardLayout === "classic" && !!onOpenNodeDetails;

  const defaultLive = {
    cpu: { usage: 0 },
    ram: { used: 0 },
    disk: { used: 0 },
    network: { up: 0, down: 0, totalUp: 0, totalDown: 0 },
    uptime: 0,
  } as Record;

  const liveData = live || defaultLive;

  // Calculate percentages
  const memoryUsagePercent = basic.mem_total
    ? (liveData.ram.used / basic.mem_total) * 100
    : 0;
  const diskUsagePercent = basic.disk_total
    ? (liveData.disk.used / basic.disk_total) * 100
    : 0;

  // Format network data
  const uploadSpeed = formatBytes(liveData.network.up);
  const downloadSpeed = formatBytes(liveData.network.down);
  const totalUpload = formatBytes(liveData.network.totalUp);
  const totalDownload = formatBytes(liveData.network.totalDown);
  const trafficLimitType = basic.traffic_limit_type ?? "sum";
  const hasTrafficLimit = basic.traffic_limit > 0;
  const trafficUsed = getTrafficUsed(
    liveData.network.totalUp,
    liveData.network.totalDown,
    trafficLimitType
  );
  const trafficRemaining = getTrafficRemaining(
    basic.traffic_limit,
    trafficUsed
  );
  const trafficRemainingPercentage = getTrafficRemainingPercentage(
    basic.traffic_limit,
    trafficRemaining
  );
  const trafficStatTypeLabel = getTrafficStatTypeLabel(trafficLimitType, t);
  const remainingTrafficTone = getRemainingTrafficTone(trafficRemainingPercentage);

  // Layout-specific styles
  const cardStyles = {
    classic: "w-full transition-all duration-200 hover:shadow-lg hover:border-primary/50 overflow-hidden group border",
    modern: "w-full transition-all duration-200 hover:shadow-lg overflow-hidden group border-none bg-gradient-to-br from-card to-card/50 shadow-sm",
    minimal: "w-full transition-all duration-200 hover:shadow-md overflow-hidden group bg-gradient-to-br from-muted/40 to-muted/20 rounded-xl border border-border/50",
    detailed: "w-full transition-all duration-200 hover:shadow-xl overflow-hidden group border-2 shadow-md hover:border-primary/30",
  };

  const headerStyles = {
    classic: "pb-2 pt-4 px-4 space-y-0",
    modern: "pb-3 pt-3 px-4 space-y-0 bg-primary/5 border-b border-primary/10",
    minimal: "pb-2 pt-4 px-4 space-y-0",
    detailed: "pb-3 pt-5 px-5 space-y-0 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border-b-2",
  };

  const contentStyles = {
    classic: "p-4 pt-4",
    modern: "p-4 pt-4 bg-gradient-to-b from-background/50 to-transparent",
    minimal: "p-4 pt-3",
    detailed: "p-5 pt-4 bg-gradient-to-b from-background to-muted/10",
  };

  const footerStyles = {
    classic: "pb-3 pt-0 px-4 flex justify-between items-center",
    modern: "pb-3 pt-0 px-4 flex justify-between items-center bg-muted/20 border-t",
    minimal: "pb-3 pt-0 px-4 flex justify-between items-center",
    detailed: "pb-4 pt-0 px-5 flex justify-between items-center bg-muted/30 border-t-2",
  };

  const openNodeDetails = () => {
    if (!isClassicInteractive) {
      return;
    }

    onOpenNodeDetails?.(basic.uuid);
  };

  const stopNodeDetailsOpen = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  return (
    <Card
      ref={cardRef}
      id={basic.uuid}
      className={`${cardStyles[themeConfig.cardLayout] || cardStyles.classic} ${
        isClassicInteractive ? "cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/30" : ""
      }`}
      role={isClassicInteractive ? "button" : undefined}
      tabIndex={isClassicInteractive ? 0 : undefined}
      onClick={openNodeDetails}
      onKeyDown={
        isClassicInteractive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openNodeDetails();
              }
            }
          : undefined
      }
    >
      {/* Header: Identity & Status */}
      <CardHeader className={headerStyles[themeConfig.cardLayout] || headerStyles.classic}>
        <div className="flex justify-between items-start">
          <div className="flex flex-1 min-w-0 items-center gap-3 overflow-hidden">
            {/* Flag position changes based on layout */}
            {themeConfig.cardLayout !== 'detailed' && (
              <div className="flex-shrink-0">
                <Flag flag={basic.region} />
              </div>
            )}
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex flex-row min-w-0 items-center">
                {isClassicInteractive ? (
                  <div className="group-hover:text-primary transition-colors overflow-hidden flex-1">
                    <h3
                      className={`font-bold truncate pr-2 tracking-tight ${
                        themeConfig.cardLayout === 'detailed' ? 'text-lg' : 'text-base'
                      }`}
                    >
                      {basic.name}
                    </h3>
                  </div>
                ) : (
                  <Link href={`/instance/${basic.uuid}`} className="group-hover:text-primary transition-colors overflow-hidden flex-1">
                    <h3 className={`font-bold truncate pr-2 tracking-tight ${
                      themeConfig.cardLayout === 'detailed' ? 'text-lg' : 'text-base'
                    }`}>{basic.name}</h3>
                  </Link>
                )}
                <div className="flex items-center gap-1 shrink-0">
                  {live?.message && <Tips color="#CE282E">{live.message}</Tips>}
                  <MiniPingChartFloat
                    uuid={basic.uuid}
                    hours={24}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                        onClick={stopNodeDetailsOpen}
                        onMouseDown={stopNodeDetailsOpen}
                        onKeyDown={stopNodeDetailsOpen}
                      >
                        <TrendingUp className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <Badge variant={online ? "default" : "destructive"} className={online ? "bg-green-600 hover:bg-green-700" : ""}>
                    {online ? t("nodeCard.online") : t("nodeCard.offline")}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center text-[11px] text-muted-foreground/80 gap-2 mt-0.5">
                <span className="flex items-center gap-1.5 bg-muted/50 px-1.5 py-0.5 rounded min-w-0">
                  <img src={getOSImage(basic.os)} alt={basic.os} className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{getOSName(basic.os)}</span>
                </span>
                {themeConfig.cardLayout === 'detailed' && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 rounded text-primary">
                    <Flag flag={basic.region} />
                  </span>
                )}
                <span className="opacity-40">•</span>
                <span>{formatUptime(liveData.uptime, t)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      {themeConfig.cardLayout !== 'minimal' && <Separator className="opacity-50" />}

      {/* Main Content: Metrics */}
      <CardContent className={contentStyles[themeConfig.cardLayout] || contentStyles.classic}>
        {/* Charts Grid - layout affects arrangement */}
        <div className={`grid mb-4 ${
          themeConfig.cardLayout === 'minimal' ? 'grid-cols-3 gap-3' :
          themeConfig.cardLayout === 'detailed' ? 'grid-cols-3 gap-4' :
          themeConfig.cardLayout === 'modern' ? 'grid-cols-3 gap-2' :
          'grid-cols-3 gap-2'
        }`}>
          <AdaptiveChart
            value={liveData.cpu.usage}
            label="CPU"
            subLabel={`${liveData.cpu.usage.toFixed(1)}%`}
          />
          <AdaptiveChart
            value={memoryUsagePercent}
            label="RAM"
            subLabel={formatBytes(liveData.ram.used)}
          />
          <AdaptiveChart
            value={diskUsagePercent}
            label="Disk"
            subLabel={formatBytes(liveData.disk.used)}
          />
        </div>

        {/* Network Stats */}
        <div className={`rounded-lg p-3 space-y-2 text-sm ${
          themeConfig.cardLayout === 'modern' ? 'bg-primary/5 border border-primary/10' :
          themeConfig.cardLayout === 'minimal' ? 'bg-background/50 border border-border/30' :
          themeConfig.cardLayout === 'detailed' ? 'bg-muted/40 border-2 border-muted' :
          'bg-muted/30'
        }`}>
          <div className="flex justify-between items-center">
             <span className="text-muted-foreground flex items-center gap-1">
               <Activity className="h-3 w-3" /> {t("nodeCard.networkSpeed")}
             </span>
             <div className="flex gap-3 font-mono text-xs">
                <span className="flex items-center text-green-600 dark:text-green-400">
                  <ArrowUp className="h-3 w-3 mr-0.5" /> {uploadSpeed}/s
                </span>
                <span className="flex items-center text-blue-600 dark:text-blue-400">
                  <ArrowDown className="h-3 w-3 mr-0.5" /> {downloadSpeed}/s
                </span>
             </div>
          </div>
          
          <Separator className="opacity-30" />
          
          {hasTrafficLimit ? (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">
                  {t("nodeCard.monthlyRemainingTraffic", {
                    defaultValue: "本月剩余流量",
                  })}{" "}
                  ({trafficStatTypeLabel})
                </span>
                <span className="text-right font-mono text-xs text-foreground">
                  {formatBytes(trafficRemaining)} / {formatBytes(basic.traffic_limit)}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  data-testid="monthly-traffic-progress-bar"
                  className={`h-full rounded-full ${remainingTrafficTone.progressClassName}`}
                  style={{ width: `${Math.min(trafficRemainingPercentage, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between gap-3 text-[10px] font-mono">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ArrowUp className="h-3 w-3 text-green-600 dark:text-green-400" />
                    {t("nodeCard.uploadAmount", { defaultValue: "上传量" })} {totalUpload}
                  </span>
                  <span className="flex items-center gap-1">
                    <ArrowDown className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    {t("nodeCard.downloadAmount", { defaultValue: "下载量" })} {totalDownload}
                  </span>
                </div>
                <span
                  data-testid="monthly-traffic-percentage"
                  className={remainingTrafficTone.percentageClassName}
                >
                  {formatTrafficPercentage(trafficRemainingPercentage)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                 {t("nodeCard.totalTraffic")}
              </span>
               <div className="flex gap-3 font-mono text-xs text-muted-foreground">
                  <span className="flex items-center">
                    <ArrowUp className="h-3 w-3 mr-0.5" /> {totalUpload}
                  </span>
                  <span className="flex items-center">
                    <ArrowDown className="h-3 w-3 mr-0.5" /> {totalDownload}
                  </span>
               </div>
            </div>
          )}

          <Separator className="opacity-30" />

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">{t("nodeCard.pingStats")}</span>
            {pingStats.hasData ? (
              <div className="flex gap-3 font-mono text-xs text-muted-foreground">
                <span>{pingStats.avgLoss.toFixed(1)}% {t("chart.lossRate")}</span>
                <span>{pingStats.avgVolatility.toFixed(1)} {t("chart.volatility")}</span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground/70 italic">{t("nodeCard.noPingData")}</span>
            )}
          </div>

        </div>
      </CardContent>

      {/* Footer: Price & Extra Info */}
      {(basic.price || basic.ipv4 || basic.ipv6) && (
        <CardFooter className={footerStyles[themeConfig.cardLayout] || footerStyles.classic}>
           <PriceTags
              hidden={false}
              price={basic.price}
              billing_cycle={basic.billing_cycle}
              expired_at={basic.expired_at}
              currency={basic.currency}
              tags={basic.tags}
              ip4={basic.ipv4}
              ip6={basic.ipv6}
           />
        </CardFooter>
      )}
    </Card>
  );
};

export default Node;

// --- NodeGrid Component ---

type NodeGridProps = {
  nodes: NodeBasicInfo[];
  liveData: LiveData;
  onOpenNodeDetails?: (uuid: string) => void;
};

const NodeCardSkeleton = ({ count }: { count: number }) => {
  return Array.from({ length: count }, (_, index) => (
    <div
      key={`node-card-skeleton-${index}`}
      className="rounded-lg border bg-card/70 p-4 shadow-sm"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-6 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <div className="space-y-2 rounded-lg bg-muted/30 p-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  ));
};

export const NodeGrid = ({ nodes, liveData, onOpenNodeDetails }: NodeGridProps) => {
  // Ensure liveData is valid
  const onlineNodes = liveData && liveData.online ? liveData.online : [];
  const onlineNodeSet = useMemo(() => new Set(onlineNodes), [onlineNodes]);
  const progressiveResetKey = useMemo(
    () => `grid:${nodes.map((node) => node.uuid).join("|")}`,
    [nodes],
  );

  // Sort nodes: Online first, then by weight
  const sortedNodes = useMemo(() => {
    return [...nodes].sort((a, b) => {
      const aOnline = onlineNodeSet.has(a.uuid);
      const bOnline = onlineNodeSet.has(b.uuid);

      if (aOnline !== bOnline) {
        return aOnline ? -1 : 1;
      }

      return a.weight - b.weight;
    });
  }, [nodes, onlineNodeSet]);

  const { visibleItems, remainingCount } = useProgressiveRender(sortedNodes, {
    enabled: true,
    initialCount: 10,
    batchSize: 10,
    batchDelayMs: 32,
    revealAllOnInteraction: false,
    resetKey: progressiveResetKey,
  });

  return (
    <div
      className="grid gap-6 py-4 box-border w-full"
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
      }}
    >
      {visibleItems.map((node) => {
        const isOnline = onlineNodeSet.has(node.uuid);
        const nodeData =
          liveData && liveData.data ? liveData.data[node.uuid] : undefined;

        return (
          <Node
            key={node.uuid}
            basic={node}
            live={nodeData}
            online={isOnline}
            onOpenNodeDetails={onOpenNodeDetails}
          />
        );
      })}
      {remainingCount > 0 ? <NodeCardSkeleton count={Math.min(10, remainingCount)} /> : null}
    </div>
  );
};
