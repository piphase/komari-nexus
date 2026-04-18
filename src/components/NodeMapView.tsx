"use client";

import { useEffect, useMemo, useState } from "react";
import { geoGraticule10, geoNaturalEarth1, geoPath } from "d3-geo";
import { Globe2, MapPinned } from "lucide-react";
import { feature } from "topojson-client";
import { useTranslation } from "react-i18next";

import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import type { LiveData } from "@/types/LiveData";
import worldCountries50m from "@/data/world-countries-50m.json";
import { buildMapViewSummary } from "@/utils/mapRegions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Flag from "@/components/Flag";

import "./NodeMapView.css";

interface NodeMapViewProps {
  nodes: NodeBasicInfo[];
  liveData: LiveData;
  onOpenNodeDetails?: (uuid: string) => void;
}

const SVG_WIDTH = 1000;
const SVG_HEIGHT = 560;
const ALWAYS_MARKER_CODES = new Set(["SG", "HK", "MO", "TW"]);
const CALLOUT_MARKERS: Record<string, { marker: [number, number]; elbow: [number, number] }> = {
  SG: { marker: [818, 364], elbow: [785, 350] },
  HK: { marker: [862, 292], elbow: [820, 292] },
  MO: { marker: [882, 318], elbow: [832, 311] },
  TW: { marker: [860, 250], elbow: [824, 258] },
  JP: { marker: [914, 226], elbow: [870, 224] },
  KR: { marker: [882, 262], elbow: [840, 255] },
  GB: { marker: [520, 110], elbow: [540, 126] },
  NL: { marker: [578, 132], elbow: [564, 145] },
};
const EXTERNAL_MARKER_OFFSETS: Record<string, [number, number]> = {
  SG: [42, -20],
  HK: [48, -18],
  MO: [52, -8],
  TW: [52, -12],
  JP: [56, -2],
  KR: [48, -8],
  GB: [-34, -20],
  NL: [30, -18],
};

type MarkerLayout = {
  type: "inline" | "external";
  strategy: "centroid" | "callout";
  marker: [number, number];
  leaderPath: string | null;
};

function getStatusText(status: "online" | "offline" | "partial") {
  switch (status) {
    case "online":
      return "在线";
    case "offline":
      return "离线";
    default:
      return "部分在线";
  }
}

export function NodeMapView({ nodes, liveData, onOpenNodeDetails }: NodeMapViewProps) {
  const { t } = useTranslation();
  const summary = useMemo(() => buildMapViewSummary(nodes, liveData), [nodes, liveData]);
  const [selectedRegionKey, setSelectedRegionKey] = useState<string | null>(summary.regions[0]?.key ?? null);

  useEffect(() => {
    if (!summary.regions.length) {
      setSelectedRegionKey(null);
      return;
    }

    const regionExists = summary.regions.some((region) => region.key === selectedRegionKey);
    if (!regionExists) {
      setSelectedRegionKey(summary.regions[0].key);
    }
  }, [selectedRegionKey, summary.regions]);

  const selectedRegion =
    summary.regions.find((region) => region.key === selectedRegionKey) ?? summary.regions[0] ?? null;

  const activeRegionsByMapName = useMemo(
    () => new Map(summary.regions.map((region) => [region.mapName, region])),
    [summary.regions]
  );

  const projectedMap = useMemo(() => {
    const countriesGeo = feature(
      worldCountries50m as never,
      (worldCountries50m as unknown as { objects: { countries: never } }).objects.countries
    ) as unknown as { features: Array<{ id?: string; properties?: { name?: string } }> };

    const projection = geoNaturalEarth1().fitExtent(
      [
        [28, 34],
        [SVG_WIDTH - 28, SVG_HEIGHT - 46],
      ],
      countriesGeo as never
    );

    const pathGenerator = geoPath(projection);
    const spherePath = pathGenerator({ type: "Sphere" }) ?? "";
    const graticulePath = pathGenerator(geoGraticule10()) ?? "";

    const countries = countriesGeo.features
      .map((country) => {
        const name = country.properties?.name ?? String(country.id ?? "unknown");
        const pathData = pathGenerator(country as never) ?? "";
        const activeRegion = activeRegionsByMapName.get(name) ?? null;
        const area = pathData ? pathGenerator.area(country as never) : 0;
        const centroid = pathData ? pathGenerator.centroid(country as never) : [0, 0];
        const bounds = pathData ? pathGenerator.bounds(country as never) : [[0, 0], [0, 0]];
        const width = bounds[1][0] - bounds[0][0];
        const height = bounds[1][1] - bounds[0][1];
        const canProjectCentroid = Number.isFinite(centroid[0]) && Number.isFinite(centroid[1]);
        const prefersExternalMarker =
          !!activeRegion &&
          (EXTERNAL_MARKER_OFFSETS[activeRegion.flagCode] !== undefined ||
            width < 18 ||
            height < 16 ||
            area < 120);
        const showMarker =
          !!activeRegion &&
          canProjectCentroid &&
          (prefersExternalMarker || area < 180 || activeRegion.total > 2 || ALWAYS_MARKER_CODES.has(activeRegion.flagCode));

        let markerLayout: MarkerLayout | null = null;
        if (activeRegion && showMarker) {
          const calloutAnchor = CALLOUT_MARKERS[activeRegion.flagCode];
          if (calloutAnchor) {
            const [markerX, markerY] = calloutAnchor.marker;
            const [elbowX, elbowY] = calloutAnchor.elbow;
            const directionX = markerX >= elbowX ? 1 : -1;
            const leaderEndX = markerX - directionX * 12;

            markerLayout = {
              type: "external",
              strategy: "callout",
              marker: [markerX, markerY],
              leaderPath: `M ${centroid[0].toFixed(2)} ${centroid[1].toFixed(2)} L ${elbowX.toFixed(2)} ${elbowY.toFixed(2)} L ${leaderEndX.toFixed(2)} ${markerY.toFixed(2)}`,
            };
          } else if (prefersExternalMarker) {
            const [defaultDx, defaultDy] =
              EXTERNAL_MARKER_OFFSETS[activeRegion.flagCode] ??
              (centroid[0] < SVG_WIDTH / 2 ? [34, -22] : [-34, -22]);
            const markerX = Math.min(Math.max(centroid[0] + defaultDx, 24), SVG_WIDTH - 24);
            const markerY = Math.min(Math.max(centroid[1] + defaultDy, 24), SVG_HEIGHT - 28);
            const directionX = markerX >= centroid[0] ? 1 : -1;
            const elbowX = centroid[0] + defaultDx * 0.58;
            const elbowY = centroid[1] + defaultDy * 0.18;
            const leaderEndX = markerX - directionX * 10;

            markerLayout = {
              type: "external",
              strategy: "centroid",
              marker: [markerX, markerY],
              leaderPath: `M ${centroid[0].toFixed(2)} ${centroid[1].toFixed(2)} L ${elbowX.toFixed(2)} ${elbowY.toFixed(2)} L ${leaderEndX.toFixed(2)} ${markerY.toFixed(2)}`,
            };
          } else {
            markerLayout = {
              type: "inline",
              strategy: "centroid",
              marker: [centroid[0], centroid[1]],
              leaderPath: null,
            };
          }
        }

        return {
          name,
          pathData,
          activeRegion,
          area,
          centroid,
          showMarker,
          markerLayout,
        };
      })
      .filter((country) => country.pathData);

    return {
      spherePath,
      graticulePath,
      countries,
    };
  }, [activeRegionsByMapName]);

  if (!summary.regions.length) {
    return (
        <Card className="overflow-hidden rounded-[28px] border-slate-200/80 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle>{t("mapView.title", { defaultValue: "全球分布" })}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center text-sm text-muted-foreground">
            {t("nodes.empty", { defaultValue: "暂无节点数据" })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="node-map-view overflow-hidden rounded-[28px] border-slate-200/80 bg-card/95 shadow-sm">
      <CardHeader className="space-y-4 border-b border-slate-100/80 pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
              <MapPinned className="h-3.5 w-3.5" />
              {t("common.map", { defaultValue: "地图" })}
            </div>
            <CardTitle className="text-2xl tracking-tight">
              {t("mapView.title", { defaultValue: "全球分布" })}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("mapView.activeCountries", {
                count: summary.regions.length,
                defaultValue: `${summary.regions.length} 个活跃国家/地区`,
              })}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="rounded-full bg-slate-100 text-slate-700">
              {t("mapView.servers", {
                count: summary.totalNodes,
                defaultValue: `${summary.totalNodes} 台节点`,
              })}
            </Badge>
            <Badge variant="secondary" className="rounded-full bg-emerald-50 text-emerald-700">
              {t("mapView.online", {
                count: summary.onlineNodes,
                defaultValue: `${summary.onlineNodes} 台在线`,
              })}
            </Badge>
            <Badge variant="secondary" className="rounded-full bg-rose-50 text-rose-700">
              {t("mapView.offline", {
                count: summary.offlineNodes,
                defaultValue: `${summary.offlineNodes} 台离线`,
              })}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 lg:p-6">
        <div className="node-map-view__layout">
          <div className="node-map-view__surface">
            <svg
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className="node-map-view__svg"
              role="img"
              aria-label="全球节点分布地图"
            >
              <path d={projectedMap.spherePath} className="node-map-view__ocean" />
              <path d={projectedMap.graticulePath} className="node-map-view__graticule" />

              <g className="node-map-view__country-layer">
                {projectedMap.countries.map((country) => {
                  const region = country.activeRegion;
                  const isSelected = selectedRegion?.key === region?.key;

                  return (
                    <g key={country.name} className="node-map-view__country-group">
                      <path
                        d={country.pathData}
                        data-country-code={region?.flagCode}
                        data-country-name={country.name}
                        className={`node-map-view__country${region ? ` is-active status-${region.status}` : ""}${isSelected ? " is-selected" : ""}`}
                        onClick={region ? () => setSelectedRegionKey(region.key) : undefined}
                      >
                        <title>
                          {region
                            ? `${region.label}: ${region.total} 台节点，${region.online} 台在线，${region.offline} 台离线`
                            : country.name}
                        </title>
                      </path>
                    </g>
                  );
                })}
              </g>

              <g className="node-map-view__marker-layer">
                {projectedMap.countries.map((country) => {
                  const region = country.activeRegion;
                  const markerLayout = country.markerLayout;
                  if (!region || !country.showMarker || !markerLayout) {
                    return null;
                  }

                  const isSelected = selectedRegion?.key === region.key;
                  const markerSize =
                    markerLayout.type === "external"
                      ? Math.min(11 + region.total * 1.3, 18)
                      : Math.min(14 + region.total * 2, 24);

                  return (
                    <g key={`${country.name}-marker`} className="node-map-view__marker-group">
                      {markerLayout.leaderPath && (
                        <path
                          d={markerLayout.leaderPath}
                          data-country-leader={region.flagCode}
                          className={`node-map-view__country-leader status-${region.status}${isSelected ? " is-selected" : ""}`}
                        />
                      )}
                      <g
                        data-country-code={region.flagCode}
                        data-marker-placement={markerLayout.type}
                        data-marker-strategy={markerLayout.strategy}
                        className={`node-map-view__country-marker status-${region.status}${isSelected ? " is-selected" : ""}`}
                        transform={`translate(${markerLayout.marker[0]}, ${markerLayout.marker[1]})`}
                        onClick={() => setSelectedRegionKey(region.key)}
                      >
                        <circle r={markerSize} />
                        {region.total > 1 && <text dy="0.35em">{region.total}</text>}
                        <title>{`${region.label}: ${region.total} 台节点`}</title>
                      </g>
                    </g>
                  );
                })}
              </g>
            </svg>

            <div className="node-map-view__legend">
              <div className="node-map-view__legend-card">
                <Globe2 className="h-4 w-4 text-slate-600" />
                <div className="node-map-view__legend-items">
                  <span className="node-map-view__legend-item">
                    <span className="node-map-view__legend-dot status-online" />
                    全部在线
                  </span>
                  <span className="node-map-view__legend-item">
                    <span className="node-map-view__legend-dot status-partial" />
                    部分在线
                  </span>
                  <span className="node-map-view__legend-item">
                    <span className="node-map-view__legend-dot status-offline" />
                    全部离线
                  </span>
                </div>
              </div>

              {summary.unmappedNodes.length > 0 && (
                <div className="node-map-view__legend-card">
                  <span className="text-xs font-medium text-slate-600">
                    {`+${summary.unmappedNodes.length} 个未显示地区`}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="node-map-view__detail">
            {selectedRegion && (
              <div className="node-map-view__detail-card">
                <div className="node-map-view__detail-header">
                  <div className="node-map-view__detail-heading">
                    <span className="node-map-view__detail-flag" aria-hidden="true">
                      <Flag flag={selectedRegion.emoji} />
                    </span>
                    <div className="space-y-1">
                      <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                        {selectedRegion.label}
                      </h3>
                      <p className="text-sm text-slate-500">{`该地区共 ${selectedRegion.total} 台节点`}</p>
                    </div>
                  </div>

                  <Badge
                    variant="secondary"
                    className={`rounded-full ${
                      selectedRegion.status === "online"
                        ? "bg-emerald-50 text-emerald-700"
                        : selectedRegion.status === "offline"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {getStatusText(selectedRegion.status)}
                  </Badge>
                </div>

                <div className="grid gap-3 px-5 py-5 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-500">节点数</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">{selectedRegion.total}</div>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-emerald-700">在线</div>
                    <div className="mt-2 text-2xl font-semibold text-emerald-900">{selectedRegion.online}</div>
                  </div>
                  <div className="rounded-2xl bg-rose-50 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-rose-700">离线</div>
                    <div className="mt-2 text-2xl font-semibold text-rose-900">{selectedRegion.offline}</div>
                  </div>
                </div>

                <div className="node-map-view__node-list">
                  {selectedRegion.nodes.map((node) => {
                    const online = (liveData?.online ?? []).includes(node.uuid);
                    const secondaryText = node.group?.trim() || node.os;

                    return (
                      <button
                        key={node.uuid}
                        type="button"
                        className="node-map-view__node-card"
                        onClick={() => onOpenNodeDetails?.(node.uuid)}
                        aria-label={`查看 ${node.name} 详情`}
                      >
                        <div className="min-w-0 text-left">
                          <div className="truncate font-medium text-slate-900">{node.name}</div>
                          <div className="truncate text-xs text-slate-500">{secondaryText}</div>
                        </div>
                        <Badge
                          variant="secondary"
                          className={`rounded-full ${
                            online ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {online
                            ? t("nodeCard.online", { defaultValue: "在线" })
                            : t("nodeCard.offline", { defaultValue: "离线" })}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
