import { describe, expect, it } from "vitest";
import {
  getEventClientPoint,
  getSyntheticMovingRect,
  getUnionRect,
  placeMeasuredRectAtPoint,
  toDropRect,
} from "../drag-geometry";
import type { DropRect } from "../drag-interactions";

describe("drag-geometry", () => {
  describe("getEventClientPoint", () => {
    it("extracts coordinates from MouseEvent", () => {
      const event = { clientX: 100, clientY: 200 } as MouseEvent;
      const point = getEventClientPoint(event);
      expect(point).toEqual({ x: 100, y: 200 });
    });

    it("extracts coordinates from TouchEvent with touches", () => {
      const event = {
        touches: [{ clientX: 50, clientY: 60 }],
        changedTouches: [],
      } as unknown as TouchEvent;
      const point = getEventClientPoint(event);
      expect(point).toEqual({ x: 50, y: 60 });
    });

    it("falls back to changedTouches when touches is empty", () => {
      const event = {
        touches: [],
        changedTouches: [{ clientX: 70, clientY: 80 }],
      } as unknown as TouchEvent;
      const point = getEventClientPoint(event);
      expect(point).toEqual({ x: 70, y: 80 });
    });

    it("returns undefined when no touch data available", () => {
      const event = {
        touches: [],
        changedTouches: [],
      } as unknown as TouchEvent;
      const point = getEventClientPoint(event);
      expect(point).toBeUndefined();
    });
  });

  describe("toDropRect", () => {
    it("converts DOMRect to DropRect", () => {
      const domRect = {
        left: 10, top: 20, right: 30, bottom: 40, width: 20, height: 20,
      } as DOMRect;
      const result = toDropRect(domRect);
      expect(result).toEqual({
        left: 10, top: 20, right: 30, bottom: 40, width: 20, height: 20,
      });
    });
  });

  describe("getSyntheticMovingRect", () => {
    it("creates a 2x2 rect centered at the point", () => {
      const rect = getSyntheticMovingRect({ x: 100, y: 200 });
      expect(rect.left).toBe(99);
      expect(rect.top).toBe(199);
      expect(rect.right).toBe(101);
      expect(rect.bottom).toBe(201);
      expect(rect.width).toBe(2);
      expect(rect.height).toBe(2);
    });
  });

  describe("getUnionRect", () => {
    it("returns undefined for empty array", () => {
      expect(getUnionRect([])).toBeUndefined();
    });

    it("returns the single rect when only one is provided", () => {
      const rect: DropRect = { left: 0, top: 0, right: 10, bottom: 10, width: 10, height: 10 };
      expect(getUnionRect([rect])).toEqual(rect);
    });

    it("computes union of multiple rects", () => {
      const r1: DropRect = { left: 0, top: 0, right: 10, bottom: 10, width: 10, height: 10 };
      const r2: DropRect = { left: 5, top: 5, right: 20, bottom: 20, width: 15, height: 15 };
      const result = getUnionRect([r1, r2]);
      expect(result).toEqual({
        left: 0, top: 0, right: 20, bottom: 20, width: 20, height: 20,
      });
    });

    it("handles non-overlapping rects", () => {
      const r1: DropRect = { left: 0, top: 0, right: 5, bottom: 5, width: 5, height: 5 };
      const r2: DropRect = { left: 10, top: 10, right: 15, bottom: 15, width: 5, height: 5 };
      const result = getUnionRect([r1, r2]);
      expect(result).toEqual({
        left: 0, top: 0, right: 15, bottom: 15, width: 15, height: 15,
      });
    });
  });

  describe("placeMeasuredRectAtPoint", () => {
    it("centers the measured rect at the given point", () => {
      const measured: DropRect = { left: 0, top: 0, right: 10, bottom: 10, width: 10, height: 10 };
      const result = placeMeasuredRectAtPoint({ x: 100, y: 200 }, measured);
      expect(result.left).toBe(95);
      expect(result.top).toBe(195);
      expect(result.right).toBe(105);
      expect(result.bottom).toBe(205);
      expect(result.width).toBe(10);
      expect(result.height).toBe(10);
    });

    it("preserves width and height of the measured rect", () => {
      const measured: DropRect = { left: 0, top: 0, right: 20, bottom: 30, width: 20, height: 30 };
      const result = placeMeasuredRectAtPoint({ x: 0, y: 0 }, measured);
      expect(result.width).toBe(20);
      expect(result.height).toBe(30);
    });
  });
});
