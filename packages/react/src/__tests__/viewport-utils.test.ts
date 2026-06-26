import { describe, expect, it } from "vitest";
import { normalizeWheelDelta, isPinchLikeWheel } from "../viewport-utils";

describe("viewport-utils", () => {
  describe("normalizeWheelDelta", () => {
    it("returns value as-is for deltaMode 0 (pixel)", () => {
      expect(normalizeWheelDelta(100, 0)).toBe(100);
      expect(normalizeWheelDelta(-50, 0)).toBe(-50);
    });

    it("multiplies by 16 for deltaMode 1 (line)", () => {
      expect(normalizeWheelDelta(3, 1)).toBe(48);
      expect(normalizeWheelDelta(-2, 1)).toBe(-32);
    });

    it("multiplies by 160 for deltaMode 2 (page)", () => {
      expect(normalizeWheelDelta(1, 2)).toBe(160);
      expect(normalizeWheelDelta(-1, 2)).toBe(-160);
    });

    it("handles zero values", () => {
      expect(normalizeWheelDelta(0, 0)).toBe(0);
      expect(normalizeWheelDelta(0, 1)).toBe(0);
      expect(normalizeWheelDelta(0, 2)).toBe(0);
    });
  });

  describe("isPinchLikeWheel", () => {
    it("returns true when ctrlKey is true", () => {
      const event = { ctrlKey: true, metaKey: false } as WheelEvent;
      expect(isPinchLikeWheel(event)).toBe(true);
    });

    it("returns true when metaKey is true", () => {
      const event = { ctrlKey: false, metaKey: true } as WheelEvent;
      expect(isPinchLikeWheel(event)).toBe(true);
    });

    it("returns true when both ctrlKey and metaKey are true", () => {
      const event = { ctrlKey: true, metaKey: true } as WheelEvent;
      expect(isPinchLikeWheel(event)).toBe(true);
    });

    it("returns false when neither ctrlKey nor metaKey is true", () => {
      const event = { ctrlKey: false, metaKey: false } as WheelEvent;
      expect(isPinchLikeWheel(event)).toBe(false);
    });
  });
});
