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
  settings: { label: string; isEnabled: boolean; deliveryCharge: number }[],
  labels: string[]
) => settings.find((item) => labels.includes(item.label));

const deliveryTypesSchema = yup.object({
  expressDelivery: yup.boolean().required(),
  selfPickup: yup.boolean().required(),
  scheduledDelivery: yup.boolean().required(),
  // pickUpAtVehicle: yup.boolean().required(),
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
  // expressExtraCharge: yup
  //   .string()
  //   .matches(/^\d*$/, "Extra charge must be a valid number"),
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
});

type DeliveryTypesFormData = {
  expressDelivery: boolean;
  selfPickup: boolean;
  scheduledDelivery: boolean;
  // pickUpAtVehicle: boolean;
  expressDeliveryCharge?: string;
  // expressExtraCharge?: string;
  scheduledDeliveryCharge?: string;
};

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
      // pickUpAtVehicle: false,
      expressDeliveryCharge: "",
      // expressExtraCharge: "",
      scheduledDeliveryCharge: "",
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
      // const pickupAtVehicleItem = getSettingByLabel(settings, [
      //   "Pick up At Vehicle",
      //   "Pickup At Vehicle",
      //   "Pick At Vehicle",
      // ]);

      reset({
        expressDelivery: expressDeliveryItem?.isEnabled ?? false,
        selfPickup: selfPickupItem?.isEnabled ?? false,
        scheduledDelivery: scheduledDeliveryItem?.isEnabled ?? false,
        // pickUpAtVehicle: pickupAtVehicleItem?.isEnabled ?? false,
        expressDeliveryCharge:
          expressDeliveryItem?.deliveryCharge !== undefined
            ? expressDeliveryItem.deliveryCharge.toString()
            : "",
        scheduledDeliveryCharge:
          scheduledDeliveryItem?.deliveryCharge !== undefined
            ? scheduledDeliveryItem.deliveryCharge.toString()
            : "",
        // expressExtraCharge:
        //   pickupAtVehicleItem?.deliveryCharge !== undefined
        //     ? pickupAtVehicleItem.deliveryCharge.toString()
        //     : "",
      });
    }
  }, [data?.data?.deliverySettings, reset]);

  const expressDelivery = watch("expressDelivery");
  const selfPickup = watch("selfPickup");
  const scheduledDelivery = watch("scheduledDelivery");
  // const pickUpAtVehicle = watch("pickUpAtVehicle");

  const onSubmit = (values: DeliveryTypesFormData) => {

    updateMutation.mutate({
      expressSettingsEnabled: values.expressDelivery,
      expressSettingsCharge: values.expressDelivery
        ? Number(values.expressDeliveryCharge ?? "") || 0
        : 0,
      selfPickupEnabled: values.selfPickup,
      scheduledDeliveryEnabled: values.scheduledDelivery,
      scheduledDeliveryCharge: values.scheduledDelivery
        ? Number(values.scheduledDeliveryCharge ?? "") || 0
        : 0,
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
                  if (!value) setValue("expressDeliveryCharge", "");
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
                {/* <Controller
                  name="expressExtraCharge"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      label={
                        <span className="flex items-center gap-1">
                          Extra Charges (<IndianRupee size={14} className="inline" />)
                        </span>
                      }
                      type="text"
                      onlyNumbers
                      maxLength={5}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Enter delivery Charge"
                      error={errors.expressExtraCharge?.message}
                    />
                  )}
                /> */}
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
                  if (!value) setValue("scheduledDeliveryCharge", "");
                }}
              />
            </div>

            {scheduledDelivery && (
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
