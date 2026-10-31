/**
 * Step 1 – Delete alignment: tests for soft-deactivating DeliverySlot when partner deletes ScheduledDeliverySlot.
 * Run: node --test tests/deliverySettingsController.deleteAlignment.test.js
 */
import { describe, it } from "node:test";
import assert from "node:assert";
import { deactivateDeliverySlotsForScheduledSlot } from "../controllers/deliverySettingsController.js";

describe("Step 1 – Delete alignment", () => {
  describe("deactivateDeliverySlotsForScheduledSlot", () => {
    it("calls updateMany with correct where (warehouseId, date, slot) and data (isActive: false)", async () => {
      const slotDate = new Date(Date.UTC(2025, 2, 15)); // 2025-03-15 UTC
      const slot = {
        slotDate,
        startTime: "09:00",
        endTime: "12:00",
      };
      const warehouseId = "wh-uuid-123";

      const updateManyCalls = [];
      const mockPrisma = {
        deliverySlot: {
          updateMany: async (args) => {
            updateManyCalls.push(args);
            return { count: 1 };
          },
        },
      };

      const result = await deactivateDeliverySlotsForScheduledSlot(mockPrisma, { slot, warehouseId });

      assert.strictEqual(result.count, 1);
      assert.strictEqual(updateManyCalls.length, 1);

      const call = updateManyCalls[0];
      assert.strictEqual(call.where.warehouseId, warehouseId);
      assert.strictEqual(call.where.slot, "09:00-12:00");
      assert.ok(call.where.date instanceof Date);
      assert.strictEqual(call.where.date.getUTCFullYear(), 2025);
      assert.strictEqual(call.where.date.getUTCMonth(), 2);
      assert.strictEqual(call.where.date.getUTCDate(), 15);
      assert.strictEqual(call.where.date.getUTCHours(), 0);
      assert.strictEqual(call.where.date.getUTCMinutes(), 0);

      assert.deepStrictEqual(call.data, { isActive: false });
    });

    it("normalizes date to UTC midnight (no time component)", async () => {
      const slotDate = new Date("2025-06-20T18:30:00.000Z"); // evening UTC
      const slot = { slotDate, startTime: "14:00", endTime: "16:00" };
      const mockPrisma = {
        deliverySlot: {
          updateMany: async (args) => {
            const d = args.where.date;
            assert.strictEqual(d.getUTCHours(), 0);
            assert.strictEqual(d.getUTCMinutes(), 0);
            assert.strictEqual(d.getUTCDate(), 20);
            assert.strictEqual(d.getUTCMonth(), 5);
            return { count: 0 };
          },
        },
      };

      await deactivateDeliverySlotsForScheduledSlot(mockPrisma, { slot, warehouseId: "wh" });
    });

    it("trims startTime/endTime in slot key", async () => {
      const slot = {
        slotDate: new Date(Date.UTC(2025, 0, 1)),
        startTime: " 08:00 ",
        endTime: " 10:00 ",
      };
      const mockPrisma = {
        deliverySlot: {
          updateMany: async (args) => {
            assert.strictEqual(args.where.slot, "08:00-10:00");
            return { count: 0 };
          },
        },
      };

      await deactivateDeliverySlotsForScheduledSlot(mockPrisma, { slot, warehouseId: "w" });
    });

    it("returns updateMany result (count 0 when no matching row)", async () => {
      const slot = {
        slotDate: new Date(Date.UTC(2025, 0, 1)),
        startTime: "09:00",
        endTime: "12:00",
      };
      const mockPrisma = {
        deliverySlot: { updateMany: async () => ({ count: 0 }) },
      };

      const result = await deactivateDeliverySlotsForScheduledSlot(mockPrisma, { slot, warehouseId: "wh" });
      assert.strictEqual(result.count, 0);
    });

    it("includes routeMapId in where when slot has routeMapId (route-scoped deactivation)", async () => {
      const slotDate = new Date(Date.UTC(2025, 3, 10));
      const slot = {
        slotDate,
        startTime: "09:00",
        endTime: "12:00",
        routeMapId: "route-uuid-456",
      };
      const warehouseId = "wh-uuid-123";
      const updateManyCalls = [];
      const mockPrisma = {
        deliverySlot: {
          updateMany: async (args) => {
            updateManyCalls.push(args);
            return { count: 1 };
          },
        },
      };

      await deactivateDeliverySlotsForScheduledSlot(mockPrisma, { slot, warehouseId });

      assert.strictEqual(updateManyCalls.length, 1);
      assert.strictEqual(updateManyCalls[0].where.warehouseId, warehouseId);
      assert.strictEqual(updateManyCalls[0].where.slot, "09:00-12:00");
      assert.strictEqual(updateManyCalls[0].where.routeMapId, "route-uuid-456");
      assert.deepStrictEqual(updateManyCalls[0].data, { isActive: false });
    });
  });
});
