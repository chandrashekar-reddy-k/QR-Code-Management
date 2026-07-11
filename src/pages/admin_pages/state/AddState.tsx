import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { Save } from "lucide-react";
import {
  PrimaryButton,
  Button,
  TextInput,
  SelectInput,
  FormSectionWithDots,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";
import { useCreateState } from "../../../hooks/state";
import { useGetAllCountryList } from "../../../hooks/country";


interface StateFormInputs {
  name: string;
  countryId: string;
  status: "active" | "inactive";
  stateIcon: "mapPin" | "flag" | "building" | "landmark" | "mountain" | "waves";
}

interface ApiStatePayload {
  name: string;
  country: string;
  status: string;
  stateIcon: string;
}

const AddState = () => {
  const navigate = useNavigate();
  const { mutate, isPending } = useCreateState();
  const { data: countryData } = useGetAllCountryList(1, 100);

const countryOptions = [
  { value: "", label: "Select Country", disabled: true },
  ...(countryData?.data?.countries?.map((country: any) => ({
    value: country.id,
    label: country.name,
  })) || []),
];



  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<StateFormInputs>({
    mode: "onChange",
    defaultValues: {
      name: "",
      countryId: "",
      status: "active",
      stateIcon: "mapPin",
    },
  });

  const onSubmit = (data: StateFormInputs) => {
    const payload = {
      countryId: data.countryId,
      stateName: data.name.trim(),        // <-- update key
      stateIcon: data.stateIcon,
      isActive: data.status === "active", // <-- convert status to boolean
    };

    mutate(payload, {
      onSuccess: () => {
        navigate("/master-setup/states");
      },
    });
  };


  const onError = (errors: any) => {
    console.log("Form errors:", errors);
  };

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Add State
        </h1>
        <BackButton to="/master-setup/states" />
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit(onSubmit, onError)}
        className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6"
      >
        <div className="max-w-4xl">
          {/* State Information */}
          <FormSectionWithDots title="State Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Country (disabled input) */}
              <Controller
                name="countryId"
                control={control}
                rules={{ required: "Country is required" }}
                render={({ field }) => (
                  <SelectInput
                    label="Country"
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    options={countryOptions}
                    error={errors.countryId?.message}
                  />
                )}
              />


              {/* State Name */}
              <Controller
                name="name"
                control={control}
                rules={{ required: "State name is required" }}
                render={({ field }) => (
                  <TextInput
                    label="State Name"
                    required
                    type="text"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.name?.message}
                    placeholder="Enter state name"
                  />
                )}
              />

              {/* Status */}
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <SelectInput
                    label="Status"
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: "active", label: "Active" },
                      { value: "inactive", label: "Inactive" },
                    ]}
                  />
                )}
              />

              {/* State Icon */}
              <Controller
                name="stateIcon"
                control={control}
                render={({ field }) => (
                  <SelectInput
                    label="State Icon"
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: "mapPin", label: "Map Pin (Location)" },
                      { value: "flag", label: "Flag (State Flag)" },
                      { value: "building", label: "Building (Major State)" },
                      { value: "landmark", label: "Landmark (Famous Places)" },
                      { value: "mountain", label: "Mountain (Hilly State)" },
                      { value: "waves", label: "Waves (Coastal State)" },
                    ]}
                  />
                )}
              />
            </div>
          </FormSectionWithDots>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/master-setup/states")}
              className="px-4 py-2 text-xs font-medium"
              disabled={isPending}
            >
              Cancel
            </Button>

            <PrimaryButton
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Add State</span>
                </>
              )}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddState;
