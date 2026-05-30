import { useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  FormSectionWithDots,
  TextInput,
  RadioButton,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";
import {
  useCreatePickupSlot,
  useUpdatePickupSlot,
  type PickupSlotItem,
  type PickupRepeatType,
} from "../../../hooks/deliverySettings";
import { pickupAtVehicleSchema } from "../../../validationSchema/deliverySettings/pickupAtVehicleSchema";
import {
  formatDateForInput,
  formatRepeatOptionForForm,
} from "../../../utils/formatters/dateTimeFormatters";

const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const REPEAT_FORM_TO_API: Record<
  "mon-fri" | "sun" | "customise",
  PickupRepeatType
> = {
  "mon-fri": "MON_FRI",
  sun: "SUN",
  customise: "CUSTOM",
};

function slotToForm(slot: PickupSlotItem): PickupAtVehicleFormData {
  const customDays = (slot.customDays ?? []).reduce(
    (acc, d) => {
      const key = d.toLowerCase() as (typeof DAY_KEYS)[number];
      if (DAY_KEYS.includes(key)) acc[key] = true;
      return acc;
    },
    {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false,
    } as PickupAtVehicleFormData["customDays"]
  );

  return {
    selectDate: formatDateForInput(slot.date ?? ""),
    startTime: slot.startTime ?? "",
    endTime: slot.endTime ?? "",
    orderPerSlot: String(slot.capacity ?? ""),
    slot: slot.slot ?? "morning",
    repeat: slot.repeat ?? true,
    repeatOption: formatRepeatOptionForForm(slot.repeatType),
    customDays,
  };
}

type PickupAtVehicleFormData = {
  selectDate: string;
  startTime: string;
  endTime: string;
  orderPerSlot: string;
  slot: string;
  repeat: boolean;
  repeatOption: "mon-fri" | "sun" | "customise";
  customDays: Record<(typeof DAY_KEYS)[number], boolean>;
};

const CreatePickupAtVehicleSlot = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const stateSlot = (location.state as { slot?: PickupSlotItem } | null)?.slot;
  const isEdit = Boolean(id);
  const {
    control,
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<PickupAtVehicleFormData>({
    resolver: yupResolver(pickupAtVehicleSchema) as any,
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      selectDate: "",
      startTime: "",
      endTime: "",
      orderPerSlot: "",
      slot: "morning",
      repeat: true,
      repeatOption: "mon-fri",
      customDays: {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false,
      },
    },
  });

  const createMutation = useCreatePickupSlot();
  const updateMutation = useUpdatePickupSlot(id);

  useEffect(() => {
    if (isEdit && stateSlot) {
      reset(slotToForm(stateSlot));
    }
  }, [isEdit, stateSlot, reset]);

  const vehicleId =
    (stateSlot as PickupSlotItem & { vehicleId?: string | number; vehicle_id?: string | number } | undefined)?.vehicleId ??
    (stateSlot as PickupSlotItem & { vehicleId?: string | number; vehicle_id?: string | number } | undefined)?.vehicle_id ??
    "12345";

  const repeat = watch("repeat");
  const repeatOption = watch("repeatOption");

  const buildPayload = (values: PickupAtVehicleFormData) => {
    const repeatType = values.repeat
      ? REPEAT_FORM_TO_API[values.repeatOption] ?? "MON_FRI"
      : "ONCE";

    const customDays =
      repeatType === "CUSTOM"
        ? DAY_KEYS.filter((k) => values.customDays[k]).map((k) => k.toUpperCase())
        : [];

    return {
      date: values.selectDate,
      startTime: values.startTime,
      endTime: values.endTime,
      slot: values.slot,
      capacity: Number(values.orderPerSlot) || 0,
      repeat: values.repeat,
      repeatType,
      customDays,
    };
  };

  const onSubmit = (values: PickupAtVehicleFormData) => {
    const payload = buildPayload(values);

    const onSuccess = () =>
      navigate("/delivery-settings/pick-at-vehicle");

    if (isEdit && id) {
      updateMutation.mutate(payload, { onSuccess });
    } else {
      createMutation.mutate(payload, { onSuccess });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
          {isEdit ? "Edit Pickup Slot" : "Add Pickup Slot"}
        </h1>
        <BackButton />
      </div>

      <div className="mb-4">
        <Breadcrumbs />
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6"
      >
        <div className="max-w-4xl">
          <FormSectionWithDots title="Slot Information">
            <div className="grid grid-cols-1 gap-4">
              <TextInput
                label="Vehicle ID ( Auto Fetched )"
                name="vehicleId"
                value={String(vehicleId)}
                onChange={() => {}}
                disabled
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="selectDate"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="Select Date"
                    required
                    type="date"
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="mm/dd/yyyy"
                    error={errors.selectDate?.message}
                  />
                )}
              />

              <Controller
                name="orderPerSlot"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="Maximum Orders"
                    required
                    type="text"
                    onlyNumbers
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Enter"
                    error={errors.orderPerSlot?.message}
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="startTime"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="Start Time"
                    required
                    type="time"
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="--:-- --"
                    error={errors.startTime?.message}
                  />
                )}
              />
              <Controller
                name="endTime"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="End Time"
                    required
                    type="time"
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="--:-- --"
                    error={errors.endTime?.message}
                  />
                )}
              />
            </div>
          </FormSectionWithDots>

          <FormSectionWithDots title="Repeat">
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register("repeat")}
                  className="w-4 h-4 text-gray-600 border-0 rounded focus:ring-gray-400 dark:focus:ring-gray-500 focus:ring-2 bg-white dark:bg-gray-700 cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Repeat
                </span>
              </label>
            </div>

            {repeat && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <RadioButton
                    label="Mon - Fri"
                    value="mon-fri"
                    checked={repeatOption === "mon-fri"}
                    onChange={() => setValue("repeatOption", "mon-fri", { shouldValidate: true })}
                  />
                  <RadioButton
                    label="Sun"
                    value="sun"
                    checked={repeatOption === "sun"}
                    onChange={() => setValue("repeatOption", "sun", { shouldValidate: true })}
                  />
                  <RadioButton
                    label="Customise"
                    value="customise"
                    checked={repeatOption === "customise"}
                    onChange={() => setValue("repeatOption", "customise", { shouldValidate: true })}
                  />
                </div>

                {repeatOption === "customise" && (
                  <div className="mt-4 space-y-2">
                    {DAY_KEYS.map((day) => (
                      <label
                        key={day}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          {...register(`customDays.${day}`)}
                          className="w-4 h-4 text-gray-600 border-0 rounded focus:ring-gray-400 dark:focus:ring-gray-500 focus:ring-2 bg-white dark:bg-gray-700 cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {day.charAt(0).toUpperCase() + day.slice(1)}
                        </span>
                      </label>
                    ))}
                    {errors.customDays && typeof errors.customDays.message === "string" && (
                      <p className="text-[10px] text-red-600 dark:text-red-400 mt-1">
                        {errors.customDays.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </FormSectionWithDots>

          <input type="hidden" {...register("slot")} />

          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => navigate("/delivery-settings/pick-at-vehicle")}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {isPending ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreatePickupAtVehicleSlot;
