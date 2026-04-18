"use client";

import { useEffect, useMemo, useState } from "react";
import { Globe2, MapPinned } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import type { LiveData } from "@/types/LiveData";
import { buildMapViewSummary } from "@/utils/mapRegions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import "./NodeMapView.css";

interface NodeMapViewProps {
  nodes: NodeBasicInfo[];
  liveData: LiveData;
}

export function NodeMapView({ nodes, liveData }: NodeMapViewProps) {
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

  if (!summary.regions.length) {
    return (
      <Card className="overflow-hidden rounded-[28px] border-slate-200/80 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle>{t("mapView.title", { defaultValue: "Global Distribution" })}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center text-sm text-muted-foreground">
            {t("nodes.empty", { defaultValue: "No node data" })}
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
              {t("common.map", { defaultValue: "Map" })}
            </div>
            <CardTitle className="text-2xl tracking-tight">
              {t("mapView.title", { defaultValue: "Global Distribution" })}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {`${summary.regions.length} active regions`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="rounded-full bg-slate-100 text-slate-700">
              {t("mapView.servers", {
                count: summary.totalNodes,
                defaultValue: `${summary.totalNodes} servers`,
              })}
            </Badge>
            <Badge variant="secondary" className="rounded-full bg-emerald-50 text-emerald-700">
              {t("mapView.online", {
                count: summary.onlineNodes,
                defaultValue: `${summary.onlineNodes} online`,
              })}
            </Badge>
            <Badge variant="secondary" className="rounded-full bg-rose-50 text-rose-700">
              {t("mapView.offline", {
                count: summary.offlineNodes,
                defaultValue: `${summary.offlineNodes} offline`,
              })}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 lg:p-6">
        <div className="node-map-view__layout">
          <div className="node-map-view__surface">
            <img
              src="/assets/maps/world-card-map.svg"
              alt=""
              aria-hidden="true"
              className="node-map-view__backdrop"
            />

            <div className="node-map-view__marker-layer">
              {summary.regions.map((region) => {
                const size = 16 + Math.min(region.total * 5, 20);
                const isSelected = selectedRegion?.key === region.key;

                return (
                  <button
                    key={region.key}
                    type="button"
                    className={`node-map-view__marker status-${region.status}${isSelected ? " is-selected" : ""}`}
                    style={{
                      left: `${region.x}%`,
                      top: `${region.y}%`,
                      width: `${size}px`,
                      height: `${size}px`,
                    }}
                    onClick={() => setSelectedRegionKey(region.key)}
                    aria-label={`${region.label} · ${region.total} servers`}
                  >
                    <span className="node-map-view__marker-count">{region.total}</span>
                    <div className="node-map-view__tooltip">
                      <div className="node-map-view__tooltip-title">
                        <span>{`${region.emoji} ${region.label}`}</span>
                      </div>
                      <div className="node-map-view__tooltip-meta">
                        <span>
                          {t("mapView.servers", {
                            count: region.total,
                            defaultValue: `${region.total} servers`,
                          })}
                        </span>
                        <span>
                          {t("mapView.online", {
                            count: region.online,
                            defaultValue: `${region.online} online`,
                          })}
                        </span>
                        <span>
                          {t("mapView.offline", {
                            count: region.offline,
                            defaultValue: `${region.offline} offline`,
                          })}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="node-map-view__legend">
              <div className="node-map-view__legend-card">
                <Globe2 className="h-4 w-4 text-slate-600" />
                <div className="node-map-view__legend-items">
                  <span className="node-map-view__legend-item">
                    <span className="node-map-view__legend-dot status-online" />
                    All online
                  </span>
                  <span className="node-map-view__legend-item">
                    <span className="node-map-view__legend-dot status-partial" />
                    Partial
                  </span>
                  <span className="node-map-view__legend-item">
                    <span className="node-map-view__legend-dot status-offline" />
                    All offline
                  </span>
                </div>
              </div>

              {summary.unmappedNodes.length > 0 && (
                <div className="node-map-view__legend-card">
                  <span className="text-xs font-medium text-slate-600">
                    +{summary.unmappedNodes.length} hidden region
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="node-map-view__detail">
            {selectedRegion && (
              <div className="node-map-view__detail-card">
                <div className="flex items-start justify-between gap-3 border-b border-slate-100/90 px-5 py-5">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      <span>{selectedRegion.emoji}</span>
                      <span>{selectedRegion.label}</span>
                    </div>
                    <h3 className="text-xl font-semibold tracking-tight">{selectedRegion.label}</h3>
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
                    {selectedRegion.status}
                  </Badge>
                </div>

                <div className="grid gap-3 px-5 py-5 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Servers</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">{selectedRegion.total}</div>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-emerald-700">Online</div>
                    <div className="mt-2 text-2xl font-semibold text-emerald-900">{selectedRegion.online}</div>
                  </div>
                  <div className="rounded-2xl bg-rose-50 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-rose-700">Offline</div>
                    <div className="mt-2 text-2xl font-semibold text-rose-900">{selectedRegion.offline}</div>
                  </div>
                </div>

                <div className="space-y-3 px-5 pb-5">
                  {selectedRegion.nodes.map((node) => {
                    const online = (liveData?.online ?? []).includes(node.uuid);

                    return (
                      <div
                        key={node.uuid}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white/90 px-4 py-3 shadow-sm"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-900">{node.name}</div>
                          <div className="truncate text-xs text-slate-500">{node.uuid}</div>
                        </div>
                        <Badge
                          variant="secondary"
                          className={`rounded-full ${
                            online ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {online
                            ? t("nodeCard.online", { defaultValue: "Online" })
                            : t("nodeCard.offline", { defaultValue: "Offline" })}
                        </Badge>
                      </div>
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
