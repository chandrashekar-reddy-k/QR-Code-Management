import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Save } from "lucide-react";
import {
  PrimaryButton,
  Button,
  TextInput,
  SelectInput,
  FormSectionWithDots,
} from "../../../../components/ui";
import Breadcrumbs from "../../../../components/common/Breadcrumbs";
import BackButton from "../../../../components/common/BackButton";
import { districtSchema } from "../../../../validationSchema/district";
import {
  useGetDistrictDetailsById,
  useUpdateDistrict,
} from "../../../../hooks/district";

// Interface for form inputs
interface DistrictFormInputs {
  state: string;
  districtName: string;
}

// Interface for API payload
interface ApiDistrictPayload {
  state: string;
  districtName: string;
}

// Interface for API response
interface ApiDistrictResponse {
  id: string;
  districtName: string;
  state: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt?: string;
  updatedAt?: string;
}

// Interface for the hook response data structure
interface DistrictResponseData {
  data: ApiDistrictResponse;
  [key: string]: unknown;
}

// Mock states data
const mockStates = [
  { id: 1, name: "Andhra Pradesh", country: "India", status: "active" },
  { id: 2, name: "Telangana", country: "India", status: "active" },
  { id: 3, name: "Karnataka", country: "India", status: "active" },
  { id: 4, name: "Tamil Nadu", country: "India", status: "active" },
  { id: 5, name: "Kerala", country: "India", status: "active" },
];

const EditDistrict = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { mutate: updateDistrict, isPending } = useUpdateDistrict(id || "");
  const {
    data: editData,
    refetch,
    isLoading: isEditLoading,
  } = useGetDistrictDetailsById(id ?? "");

  // Initialize React Hook Form with Controller
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<DistrictFormInputs>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: yupResolver(districtSchema) as any,
    mode: "onChange",
    defaultValues: {
      state: "",
      districtName: "",
    },
  });

  // Handle edit mode data binding
  useEffect(() => {
    if (id) {
      refetch();
    }
  }, [id, refetch]);

  // Set form values when edit data is available
  useEffect(() => {
    if (editData) {
      const districtResponseData = editData as DistrictResponseData;
      const districtEditData =
        districtResponseData?.data as ApiDistrictResponse;

      if (!districtEditData) return;

      // Set form values
      setValue("districtName", districtEditData?.districtName || "");
      setValue("state", districtEditData?.state || "");
    }
  }, [editData, setValue]);

  const onSubmit = async (data: DistrictFormInputs) => {
    try {
      // Prepare payload for API - map form values exactly to API payload structure
      const payload: ApiDistrictPayload = {
        state: data.state.trim(),
        districtName: data.districtName.trim(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updateDistrict(payload as any);
      navigate("/master-setup/districts");
    } catch (error: unknown) {
      console.error("Error saving district:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Error saving district. Please try again."
      );
    }
  };

  const onError = (errors: Record<string, { message?: string }>) => {
    console.log("Form errors:", errors);
  };

  if (isEditLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500">
            Loading district...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Edit District
        </h1>
        <BackButton to="/master-setup/districts" />
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
          <FormSectionWithDots title="District Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="state"
                control={control}
                render={({ field }) => (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      State{" "}
                      <span className="text-red-500 dark:text-red-400">*</span>
                    </label>
                    <SelectInput
                      name={field.name}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      options={[
                        { value: "", label: "--Select State--" },
                        ...mockStates.map((state) => ({
                          value: state.name,
                          label: state.name,
                        })),
                      ]}
                      error={errors.state?.message}
                    />
                  </div>
                )}
              />

              <Controller
                name="districtName"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="District Name"
                    required
                    type="text"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.districtName?.message}
                    placeholder="Enter district name"
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
              onClick={() => navigate("/master-setup/districts")}
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
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Update District</span>
                </>
              )}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditDistrict;
