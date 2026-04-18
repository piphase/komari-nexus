"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";

import Flag from "@/components/Flag";
import { useLiveData } from "@/contexts/LiveDataContext";
import { useNodeList } from "@/contexts/NodeListContext";
import { liveDataToRecords } from "@/utils/RecordHelper";
import type { Record } from "@/types/LiveData";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";

import LoadChart from "./LoadChart";
import PingChart from "./PingChart";

const DetailsGrid = dynamic(
  () => import("@/components/DetailsGrid").then((mod) => ({ default: mod.DetailsGrid })),
  { ssr: false }
);

export function NodeDetailsContent({ uuid }: { uuid: string }) {
  const { t } = useTranslation();
  const { onRefresh } = useLiveData();
  const { nodeList } = useNodeList();
  const [recent, setRecent] = useState<Record[]>([]);
  const [chartView, setChartView] = useState<"load" | "ping">("load");
  const length = 30 * 5;

  const node = nodeList?.find((item) => item.uuid === uuid);

  useEffect(() => {
    if (!uuid) return;

    fetch(`/api/recent/${uuid}`)
      .then((res) => res.json())
      .then((data) => setRecent(data.data.slice(-length)))
      .catch((err) => console.error("Failed to fetch recent data:", err));
  }, [uuid, length]);

  useEffect(() => {
    const unsubscribe = onRefresh((resp) => {
      if (!uuid) return;

      const data = resp.data.data[uuid];
      if (!data) return;

      setRecent((prev) => {
        const newRecord: Record = data;
        const exists = prev.some((item) => item.updated_at === newRecord.updated_at);
        if (exists) {
          return prev;
        }

        return [...prev, newRecord].slice(-length);
      });
    });

    return unsubscribe;
  }, [onRefresh, uuid, length]);

  return (
    <div className="flex flex-col items-center gap-6 p-4 w-full max-w-[1400px] mx-auto">
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center gap-4 py-6">
          <div className="flex items-center gap-2">
            <Flag flag={node?.region ?? ""} />
            <h1 className="text-2xl font-bold tracking-tight">{node?.name ?? uuid}</h1>
          </div>
          <div className="bg-muted px-2 py-1 rounded text-xs font-mono text-muted-foreground">
            {node?.uuid ?? uuid}
          </div>
        </CardHeader>
      </Card>

      <DetailsGrid box align="center" uuid={uuid} />

      <div className="w-full space-y-6">
        <div className="w-full overflow-x-auto px-2">
          <div className="w-max mx-auto">
            <SegmentedControl
              value={chartView}
              onValueChange={(value) => setChartView(value as "load" | "ping")}
            >
              <SegmentedControlItem value="load" className="capitalize">
                {t("nodeCard.load")}
              </SegmentedControlItem>
              <SegmentedControlItem value="ping" className="capitalize">
                {t("nodeCard.ping")}
              </SegmentedControlItem>
            </SegmentedControl>
          </div>
        </div>

        <CardContent className="p-0">
          {chartView === "load" ? (
            <LoadChart uuid={uuid} data={liveDataToRecords(uuid, recent)} />
          ) : (
            <PingChart uuid={uuid} />
          )}
        </CardContent>
      </div>
    </div>
  );
}
