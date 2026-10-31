/**
 * Tests for Partner Portal Delivery Types: Configurable Fees, Free-Delivery Thresholds, Validation, and Partner Isolation.
 * Run with: node --test tests/deliveryTypesThreshold.test.js
 */
import { describe, it } from "node:test";
import assert from "node:assert";
import {
  getDeliveryTypes,
  updateDeliveryTypes,
} from "../controllers/deliverySettingsController.js";
import { updateDeliveryTypesValidator } from "../validations/deliverySettingsValidation.js";
import { validationResult } from "express-validator";

describe("Partner Portal - Delivery Types Fees & Free-Delivery Thresholds", () => {
  describe("Validation schema tests", () => {
    const runValidation = async (body) => {
      const req = { body };
      for (const validator of updateDeliveryTypesValidator) {
        await validator.run(req);
      }
      return validationResult(req);
    };

    it("accepts valid delivery settings with positive charges and thresholds", async () => {
      const result = await runValidation({
        deliverySettings: [
          {
            isEnabled: true,
            label: "Express Settings",
            deliveryCharge: 60,
            freeDeliveryThreshold: 499,
          },
          {
            isEnabled: true,
            label: "Scheduled Delivery",
            deliveryCharge: 30,
            freeDeliveryThreshold: 299,
          },
          {
            isEnabled: true,
            label: "Self Pickup",
            deliveryCharge: 0,
            freeDeliveryThreshold: null,
          },
        ],
      });
      assert.strictEqual(result.isEmpty(), true);
    });

    it("accepts zero threshold and zero delivery charge", async () => {
      const result = await runValidation({
        deliverySettings: [
          {
            isEnabled: true,
            label: "Express Settings",
            deliveryCharge: 0,
            freeDeliveryThreshold: 0,
          },
          {
            isEnabled: true,
            label: "Scheduled Delivery",
            deliveryCharge: 0,
            freeDeliveryThreshold: 0,
          },
        ],
      });
      assert.strictEqual(result.isEmpty(), true);
    });

    it("rejects negative delivery charge", async () => {
      const result = await runValidation({
        deliverySettings: [
          {
            isEnabled: true,
            label: "Express Settings",
            deliveryCharge: -15,
            freeDeliveryThreshold: 500,
          },
        ],
      });
      assert.strictEqual(result.isEmpty(), false);
      const errors = result.array();
      assert.ok(errors.some((e) => e.msg.includes("deliverySettings must be a non-empty array")));
    });

    it("rejects negative free-delivery threshold", async () => {
      const result = await runValidation({
        deliverySettings: [
          {
            isEnabled: true,
            label: "Scheduled Delivery",
            deliveryCharge: 30,
            freeDeliveryThreshold: -100,
          },
        ],
      });
      assert.strictEqual(result.isEmpty(), false);
    });

    it("rejects non-numeric / malformed delivery charge or threshold", async () => {
      const result = await runValidation({
        deliverySettings: [
          {
            isEnabled: true,
            label: "Express Settings",
            deliveryCharge: "invalid-charge",
            freeDeliveryThreshold: "not-a-number",
          },
        ],
      });
      assert.strictEqual(result.isEmpty(), false);
    });

    it("rejects empty or non-array payload", async () => {
      const emptyResult = await runValidation({ deliverySettings: [] });
      assert.strictEqual(emptyResult.isEmpty(), false);

      const nonArrayResult = await runValidation({ deliverySettings: "not-an-array" });
      assert.strictEqual(nonArrayResult.isEmpty(), false);
    });
  });

  describe("Controller: getDeliveryTypes and updateDeliveryTypes with thresholds", () => {
    it("updateDeliveryTypes maps fees, thresholds, and upserts with warehouse isolation", async () => {
      let upsertCall = null;
      let warehouseUpdateCall = null;

      const mockPrisma = {
        user: {
          findUnique: async ({ where }) => {
            if (where.id === "user-partner-1") {
              return { warehouseId: "wh-partner-1" };
            }
            return null;
          },
        },
        warehouseDeliverySetting: {
          upsert: async (args) => {
            upsertCall = args;
            return { id: "wds-1", ...args.create };
          },
        },
        warehouse: {
          update: async (args) => {
            warehouseUpdateCall = args;
            return { id: args.where.id };
          },
        },
        $transaction: async (fn) => fn(mockPrisma),
      };

      // Mock request and response
      const req = {
        user: { id: "user-partner-1" },
        body: {
          deliverySettings: [
            {
              isEnabled: true,
              label: "Express Settings",
              deliveryCharge: 55,
              freeDeliveryThreshold: 450,
            },
            {
              isEnabled: true,
              label: "Scheduled Delivery",
              deliveryCharge: 25,
              freeDeliveryThreshold: 350,
            },
            {
              isEnabled: true,
              label: "Self Pickup",
              deliveryCharge: 0,
              freeDeliveryThreshold: null,
            },
          ],
        },
      };

      let responseStatus = null;
      let responseBody = null;
      const res = {
        setHeader: () => {},
        status: (code) => {
          responseStatus = code;
          return {
            json: (data) => {
              responseBody = data;
              return data;
            },
          };
        },
      };

      // Temporarily inject mock into prismaClient
      const { prisma } = await import("../config/prismaClient.js");
      const originalFindUniqueUser = prisma.user.findUnique;
      const originalUpsert = prisma.warehouseDeliverySetting.upsert;
      const originalWarehouseUpdate = prisma.warehouse.update;
      const originalTransaction = prisma.$transaction;

      try {
        prisma.user.findUnique = mockPrisma.user.findUnique;
        prisma.warehouseDeliverySetting.upsert = mockPrisma.warehouseDeliverySetting.upsert;
        prisma.warehouse.update = mockPrisma.warehouse.update;
        prisma.$transaction = async (fn) => fn(prisma);

        await updateDeliveryTypes(req, res);

        assert.strictEqual(responseStatus, 200);
        assert.strictEqual(responseBody.status, true);
        assert.ok(upsertCall != null);
        assert.strictEqual(upsertCall.where.warehouseId, "wh-partner-1");
        assert.strictEqual(upsertCall.update.defaultDeliveryCharge, 55);
        assert.strictEqual(upsertCall.update.expressDeliveryCharge, 55);
        assert.strictEqual(upsertCall.update.expressFreeDeliveryThreshold, 450);
        assert.strictEqual(upsertCall.update.freeDeliveryThreshold, 450);
        assert.strictEqual(upsertCall.update.scheduledDeliveryCharge, 25);
        assert.strictEqual(upsertCall.update.scheduledFreeDeliveryThreshold, 350);
        assert.strictEqual(upsertCall.update.selfPickupEnabled, true);

        // Self pickup keeps warehouse isPickupStore aligned
        assert.strictEqual(warehouseUpdateCall.where.id, "wh-partner-1");
        assert.strictEqual(warehouseUpdateCall.data.isPickupStore, true);
      } finally {
        prisma.user.findUnique = originalFindUniqueUser;
        prisma.warehouseDeliverySetting.upsert = originalUpsert;
        prisma.warehouse.update = originalWarehouseUpdate;
        prisma.$transaction = originalTransaction;
      }
    });

    it("partner isolation: partner without configured warehouse receives 403 Forbidden", async () => {
      const { prisma } = await import("../config/prismaClient.js");
      const originalFindUniqueUser = prisma.user.findUnique;

      try {
        prisma.user.findUnique = async () => null;

        let statusCode = null;
        let responseJson = null;
        const res = {
          setHeader: () => {},
          status: (code) => {
            statusCode = code;
            return {
              json: (data) => {
                responseJson = data;
                return data;
              },
            };
          },
        };

        const req = {
          user: { id: "unauthorized-partner" },
          body: { deliverySettings: [{ isEnabled: true, label: "Express Settings", deliveryCharge: 10 }] },
        };

        await updateDeliveryTypes(req, res);
        assert.strictEqual(statusCode, 403);
        assert.strictEqual(responseJson.status, false);

        await getDeliveryTypes(req, res);
        assert.strictEqual(statusCode, 403);
      } finally {
        prisma.user.findUnique = originalFindUniqueUser;
      }
    });

    it("getDeliveryTypes loads persisted threshold and charges after save", async () => {
      const { prisma } = await import("../config/prismaClient.js");
      const originalFindUniqueUser = prisma.user.findUnique;
      const originalFindManyMaster = prisma.masterDeliverySetting.findMany;
      const originalFindUniqueWds = prisma.warehouseDeliverySetting.findUnique;

      try {
        prisma.user.findUnique = async () => ({ warehouseId: "wh-test-99" });
        prisma.masterDeliverySetting.findMany = async () => [
          { type: "FAST", label: "Express Settings", isEnabledByDefault: true, defaultCharge: "60", freeDeliveryThreshold: null },
          { type: "SCHEDULED", label: "Scheduled Delivery", isEnabledByDefault: true, defaultCharge: "30", freeDeliveryThreshold: null },
          { type: "PICKUP_STORE", label: "Self Pickup", isEnabledByDefault: false, defaultCharge: "0", freeDeliveryThreshold: null },
        ];
        prisma.warehouseDeliverySetting.findUnique = async () => ({
          expressSettingsEnabled: true,
          scheduledDeliveryEnabled: true,
          selfPickupEnabled: false,
          expressDeliveryCharge: "75",
          defaultDeliveryCharge: "75",
          expressFreeDeliveryThreshold: "600",
          scheduledDeliveryCharge: "40",
          scheduledFreeDeliveryThreshold: "350",
          freeDeliveryThreshold: "600",
        });

        let statusCode = null;
        let responseJson = null;
        const res = {
          setHeader: () => {},
          status: (code) => {
            statusCode = code;
            return {
              json: (data) => {
                responseJson = data;
                return data;
              },
            };
          },
        };

        await getDeliveryTypes({ user: { id: "user-test-99" } }, res);

        assert.strictEqual(statusCode, 200);
        assert.strictEqual(responseJson.status, true);
        const settings = responseJson.data.deliverySettings;

        const express = settings.find((s) => s.label === "Express Settings");
        assert.strictEqual(express.isEnabled, true);
        assert.strictEqual(express.deliveryCharge, 75);
        assert.strictEqual(express.freeDeliveryThreshold, 600);

        const scheduled = settings.find((s) => s.label === "Scheduled Delivery");
        assert.strictEqual(scheduled.isEnabled, true);
        assert.strictEqual(scheduled.deliveryCharge, 40);
        assert.strictEqual(scheduled.freeDeliveryThreshold, 350);

        const selfPickup = settings.find((s) => s.label === "Self Pickup");
        assert.strictEqual(selfPickup.isEnabled, false);
        assert.strictEqual(selfPickup.deliveryCharge, 0);
        assert.strictEqual(selfPickup.freeDeliveryThreshold, null);
      } finally {
        prisma.user.findUnique = originalFindUniqueUser;
        prisma.masterDeliverySetting.findMany = originalFindManyMaster;
        prisma.warehouseDeliverySetting.findUnique = originalFindUniqueWds;
      }
    });
  });
});
