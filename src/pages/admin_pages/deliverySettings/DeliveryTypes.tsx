import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import { TextInput } from "../../../components/ui";
import { IndianRupee } from "lucide-react";
import {
  useGetDeliveryTypes,
  useUpdateDeliveryTypes,
} from "../../../hooks/deliverySettings";

const getSettingByLabel = (
  settings: { label: string; isEnabled: boolean; deliveryCharge: number; freeDeliveryThreshold?: number | null }[],
  labels: string[]
) => settings.find((item) => labels.includes(item.label));

const deliveryTypesSchema = yup.object({
  expressDelivery: yup.boolean().required(),
  selfPickup: yup.boolean().required(),
  scheduledDelivery: yup.boolean().required(),
  expressDeliveryCharge: yup
    .string()
    .when("expressDelivery", {
      is: true,
      then: (schema) =>
        schema
          .required("Delivery charge is required when Express Delivery is enabled")
          .matches(/^\d+$/, "Delivery charge must be a valid number"),
      otherwise: (schema) => schema,
    }),
  expressFreeDeliveryThreshold: yup
    .string()
    .when("expressDelivery", {
      is: true,
      then: (schema) =>
        schema
          .nullable()
          .notRequired()
          .test(
            "is-valid-threshold",
            "Minimum order value must be a valid non-negative number",
            (val) => !val || /^\d+$/.test(val)
          ),
      otherwise: (schema) => schema,
    }),
  scheduledDeliveryCharge: yup
    .string()
    .when("scheduledDelivery", {
      is: true,
      then: (schema) =>
        schema
          .required("Delivery charge is required when Scheduled Delivery is enabled")
          .matches(/^\d+$/, "Delivery charge must be a valid number"),
      otherwise: (schema) => schema,
    }),
  scheduledFreeDeliveryThreshold: yup
    .string()
    .when("scheduledDelivery", {
      is: true,
      then: (schema) =>
        schema
          .nullable()
          .notRequired()
          .test(
            "is-valid-threshold",
            "Minimum order value must be a valid non-negative number",
            (val) => !val || /^\d+$/.test(val)
          ),
      otherwise: (schema) => schema,
    }),
});

type DeliveryTypesFormData = yup.InferType<typeof deliveryTypesSchema>;

const ToggleSwitch = ({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-8 items-center rounded-full transition-colors ${
      checked ? "bg-green-600" : "bg-gray-300 dark:bg-gray-600"
    }`}
    aria-pressed={checked}
  >
    <span
      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
        checked ? "translate-x-4" : "translate-x-0.5"
      }`}
    />
  </button>
);

const DeliveryTypes = () => {
  const { data, isLoading } = useGetDeliveryTypes();
  const updateMutation = useUpdateDeliveryTypes();
  const {
    control,
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<DeliveryTypesFormData>({
    resolver: yupResolver(deliveryTypesSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      expressDelivery: false,
      selfPickup: false,
      scheduledDelivery: false,
      expressDeliveryCharge: "",
      expressFreeDeliveryThreshold: "",
      scheduledDeliveryCharge: "",
      scheduledFreeDeliveryThreshold: "",
    },
  });

  useEffect(() => {
    if (data?.data?.deliverySettings) {
      const settings = data.data.deliverySettings;
      const expressDeliveryItem = getSettingByLabel(settings, [
        "Express Settings",
        "Express Delivery",
      ]);
      const selfPickupItem = getSettingByLabel(settings, ["Self Pickup"]);
      const scheduledDeliveryItem = getSettingByLabel(settings, [
        "Scheduled Delivery",
      ]);

      reset({
        expressDelivery: expressDeliveryItem?.isEnabled ?? false,
        selfPickup: selfPickupItem?.isEnabled ?? false,
        scheduledDelivery: scheduledDeliveryItem?.isEnabled ?? false,
        expressDeliveryCharge:
          expressDeliveryItem?.deliveryCharge !== undefined &&
          expressDeliveryItem?.deliveryCharge !== null
            ? expressDeliveryItem.deliveryCharge.toString()
            : "",
        expressFreeDeliveryThreshold:
          expressDeliveryItem?.freeDeliveryThreshold !== undefined &&
          expressDeliveryItem?.freeDeliveryThreshold !== null
            ? expressDeliveryItem.freeDeliveryThreshold.toString()
            : "",
        scheduledDeliveryCharge:
          scheduledDeliveryItem?.deliveryCharge !== undefined &&
          scheduledDeliveryItem?.deliveryCharge !== null
            ? scheduledDeliveryItem.deliveryCharge.toString()
            : "",
        scheduledFreeDeliveryThreshold:
          scheduledDeliveryItem?.freeDeliveryThreshold !== undefined &&
          scheduledDeliveryItem?.freeDeliveryThreshold !== null
            ? scheduledDeliveryItem.freeDeliveryThreshold.toString()
            : "",
      });
    }
  }, [data?.data?.deliverySettings, reset]);

  const expressDelivery = watch("expressDelivery");
  const selfPickup = watch("selfPickup");
  const scheduledDelivery = watch("scheduledDelivery");

  const onSubmit = (values: DeliveryTypesFormData) => {
    updateMutation.mutate({
      expressSettingsEnabled: values.expressDelivery,
      expressSettingsCharge: values.expressDelivery
        ? Number(values.expressDeliveryCharge ?? "") || 0
        : 0,
      expressFreeDeliveryThreshold:
        values.expressDelivery &&
        values.expressFreeDeliveryThreshold !== undefined &&
        values.expressFreeDeliveryThreshold !== "" &&
        values.expressFreeDeliveryThreshold !== null
          ? Number(values.expressFreeDeliveryThreshold)
          : null,
      selfPickupEnabled: values.selfPickup,
      scheduledDeliveryEnabled: values.scheduledDelivery,
      scheduledDeliveryCharge: values.scheduledDelivery
        ? Number(values.scheduledDeliveryCharge ?? "") || 0
        : 0,
      scheduledFreeDeliveryThreshold:
        values.scheduledDelivery &&
        values.scheduledFreeDeliveryThreshold !== undefined &&
        values.scheduledFreeDeliveryThreshold !== "" &&
        values.scheduledFreeDeliveryThreshold !== null
          ? Number(values.scheduledFreeDeliveryThreshold)
          : null,
    });
  };

  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="mb-4">
          <Breadcrumbs />
        </div>
        <div className="flex items-center justify-center min-h-[200px] text-gray-500">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      <div className="mb-3 mt-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Delivery Types
        </h1>
      </div>

      <div className="mb-5">
        <Breadcrumbs />
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6"
      >
        <div className="max-w-4xl space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-base font-medium text-gray-900">
                Express Delivery
              </p>
              <ToggleSwitch
                checked={expressDelivery}
                onChange={(value) => {
                  setValue("expressDelivery", value, { shouldValidate: true });
                  if (!value) {
                    setValue("expressDeliveryCharge", "");
                    setValue("expressFreeDeliveryThreshold", "");
                  }
                }}
              />
            </div>

            {expressDelivery && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller
                  name="expressDeliveryCharge"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      label={
                        <span className="flex items-center gap-1">
                          Delivery Charges (<IndianRupee size={14} className="inline" />)
                        </span>
                      }
                      type="text"
                      onlyNumbers
                      maxLength={5}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Enter delivery Charge"
                      error={errors.expressDeliveryCharge?.message}
                    />
                  )}
                />
                <Controller
                  name="expressFreeDeliveryThreshold"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      label={
                        <span className="flex items-center gap-1">
                          Free Delivery Minimum Order Value (<IndianRupee size={14} className="inline" />)
                        </span>
                      }
                      type="text"
                      onlyNumbers
                      maxLength={7}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Enter minimum order value"
                      error={errors.expressFreeDeliveryThreshold?.message}
                    />
                  )}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-base font-medium text-gray-900">
              Self Pickup
            </p>
            <ToggleSwitch
              checked={selfPickup}
              onChange={(value) =>
                setValue("selfPickup", value, { shouldValidate: true })
              }
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-base font-medium text-gray-900">
                Scheduled Delivery
              </p>
              <ToggleSwitch
                checked={scheduledDelivery}
                onChange={(value) => {
                  setValue("scheduledDelivery", value, { shouldValidate: true });
                  if (!value) {
                    setValue("scheduledDeliveryCharge", "");
                    setValue("scheduledFreeDeliveryThreshold", "");
                  }
                }}
              />
            </div>

            {scheduledDelivery && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller
                  name="scheduledDeliveryCharge"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      label={
                        <span className="flex items-center gap-1">
                          Delivery Charges (<IndianRupee size={14} className="inline" />)
                        </span>
                      }
                      type="text"
                      onlyNumbers
                      maxLength={5}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Enter delivery Charge"
                      error={errors.scheduledDeliveryCharge?.message}
                    />
                  )}
                />
                <Controller
                  name="scheduledFreeDeliveryThreshold"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      label={
                        <span className="flex items-center gap-1">
                          Free Delivery Minimum Order Value (<IndianRupee size={14} className="inline" />)
                        </span>
                      }
                      type="text"
                      onlyNumbers
                      maxLength={7}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Enter minimum order value"
                      error={errors.scheduledFreeDeliveryThreshold?.message}
                    />
                  )}
                />
              </div>
            )}
          </div>

          {/* <div className="flex items-center justify-between">
            <p className="text-base font-medium text-gray-900">
              Pick up At Vehicle
            </p>
            <ToggleSwitch
              checked={pickUpAtVehicle}
              onChange={(value) => {
                setValue("pickUpAtVehicle", value, { shouldValidate: true });
                if (!value) setValue("expressExtraCharge", "");
              }}
            />
          </div> */}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {updateMutation.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default DeliveryTypes;
