import * as yup from "yup";

export const storePickupSchema = yup.object({
  selectDate: yup.string().required("Date is required"),

  startTime: yup.string().required("Start time is required"),

  endTime: yup
    .string()
    .required("End time is required")
    .test(
      "is-after-start",
      "End time must be after start time",
      function (value) {
        const { startTime } = this.parent;
        if (!startTime || !value) return true;
        return value > startTime;
      },
    ),

  slot: yup
    .string()
    .required("Slot name is required")
    .min(3, "Slot name must be at least 3 characters")
    .max(30, "Slot name cannot exceed 30 characters"),

  orderPerSlot: yup
    .number()
    .typeError("Order per slot must be a number")
    .required("Order per slot is required")
    .min(1, "Order per slot must be at least 1")
    .max(100, "Order per slot cannot exceed 100"),

  repeat: yup.boolean(),

  repeatOption: yup.string().oneOf(["mon-fri", "sun", "customise"]).required(),

  customDays: yup
    .object({
      monday: yup.boolean(),
      tuesday: yup.boolean(),
      wednesday: yup.boolean(),
      thursday: yup.boolean(),
      friday: yup.boolean(),
      saturday: yup.boolean(),
      sunday: yup.boolean(),
    })
    .test("custom-days", "Please select at least one day", function (value) {
      const { repeat, repeatOption } = this.parent;

      if (repeat && repeatOption === "customise") {
        return Object.values(value || {}).some(Boolean);
      }

      return true;
    }),
});

export type StorePickupFormData = yup.InferType<typeof storePickupSchema>;
