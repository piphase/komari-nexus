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
import { useMounted } from "@/hooks/useMounted";
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
type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

function formatConvertedAmount(t: TranslateFn, code: string, value: number | null) {
  if (value === null) {
    return t("remainingValue.placeholderPending", { defaultValue: "暂未换算" });
  }

  return `${code} ${value.toFixed(2)}`;
}

function formatOriginalAmount(code: string, value: number) {
  return `${code} ${value.toFixed(2)}`;
}

function formatBillingCycle(t: TranslateFn, billingCycle: number) {
  if (billingCycle === -1) {
    return t("remainingValue.billingCycle.once", { defaultValue: "一次性" });
  }

  return t("remainingValue.billingCycle.days", {
    count: billingCycle,
    defaultValue: "{{count}} 天",
  });
}

function formatRemainingTime(t: TranslateFn, remainingMs: number | null, isLongTerm: boolean) {
  if (isLongTerm) {
    return t("remainingValue.remainingTime.longTerm", { defaultValue: "长期" });
  }
  if (remainingMs === null) {
    return t("remainingValue.remainingTime.oneTime", { defaultValue: "一次性" });
  }

  const totalHours = Math.floor(remainingMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  return t("remainingValue.remainingTime.value", {
    days,
    hours,
    defaultValue: "{{days}} 天 {{hours}} 小时",
  });
}

function getSkipReasonLabel(t: TranslateFn, skipReason: SkipReason) {
  switch (skipReason) {
    case "missing_price":
      return t("remainingValue.skipReason.missing_price", { defaultValue: "未填写价格" });
    case "missing_currency":
      return t("remainingValue.skipReason.missing_currency", { defaultValue: "未填写币种" });
    case "unsupported_currency":
      return t("remainingValue.skipReason.unsupported_currency", {
        defaultValue: "币种暂不支持",
      });
    case "missing_expired_at":
      return t("remainingValue.skipReason.missing_expired_at", {
        defaultValue: "未填写到期时间",
      });
    case "invalid_expired_at":
      return t("remainingValue.skipReason.invalid_expired_at", {
        defaultValue: "到期时间格式无效",
      });
    case "unsupported_billing_cycle":
      return t("remainingValue.skipReason.unsupported_billing_cycle", {
        defaultValue: "未填写周期",
      });
    default:
      return t("remainingValue.skipReason.default", { defaultValue: "信息不完整" });
  }
}

function ActiveNodeCard({
  item,
  displayCurrency,
  t,
}: {
  item: RemainingValueNode & { convertedRemainingValue: number | null };
  displayCurrency: DisplayCurrency;
  t: TranslateFn;
}) {
  return (
    <article className="rounded-2xl border border-border/60 bg-muted/35 p-4 shadow-sm shadow-black/5">
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium">{item.name}</div>
        <div className="text-sm font-semibold">
          {formatConvertedAmount(t, displayCurrency, item.convertedRemainingValue)}
        </div>
      </div>
      <div className="mt-2 text-sm text-muted-foreground">
        {t("remainingValue.card.originalPrice", {
          amount: `${item.currencySymbol}${item.price}`,
          cycle: formatBillingCycle(t, item.billingCycle),
          defaultValue: "原价 {{amount}} / {{cycle}}",
        })}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">
        {t("remainingValue.card.remainingTime", {
          value: formatRemainingTime(t, item.remainingMs, item.isLongTerm),
          defaultValue: "剩余时间 {{value}}",
        })}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">
        {t("remainingValue.card.originalValue", {
          amount: formatOriginalAmount(item.currencyCode, item.remainingValueOriginal),
          defaultValue: "原币种价值 {{amount}}",
        })}
      </div>
    </article>
  );
}

function SkippedNodeCard({ item, t }: { item: SkippedRemainingValueNode; t: TranslateFn }) {
  return (
    <article className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-4 shadow-sm shadow-black/5">
      <div className="font-medium">{item.name}</div>
      <div className="mt-2 text-sm text-muted-foreground">
        {t("remainingValue.card.skipReason", { defaultValue: "未纳入原因" })}
      </div>
      <div className="mt-1 text-sm text-foreground/80">{getSkipReasonLabel(t, item.skipReason)}</div>
    </article>
  );
}

function ExpiredNodeCard({ item, t }: { item: RemainingValueNode; t: TranslateFn }) {
  return (
    <article className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-4 shadow-sm shadow-black/5">
      <div className="font-medium">{item.name}</div>
      <div className="mt-2 text-sm text-muted-foreground">
        {t("remainingValue.card.originalPrice", {
          amount: `${item.currencySymbol}${item.price}`,
          cycle: formatBillingCycle(t, item.billingCycle),
          defaultValue: "原价 {{amount}} / {{cycle}}",
        })}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">
        {t("remainingValue.card.expiredValue", { defaultValue: "剩余价值 0" })}
      </div>
    </article>
  );
}

export default function RemainingValueCalculator() {
  const { t, ready, i18n } = useTranslation();
  const mounted = useMounted();
  const isMobile = useIsMobile();
  const { nodeList } = useNodeList();
  const [open, setOpen] = useState(false);
  const [displayCurrency, setDisplayCurrency] =
    useLocalStorage<DisplayCurrency>("remainingValueDisplayCurrency", "CNY");
  const [detailFilter, setDetailFilter] = useState<DetailFilter>("all");
  const [ratesState, setRatesState] = useState<LoadedRates | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);

  const locale = i18n.resolvedLanguage || i18n.language || "zh-CN";
  const snapshot = useMemo(() => buildRemainingValueSnapshot(nodeList ?? []), [nodeList]);
  const titleText = t("remainingValue.title", { defaultValue: "剩余价值计算器" });
  const descriptionText = t("remainingValue.description", {
    defaultValue: "查看节点剩余价值与汇率换算结果。",
  });

  const convertedActive = useMemo(() => {
    return snapshot.active
      .map((item) => {
        const convertedRemainingValue = ratesState
          ? convertAmount(
              item.remainingValueOriginal,
              item.currencyCode,
              displayCurrency,
              ratesState.rates,
            )
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
      setRatesError(
        t("remainingValue.errorRatesUnavailable", { defaultValue: "暂时无法获取汇率" }),
      );
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
    {
      value: "all",
      label: t("remainingValue.filter.all", {
        count: filterCounts.all,
        defaultValue: "全部 {{count}}",
      }),
    },
    {
      value: "active",
      label: t("remainingValue.filter.active", {
        count: filterCounts.active,
        defaultValue: "可计算 {{count}}",
      }),
    },
    {
      value: "skipped",
      label: t("remainingValue.filter.skipped", {
        count: filterCounts.skipped,
        defaultValue: "未纳入 {{count}}",
      }),
    },
    {
      value: "expired",
      label: t("remainingValue.filter.expired", {
        count: filterCounts.expired,
        defaultValue: "已过期 {{count}}",
      }),
    },
  ];

  const renderAllSections = () => {
    const sections = [];

    if (convertedActive.length > 0) {
      sections.push(
        <section key="active" className="space-y-2">
          <div className="text-sm font-semibold">
            {t("remainingValue.section.active", { defaultValue: "可计算节点" })}
          </div>
          {convertedActive.map((item) => (
            <ActiveNodeCard
              key={item.uuid}
              item={item}
              displayCurrency={displayCurrency}
              t={t}
            />
          ))}
        </section>,
      );
    }

    if (snapshot.skipped.length > 0) {
      sections.push(
        <section key="skipped" className="space-y-2">
          <div className="text-sm font-semibold">
            {t("remainingValue.section.skipped", { defaultValue: "未纳入节点" })}
          </div>
          {snapshot.skipped.map((item) => (
            <SkippedNodeCard key={item.uuid} item={item} t={t} />
          ))}
        </section>,
      );
    }

    if (snapshot.expired.length > 0) {
      sections.push(
        <section key="expired" className="space-y-2">
          <div className="text-sm font-semibold">
            {t("remainingValue.section.expired", { defaultValue: "已过期节点" })}
          </div>
          {snapshot.expired.map((item) => (
            <ExpiredNodeCard key={item.uuid} item={item} t={t} />
          ))}
        </section>,
      );
    }

    if (sections.length === 0) {
      return (
        <section className="rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
          {t("remainingValue.empty.none", { defaultValue: "当前没有可展示的节点" })}
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
            {t("remainingValue.empty.active", { defaultValue: "当前没有可计算的节点" })}
          </section>
        );
      }

      return (
        <section className="space-y-2">
          {convertedActive.map((item) => (
            <ActiveNodeCard key={item.uuid} item={item} displayCurrency={displayCurrency} t={t} />
          ))}
        </section>
      );
    }

    if (detailFilter === "skipped") {
      if (snapshot.skipped.length === 0) {
        return (
          <section className="rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
            {t("remainingValue.empty.skipped", { defaultValue: "当前没有未纳入的节点" })}
          </section>
        );
      }

      return (
        <section className="space-y-2">
          {snapshot.skipped.map((item) => (
            <SkippedNodeCard key={item.uuid} item={item} t={t} />
          ))}
        </section>
      );
    }

    if (snapshot.expired.length === 0) {
      return (
        <section className="rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
          {t("remainingValue.empty.expired", { defaultValue: "暂无已过期节点" })}
        </section>
      );
    }

    return (
      <section className="space-y-2">
        {snapshot.expired.map((item) => (
          <ExpiredNodeCard key={item.uuid} item={item} t={t} />
        ))}
      </section>
    );
  };

  const rateStatusText = ratesState?.isStale
    ? t("remainingValue.rateStatus.stale", { defaultValue: "汇率非最新" })
    : ratesState?.fetchedAt
      ? t("remainingValue.rateStatus.updatedAt", {
          value: new Date(ratesState.fetchedAt).toLocaleString(locale),
          defaultValue: "汇率更新时间 {{value}}",
        })
      : t("remainingValue.rateStatus.loading", { defaultValue: "等待获取汇率" });

  const panelBody = (
    <div
      data-testid="remaining-value-panel"
      className="flex max-h-[min(85vh,48rem)] flex-col overflow-hidden rounded-3xl border border-border/80 bg-card/95 ring-1 ring-white/10 shadow-[0_20px_44px_rgba(15,23,42,0.18)] dark:ring-white/12 dark:shadow-[0_20px_44px_rgba(0,0,0,0.42)]"
    >
      <div className="space-y-4 border-b border-border/70 px-5 py-4">
        <div className="text-base font-semibold">{titleText}</div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">{rateStatusText}</div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => void refreshRates(true)}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{t("remainingValue.refreshRates", { defaultValue: "刷新汇率" })}</span>
          </Button>
        </div>

        {ratesError && <div className="text-xs text-orange-600">{ratesError}</div>}

        <div
          data-testid="remaining-value-rate-provider"
          className="text-xs leading-5 text-muted-foreground"
        >
          {t("remainingValue.rateProvider", {
            defaultValue: "在线汇率由 Frankfurter 提供，仅会在你打开计算器后发起查询。",
          })}
        </div>

        <Tabs
          value={displayCurrency}
          onValueChange={(value) => setDisplayCurrency(value as DisplayCurrency)}
          className="max-w-full"
        >
          <TabsList className="h-10 w-fit max-w-full justify-start rounded-xl border bg-muted/45 p-1">
            {DISPLAY_CURRENCIES.map((currency) => (
              <TabsTrigger key={currency} value={currency} className="min-w-16 rounded-lg px-4">
                {currency}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-4 overflow-y-auto px-5 py-4">
        <section className="rounded-2xl border border-border/60 bg-muted/55 p-4 shadow-inner shadow-black/5">
          <div className="text-xs text-muted-foreground">
            {t("remainingValue.total", { defaultValue: "全部剩余价值" })}
          </div>
          <div className="mt-2 text-2xl font-bold">
            {formatConvertedAmount(t, displayCurrency, convertedTotal)}
          </div>
        </section>

        <Tabs
          value={detailFilter}
          onValueChange={(value) => setDetailFilter(value as DetailFilter)}
          className="max-w-full"
        >
          <TabsList className="h-auto w-fit max-w-full flex-wrap justify-start gap-2 rounded-2xl border bg-muted/40 p-2">
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

  if (!mounted || !ready) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label={titleText}
        onClick={() => void handleOpenChange(!open)}
        className="fixed bottom-6 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border/80 bg-card/95 ring-1 ring-white/10 shadow-[0_12px_28px_rgba(15,23,42,0.18)] dark:ring-white/12 dark:shadow-[0_14px_30px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:shadow-[0_16px_32px_rgba(15,23,42,0.22)] dark:hover:shadow-[0_16px_34px_rgba(0,0,0,0.46)]"
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
