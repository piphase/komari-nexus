"use client";

import { Calculator, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNodeList } from "@/contexts/NodeListContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { type LoadedRates, convertAmount, loadRates } from "@/lib/exchangeRates";
import { OPEN_REMAINING_VALUE_CALCULATOR_EVENT } from "@/lib/remainingValueEvents";
import {
  buildRemainingValueSnapshot,
  type RemainingValueNode,
  type SkipReason,
  type SkippedRemainingValueNode,
} from "@/lib/remainingValue";

const DISPLAY_CURRENCIES = ["CNY", "USD", "EUR"] as const;

type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];
type DetailFilter = "all" | "active" | "skipped" | "expired";

function formatConvertedAmount(code: string, value: number | null) {
  if (value === null) {
    return "鏆傛湭鎹㈢畻";
  }

  return `${code} ${value.toFixed(2)}`;
}

function formatOriginalAmount(code: string, value: number) {
  return `${code} ${value.toFixed(2)}`;
}

function formatBillingCycle(billingCycle: number) {
  return billingCycle === -1 ? "一次性" : `${billingCycle} 天`;
}

function formatRemainingTime(remainingMs: number | null, isLongTerm: boolean) {
  if (isLongTerm) {
    return "长期";
  }
  if (remainingMs === null) {
    return "一次性";
  }

  const totalHours = Math.floor(remainingMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  return `${days} 天 ${hours} 小时`;
}

function getSkipReasonLabel(skipReason: SkipReason) {
  switch (skipReason) {
    case "missing_price":
      return "未填写价格";
    case "missing_currency":
      return "未填写币种";
    case "unsupported_currency":
      return "币种暂不支持";
    case "missing_expired_at":
      return "未填写到期时间";
    case "invalid_expired_at":
      return "到期时间格式无效";
    case "unsupported_billing_cycle":
      return "未填写周期";
    default:
      return "信息不完整";
  }
}

function ActiveNodeCard({
  item,
  displayCurrency,
}: {
  item: RemainingValueNode & { convertedRemainingValue: number | null };
  displayCurrency: DisplayCurrency;
}) {
  return (
    <article className="rounded-2xl border border-border/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium">{item.name}</div>
        <div className="text-sm font-semibold">
          {formatConvertedAmount(displayCurrency, item.convertedRemainingValue)}
        </div>
      </div>
      <div className="mt-2 text-sm text-muted-foreground">
        原价 {item.currencySymbol}
        {item.price} / {formatBillingCycle(item.billingCycle)}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">
        剩余时间 {formatRemainingTime(item.remainingMs, item.isLongTerm)}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">
        原币种价值 {formatOriginalAmount(item.currencyCode, item.remainingValueOriginal)}
      </div>
    </article>
  );
}

function SkippedNodeCard({ item }: { item: SkippedRemainingValueNode }) {
  return (
    <article className="rounded-2xl border border-dashed border-border/60 p-4">
      <div className="font-medium">{item.name}</div>
      <div className="mt-2 text-sm text-muted-foreground">未纳入原因</div>
      <div className="mt-1 text-sm text-foreground/80">{getSkipReasonLabel(item.skipReason)}</div>
    </article>
  );
}

function ExpiredNodeCard({ item }: { item: RemainingValueNode }) {
  return (
    <article className="rounded-2xl border border-dashed border-border/60 p-4">
      <div className="font-medium">{item.name}</div>
      <div className="mt-2 text-sm text-muted-foreground">
        原价 {item.currencySymbol}
        {item.price} / {formatBillingCycle(item.billingCycle)}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">剩余价值 0</div>
    </article>
  );
}

export default function RemainingValueCalculator() {
  const [t] = useTranslation();
  const isMobile = useIsMobile();
  const { nodeList } = useNodeList();
  const [open, setOpen] = useState(false);
  const [displayCurrency, setDisplayCurrency] =
    useLocalStorage<DisplayCurrency>("remainingValueDisplayCurrency", "CNY");
  const [detailFilter, setDetailFilter] = useState<DetailFilter>("all");
  const [ratesState, setRatesState] = useState<LoadedRates | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);

  const snapshot = useMemo(() => buildRemainingValueSnapshot(nodeList ?? []), [nodeList]);
  const titleText = t("remainingValue.title", { defaultValue: "剩余价值计算器" });
  const descriptionText = "查看节点剩余价值与汇率换算结果。";

  const convertedActive = useMemo(() => {
    return snapshot.active
      .map((item) => {
        const convertedRemainingValue = ratesState
          ? convertAmount(item.remainingValueOriginal, item.currencyCode, displayCurrency, ratesState.rates)
          : null;

        return {
          ...item,
          convertedRemainingValue,
        };
      })
      .sort((left, right) => (right.convertedRemainingValue ?? -1) - (left.convertedRemainingValue ?? -1));
  }, [displayCurrency, ratesState, snapshot.active]);

  const convertedTotal = useMemo(() => {
    if (!ratesState) {
      return null;
    }

    return convertedActive.reduce((sum, item) => sum + (item.convertedRemainingValue ?? 0), 0);
  }, [convertedActive, ratesState]);

  const refreshRates = async (forceRefresh = false) => {
    const sourceCurrencies = Array.from(new Set(snapshot.active.map((item) => item.currencyCode)));
    if (sourceCurrencies.length === 0) {
      return;
    }

    setIsRefreshing(true);
    setRatesError(null);

    try {
      const loaded = await loadRates({
        displayCurrency,
        sourceCurrencies,
        forceRefresh,
      });

      setRatesState(loaded);
    } catch {
      setRatesError("暂时无法获取汇率");
    } finally {
      setIsRefreshing(false);
    }
  };

  const openPanel = async () => {
    setOpen(true);

    if (
      snapshot.active.length > 0 &&
      (!ratesState || typeof ratesState.rates[displayCurrency] !== "number")
    ) {
      await refreshRates(false);
    }
  };

  const handleOpenChange = async (nextOpen: boolean) => {
    if (!nextOpen) {
      setOpen(false);
      return;
    }

    await openPanel();
  };

  useEffect(() => {
    const handleExternalOpen = () => {
      void openPanel();
    };

    window.addEventListener(OPEN_REMAINING_VALUE_CALCULATOR_EVENT, handleExternalOpen);
    return () => {
      window.removeEventListener(OPEN_REMAINING_VALUE_CALCULATOR_EVENT, handleExternalOpen);
    };
  }, [displayCurrency, ratesState, snapshot.active.length]);

  useEffect(() => {
    if (
      open &&
      snapshot.active.length > 0 &&
      ratesState &&
      typeof ratesState.rates[displayCurrency] !== "number"
    ) {
      void refreshRates(false);
    }
  }, [displayCurrency, open, ratesState, snapshot.active.length]);

  const filterCounts = {
    all: snapshot.active.length + snapshot.skipped.length + snapshot.expired.length,
    active: snapshot.active.length,
    skipped: snapshot.skipped.length,
    expired: snapshot.expired.length,
  };

  const filterOptions: Array<{ value: DetailFilter; label: string }> = [
    { value: "all", label: `全部 ${filterCounts.all}` },
    { value: "active", label: `可计算 ${filterCounts.active}` },
    { value: "skipped", label: `未纳入 ${filterCounts.skipped}` },
    { value: "expired", label: `已过期 ${filterCounts.expired}` },
  ];

  const renderAllSections = () => {
    const sections = [];

    if (convertedActive.length > 0) {
      sections.push(
        <section key="active" className="space-y-2">
          <div className="text-sm font-semibold">可计算节点</div>
          {convertedActive.map((item) => (
            <ActiveNodeCard key={item.uuid} item={item} displayCurrency={displayCurrency} />
          ))}
        </section>,
      );
    }

    if (snapshot.skipped.length > 0) {
      sections.push(
        <section key="skipped" className="space-y-2">
          <div className="text-sm font-semibold">未纳入节点</div>
          {snapshot.skipped.map((item) => (
            <SkippedNodeCard key={item.uuid} item={item} />
          ))}
        </section>,
      );
    }

    if (snapshot.expired.length > 0) {
      sections.push(
        <section key="expired" className="space-y-2">
          <div className="text-sm font-semibold">已过期节点</div>
          {snapshot.expired.map((item) => (
            <ExpiredNodeCard key={item.uuid} item={item} />
          ))}
        </section>,
      );
    }

    if (sections.length === 0) {
      return (
        <section className="rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
          当前没有可展示的节点
        </section>
      );
    }

    return sections;
  };

  const renderFilteredSection = () => {
    if (detailFilter === "all") {
      return renderAllSections();
    }

    if (detailFilter === "active") {
      if (convertedActive.length === 0) {
        return (
          <section className="rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
            当前没有可计算的节点
          </section>
        );
      }

      return (
        <section className="space-y-2">
          {convertedActive.map((item) => (
            <ActiveNodeCard key={item.uuid} item={item} displayCurrency={displayCurrency} />
          ))}
        </section>
      );
    }

    if (detailFilter === "skipped") {
      if (snapshot.skipped.length === 0) {
        return (
          <section className="rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
            当前没有未纳入的节点
          </section>
        );
      }

      return (
        <section className="space-y-2">
          {snapshot.skipped.map((item) => (
            <SkippedNodeCard key={item.uuid} item={item} />
          ))}
        </section>
      );
    }

    if (snapshot.expired.length === 0) {
      return (
        <section className="rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
          暂无已过期节点
        </section>
      );
    }

    return (
      <section className="space-y-2">
        {snapshot.expired.map((item) => (
          <ExpiredNodeCard key={item.uuid} item={item} />
        ))}
      </section>
    );
  };

  const panelBody = (
    <div
      data-testid="remaining-value-panel"
      className="flex max-h-[min(85vh,48rem)] flex-col overflow-hidden rounded-3xl bg-background"
    >
      <div className="space-y-4 border-b border-border/70 px-5 py-4">
        <div className="text-base font-semibold">{titleText}</div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {ratesState?.isStale
              ? "汇率非最新"
              : ratesState?.fetchedAt
                ? `汇率更新时间 ${new Date(ratesState.fetchedAt).toLocaleString("zh-CN")}`
                : "等待获取汇率"}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => void refreshRates(true)}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>刷新汇率</span>
          </Button>
        </div>

        {ratesError && <div className="text-xs text-orange-600">{ratesError}</div>}

        <div
          data-testid="remaining-value-rate-provider"
          className="text-xs leading-5 text-muted-foreground"
        >
          在线汇率由 Frankfurter 提供，仅会在你打开计算器后发起查询。
        </div>

        <Tabs
          value={displayCurrency}
          onValueChange={(value) => setDisplayCurrency(value as DisplayCurrency)}
          className="max-w-full"
        >
          <TabsList className="h-10 w-fit max-w-full justify-start rounded-xl border bg-muted/50 p-1">
            {DISPLAY_CURRENCIES.map((currency) => (
              <TabsTrigger key={currency} value={currency} className="min-w-16 rounded-lg px-4">
                {currency}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-4 overflow-y-auto px-5 py-4">
        <section className="rounded-2xl bg-muted/40 p-4">
          <div className="text-xs text-muted-foreground">
            {t("remainingValue.total", { defaultValue: "全部剩余价值" })}
          </div>
          <div className="mt-2 text-2xl font-bold">
            {formatConvertedAmount(displayCurrency, convertedTotal)}
          </div>
        </section>

        <Tabs
          value={detailFilter}
          onValueChange={(value) => setDetailFilter(value as DetailFilter)}
          className="max-w-full"
        >
          <TabsList className="h-auto w-fit max-w-full flex-wrap justify-start gap-2 rounded-2xl border bg-muted/30 p-2">
            {filterOptions.map((option) => (
              <TabsTrigger key={option.value} value={option.value} className="rounded-xl px-4 py-2">
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {renderFilteredSection()}
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        aria-label={titleText}
        onClick={() => void handleOpenChange(!open)}
        className="fixed bottom-6 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-background/90 shadow-lg backdrop-blur-xl transition-all duration-300 hover:scale-105"
      >
        <Calculator className="h-5 w-5 text-primary" />
      </button>

      {isMobile ? (
        <Drawer open={open} onOpenChange={(nextOpen) => void handleOpenChange(nextOpen)}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerTitle className="sr-only">{titleText}</DrawerTitle>
            <DrawerDescription className="sr-only">{descriptionText}</DrawerDescription>
            {panelBody}
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={(nextOpen) => void handleOpenChange(nextOpen)}>
          <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden border-none p-0 shadow-2xl">
            <DialogTitle className="sr-only">{titleText}</DialogTitle>
            <DialogDescription className="sr-only">{descriptionText}</DialogDescription>
            {panelBody}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

