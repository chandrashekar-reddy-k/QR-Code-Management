import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  FormSectionWithDots,
  TextInput,
  SearchInput,
  RadioButton,
  SelectInput,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";
import {
  useCreatePickupSlot,
  useUpdatePickupSlot,
  type PickupSlotItem,
  type PickupRepeatType,
} from "../../../hooks/deliverySettings";
import { storePickupSchema } from "../../../validationSchema/deliverySettings/storePickupSchema";
const SLOT_OPTIONS = [
  { label: "Morning", value: "morning" },
  { label: "Afternoon", value: "afternoon" },
  { label: "Evening", value: "evening" },
];
const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const REPEAT_FORM_TO_API: Record<
  "mon-fri" | "sun" | "customise",
  PickupRepeatType
> = {
  "mon-fri": "MON_FRI",
  sun: "SUN",
  customise: "CUSTOM",
};

function formatDateForInput(dateStr: string): string {
  if (!dateStr) return "";

  if (dateStr.includes("T")) {
    const datePart = dateStr.split("T")[0];
    if (datePart.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return datePart;
    }
  }

  if (dateStr.includes("-")) {
    const parts = dateStr.split("-");
    if (parts.length >= 3) {
      if (parts[0].length === 2 && parts[1].length === 2 && parts[2].length >= 4) {
        const [day, month, year] = parts;
        return `${year}-${month}-${day}`;
      }
      if (parts[0].length === 4 && parts.length === 3) {
        return dateStr;
      }
    }
  }

  const date = new Date(dateStr);
  if (!Number.isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return dateStr;
}

function slotToForm(slot: PickupSlotItem) {
  const customDays = (slot.customDays ?? []).reduce(
    (acc, d) => {
      const key = d.toLowerCase() as keyof typeof acc;
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
    } as Record<string, boolean>
  );

  return {
    selectDate: formatDateForInput(slot.date ?? ""),
    startTime: slot.startTime ?? "",
    endTime: slot.endTime ?? "",
    orderPerSlot: String(slot.capacity ?? ""),
    slot: slot.slot ?? "",
    repeat: slot.repeat ?? true,
    repeatOption:
      slot.repeatType === "MON_FRI"
        ? "mon-fri"
        : slot.repeatType === "SUN"
          ? "sun"
          : "customise",
    customDays,
  };
}

const CreateStorePickupSlot = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const stateSlot = (location.state as { slot?: PickupSlotItem } | null)?.slot;
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    selectDate: "",
    startTime: "",
    endTime: "",
    orderPerSlot: "",
    slot: "",
    repeat: true,
    repeatOption: "mon-fri" as "mon-fri" | "sun" | "customise",
    customDays: {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false,
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useCreatePickupSlot();
  const updateMutation = useUpdatePickupSlot(id);

  useEffect(() => {
    if (isEdit && stateSlot) {
      setFormData((prev) => ({
        ...prev,
        ...slotToForm(stateSlot),
      }));
    }
  }, [isEdit, stateSlot]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (type === "checkbox") {
      if (name === "repeat") {
        setFormData((prev) => ({ ...prev, repeat: checked }));
      } else if (name.startsWith("customDay-")) {
        const day = name.replace("customDay-", "");
        setFormData((prev) => ({
          ...prev,
          customDays: {
            ...prev.customDays,
            [day]: checked,
          },
        }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleRepeatOptionChange = (value: string) => {
    setFormData((prev) => ({ ...prev, repeatOption: value }));
  };

  const validate = async () => {
    try {
      await storePickupSchema.validate(formData, { abortEarly: false });
      setErrors({});
      return true;
    } catch (err: any) {
      const newErrors: Record<string, string> = {};
      err.inner.forEach((e: any) => {
        if (e.path) newErrors[e.path] = e.message;
      });
      setErrors(newErrors);
      return false;
    }
  };

  const buildPayload = () => {
    const repeatType = formData.repeat
      ? REPEAT_FORM_TO_API[formData.repeatOption] ?? "MON_FRI"
      : "ONCE";

    const customDays =
      repeatType === "CUSTOM"
        ? DAY_KEYS.filter((k) => formData.customDays[k]).map((k) => k.toUpperCase())
        : [];

    return {
      date: formData.selectDate,
      startTime: formData.startTime,
      endTime: formData.endTime,
      slot: formData.slot,
      capacity: Number(formData.orderPerSlot) || 0,
      repeat: formData.repeat,
      repeatType,
      customDays,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isValid = await validate();
    if (!isValid) return;

    const payload = buildPayload();

    const onSuccess = () =>
      navigate("/delivery-settings/store-pickup");

    if (isEdit && id) {
      updateMutation.mutate(payload, { onSuccess });
    } else {
      createMutation.mutate(payload, { onSuccess });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          {isEdit ? "Edit Store Pickup Slot" : "Create Store Pickup Slot"}
        </h1>
        <BackButton
        //   onClick={() =>
        //     navigate("/delivery-settings/scheduled-delivery", {
        //       state: { activeTab: "delivery-slots" },
        //     })
        //   }
        />
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6"
      >
        <div className="max-w-4xl">
          {/* Slot Information Section */}
          <FormSectionWithDots title="Slot Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput
                label="Select Date"
                required
                type="date"
                name="selectDate"
                value={formData.selectDate}
                onChange={handleDateChange}
                placeholder="mm/dd/yyyy"
                error={errors.selectDate}
              />

              <TextInput
                label="Start Time"
                required
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleTimeChange}
                placeholder="--:-- --"
                error={errors.startTime}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput
                label="End Time"
                required
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleTimeChange}
                placeholder="--:-- --"
                error={errors.endTime}
              />
              <SelectInput
                label="Slot Name"
                required
                name="slot"
                value={formData.slot}
                onChange={handleChange}
                options={SLOT_OPTIONS}
                placeholder="Select Slot"
                error={errors.slot}
              />

            </div>
            {/* Order Per Slot */}
            <div>
              <TextInput
                label="Order Per Slot"
                required
                type="text"
                onlyNumbers
                name="orderPerSlot"
                value={formData.orderPerSlot}
                onChange={handleChange}
                placeholder="Enter"
                error={errors.orderPerSlot}
              />
            </div>

          </FormSectionWithDots>

          {/* Repeat Section */}
          <FormSectionWithDots title="Repeat">
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="repeat"
                  checked={formData.repeat}
                  onChange={handleChange}
                  className="w-4 h-4 text-gray-600 border-0 rounded focus:ring-gray-400 dark:focus:ring-gray-500 focus:ring-2 bg-white cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-800">
                  Repeat
                </span>
              </label>
            </div>

            {formData.repeat && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <RadioButton
                    label="Mon - Fri"
                    value="mon-fri"
                    checked={formData.repeatOption === "mon-fri"}
                    onChange={(e) => handleRepeatOptionChange(e.target.value)}
                  />
                  <RadioButton
                    label="Sun"
                    value="sun"
                    checked={formData.repeatOption === "sun"}
                    onChange={(e) => handleRepeatOptionChange(e.target.value)}
                  />
                  <RadioButton
                    label="Customise"
                    value="customise"
                    checked={formData.repeatOption === "customise"}
                    onChange={(e) => handleRepeatOptionChange(e.target.value)}
                  />
                </div>

                {formData.repeatOption === "customise" && (
                  <div className="mt-4 space-y-2">
                    {DAY_KEYS.map((day) => (
                      <label
                        key={day}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          name={`customDay-${day}`}
                          checked={formData.customDays[day]}
                          onChange={handleChange}
                          className="w-4 h-4 text-gray-600 border-0 rounded focus:ring-gray-400 dark:focus:ring-gray-500 focus:ring-2 bg-white cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-800">
                          {day.charAt(0).toUpperCase() + day.slice(1)}
                        </span>
                      </label>
                    ))}
                    {errors.customDays && (
                      <p className="text-[10px] text-red-600 dark:text-red-400 mt-1">
                        {errors.customDays}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </FormSectionWithDots>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() =>
                navigate("/delivery-settings/store-pickup")
              }
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
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

export default CreateStorePickupSlot;