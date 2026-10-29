import { describe, expect, it } from "vitest";
import { bundleSavingsPaise, formatINR, sumOfSinglesPaise } from "./money";
import { formatAges, formatDate } from "./format";

describe("formatINR", () => {
  it("uses the rupee sign and Indian digit grouping", () => {
    expect(formatINR(115000)).toBe("₹1,150");
    expect(formatINR(12345600)).toBe("₹1,23,456");
    expect(formatINR(15000)).toBe("₹150");
  });

  it("shows paise only when present", () => {
    expect(formatINR(15050)).toBe("₹150.50");
  });

  it("rejects non-integer paise", () => {
    expect(() => formatINR(10.5)).toThrow();
  });
});

describe("bundle savings", () => {
  it("is the sum of singles minus the bundle price", () => {
    const components = [
      { pricePaise: 15000, quantity: 1 },
      { pricePaise: 15000, quantity: 1 },
      { pricePaise: 15000, quantity: 1 },
    ];
    expect(sumOfSinglesPaise(components)).toBe(45000);
    expect(bundleSavingsPaise(39900, components)).toBe(5100);
  });
});

describe("format helpers", () => {
  it("formats dates as DD Month YYYY in Asia/Kolkata", () => {
    expect(formatDate(new Date("2024-03-26T00:00:00Z"))).toBe("26 March 2024");
    // 20:00 UTC is already the next day in India.
    expect(formatDate(new Date("2024-12-25T20:00:00Z"))).toBe("26 December 2024");
  });

  it("formats age ranges from the product record", () => {
    expect(formatAges(6, 8)).toBe("Ages 6–8");
    expect(formatAges(5, null)).toBe("Ages 5+");
    expect(formatAges(null, null)).toBeNull();
  });
});
