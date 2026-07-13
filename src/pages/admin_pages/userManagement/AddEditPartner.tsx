import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Save } from "lucide-react";
import {
  PrimaryButton,
  Button,
  TextInput,
  PasswordInput,
  RadioButton,
  FormSectionWithDots,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";
import {
  partnerSchema,
  PartnerFormData,
} from "../../../validationSchema/partner";
import {
  useCreatePartner,
  useGetPartnerDetailsById,
  useUpdatePartner,
} from "../../../hooks/partner";

// Use the type inferred from yup schema
type PartnerFormInputs = PartnerFormData;

// Interface for API payload
interface ApiPartnerPayload {
  name: string;
  phone: string;
  email: string;
  password?: string; // Optional for update
  companyName: string;
}

// Interface for API response
interface ApiPartnerResponse {
  id: string;
  name: string;
  phone: string;
  email: string;
  companyName: string;
  status: string;
  [key: string]: unknown;
}

// Interface for API validation error
interface ApiValidationError {
  type: string;
  value?: string;
  msg: string;
  path: string;
  location: string;
}

// Interface for the hook response data structure
interface PartnerResponseData {
  data: ApiPartnerResponse;
  [key: string]: unknown;
}

const AddEditPartner = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const { mutateAsync: createPartnerAsync, isPending } = useCreatePartner();
  const { mutateAsync: updatePartnerAsync, isPending: isUpdatePending } =
    useUpdatePartner(id || "");
  const {
    data: editData,
    refetch,
    isLoading: isEditLoading,
  } = useGetPartnerDetailsById(id ?? "");

  // Initialize React Hook Form with Controller
  const {
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<PartnerFormInputs>({
    resolver: yupResolver(partnerSchema) as any,
    mode: "onChange",
    context: { isEditMode },
    defaultValues: {
      name: "",
      mobile: "",
      email: "",
      password: "",
      confirmPassword: "",
      company: "",
      status: "active",
    },
  });

  // Handle edit mode data binding
  useEffect(() => {
    if (isEditMode && id) {
      refetch();
    }
  }, [id, isEditMode, refetch]);

  // Set form values when edit data is available
  useEffect(() => {
    if (isEditMode && editData) {
      const partnerResponseData = editData as PartnerResponseData;
      const partnerEditData = partnerResponseData?.data as ApiPartnerResponse;

      if (!partnerEditData) return;

      // Set all form values
      setValue("name", partnerEditData?.name || "");
      setValue("mobile", partnerEditData?.phone || "");
      setValue("email", partnerEditData?.email || "");
      setValue("company", partnerEditData?.companyName || "");
      setValue(
        "status",
        (partnerEditData?.status?.toLowerCase() === "active"
          ? "active"
          : "inactive") as "active" | "inactive"
      );
      // Don't set password fields in edit mode
    }
  }, [editData, isEditMode, setValue]);

  // Handle API validation errors
  const handleApiErrors = (error: unknown) => {
    // API returns errors in format: [{ type: "field", path: "phone", msg: "Invalid phone number" }]
    let apiErrors: ApiValidationError[] | unknown = error;

    // Try to extract errors from different error structures
    if (error && typeof error === "object") {
      const errorObj = error as {
        data?: unknown;
        response?: { data?: unknown };
        message?: string;
      };
      apiErrors = errorObj?.data || errorObj?.response?.data || error;
    }

    // Check if it's an array of validation errors
    if (Array.isArray(apiErrors)) {
      apiErrors.forEach((err: ApiValidationError) => {
        if (err.type === "field" && err.path && err.msg) {
          // Map API field names to form field names
          let formFieldName: keyof PartnerFormInputs;

          switch (err.path) {
            case "phone":
              formFieldName = "mobile";
              break;
            case "companyName":
              formFieldName = "company";
              break;
            case "name":
            case "email":
            case "password":
              formFieldName = err.path as keyof PartnerFormInputs;
              break;
            default:
              // If field doesn't exist in form, skip it
              return;
          }

          // Set error on the form field
          setError(formFieldName, {
            type: "server",
            message: err.msg,
          });
        }
      });
    } else if (error && typeof error === "object" && "message" in error) {
      // Handle general error message
      console.error("API Error:", (error as { message: string }).message);
    }

    // Ensure loading is set to false on error
    setLoading(false);
  };

  const onSubmit = async (data: PartnerFormInputs) => {
    try {
      setLoading(true);

      // Prepare payload for API matching the required format
      const payload: ApiPartnerPayload = {
        name: data.name.trim(),
        phone: data.mobile.trim(),
        email: data.email.trim(),
        companyName: data.company.trim(),
      };

      // Add password only for create mode
      if (!isEditMode && data.password) {
        payload.password = data.password;
      }

      // Call appropriate mutation and wait for result
      if (isEditMode && id) {
        await updatePartnerAsync(payload as unknown);
        // Only navigate on success
        navigate("/user-management/partners");
      } else {
        await createPartnerAsync(payload as unknown);
        // Only navigate on success
        navigate("/user-management/partners");
      }
    } catch (error: unknown) {
      // Handle API errors - don't navigate, stay on page
      handleApiErrors(error);
      // Ensure loading is set to false on error
      setLoading(false);
    }
  };

  const onError = (errors: unknown) => {
    console.log("Form errors:", errors);
  };

  if (isEditLoading && isEditMode) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500">
            Loading partner...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title and Back Button */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          {isEditMode ? "Edit Partner" : "Add Partner"}
        </h1>
        <div className="flex items-center justify-end">
          <BackButton to="/user-management/partners" />
        </div>
      </div>
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit(onSubmit, onError)}
        className="bg-white rounded-xl shadow-md border border-gray-200 p-6"
      >
        <div className="max-w-4xl">
          {/* Personal Information Section */}
          <FormSectionWithDots title="Personal Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="Name"
                    required
                    type="text"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Enter Name"
                    error={errors.name?.message}
                  />
                )}
              />

              <Controller
                name="mobile"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="Mobile Number"
                    required
                    type="tel"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Enter Mobile Number"
                    maxLength={10}
                    error={errors.mobile?.message}
                  />
                )}
              />

              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="EmailID"
                    required
                    type="email"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Enter Email ID"
                    error={errors.email?.message}
                  />
                )}
              />

              {!isEditMode && (
                <>
                  <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                      <PasswordInput
                        label="Password"
                        required
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        placeholder="Enter Password"
                        error={errors.password?.message}
                      />
                    )}
                  />

                  <Controller
                    name="confirmPassword"
                    control={control}
                    render={({ field }) => (
                      <PasswordInput
                        label="Confirm Password"
                        required
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        placeholder="Enter Confirm Password"
                        error={errors.confirmPassword?.message}
                      />
                    )}
                  />
                </>
              )}
            </div>
          </FormSectionWithDots>

          {/* Company & Status Section */}
          <FormSectionWithDots title="Company & Status">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="company"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="Company Name"
                    required
                    type="text"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Enter Company Name"
                    error={errors.company?.message}
                  />
                )}
              />

              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Status{" "}
                      <span className="text-red-500 dark:text-red-400">*</span>
                    </label>
                    <div className="flex items-center gap-6">
                      <RadioButton
                        label="Active"
                        name="status"
                        value="active"
                        checked={field.value === "active"}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                      <RadioButton
                        label="Inactive"
                        name="status"
                        value="inactive"
                        checked={field.value === "inactive"}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </div>
                    {errors.status && (
                      <p className="text-red-500 dark:text-red-400 text-[10px] mt-0.5">
                        {errors.status.message}
                      </p>
                    )}
                  </div>
                )}
              />
            </div>
          </FormSectionWithDots>

          {/* Submit Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              onClick={() => navigate("/user-management/partners")}
              variant="ghost"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs font-medium bg-white"
              disabled={isPending || loading}
            >
              Cancel
            </Button>
            <PrimaryButton
              type="submit"
              className="flex-1 px-4 py-2 text-xs font-medium"
              disabled={isPending || loading}
            >
              {isPending || isUpdatePending || loading ? (
                <>
                  <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1.5"></span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={14} className="mr-1.5" />
                  {isEditMode ? "Update Partner" : "Add Partner"}
                </>
              )}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddEditPartner;
