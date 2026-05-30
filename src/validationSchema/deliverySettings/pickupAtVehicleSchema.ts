import * as yup from "yup";

export const pickupAtVehicleSchema = yup.object({
  selectDate: yup
    .string()
    .required("Select Date is required"),

  startTime: yup
    .string()
    .required("Start Time is required"),

  endTime: yup
    .string()
    .required("End Time is required")
    .test(
      "end-after-start",
      "End Time must be after Start Time",
      function (value) {
        const { startTime } = this.parent;
        if (!startTime || !value) return true;
        return value > startTime;
      }
    ),

  orderPerSlot: yup
    .number()
    .typeError("Maximum Orders must be a number")
    .required("Maximum Orders is required")
    .min(1, "Maximum Orders should be greater than 0")
    .max(100, "Maximum Orders cannot exceed 100"),

  slot: yup
    .string()
    .required("Slot is required"),

  repeat: yup
    .boolean()
    .required(),

  repeatOption: yup
    .string()
    .oneOf(["mon-fri", "sun", "customise"])
    .required(),

  customDays: yup
    .object({
      monday: yup.boolean().required(),
      tuesday: yup.boolean().required(),
      wednesday: yup.boolean().required(),
      thursday: yup.boolean().required(),
      friday: yup.boolean().required(),
      saturday: yup.boolean().required(),
      sunday: yup.boolean().required(),
    })
    .test(
      "custom-days-required",
      "Please select at least one day",
      function (value) {
        const { repeat, repeatOption } = this.parent;
        if (repeat && repeatOption === "customise") {
          return Object.values(value || {}).some(Boolean);
        }
        return true;
      }
    ),
});

export type PickupAtVehicleFormSchema = yup.InferType<typeof pickupAtVehicleSchema>;
