/**
 * Integration tests for the delivery slot engine (partner API).
 * Covers: slot deactivation on scheduled-slot delete, route-scoped deactivation.
 * Full deactivate tests: see deliverySettingsController.deleteAlignment.test.js
 *
 * Run: node --test tests/deliverySlotEngine.integration.test.js
 * Or: npm test
 */
import { describe, it } from "node:test";
import assert from "node:assert";
import { deactivateDeliverySlotsForScheduledSlot } from "../controllers/deliverySettingsController.js";

describe("Delivery slot engine (partner) – slot deactivation", () => {
  it("deactivateDeliverySlotsForScheduledSlot uses updateMany with isActive: false", async () => {
    const slotDate = new Date(Date.UTC(2025, 2, 15));
    const slot = { slotDate, startTime: "09:00", endTime: "12:00" };
    const warehouseId = "wh-1";
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
    assert.deepStrictEqual(updateManyCalls[0].data, { isActive: false });
    assert.strictEqual(updateManyCalls[0].where.slot, "09:00-12:00");
  });

  it("deactivateDeliverySlotsForScheduledSlot scopes by routeMapId when slot has routeMapId", async () => {
    const slotDate = new Date(Date.UTC(2025, 4, 1));
    const slot = {
      slotDate,
      startTime: "14:00",
      endTime: "16:00",
      routeMapId: "route-123",
    };
    const warehouseId = "wh-1";
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

    assert.strictEqual(updateManyCalls[0].where.routeMapId, "route-123");
    assert.strictEqual(updateManyCalls[0].where.slot, "14:00-16:00");
  });
});
