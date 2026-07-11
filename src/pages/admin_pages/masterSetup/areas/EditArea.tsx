import { useEffect, useMemo } from "react";
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
import { areaSchema } from "../../../../validationSchema/area";
import {
  useGetAreaDetailsById,
  useUpdateArea,
} from "../../../../hooks/area";
import { useGetAllDistrictList } from "../../../../hooks/district";

// Interface for form inputs
interface AreaFormInputs {
  district: string;
  cityName: string;
}

// Interface for API payload
interface ApiAreaPayload {
  district: string;
  cityName: string;
}

// Interface for API response
interface ApiAreaResponse {
  id: string;
  cityName: string;
  district: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt?: string;
  updatedAt?: string;
}

// Interface for the hook response data structure
interface AreaResponseData {
  data: ApiAreaResponse;
  [key: string]: unknown;
}

// Interface for API district response
interface ApiDistrict {
  id: string;
  districtName: string;
  state: string;
  status: "ACTIVE" | "INACTIVE";
}

interface ApiDistrictResponse {
  status: boolean;
  response: string;
  data: {
    districts: ApiDistrict[];
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

const EditArea = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { mutate: updateArea, isPending } = useUpdateArea(id || "");
  const {
    data: editData,
    refetch,
    isLoading: isEditLoading,
  } = useGetAreaDetailsById(id ?? "");
  const { data: districtsData } = useGetAllDistrictList(1, 1000); // Fetch all districts for dropdown

  // Initialize React Hook Form with Controller
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AreaFormInputs>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: yupResolver(areaSchema) as any,
    mode: "onChange",
    defaultValues: {
      district: "",
      cityName: "",
    },
  });

  // Extract districts from API response
  const districts: ApiDistrict[] = useMemo(() => {
    const apiData = districtsData as ApiDistrictResponse | undefined;
    return apiData?.data?.districts || [];
  }, [districtsData]);

  // Handle edit mode data binding
  useEffect(() => {
    if (id) {
      refetch();
    }
  }, [id, refetch]);

  // Set form values when edit data is available
  useEffect(() => {
    if (editData) {
      const areaResponseData = editData as AreaResponseData;
      const areaEditData = areaResponseData?.data as ApiAreaResponse;

      if (!areaEditData) return;

      // Set form values
      setValue("cityName", areaEditData?.cityName || "");
      setValue("district", areaEditData?.district || "");
    }
  }, [editData, setValue]);

  const onSubmit = async (data: AreaFormInputs) => {
    try {
      // Prepare payload for API - map form values exactly to API payload structure
      const payload: ApiAreaPayload = {
        district: data.district.trim(),
        cityName: data.cityName.trim(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updateArea(payload as any);
      navigate("/master-setup/areas");
    } catch (error: unknown) {
      console.error("Error saving area:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Error saving area. Please try again."
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
            Loading area/city...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Edit Area/City</h1>
        <BackButton to="/master-setup/areas" />
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
          <FormSectionWithDots title="Area/City Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="district"
                control={control}
                render={({ field }) => (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      District{" "}
                      <span className="text-red-500 dark:text-red-400">*</span>
                    </label>
                    <SelectInput
                      name={field.name}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      options={[
                        { value: "", label: "--Select District--" },
                        ...districts.map((district) => ({
                          value: district.districtName,
                          label: `${district.districtName} (${district.state})`,
                        })),
                      ]}
                      error={errors.district?.message}
                    />
                  </div>
                )}
              />

              <Controller
                name="cityName"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="Area/City Name"
                    required
                    type="text"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.cityName?.message}
                    placeholder="Enter area/city name"
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
              onClick={() => navigate("/master-setup/areas")}
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
                  <span>Update Area/City</span>
                </>
              )}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditArea;

