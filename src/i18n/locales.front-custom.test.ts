import { describe, expect, it } from "vitest";

import en from "@/i18n/locales/en.json";
import jaJP from "@/i18n/locales/ja_JP.json";
import zhCN from "@/i18n/locales/zh_CN.json";
import zhTW from "@/i18n/locales/zh_TW.json";

describe("front custom locale texts", () => {
  it("keeps the new Chinese locale strings readable instead of question marks", () => {
    expect(zhCN.nodeDisplay.grid).toBe("卡片");
    expect(zhCN.mapView.activeCountries).toBe("{{count}} 个活跃国家 / 地区");
    expect(zhCN.remainingValue.title).toBe("剩余价值计算器");
    expect(zhCN.visitorInfo.title).toBe("访客信息");
  });

  it("keeps the new Traditional Chinese locale strings readable instead of question marks", () => {
    expect(zhTW.nodeDisplay.grid).toBe("卡片");
    expect(zhTW.mapView.activeCountries).toBe("{{count}} 個活躍國家 / 地區");
    expect(zhTW.remainingValue.title).toBe("剩餘價值計算器");
    expect(zhTW.visitorInfo.title).toBe("訪客資訊");
  });

  it("keeps the new Japanese locale strings readable instead of question marks", () => {
    expect(jaJP.nodeDisplay.grid).toBe("カード");
    expect(jaJP.mapView.activeCountries).toBe("{{count}} のアクティブな国 / 地域");
    expect(jaJP.remainingValue.title).toBe("残存価値計算機");
    expect(jaJP.visitorInfo.title).toBe("訪問者情報");
  });

  it("does not affect the English locale strings", () => {
    expect(en.nodeDisplay.grid).toBe("Cards");
    expect(en.mapView.activeCountries).toBe("{{count}} active countries / regions");
    expect(en.remainingValue.title).toBe("Remaining Value Calculator");
    expect(en.visitorInfo.title).toBe("Visitor Info");
  });
});
