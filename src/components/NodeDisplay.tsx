import React, { useEffect, useMemo, useRef, useState } from "react";
import { Calculator, Grid3X3, Map as MapIcon, Search, Table2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { dispatchOpenRemainingValueCalculatorEvent } from "@/lib/remainingValueEvents";
import { cn } from "@/lib/utils";
import { isRegionMatch } from "@/utils/regionHelper";
import type { LiveData } from "../types/LiveData";
import { NodeGrid } from "./Node";
import { NodeMapView } from "./NodeMapView";
import { NodeDetailsPanel } from "./instance/NodeDetailsPanel";
import NodeTable from "./NodeTable";

import "./NodeDisplay.css";

export type ViewMode = "grid" | "table" | "map";

interface NodeDisplayProps {
  nodes: NodeBasicInfo[];
  liveData: LiveData;
}

const NodeDisplay: React.FC<NodeDisplayProps> = ({ nodes, liveData }) => {
  const [t] = useTranslation();
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>("nodeViewMode", "map");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useLocalStorage<string>("nodeSelectedGroup", "all");
  const [selectedNodeUuid, setSelectedNodeUuid] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const handleOpenNodeDetails = (uuid: string) => {
    setSelectedNodeUuid(uuid);
    setDetailsOpen(true);
  };

  const handleDetailsOpenChange = (open: boolean) => {
    setDetailsOpen(open);
    if (!open) {
      setSelectedNodeUuid(null);
    }
  };

  const groups = useMemo(() => {
    const groupSet = new Set<string>();
    nodes.forEach((node) => {
      if (node.group && node.group.trim()) {
        groupSet.add(node.group);
      }
    });
    return Array.from(groupSet).sort();
  }, [nodes]);

  const showGroupSelector = groups.length >= 1;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        searchRef.current?.focus();
      }

      if (event.key === "Escape" && searchTerm) {
        setSearchTerm("");
        searchRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchTerm]);

  const filteredNodes = useMemo(() => {
    let result = nodes;

    if (selectedGroup !== "all") {
      result = result.filter((node) => node.group === selectedGroup);
    }

    if (!searchTerm.trim()) {
      return result;
    }

    const term = searchTerm.toLowerCase().trim();
    return result.filter((node) => {
      const basicMatch =
        node.name.toLowerCase().includes(term) ||
        node.os.toLowerCase().includes(term) ||
        node.arch.toLowerCase().includes(term);

      const regionMatch = isRegionMatch(node.region, term);
      const priceMatch = !Number.isNaN(Number(term)) && node.price.toString().includes(term);
      const isOnline = liveData?.online?.includes(node.uuid) || false;
      const statusMatch =
        ((term === "online" || term === "在线") && isOnline) ||
        ((term === "offline" || term === "离线") && !isOnline);

      return basicMatch || regionMatch || priceMatch || statusMatch;
    });
  }, [liveData, nodes, searchTerm, selectedGroup]);

  const onlineCount =
    selectedGroup === "all"
      ? liveData?.online?.length || 0
      : filteredNodes.filter((node) => liveData?.online?.includes(node.uuid)).length;

  const statusText = searchTerm.trim()
    ? t("search.results", {
        count: filteredNodes.length,
        total:
          selectedGroup === "all"
            ? nodes.length
            : nodes.filter((node) => node.group === selectedGroup).length,
        defaultValue: `找到 ${filteredNodes.length} 个节点`,
      })
    : selectedGroup === "all"
      ? t("nodeCard.totalNodes", {
          total: nodes.length,
          online: onlineCount,
          defaultValue: `共 ${nodes.length} 个服务器，${onlineCount} 个在线`,
        })
      : t("nodeCard.groupNodes", {
          group: selectedGroup,
          total: filteredNodes.length,
          online: onlineCount,
          defaultValue: `${selectedGroup} 分组共 ${filteredNodes.length} 个服务器，${onlineCount} 个在线`,
        });

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col items-stretch justify-between gap-4 md:flex-row md:items-center">
        <div className="group relative max-w-lg flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            ref={searchRef}
            placeholder={t("search.placeholder", {
              defaultValue: "搜索节点...（按 / 快速聚焦）",
            })}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="h-11 border-none bg-card pl-10 pr-10 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-primary/20"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1.5 top-1/2 h-8 w-8 -translate-y-1/2 hover:bg-transparent"
              onClick={() => {
                setSearchTerm("");
                searchRef.current?.focus();
              }}
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-1 shadow-sm">
            <Button
              variant={viewMode === "map" ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "h-8 gap-2 rounded-md border border-transparent px-3",
                viewMode === "map"
                  ? "border-border/80 bg-card text-foreground shadow-sm ring-1 ring-white/10 dark:border-white/15 dark:ring-white/12 dark:shadow-[0_10px_24px_rgba(0,0,0,0.32)]"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              )}
              onClick={() => setViewMode("map")}
            >
              <MapIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{t("common.map", { defaultValue: "地图" })}</span>
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "h-8 gap-2 rounded-md border border-transparent px-3",
                viewMode === "grid"
                  ? "border-border/80 bg-card text-foreground shadow-sm ring-1 ring-white/10 dark:border-white/15 dark:ring-white/12 dark:shadow-[0_10px_24px_rgba(0,0,0,0.32)]"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              )}
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4" />
              <span className="hidden sm:inline">卡片</span>
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "h-8 gap-2 rounded-md border border-transparent px-3",
                viewMode === "table"
                  ? "border-border/80 bg-card text-foreground shadow-sm ring-1 ring-white/10 dark:border-white/15 dark:ring-white/12 dark:shadow-[0_10px_24px_rgba(0,0,0,0.32)]"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              )}
              onClick={() => setViewMode("table")}
            >
              <Table2 className="h-4 w-4" />
              <span className="hidden sm:inline">列表</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        {showGroupSelector && (
          <div className="scrollbar-none flex items-center gap-2 overflow-x-auto pb-1">
            <Tabs value={selectedGroup} onValueChange={setSelectedGroup} className="w-auto">
              <TabsList className="h-10 border bg-muted/50 p-1">
                <TabsTrigger value="all" className="px-4">
                  {t("common.all", { defaultValue: "全部" })}
                </TabsTrigger>
                {groups.map((group) => (
                  <TabsTrigger key={group} value={group} className="px-4">
                    {group}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 px-1">
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          <span className="text-sm font-medium text-muted-foreground">{statusText}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-2 rounded-full border border-border/80 bg-card/95 px-3 text-foreground shadow-sm ring-1 ring-white/10 transition-all hover:bg-card hover:shadow-md dark:border-white/15 dark:ring-white/12 dark:shadow-[0_10px_24px_rgba(0,0,0,0.32)] dark:hover:shadow-[0_12px_28px_rgba(0,0,0,0.4)]"
            onClick={dispatchOpenRemainingValueCalculatorEvent}
          >
            <Calculator className="h-4 w-4" />
            <span>剩余价值计算器</span>
          </Button>
        </div>
      </div>

      {filteredNodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 py-16">
          <span className="mb-2 text-lg text-muted-foreground">
            {searchTerm.trim()
              ? t("search.no_results", { defaultValue: "没有找到匹配的节点" })
              : t("nodes.empty", { defaultValue: "暂无节点数据" })}
          </span>
          {searchTerm.trim() && (
            <span className="text-sm text-muted-foreground">
              {t("search.try_different", {
                defaultValue: "试试别的关键词",
              })}
            </span>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <NodeGrid
          key="grid-view"
          nodes={filteredNodes}
          liveData={liveData}
          onOpenNodeDetails={handleOpenNodeDetails}
        />
      ) : viewMode === "map" ? (
        <NodeMapView
          key="map-view"
          nodes={filteredNodes}
          liveData={liveData}
          onOpenNodeDetails={handleOpenNodeDetails}
        />
      ) : (
        <NodeTable key="table-view" nodes={filteredNodes} liveData={liveData} />
      )}

      <NodeDetailsPanel
        open={detailsOpen}
        onOpenChange={handleDetailsOpenChange}
        uuid={selectedNodeUuid}
      />
    </div>
  );
};

export default NodeDisplay;
