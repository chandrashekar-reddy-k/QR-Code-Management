import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Upload, Save, Search as SearchIcon } from "lucide-react";
import {
  PrimaryButton,
  Button,
  TextInput,
  SelectInput,
  PasswordInput,
  FormSectionWithDots,
} from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";
import { deliveryBoySchema } from "../../../validationSchema/deliveryBoy";
import {
  useCreateDeliveryBoy,
  useGetDeliveryBoyDetailsById,
  useUpdateDeliveryBoy,
} from "../../../hooks/deliveryBoy";

interface DeliveryBoyFormInputs {
  name: string;
  dateOfBirth: string;
  mobile: string;
  email: string;
  password: string;
  confirmPassword: string;
  ifscCode: string;
  bankName: string;
  accountNumber: string;
  bankAccountName: string;
  city: string;
  state: string;
  street: string;
  latitude: number;
  longitude: number;
  address: string;
  pincode: string;
  addressLabel: string;
  otherPaymentInformation: string;
  drivingLicense: File | null | string;
  nationalIdentityCard: File | null | string;
  bonusType: string;
  avatar: File | null | string;
}

  // Interface for API payload
interface ApiDeliveryBoyPayload {
  name: string;
  phone: string;
  email: string;
  password?: string;
  dob: string;
  bankInfo: {
    bankName: string;
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    paymentInfo: string;
  };
  documents: {
    drivingLicense?: string; // URL string
    aadharCard?: string; // URL string
  };
  avatar?: string; // URL string
  bonusType?: string;
  address: {
    label: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    latitude: number;
    longitude: number;
  };
}

// Interface for API response
interface ApiDeliveryBoyResponse {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  dob: string | null;
  bonusType: string | null;
  bankInfo: {
    bankName: string;
    ifscCode: string;
    paymentInfo: string;
    accountNumber: string;
    accountHolderName: string;
  } | null;
  isActive: boolean;
  address: {
    city: string;
    state: string;
    line1: string;
    line2: string | null;
    pincode: string | null;
    location: {
      lat: number;
      lng: number;
    } | null;
  } | null;
  documents: Array<{
    drivingLicense?: string;
    aadharCard?: string;
  }>;
  [key: string]: any;
}

// Interface for the hook response data structure
interface DeliveryBoyResponseData {
  data: ApiDeliveryBoyResponse;
  [key: string]: any;
}

// Mock cities data
const mockCities: { id: number; name: string; state: string }[] = [
  { id: 1, name: "Mumbai", state: "Maharashtra" },
  { id: 2, name: "Delhi", state: "Delhi" },
  { id: 3, name: "Bangalore", state: "Karnataka" },
  { id: 4, name: "Hyderabad", state: "Telangana" },
  { id: 5, name: "Chennai", state: "Tamil Nadu" },
  { id: 6, name: "Kolkata", state: "West Bengal" },
  { id: 7, name: "Pune", state: "Maharashtra" },
  { id: 8, name: "Ahmedabad", state: "Gujarat" },
  { id: 9, name: "Jaipur", state: "Rajasthan" },
  { id: 10, name: "Surat", state: "Gujarat" },
  { id: 11, name: "Lucknow", state: "Uttar Pradesh" },
  { id: 12, name: "Kanpur", state: "Uttar Pradesh" },
  { id: 13, name: "Nagpur", state: "Maharashtra" },
  { id: 14, name: "Indore", state: "Madhya Pradesh" },
  { id: 15, name: "Thane", state: "Maharashtra" },
  { id: 16, name: "Bhopal", state: "Madhya Pradesh" },
  { id: 17, name: "Visakhapatnam", state: "Andhra Pradesh" },
  { id: 18, name: "Guntur", state: "Andhra Pradesh" },
  { id: 19, name: "Patna", state: "Bihar" },
  { id: 20, name: "Vadodara", state: "Gujarat" },
  { id: 21, name: "Ghaziabad", state: "Uttar Pradesh" },
];

const AddDeliveryBoy = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState<
    { id: number; name: string; state: string }[]
  >([]);
  const [drivingLicensePreview, setDrivingLicensePreview] = useState<
    string | null
  >(null);
  const [nationalIdPreview, setNationalIdPreview] = useState<string | null>(
    null
  );
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const { mutate, isPending } = useCreateDeliveryBoy();
  const { mutate: updateDeliveryBoy } = useUpdateDeliveryBoy(id || "");
  const {
    data: editData,
    refetch,
    isLoading: isEditLoading,
  } = useGetDeliveryBoyDetailsById(id ?? "");
  const drivingLicenseInputRef = useRef<HTMLInputElement>(null);
  const nationalIdInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Initialize React Hook Form with Controller
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DeliveryBoyFormInputs>({
    resolver: yupResolver(deliveryBoySchema) as any,
    context: { isEditMode },
    mode: "onChange",
    defaultValues: {
      name: "",
      dateOfBirth: "",
      mobile: "",
      email: "",
      password: "",
      confirmPassword: "",
      ifscCode: "",
      bankName: "",
      accountNumber: "",
      bankAccountName: "",
      city: "",
      state: "",
      street: "",
      latitude: 0,
      longitude: 0,
      address: "",
      pincode: "",
      addressLabel: "Home",
      otherPaymentInformation: "",
      drivingLicense: null,
      nationalIdentityCard: null,
      bonusType: "",
      avatar: null,
    },
  });

  const watchDrivingLicense = watch("drivingLicense");
  const watchNationalId = watch("nationalIdentityCard");
  const watchAvatar = watch("avatar");

  // Handle file previews when files change
  useEffect(() => {
    if (watchDrivingLicense instanceof File) {
      const objectUrl = URL.createObjectURL(watchDrivingLicense);
      setDrivingLicensePreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else if (typeof watchDrivingLicense === "string") {
      setDrivingLicensePreview(watchDrivingLicense);
    } else {
      setDrivingLicensePreview(null);
    }
  }, [watchDrivingLicense]);

  useEffect(() => {
    if (watchNationalId instanceof File) {
      const objectUrl = URL.createObjectURL(watchNationalId);
      setNationalIdPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else if (typeof watchNationalId === "string") {
      setNationalIdPreview(watchNationalId);
    } else {
      setNationalIdPreview(null);
    }
  }, [watchNationalId]);

  useEffect(() => {
    if (watchAvatar instanceof File) {
      const objectUrl = URL.createObjectURL(watchAvatar);
      setAvatarPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else if (typeof watchAvatar === "string") {
      setAvatarPreview(watchAvatar);
    } else {
      setAvatarPreview(null);
    }
  }, [watchAvatar]);

  // Set mock cities on mount
  useEffect(() => {
    setCities(mockCities);
  }, []);

  // Handle edit mode data binding
  useEffect(() => {
    if (isEditMode && id) {
      refetch();
    }
  }, [id, isEditMode, refetch]);

  // Set form values when edit data is available
  useEffect(() => {
    if (isEditMode && editData) {
      const deliveryBoyResponseData = editData as DeliveryBoyResponseData;
      const deliveryBoyEditData =
        deliveryBoyResponseData?.data as ApiDeliveryBoyResponse;

      if (!deliveryBoyEditData) return;

      // Set all form values
      setValue("name", deliveryBoyEditData?.name || "");
      setValue("mobile", deliveryBoyEditData?.phone || "");
      setValue("email", deliveryBoyEditData?.email || "");
      setValue(
        "dateOfBirth",
        deliveryBoyEditData?.dob
          ? new Date(deliveryBoyEditData.dob).toISOString().split("T")[0]
          : ""
      );
      setValue("bonusType", deliveryBoyEditData?.bonusType || "");

      // Handle bank info
      if (deliveryBoyEditData?.bankInfo) {
        setValue("ifscCode", deliveryBoyEditData.bankInfo.ifscCode || "");
        setValue("bankName", deliveryBoyEditData.bankInfo.bankName || "");
        setValue(
          "accountNumber",
          deliveryBoyEditData.bankInfo.accountNumber || ""
        );
        setValue(
          "bankAccountName",
          deliveryBoyEditData.bankInfo.accountHolderName || ""
        );
        setValue(
          "otherPaymentInformation",
          deliveryBoyEditData.bankInfo.paymentInfo || ""
        );
      }

      // Handle address
      if (deliveryBoyEditData?.address) {
        setValue("city", deliveryBoyEditData.address.city || "");
        setValue("state", deliveryBoyEditData.address.state || "");
        setValue("street", deliveryBoyEditData.address.line1 || "");
        setValue("pincode", deliveryBoyEditData.address.pincode || "");
        setValue(
          "address",
          `${deliveryBoyEditData.address.line1}${
            deliveryBoyEditData.address.line2
              ? `, ${deliveryBoyEditData.address.line2}`
              : ""
          }`
        );
        if (deliveryBoyEditData.address.location) {
          setValue("latitude", deliveryBoyEditData.address.location.lat);
          setValue("longitude", deliveryBoyEditData.address.location.lng);
        }
      }

      // Handle documents
      if (
        deliveryBoyEditData?.documents &&
        deliveryBoyEditData.documents.length > 0
      ) {
        const firstDoc = deliveryBoyEditData.documents[0];
        if (firstDoc.drivingLicense) {
          setValue("drivingLicense", firstDoc.drivingLicense);
          setDrivingLicensePreview(firstDoc.drivingLicense);
        }
        if (firstDoc.aadharCard) {
          setValue("nationalIdentityCard", firstDoc.aadharCard);
          setNationalIdPreview(firstDoc.aadharCard);
        }
      }
    }
  }, [editData, isEditMode, setValue]);

  const handleFileChange = (
    file: File | null,
    field: "drivingLicense" | "nationalIdentityCard" | "avatar"
  ) => {
    setValue(field, file, { shouldValidate: true });
  };

  const handleRemoveFile = (
    field: "drivingLicense" | "nationalIdentityCard" | "avatar"
  ) => {
    setValue(field, null, { shouldValidate: true });
    if (field === "drivingLicense") {
      setDrivingLicensePreview(null);
      if (drivingLicenseInputRef.current) {
        drivingLicenseInputRef.current.value = "";
      }
    } else if (field === "nationalIdentityCard") {
      setNationalIdPreview(null);
      if (nationalIdInputRef.current) {
        nationalIdInputRef.current.value = "";
      }
    } else if (field === "avatar") {
      setAvatarPreview(null);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (
    e: React.DragEvent,
    field: "drivingLicense" | "nationalIdentityCard" | "avatar"
  ) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (field === "avatar" && !file.type.startsWith("image/")) {
        return;
      }
      if (
        (field === "drivingLicense" || field === "nationalIdentityCard") &&
        !file.type.startsWith("image/") &&
        file.type !== "application/pdf"
      ) {
        return;
      }
      handleFileChange(file, field);
    }
  };

  const onSubmit = async (data: DeliveryBoyFormInputs) => {
    try {
      setLoading(true);

      // Use static URL for all images
      const imageUrl = "https://cdn.app.com/docs/aadhar.png";

      let drivingLicenseUrl: string | undefined;
      let aadharCardUrl: string | undefined;
      let avatarUrl: string | undefined;

      // Use the static URL if file is provided, otherwise use existing URL (for edit mode)
      if (data.drivingLicense instanceof File) {
        drivingLicenseUrl = imageUrl;
      } else if (typeof data.drivingLicense === "string") {
        drivingLicenseUrl = data.drivingLicense;
      }

      if (data.nationalIdentityCard instanceof File) {
        aadharCardUrl = imageUrl;
      } else if (typeof data.nationalIdentityCard === "string") {
        aadharCardUrl = data.nationalIdentityCard;
      }

      if (data.avatar instanceof File) {
        avatarUrl = imageUrl;
      } else if (typeof data.avatar === "string") {
        avatarUrl = data.avatar;
      }

      // Prepare payload for API matching the required format
      const payload: ApiDeliveryBoyPayload = {
        name: data.name,
        phone: data.mobile,
        email: data.email,
        ...(data.password ? { password: data.password } : {}),
        dob: data.dateOfBirth,
        bankInfo: {
          bankName: data.bankName,
          accountHolderName: data.bankAccountName,
          accountNumber: data.accountNumber,
          ifscCode: data.ifscCode,
          paymentInfo: data.otherPaymentInformation || "",
        },
        documents: {
          ...(drivingLicenseUrl && { drivingLicense: drivingLicenseUrl }),
          ...(aadharCardUrl && { aadharCard: aadharCardUrl }),
        },
        address: {
          label: data.addressLabel || "Home",
          line1: data.street || "",
          ...(data.address && { line2: data.address }),
          city: data.city,
          state: data.state,
          pincode: data.pincode || "",
          latitude: data.latitude,
          longitude: data.longitude,
        },
      };

      // Add avatar if provided
      if (avatarUrl) {
        payload.avatar = avatarUrl;
      }

      // Add bonusType if provided
      if (data.bonusType && data.bonusType.trim()) {
        payload.bonusType = data.bonusType;
      }

      // Call appropriate mutation
      if (isEditMode && id) {
        updateDeliveryBoy(payload as any);
      } else {
        mutate(payload as any);
      }

      navigate("/delivery-boys/manage");
    } catch (error: unknown) {
      console.error("Error saving delivery boy:", error);
      alert(
        (error as Error).message ||
          "Error saving delivery boy. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const onError = (errors: any) => {
    console.log("Form errors:", errors);
  };

  if (isEditLoading && isEditMode) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500">
            Loading delivery boy...
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
          {isEditMode ? "Edit Delivery Agent" : "Create Delivery Agent"}
        </h1>
        <div className="flex items-center justify-end">
          <BackButton to="/delivery-boys/manage" />
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
          {/* Basic Information Section */}
          <FormSectionWithDots title="Basic Information">
            {/* Avatar */}
            <Controller
              name="avatar"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Avatar (Profile Picture)
                  </label>
                  <div
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, "avatar")}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center bg-gray-50"
                  >
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        field.onChange(file);
                        handleFileChange(file, "avatar");
                      }}
                      className="hidden"
                      id="avatar"
                    />
                    <label htmlFor="avatar" className="cursor-pointer">
                      {avatarPreview ? (
                        <div>
                          <img
                            src={avatarPreview}
                            alt="Avatar Preview"
                            className="w-24 h-24 object-cover rounded-full mx-auto mb-2"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              field.onChange(null);
                              handleRemoveFile("avatar");
                            }}
                            className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          >
                            Remove Image
                          </button>
                        </div>
                      ) : (
                        <div>
                          <Upload
                            size={20}
                            className="mx-auto text-gray-400 mb-2"
                          />
                          <p className="text-xs text-gray-600">
                            Click to upload profile picture
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                  {errors.avatar && (
                    <p className="text-red-500 dark:text-red-400 text-[10px] mt-0.5">
                      {errors.avatar.message as string}
                    </p>
                  )}
                </div>
              )}
            />

            {/* Name */}
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
                  placeholder="Enter name."
                  error={errors.name?.message}
                />
              )}
            />

            {/* Date Of Birth */}
            <Controller
              name="dateOfBirth"
              control={control}
              render={({ field }) => (
                <div>
                  <TextInput
                    label="Date Of Birth"
                    required
                    type="date"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    className="max-w-xs"
                    error={errors.dateOfBirth?.message}
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    dd-mm-yyyy
                  </p>
                </div>
              )}
            />

            {/* Mobile and Email - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="mobile"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="Mobile"
                    required
                    type="tel"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Enter mobile no."
                    error={errors.mobile?.message}
                  />
                )}
              />

              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="Email"
                    required
                    type="email"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Enter email id."
                    error={errors.email?.message}
                  />
                )}
              />
            </div>

            {/* Password and Confirm Password - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <PasswordInput
                    label={isEditMode ? "Password (Optional)" : "Password"}
                    required={!isEditMode}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder={isEditMode ? "Enter Password (optional)" : "Enter Password"}
                    error={errors.password?.message}
                  />
                )}
              />

              <Controller
                name="confirmPassword"
                control={control}
                render={({ field }) => (
                  <PasswordInput
                    label={isEditMode ? "Confirm Password (Optional)" : "Confirm Password"}
                    required={!isEditMode}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder={isEditMode ? "Enter Confirm Password (optional)" : "Enter Confirm Password"}
                    error={errors.confirmPassword?.message}
                  />
                )}
              />
            </div>
          </FormSectionWithDots>

          {/* Bank Information Section */}
          <FormSectionWithDots title="Bank Information">
            {/* Bank Details - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="ifscCode"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="Bank's IFSC Code"
                    required
                    type="text"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Enter bank's IFSC code."
                    error={errors.ifscCode?.message}
                  />
                )}
              />

              <Controller
                name="bankName"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="Bank Name"
                    required
                    type="text"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Enter bank name"
                    error={errors.bankName?.message}
                  />
                )}
              />
            </div>

            {/* Account Number and Bank Account Name - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="accountNumber"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="Account Number"
                    required
                    type="text"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Enter account number"
                    error={errors.accountNumber?.message}
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
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Enter bank account name"
                    error={errors.bankAccountName?.message}
                  />
                )}
              />
            </div>
          </FormSectionWithDots>

          {/* Location Information Section */}
          <FormSectionWithDots title="Location Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="city"
                control={control}
                render={({ field }) => {
                  const selectedCityId =
                    cities.find((c) => c.name === field.value)?.id || "";
                  return (
                    <SelectInput
                      label="Select or Search City"
                      required
                      value={selectedCityId}
                      onChange={(e) => {
                        const selectedCity = cities.find(
                          (c) => c.id.toString() === e.target.value
                        );
                        if (selectedCity) {
                          field.onChange(selectedCity.name);
                          setValue("state", selectedCity.state || "");
                        }
                      }}
                      onBlur={field.onBlur}
                      error={errors.city?.message}
                    >
                      <option value="">Select City</option>
                      {cities.map((city) => (
                        <option key={city.id} value={city.id}>
                          {city.name}
                        </option>
                      ))}
                    </SelectInput>
                  );
                }}
              />

              <Controller
                name="state"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="State"
                    type="text"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Enter state"
                    error={errors.state?.message}
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
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Enter pincode (6 digits)"
                    maxLength={6}
                    error={errors.pincode?.message}
                  />
                )}
              />

              <div className="md:col-span-2">
                <Controller
                  name="street"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      label="Street"
                      type="text"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="Enter street."
                      error={errors.street?.message}
                    />
                  )}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Search Location
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search you location on map."
                    className="flex-1 px-3 py-1.5 text-xs border border-green-300 dark:border-green-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <button
                    type="button"
                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5"
                  >
                    <SearchIcon size={14} />
                    Search
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  *Only Search Location, When Update is necessary
                </p>
                <p className="text-[10px] text-gray-500">
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
                    value={field.value}
                    onChange={(e) =>
                      field.onChange(parseFloat(e.target.value) || 0)
                    }
                    onBlur={field.onBlur}
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
                    value={field.value}
                    onChange={(e) =>
                      field.onChange(parseFloat(e.target.value) || 0)
                    }
                    onBlur={field.onBlur}
                    placeholder="Enter longitude."
                    step="any"
                    error={errors.longitude?.message}
                  />
                )}
              />

              <div className="md:col-span-2">
                <div className="w-full h-48 bg-gray-100 rounded-lg border border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center">
                  <p className="text-xs text-gray-500">
                    Map will be displayed here
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Use ctrl + scroll to zoom the map
                  </p>
                </div>
              </div>
            </div>
          </FormSectionWithDots>

          {/* Payment Information Section */}
          <FormSectionWithDots title="Payment Information">
            {/* Other Payment Information */}
            <Controller
              name="otherPaymentInformation"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Other Payment Information
                  </label>
                  <textarea
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Enter other payment information"
                    rows={3}
                    className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  {errors.otherPaymentInformation && (
                    <p className="text-red-500 dark:text-red-400 text-[10px] mt-0.5">
                      {errors.otherPaymentInformation.message as string}
                    </p>
                  )}
                </div>
              )}
            />
          </FormSectionWithDots>

          {/* Documents Section */}
          <FormSectionWithDots title="Documents">
            {/* Driving License */}
            <Controller
              name="drivingLicense"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Driving License{" "}
                    <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <div
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, "drivingLicense")}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center bg-gray-50"
                  >
                    <input
                      ref={drivingLicenseInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        field.onChange(file);
                        handleFileChange(file, "drivingLicense");
                      }}
                      className="hidden"
                      id="drivingLicense"
                    />
                    <label htmlFor="drivingLicense" className="cursor-pointer">
                      {drivingLicensePreview ? (
                        <div>
                          <img
                            src={drivingLicensePreview}
                            alt="Preview"
                            className="w-full max-w-md h-64 object-contain mx-auto mb-2"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              field.onChange(null);
                              handleRemoveFile("drivingLicense");
                            }}
                            className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          >
                            Remove File
                          </button>
                        </div>
                      ) : (
                        <div>
                          <Upload
                            size={20}
                            className="mx-auto text-gray-400 mb-2"
                          />
                          <p className="text-xs text-gray-600">
                            Drop Files here or click to upload
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                  {errors.drivingLicense && (
                    <p className="text-red-500 dark:text-red-400 text-[10px] mt-0.5">
                      {errors.drivingLicense.message as string}
                    </p>
                  )}
                </div>
              )}
            />

            {/* National Identity Card */}
            <Controller
              name="nationalIdentityCard"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    National Identity Card{" "}
                    <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <div
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, "nationalIdentityCard")}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center bg-gray-50"
                  >
                    <input
                      ref={nationalIdInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        field.onChange(file);
                        handleFileChange(file, "nationalIdentityCard");
                      }}
                      className="hidden"
                      id="nationalIdentityCard"
                    />
                    <label
                      htmlFor="nationalIdentityCard"
                      className="cursor-pointer"
                    >
                      {nationalIdPreview ? (
                        <div>
                          <img
                            src={nationalIdPreview}
                            alt="Preview"
                            className="w-full max-w-md h-64 object-contain mx-auto mb-2"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              field.onChange(null);
                              handleRemoveFile("nationalIdentityCard");
                            }}
                            className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          >
                            Remove File
                          </button>
                        </div>
                      ) : (
                        <div>
                          <Upload
                            size={20}
                            className="mx-auto text-gray-400 mb-2"
                          />
                          <p className="text-xs text-gray-600">
                            Drop Files here or click to upload
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                  {errors.nationalIdentityCard && (
                    <p className="text-red-500 dark:text-red-400 text-[10px] mt-0.5">
                      {errors.nationalIdentityCard.message as string}
                    </p>
                  )}
                </div>
              )}
            />
          </FormSectionWithDots>

          {/* Bonus Details Section */}
          <FormSectionWithDots title="Delivery Agent Bonus Details">
            {/* Bonus Type */}
            <Controller
              name="bonusType"
              control={control}
              render={({ field }) => (
                <div>
                  <SelectInput
                    label="Bonus Type"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    className="max-w-xs"
                    error={errors.bonusType?.message}
                  >
                    <option value="">Select Bonus Type</option>
                    <option value="PER_ORDER">Per Order</option>
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed Amount</option>
                  </SelectInput>
                </div>
              )}
            />
          </FormSectionWithDots>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/delivery-boys/manage")}
              className="px-4 py-2 text-xs font-medium"
              disabled={isPending || loading}
            >
              Cancel
            </Button>
            <PrimaryButton
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium"
              disabled={isPending || loading}
            >
              {isPending || loading ? (
                <>
                  <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>
                    {isEditMode
                      ? "Update Delivery Agent"
                      : "Add Delivery Agent"}
                  </span>
                </>
              )}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddDeliveryBoy;
