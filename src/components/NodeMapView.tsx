"use client";

import { useEffect, useMemo, useState } from "react";
import { geoGraticule10, geoNaturalEarth1, geoPath } from "d3-geo";
import { MapPinned } from "lucide-react";
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
const MAP_HORIZONTAL_PADDING = 28;
const MAP_TOP_PADDING = 42;
const MAP_BOTTOM_INSET = 42;

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

function getUnmappedRegionLabel(region: string) {
  const normalizedRegion = region.trim();
  return normalizedRegion || "未填写";
}

export function NodeMapView({ nodes, liveData, onOpenNodeDetails }: NodeMapViewProps) {
  const { t } = useTranslation();
  const summary = useMemo(() => buildMapViewSummary(nodes, liveData), [nodes, liveData]);
  const [selectedRegionKey, setSelectedRegionKey] = useState<string | null>(
    summary.regions[0]?.key ?? null,
  );

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
    [summary.regions],
  );

  const projectedMap = useMemo(() => {
    const countriesGeo = feature(
      worldCountries50m as never,
      (worldCountries50m as unknown as { objects: { countries: never } }).objects.countries,
    ) as unknown as { features: Array<{ id?: string; properties?: { name?: string } }> };

    const projection = geoNaturalEarth1().fitExtent(
      [
        [MAP_HORIZONTAL_PADDING, MAP_TOP_PADDING],
        [SVG_WIDTH - MAP_HORIZONTAL_PADDING, SVG_HEIGHT - MAP_BOTTOM_INSET],
      ],
      countriesGeo as never,
    );

    const pathGenerator = geoPath(projection);
    const spherePath = pathGenerator({ type: "Sphere" }) ?? "";
    const graticulePath = pathGenerator(geoGraticule10()) ?? "";

    const countries = countriesGeo.features
      .map((country) => {
        const name = country.properties?.name ?? String(country.id ?? "unknown");
        const pathData = pathGenerator(country as never) ?? "";
        const activeRegion = activeRegionsByMapName.get(name) ?? null;

        return {
          name,
          pathData,
          activeRegion,
        };
      })
      .filter((country) => country.pathData);

    return {
      spherePath,
      graticulePath,
      countries,
    };
  }, [activeRegionsByMapName]);

  if (!summary.totalNodes) {
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
            </svg>

            <div className="node-map-view__legend node-map-view__legend--inset">
              <div className="node-map-view__legend-card node-map-view__legend-card--status">
                <div className="node-map-view__legend-items node-map-view__legend-items--stacked">
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
                <div className="node-map-view__legend-card node-map-view__legend-card--stacked">
                  <div className="node-map-view__legend-unmapped-header">
                    <span className="text-xs font-semibold text-slate-700">未显示地区</span>
                    <Badge
                      variant="secondary"
                      className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700"
                    >
                      {`共 ${summary.unmappedNodes.length} 个`}
                    </Badge>
                  </div>
                  <div className="node-map-view__legend-unmapped-list">
                    {summary.unmappedNodes.map((node) => (
                      <div key={`${node.uuid}-unmapped`} className="node-map-view__legend-unmapped-item">
                        <span className="node-map-view__legend-unmapped-region">
                          {getUnmappedRegionLabel(node.region)}
                        </span>
                        <span className="node-map-view__legend-unmapped-node">{node.name}</span>
                      </div>
                    ))}
                  </div>
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
                    className={`shrink-0 whitespace-nowrap rounded-full ${
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
                    <div className="mt-2 text-2xl font-semibold text-slate-900">
                      {selectedRegion.total}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-emerald-700">在线</div>
                    <div className="mt-2 text-2xl font-semibold text-emerald-900">
                      {selectedRegion.online}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-rose-50 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-rose-700">离线</div>
                    <div className="mt-2 text-2xl font-semibold text-rose-900">
                      {selectedRegion.offline}
                    </div>
                  </div>
                </div>

                <div className="node-map-view__node-list">
                  {selectedRegion.nodes.map((node) => {
                    const online = (liveData?.online ?? []).includes(node.uuid);
                    const secondaryText = node.group?.trim() || "暂未分类";

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
                          className={`shrink-0 whitespace-nowrap rounded-full ${
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

            {!selectedRegion && (
              <div className="node-map-view__detail-card node-map-view__detail-card--empty">
                <div className="node-map-view__detail-empty">
                  <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                    当前没有可显示的地区
                  </h3>
                  <p className="text-sm leading-6 text-slate-500">
                    这些节点还在正常统计中，只是地区值暂时没有命中地图映射。先看左侧“未显示地区”列表，就能知道具体是哪一项需要补。
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
