import { describe, expect, it } from "vitest";

import en from "@/i18n/locales/en.json";
import idID from "@/i18n/locales/id_ID.json";
import jaJP from "@/i18n/locales/ja_JP.json";
import zhCN from "@/i18n/locales/zh_CN.json";
import zhTW from "@/i18n/locales/zh_TW.json";

describe("front custom locale texts", () => {
  it("keeps the existing front-custom locale entries populated", () => {
    expect(en.nodeDisplay.grid).toBe("Cards");
    expect(en.mapView.activeCountries).toBe("{{count}} active countries / regions");
    expect(en.remainingValue.title).toBe("Remaining Value Calculator");
    expect(en.visitorInfo.title).toBe("Visitor Info");

    expect(zhCN.nodeDisplay.grid).toBeTruthy();
    expect(zhTW.nodeDisplay.grid).toBeTruthy();
    expect(jaJP.nodeDisplay.grid).toBeTruthy();
  });

  it("includes the monthly remaining traffic title in every maintained locale", () => {
    expect(en.nodeCard.monthlyRemainingTraffic).toBe("Monthly Remaining Traffic");
    expect(zhCN.nodeCard.monthlyRemainingTraffic).toBeTruthy();
    expect(zhTW.nodeCard.monthlyRemainingTraffic).toBeTruthy();
    expect(jaJP.nodeCard.monthlyRemainingTraffic).toBeTruthy();
    expect(idID.nodeCard.monthlyRemainingTraffic).toBeTruthy();
  });

  it("includes monthly traffic detail labels without placeholder corruption", () => {
    expect(en.nodeCard.uploadAmount).toBe("Upload");
    expect(en.nodeCard.downloadAmount).toBe("Download");
    expect(en.nodeCard.trafficStatTypeSum).toBe("Sum");
    expect(en.nodeCard.trafficStatTypeUp).toBe("Upload Only");
    expect(en.nodeCard.trafficStatTypeDown).toBe("Download Only");
    expect(en.nodeCard.trafficStatTypeMax).toBe("Max");
    expect(en.nodeCard.trafficStatTypeMin).toBe("Min");

    expect(zhCN.nodeCard.uploadAmount).not.toContain("?");
    expect(zhCN.nodeCard.downloadAmount).not.toContain("?");
    expect(zhCN.nodeCard.trafficStatTypeSum).not.toContain("?");
    expect(zhCN.nodeCard.trafficStatTypeUp).not.toContain("?");
    expect(zhCN.nodeCard.trafficStatTypeDown).not.toContain("?");
    expect(zhCN.nodeCard.trafficStatTypeMax).not.toContain("?");
    expect(zhCN.nodeCard.trafficStatTypeMin).not.toContain("?");

    expect(zhTW.nodeCard.uploadAmount).not.toContain("?");
    expect(zhTW.nodeCard.downloadAmount).not.toContain("?");
    expect(jaJP.nodeCard.trafficStatTypeMax).not.toContain("?");
    expect(jaJP.nodeCard.trafficStatTypeMin).not.toContain("?");
    expect(idID.nodeCard.uploadAmount).not.toContain("?");
    expect(idID.nodeCard.downloadAmount).not.toContain("?");
  });
});
