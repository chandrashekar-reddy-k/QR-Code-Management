import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Upload,
  MapPin,
  Search as SearchIcon,
  User,
  Store,
  Building2,
  CreditCard,
  Settings,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  FormSection,
  TextInput,
  SelectInput,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";
import { vendorSchema, VendorFormData } from "../../../validationSchema/vendor";
import { useCreateVendor, useGetVendorDetailsById, useUpdateVendor } from "../../../hooks/vendor";
import fetchData from "../../../helper";
import { mapVendorFormToApiPayload } from "../../../utils/vendorPayloadMapper";

// Mock cities data - fallback when API is not available
const mockCities: { id: number; name: string; state: string }[] = [
  { id: 1, name: 'Hyderabad', state: 'Telangana' },
  { id: 2, name: 'Bangalore', state: 'Karnataka' },
  { id: 3, name: 'Chennai', state: 'Tamil Nadu' },
  { id: 4, name: 'Mumbai', state: 'Maharashtra' },
  { id: 5, name: 'Delhi', state: 'Delhi' },
  { id: 6, name: 'Kolkata', state: 'West Bengal' },
  { id: 7, name: 'Pune', state: 'Maharashtra' },
  { id: 8, name: 'Ahmedabad', state: 'Gujarat' },
  { id: 9, name: 'Jaipur', state: 'Rajasthan' },
  { id: 10, name: 'Surat', state: 'Gujarat' },
  { id: 11, name: 'Lucknow', state: 'Uttar Pradesh' },
  { id: 12, name: 'Kanpur', state: 'Uttar Pradesh' },
  { id: 13, name: 'Nagpur', state: 'Maharashtra' },
  { id: 14, name: 'Indore', state: 'Madhya Pradesh' },
  { id: 15, name: 'Thane', state: 'Maharashtra' },
  { id: 16, name: 'Bhopal', state: 'Madhya Pradesh' },
  { id: 17, name: 'Visakhapatnam', state: 'Andhra Pradesh' },
  { id: 18, name: 'Vadodara', state: 'Gujarat' },
  { id: 19, name: 'Patna', state: 'Bihar' },
  { id: 20, name: 'Ghaziabad', state: 'Uttar Pradesh' },
  { id: 21, name: 'Ludhiana', state: 'Punjab' },
  { id: 22, name: 'Agra', state: 'Uttar Pradesh' },
  { id: 23, name: 'Nashik', state: 'Maharashtra' },
  { id: 24, name: 'Faridabad', state: 'Haryana' },
  { id: 25, name: 'Meerut', state: 'Uttar Pradesh' },
  { id: 26, name: 'Rajkot', state: 'Gujarat' },
  { id: 27, name: 'Varanasi', state: 'Uttar Pradesh' },
  { id: 28, name: 'Srinagar', state: 'Jammu and Kashmir' },
  { id: 29, name: 'Amritsar', state: 'Punjab' },
  { id: 30, name: 'Chandigarh', state: 'Chandigarh' },
];

const AddSeller = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const totalSteps = 5;

  // React Hook Form setup
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    trigger,
  } = useForm<VendorFormData>({
    resolver: yupResolver(vendorSchema) as any,
    mode: 'onChange',
    defaultValues: {
      name: "",
      surname: "",
      vendorDesignation: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      storeName: "",
      categoryIds: "",
      taxName: "",
      taxNumber: "",
      panNumber: "",
      commission: 10,
      productStatus: false,
      requireProductApproval: false,
      selfPickupMode: false,
      city: "",
      state: "",
      line1: "",
      line2: "",
      pincode: "",
      latitude: 0,
      longitude: 0,
      bankName: "",
      accountNumber: "",
      ifscCode: "",
      bankAccountName: "",
      branch: "",
      storeDescription: "",
      nationalIdentityCard: '',
      addressProof: '',
      logo: '',
    },
    context: { isEditMode },
  });

  // Watch form values for previews
  const watchLogo = watch('logo');
  const watchNationalId = watch('nationalIdentityCard');
  const watchAddressProof = watch('addressProof');
  const watchCity = watch('city');

  const [cities, setCities] = useState<
    { id: number; name: string; state: string }[]
  >([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>(
    []
  );
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [nationalIdPreview, setNationalIdPreview] = useState<string | null>(
    null
  );
  const [addressProofPreview, setAddressProofPreview] = useState<string | null>(
    null
  );

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Vendor hooks
  const { mutate: createVendor, isPending: isCreating } = useCreateVendor();
  const { mutate: updateVendor, isPending: isUpdating } = useUpdateVendor(id || '');
  const { data: vendorData, isLoading: isLoadingVendor } = useGetVendorDetailsById(id || '');

  useEffect(() => {
    fetchCities();
    fetchCategories();
  }, []);

  // Load vendor data in edit mode
  useEffect(() => {
    if (isEditMode && vendorData) {
      // API response structure: { status, response, data: { ...vendor } }
      const apiResponse = vendorData as any;
      // Handle both direct data or wrapped in response object
      const data = apiResponse?.data || apiResponse;
      
      // Only proceed if we have actual vendor data
      if (!data || !data.id) {
        console.log('Vendor data not available yet:', { vendorData, apiResponse, data });
        return;
      }
      
      console.log('Loading vendor data into form:', data);
      
      // Map API response to form data
      setValue('name', data.name || '');
      setValue('email', data.email || '');
      setValue('phone', data.phone || '');
      // Don't set password in edit mode - keep it empty to avoid validation issues
      setValue('password', '');
      setValue('confirmPassword', '');
      setValue('storeName', data.store?.name || '');
      setValue('categoryIds', data.store?.categoryIds?.join(',') || '');
      setValue('storeDescription', data.store?.description || '');
      setValue('taxName', data.store?.taxName || '');
      setValue('taxNumber', data.store?.taxNumber || '');
      setValue('panNumber', data.store?.panNumber || '');
      setValue('commission', data.store?.commission || 10);
      setValue('requireProductApproval', data.settings?.requireProductApproval || false);
      setValue('selfPickupMode', data.settings?.selfPickupMode || false);
      setValue('city', data.address?.city || '');
      setValue('state', data.address?.state || '');
      setValue('line1', data.address?.line1 || '');
      setValue('line2', data.address?.line2 || '');
      setValue('pincode', data.address?.pincode || '');
      setValue('latitude', data.address?.location?.lat || 0);
      setValue('longitude', data.address?.location?.lng || 0);
      setValue('bankName', data.bankInfo?.bankName || '');
      setValue('accountNumber', data.bankInfo?.accountNumber || '');
      setValue('ifscCode', data.bankInfo?.ifsc || '');
      setValue('bankAccountName', data.bankInfo?.accountHolderName || '');
      setValue('branch', data.bankInfo?.branch || '');
      
      // Set file previews from URLs
      if (data.store?.logoUrl) {
        setValue('logo', data.store.logoUrl);
        setLogoPreview(data.store.logoUrl);
      }
      if (data.store?.nationalIdUrl) {
        setValue('nationalIdentityCard', data.store.nationalIdUrl);
        setNationalIdPreview(data.store.nationalIdUrl);
      }
      if (data.store?.addressProofUrl) {
        setValue('addressProof', data.store.addressProofUrl);
        setAddressProofPreview(data.store.addressProofUrl);
      }
    }
  }, [vendorData, isEditMode, setValue]);

  const fetchCities = async () => {
    // Use mock cities for now - can be replaced with API call later
    setCities(mockCities);
  };

  const fetchCategories = async () => {
    try {
      const data = await fetchData<any>("category/getCategoryList?page=1&limit=1000", "GET");
      const list =
        Array.isArray(data)
          ? data
          : data?.data?.categories ||
            data?.categories ||
            [];
      setCategories(Array.isArray(list) ? list : []);
    } catch (error: any) {
      // Silently handle network errors when API is not available (expected in development)
      const isNetworkError =
        error instanceof TypeError && error.message === "Failed to fetch";
      if (!isNetworkError) {
        console.error("Error fetching categories:", error);
      }
      setCategories([]);
    }
  };

  // Handle URL previews (these are now URL strings, not files)
  useEffect(() => {
    if (typeof watchLogo === 'string' && watchLogo.trim() !== '') {
      setLogoPreview(watchLogo);
    } else {
      setLogoPreview(null);
    }
  }, [watchLogo]);

  useEffect(() => {
    if (typeof watchNationalId === 'string' && watchNationalId.trim() !== '') {
      setNationalIdPreview(watchNationalId);
    } else {
      setNationalIdPreview(null);
    }
  }, [watchNationalId]);

  useEffect(() => {
    if (typeof watchAddressProof === 'string' && watchAddressProof.trim() !== '') {
      setAddressProofPreview(watchAddressProof);
    } else {
      setAddressProofPreview(null);
    }
  }, [watchAddressProof]);


  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCity = cities.find((c) => c.id.toString() === e.target.value);
    if (selectedCity) {
      setValue('city', selectedCity.name, { shouldValidate: true });
      setValue('state', selectedCity.state || '', { shouldValidate: true });
    }
  };

  // Validate specific step using react-hook-form
  const validateStep = async (step: number): Promise<boolean> => {
    let fieldsToValidate: (keyof VendorFormData)[] = [];

    if (step === 1) {
      fieldsToValidate = ['name', 'email', 'phone', 'password', 'confirmPassword'];
    } else if (step === 2) {
      fieldsToValidate = ['storeName', 'categoryIds', 'panNumber', 'commission', 'taxName', 'taxNumber', 'nationalIdentityCard', 'addressProof', 'logo'];
    } else if (step === 3) {
      fieldsToValidate = ['city', 'state', 'line1', 'pincode', 'latitude', 'longitude'];
    } else if (step === 4) {
      fieldsToValidate = ['bankName', 'accountNumber', 'ifscCode', 'bankAccountName'];
    } else if (step === 5) {
      fieldsToValidate = ['requireProductApproval', 'selfPickupMode'];
    }

    const result = await trigger(fieldsToValidate);
    return result;
  };

  // Check if step is completed
  const isStepCompleted = (step: number): boolean => {
    return completedSteps.includes(step);
  };

  // Mark step as completed
  const markStepCompleted = (step: number) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps([...completedSteps, step]);
    }
  };

  // Handle next step
  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid) {
      markStepCompleted(currentStep);
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Go to specific step
  const goToStep = (step: number) => {
    if (step <= currentStep || isStepCompleted(step)) {
      setCurrentStep(step);
    }
  };

  const onSubmit = async (data: VendorFormData) => {
    try {
      // Map form data to API payload structure
      const payload = await mapVendorFormToApiPayload(data);

      if (isEditMode && id) {
        updateVendor(payload as any, {
          onSuccess: () => {
            navigate("/vendors/manage");
          },
          onError: (error: any) => {
            console.error("Error updating vendor:", error);
            // Error toast is handled by the hook, but we can add additional handling here if needed
          },
        });
      } else {
        createVendor(payload as any, {
          onSuccess: () => {
            navigate("/vendors/manage");
          },
          onError: (error: any) => {
            console.error("Error creating vendor:", error);
            // Error toast is handled by the hook, but we can add additional handling here if needed
          },
        });
      }
    } catch (error: any) {
      console.error("Error preparing vendor payload:", error);
      // This handles errors during payload mapping (shouldn't happen if validation passes)
    }
  };

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
          {isEditMode ? "Edit Vendor" : "Create Vendor"}
        </h1>
        <BackButton to="/vendors/manage" />
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Loading state when fetching vendor data in edit mode */}
      {isEditMode && isLoadingVendor && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Loading vendor details...</p>
        </div>
      )}

      {/* Add Vendor Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
              {isEditMode ? "Edit Vendor" : "Create Vendor"}
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Step {currentStep} of {totalSteps}
            </span>
          </div>
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <button
                  type="button"
                  onClick={() => goToStep(step)}
                  className={`flex items-center gap-2 ${
                    step <= currentStep || isStepCompleted(step)
                      ? "cursor-pointer"
                      : "cursor-not-allowed opacity-50"
                  }`}
                  disabled={step > currentStep && !isStepCompleted(step)}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                      step === currentStep
                        ? "bg-green-600 text-white"
                        : isStepCompleted(step)
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {isStepCompleted(step) ? (
                      <CheckCircle size={16} className="text-white" />
                    ) : (
                      step
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium hidden sm:block ${
                      step === currentStep
                        ? "text-green-600 dark:text-green-400"
                        : isStepCompleted(step)
                        ? "text-green-500 dark:text-green-400"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {step === 1 && "Basic Info"}
                    {step === 2 && "Store Info"}
                    {step === 3 && "Location"}
                    {step === 4 && "Bank Info"}
                    {step === 5 && "Settings"}
                  </span>
                </button>
                {step < totalSteps && (
                  <div className="flex-1 h-0.5 mx-2 bg-gray-200 dark:bg-gray-700">
                    <div
                      className={`h-full transition-all ${
                        step < currentStep || isStepCompleted(step)
                          ? "bg-green-500"
                          : "bg-gray-200 dark:bg-gray-700"
                      }`}
                      style={{
                        width:
                          step < currentStep || isStepCompleted(step)
                            ? "100%"
                            : "0%",
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                <User size={16} className="text-green-600 dark:text-green-400" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Step 1: Personal Information
                </h3>
                {isStepCompleted(1) && (
                  <CheckCircle size={16} className="text-green-500 dark:text-green-400" />
                )}
              </div>
              <FormSection variant="white">
                {/* Personal Information heading line */}
                <div className="mb-4 flex items-center">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mr-4">
                    Personal Information
                  </h4>
                  <div className="flex-1 border-t border-dashed border-gray-300 dark:border-gray-600" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Full Name */}
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          {...field}
                          placeholder="Enter Name"
                          className="w-full px-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 border-gray-300 dark:border-gray-600 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                        />
                        {errors.name?.message && (
                          <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">
                            {errors.name.message}
                          </p>
                        )}
                      </div>
                    )}
                  />

                  {/* Surname */}
                  <Controller
                    name="surname"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          Surname
                        </label>
                        <input
                          type="text"
                          {...field}
                          placeholder="Enter Name"
                          className="w-full px-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 border-gray-300 dark:border-gray-600 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                        />
                      </div>
                    )}
                  />

                  {/* Mobile Number with Verify */}
                  <Controller
                    name="phone"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          Mobile Number <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            {...field}
                            placeholder="Enter Mobile Number"
                            maxLength={10}
                            className="w-full pr-16 px-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 border-gray-300 dark:border-gray-600 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-3 flex items-center text-[11px] font-semibold text-green-600"
                          >
                            Verify
                          </button>
                        </div>
                        {errors.phone?.message && (
                          <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">
                            {errors.phone.message}
                          </p>
                        )}
                      </div>
                    )}
                  />

                  {/* EmailID with Verify */}
                  <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          EmailID <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            {...field}
                            placeholder="Enter Email ID"
                            className="w-full pr-16 px-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 border-gray-300 dark:border-gray-600 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-3 flex items-center text-[11px] font-semibold text-green-600"
                          >
                            Verify
                          </button>
                        </div>
                        {errors.email?.message && (
                          <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">
                            {errors.email.message}
                          </p>
                        )}
                      </div>
                    )}
                  />

                  {/* Vendor designation */}
                  <Controller
                    name="vendorDesignation"
                    control={control}
                    render={({ field }) => (
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          Vendor designation
                        </label>
                        <input
                          type="text"
                          {...field}
                          placeholder="Enter Name"
                          className="w-full px-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 border-gray-300 dark:border-gray-600 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                        />
                      </div>
                    )}
                  />
                </div>

            <Controller
              name="password"
              control={control}
              render={({ field }) => {
                return (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        {...field}
                        disabled={isEditMode}
                        value={isEditMode ? "" : (field.value || "")}
                        onChange={(e) => {
                          if (!isEditMode) {
                            field.onChange(e);
                          }
                        }}
                        placeholder={isEditMode ? "••••••••" : "Enter password."}
                        className={`w-full pr-10 px-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 border-gray-300 dark:border-gray-600 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${
                          isEditMode ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed" : ""
                        }`}
                      />
                      {!isEditMode && (
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      )}
                    </div>
                    {errors.password?.message && (
                      <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">
                        {errors.password.message}
                      </p>
                    )}
                  </div>
                );
              }}
            />

            <Controller
              name="confirmPassword"
              control={control}
              render={({ field }) => {
                return (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        {...field}
                        disabled={isEditMode}
                        value={isEditMode ? "" : (field.value || "")}
                        onChange={(e) => {
                          if (!isEditMode) {
                            field.onChange(e);
                          }
                        }}
                        placeholder={isEditMode ? "••••••••" : "Enter confirm password."}
                        className={`w-full pr-10 px-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 border-gray-300 dark:border-gray-600 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${
                          isEditMode ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed" : ""
                        }`}
                      />
                      {!isEditMode && (
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      )}
                    </div>
                    {errors.confirmPassword?.message && (
                      <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">
                        {errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                );
              }}
            />
              </FormSection>
            </div>
          )}

          {/* Step 2: Store Information */}
          {currentStep === 2 && (
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                <Store size={16} className="text-green-600 dark:text-green-400" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Step 2: Store Information
                </h3>
                {isStepCompleted(2) && (
                  <CheckCircle size={16} className="text-green-500 dark:text-green-400" />
                )}
              </div>
              <FormSection variant="white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              name="storeName"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="Store Name"
                  required
                  type="text"
                  {...field}
                  placeholder="Enter store name."
                  error={errors.storeName?.message}
                />
              )}
            />

            <div>
              <Controller
                name="categoryIds"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="Category IDs"
                    required
                    type="text"
                    {...field}
                    placeholder="Ex : 100,205, 360"
                    error={errors.categoryIds?.message}
                  />
                )}
              />
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                Enter category IDs separated by commas
              </p>
            </div>

            <Controller
              name="taxName"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="Tax Name"
                  type="text"
                  {...field}
                  placeholder="Enter tax name."
                  error={errors.taxName?.message}
                />
              )}
            />

            <Controller
              name="taxNumber"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="Tax Number"
                  type="text"
                  {...field}
                  placeholder="Enter tax number."
                  error={errors.taxNumber?.message}
                />
              )}
            />

            <Controller
              name="panNumber"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="PAN Number"
                  required
                  type="text"
                  {...field}
                  placeholder="Enter PAN number."
                  error={errors.panNumber?.message}
                />
              )}
            />

            <div>
              <Controller
                name="commission"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="Commission (%)"
                    required
                    type="number"
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    placeholder="10"
                    min="0"
                    max="100"
                    step="0.1"
                    error={errors.commission?.message}
                  />
                )}
              />
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                How vendor commission works?
              </p>
            </div>

            <Controller
              name="nationalIdentityCard"
              control={control}
              render={({ field }) => (
                <div>
                  <TextInput
                    label="National Identity Card URL"
                    required
                    type="url"
                    {...field}
                    placeholder="https://example.com/docs/national-id.png"
                    error={errors.nationalIdentityCard?.message}
                  />
                  {nationalIdPreview && (
                    <div className="mt-2">
                      <img
                        src={nationalIdPreview}
                        alt="National ID Preview"
                        className="w-full h-32 object-contain border rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            />

            <Controller
              name="addressProof"
              control={control}
              render={({ field }) => (
                <div>
                  <TextInput
                    label="Address Proof URL"
                    required
                    type="url"
                    {...field}
                    placeholder="https://example.com/docs/address-proof.png"
                    error={errors.addressProof?.message}
                  />
                  {addressProofPreview && (
                    <div className="mt-2">
                      <img
                        src={addressProofPreview}
                        alt="Address Proof Preview"
                        className="w-full h-32 object-contain border rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            />

            <Controller
              name="logo"
              control={control}
              render={({ field }) => (
                <div>
                  <TextInput
                    label="Logo URL"
                    required
                    type="url"
                    {...field}
                    placeholder="https://example.com/store/logo.png"
                    error={errors.logo?.message}
                  />
                  {logoPreview && (
                    <div className="mt-2">
                      <img
                        src={logoPreview}
                        alt="Logo Preview"
                        className="w-full h-32 object-contain border rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            />

            <div className="md:col-span-2">
              <Controller
                name="storeDescription"
                control={control}
                render={({ field }) => (
                  <>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Store Description
                    </label>
                    <textarea
                      {...field}
                      placeholder="Enter store description"
                      rows={4}
                      className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </>
                )}
              />
            </div>
          </div>
              </FormSection>
            </div>
          )}

          {/* Step 3: Store Location Information */}
          {currentStep === 3 && (
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                <MapPin size={16} className="text-green-600 dark:text-green-400" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Step 3: Store Location Information
                </h3>
                {isStepCompleted(3) && (
                  <CheckCircle size={16} className="text-green-500 dark:text-green-400" />
                )}
              </div>
              <FormSection variant="white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              name="city"
              control={control}
              render={({ field }) => (
                <SelectInput
                  label="Select or Search City"
                  required
                  value={cities.find((c) => c.name === field.value)?.id || ""}
                  onChange={(e) => {
                    const selectedCity = cities.find((c) => c.id.toString() === e.target.value);
                    if (selectedCity) {
                      field.onChange(selectedCity.name);
                      setValue('state', selectedCity.state || '');
                    }
                  }}
                  error={errors.city?.message}
                >
                  <option value="">Select City</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </SelectInput>
              )}
            />

            <Controller
              name="state"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="State"
                  type="text"
                  {...field}
                  placeholder="Enter state"
                  error={errors.state?.message}
                />
              )}
            />

            <Controller
              name="line1"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="Address Line 1"
                  required
                  type="text"
                  {...field}
                  placeholder="Enter address line 1"
                  error={errors.line1?.message}
                />
              )}
            />

            <Controller
              name="line2"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="Address Line 2"
                  type="text"
                  {...field}
                  placeholder="Enter address line 2 (optional)"
                  error={errors.line2?.message}
                />
              )}
            />

            <Controller
              name="pincode"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="Pincode"
                  required
                  type="text"
                  {...field}
                  placeholder="Enter 6-digit pincode"
                  error={errors.pincode?.message}
                />
              )}
            />

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Search Location
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search you location on map."
                  className="flex-1 px-3 py-1.5 text-xs border border-green-300 dark:border-green-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                />
                <button
                  type="button"
                  className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5"
                >
                  <SearchIcon size={14} />
                  Search
                </button>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                *Only Search Location, When Update is necessary
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                Search your vendor name and you will get the location
                points(Latitude & Longitude) below.
              </p>
            </div>

            <Controller
              name="latitude"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="Latitude"
                  required
                  type="number"
                  {...field}
                  value={field.value || ''}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  placeholder="Enter latitude."
                  step="any"
                  error={errors.latitude?.message}
                />
              )}
            />

            <Controller
              name="longitude"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="Longitude"
                  required
                  type="number"
                  {...field}
                  value={field.value || ''}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  placeholder="Enter longitude."
                  step="any"
                  error={errors.longitude?.message}
                />
              )}
            />

            <div className="md:col-span-2">
              <div className="w-full h-48 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 flex items-center justify-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Map will be displayed here
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 ml-2">
                  Use ctrl + scroll to zoom the map
                </p>
              </div>
            </div>
          </div>
              </FormSection>
            </div>
          )}

          {/* Step 4: Vendor Bank Information */}
          {currentStep === 4 && (
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                <CreditCard size={16} className="text-green-600 dark:text-green-400" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Step 4: Vendor Bank Information
                </h3>
                {isStepCompleted(4) && (
                  <CheckCircle size={16} className="text-green-500 dark:text-green-400" />
                )}
              </div>
              <FormSection variant="white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              name="bankName"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="Bank Name"
                  required
                  type="text"
                  {...field}
                  placeholder="Enter bank name."
                  error={errors.bankName?.message}
                />
              )}
            />

            <Controller
              name="accountNumber"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="Account Number"
                  required
                  type="text"
                  {...field}
                  placeholder="Enter account number."
                  error={errors.accountNumber?.message}
                />
              )}
            />

            <Controller
              name="ifscCode"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="Bank's IFSC Code"
                  required
                  type="text"
                  {...field}
                  placeholder="Enter bank's IFSC code."
                  error={errors.ifscCode?.message}
                />
              )}
            />

            <Controller
              name="bankAccountName"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="Bank Account Name"
                  required
                  type="text"
                  {...field}
                  placeholder="Enter bank account name."
                  error={errors.bankAccountName?.message}
                />
              )}
            />

            <Controller
              name="branch"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="Branch"
                  type="text"
                  {...field}
                  placeholder="Enter branch name (optional)"
                  error={errors.branch?.message}
                />
              )}
            />
          </div>
              </FormSection>
            </div>
          )}

          {/* Step 5: Other Settings */}
          {currentStep === 5 && (
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                <Settings size={16} className="text-green-600 dark:text-green-400" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Step 5: Other Settings
                </h3>
                {isStepCompleted(5) && (
                  <CheckCircle size={16} className="text-green-500 dark:text-green-400" />
                )}
              </div>
              <FormSection variant="white">
          <div className="space-y-3">
            <Controller
              name="requireProductApproval"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="w-4 h-4 text-gray-600 border-0 rounded focus:ring-gray-400 dark:bg-gray-700"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    Require Product's Approval
                  </span>
                </label>
              )}
            />

            <Controller
              name="selfPickupMode"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="w-4 h-4 text-gray-600 border-0 rounded focus:ring-gray-400 dark:bg-gray-700"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">Self Pickup Mode</span>
                </label>
              )}
            />
          </div>
              </FormSection>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs font-medium bg-white dark:bg-gray-800"
                >
                  <ChevronLeft size={14} />
                  Previous
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate("/vendors/manage")}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs font-medium bg-white dark:bg-gray-800"
              >
                Cancel
              </button>
            </div>
            <div className="flex gap-2">
              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleNext();
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isCreating || isUpdating}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating || isUpdating
                    ? isEditMode
                      ? "Updating..."
                      : "Creating..."
                    : isEditMode
                    ? "Update Vendor"
                    : "Create Vendor"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSeller;
