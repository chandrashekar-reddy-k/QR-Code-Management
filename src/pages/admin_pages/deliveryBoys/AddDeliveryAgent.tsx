import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { ChevronLeft, ChevronRight, CheckCircle, Upload } from "lucide-react";
import {
  PrimaryButton,
  Button,
  FormSectionWithDots,
  TextInput,
  SelectInput,
  RadioButton,
} from "../../../components/ui";

import BackButton from "../../../components/common/BackButton";
const TOTAL_STEPS = 5;

const AddDeliveryAgent = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [paySlipPreview, setPaySlipPreview] = useState(null);
  const [aadhaarPreview, setAadhaarPreview] = useState(null);
  const [panPreview, setPanPreview] = useState(null);
  const [drivingLicensePreview, setDrivingLicensePreview] = useState(null);
  const [passportPhotoPreview, setPassportPhotoPreview] = useState(null);
  const [cancelledChequePreview, setCancelledChequePreview] = useState(null);

  const {
    handleSubmit,
    trigger,
    control,
    watch,
    setValue,
    formState,
  } = useForm({
    mode: "onChange",
  });
  const errors = formState.errors as Record<string, { message?: string } | undefined>;

  const sameAsPermanent = watch("sameAsPermanent");

  useEffect(() => {
    if (sameAsPermanent) {
      setValue("commDoorNo", watch("permDoorNo"));
      setValue("commRoadNo", watch("permRoadNo"));
      setValue("commColony", watch("permColony"));
      setValue("commMandal", watch("permMandal"));
      setValue("commState", watch("permState"));
      setValue("commCity", watch("permCity"));
      setValue("commPincode", watch("permPincode"));
    }
  }, [sameAsPermanent]);

  const markStepCompleted = (step: number) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps((prev) =>
        prev.includes(step) ? prev : [...prev, step],
      );
    }
  };

  const validateStep = async (step: number) => {
    let fields: string[] = [];

    switch (step) {
      case 1:
        fields = [
          "fullName",
          "surName",
          "fatherOrSpouseName",
          "email",
          "dateOfBirth",
          "gender",
          "mobileNumber",
          "maritalStatus",
          "nationality",
        ];
        break;

      case 2:
        fields = ["addressLine1", "city", "state", "zipCode"];
        break;
    }

    return await trigger(fields);
  };

  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    if (!isValid) return;

    markStepCompleted(currentStep);
    setCurrentStep((prev) => prev + 1);
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleFilePreview = (file: File | null | undefined, setter: any) => {
    if (!file) {
      setter(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setter(url);
  };

  const onSubmit = (data: any) => {
    console.log("Delivery AgentForm Data :", data);
  };

  return (
    <div className="w-full px-2 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-900">Add Delivery Agent</h1>
        <BackButton to="/delivery-boys/manage" />
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">
            Add Delivery Agent
          </h2>
          <span className="text-xs text-gray-500">
            Step {currentStep} of {TOTAL_STEPS}
          </span>
        </div>

        <div className="flex items-center justify-between">
          {Array.from({ length: TOTAL_STEPS }).map((_, index) => {
            const step = index + 1;
            const completed = completedSteps.includes(step);

            return (
              <div key={step} className="flex items-center flex-1">
                <button
                  type="button"
                  onClick={() => {
                    if (completedSteps.includes(step) || step === currentStep) {
                      setCurrentStep(step);
                    }
                  }}
                  disabled={step > currentStep && !completed}
                  className={`flex items-center gap-2 ${step <= currentStep || completed
                    ? "cursor-pointer"
                    : "cursor-not-allowed opacity-50"
                    }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors
                      ${step === currentStep
                        ? "bg-green-600 text-white"
                        : completed
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 text-gray-600"
                      }
                    `}
                  >
                    {completed ? <CheckCircle size={16} /> : step}
                  </div>

                  <span
                    className={`text-xs font-medium hidden sm:block ${step === currentStep
                      ? "text-green-600"
                      : completed
                        ? "text-green-500"
                        : "text-gray-500"
                      }`}
                  >
                    {step === 1 && "Personal Info"}
                    {step === 2 && "Address"}
                    {step === 3 && "Education Details"}
                    {step === 4 && "Documents"}
                    {step === 5 && "Bank Info"}
                  </span>
                </button>

                {step < TOTAL_STEPS && (
                  <div className="flex-1 h-0.5 mx-2 bg-gray-200">
                    <div
                      className={`h-full transition-all ${step < currentStep || completed
                        ? "bg-green-500 w-full"
                        : "w-0"
                        }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {currentStep === 1 && (
          <div className="max-w-4xl">
            <FormSectionWithDots title="Personal Information">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <Controller
                  name="fullName"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      label="Full Name"
                      required
                      type="text"
                      placeholder="Enter full name"
                      {...field}
                      error={errors.fullName?.message}
                    />
                  )}
                />

                {/* Sur Name */}
                <Controller
                  name="surName"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      label="Sur Name"
                      required
                      type="text"
                      placeholder="Enter surname"
                      {...field}
                      error={errors.surName?.message}
                    />
                  )}
                />

                {/* Father / Spouse Name */}
                <Controller
                  name="fatherOrSpouseName"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      label="Father's / Spouse Name"
                      required
                      type="text"
                      placeholder="Enter name"
                      {...field}
                      error={errors.fatherOrSpouseName?.message}
                    />
                  )}
                />

                {/* Email ID */}
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      label="Email ID"
                      required
                      type="email"
                      placeholder="Enter email address"
                      {...field}
                      error={errors.email?.message}
                    />
                  )}
                />

                {/* Date of Birth */}
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

                {/* Portal Type */}
                <Controller
                  name="role"
                  control={control}
                  defaultValue="DELIVERY_AGENT"
                  render={({ field }) => (
                    <SelectInput
                      label="Portal Type"
                      required
                      value={field.value || "DELIVERY_AGENT"}
                      onChange={field.onChange}
                      error={errors.role?.message}
                    >
                      <option value="DELIVERY_AGENT">Delivery Agent Portal</option>
                      <option value="VEHICLE_AGENT">VSMS Vehicle Agent Portal</option>
                      <option value="SHOPKEEPER">Shopkeeper Portal</option>
                      <option value="PACKING_OPERATOR">Packing Operator Portal</option>
                      <option value="QC_INSPECTOR">QC Inspector Portal</option>
                    </SelectInput>
                  )}
                />

                {/* Gender */}
                <Controller
                  name="gender"
                  control={control}
                  render={({ field }) => (
                    <SelectInput
                      label="Gender"
                      required
                      value={field.value || ""}
                      onChange={field.onChange}
                      error={errors.gender?.message}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </SelectInput>
                  )}
                />

                {/* Mobile Number */}
                <Controller
                  name="mobileNumber"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      label="Mobile Number"
                      required
                      type="tel"
                      onlyNumbers
                      maxLength={10}
                      placeholder="Enter mobile number"
                      {...field}
                      error={errors.mobileNumber?.message}
                    />
                  )}
                />

                {/* Alternate Mobile Number */}
                <Controller
                  name="alternateMobileNumber"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      label="Alternate Mobile Number"
                      type="tel"
                      onlyNumbers
                      maxLength={10}
                      placeholder="Enter alternate mobile number"
                      {...field}
                      error={errors.alternateMobileNumber?.message}
                    />
                  )}
                />

                {/* Marital Status */}
                <Controller
                  name="maritalStatus"
                  control={control}
                  render={({ field }) => (
                    <SelectInput
                      label="Marital Status"
                      required
                      value={field.value || ""}
                      onChange={field.onChange}
                      error={errors.maritalStatus?.message}
                    >
                      <option value="">Select Marital Status</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </SelectInput>
                  )}
                />

                {/* Nationality */}
                <Controller
                  name="nationality"
                  control={control}
                  render={({ field }) => (
                    <SelectInput
                      label="Nationality"
                      required
                      value={field.value || ""}
                      onChange={field.onChange}
                      error={errors.nationality?.message}
                    >
                      <option value="">Select Nationality</option>
                      <option value="Indian">Indian</option>
                      <option value="NRI">NRI</option>
                      <option value="Foreigner">Foreigner</option>
                    </SelectInput>
                  )}
                />
              </div>
            </FormSectionWithDots>
          </div>
        )}

        {currentStep === 2 && (
          <div className="max-w-4xl">
            <FormSectionWithDots title="Perminent Address">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller
                  name="permDoorNo"
                  control={control}
                  render={({ field }) => (
                    <TextInput label="Door No / Flat No" required {...field} />
                  )}
                />

                <Controller
                  name="permRoadNo"
                  control={control}
                  render={({ field }) => (
                    <TextInput label="Road No" required {...field} />
                  )}
                />

                <Controller
                  name="permColony"
                  control={control}
                  render={({ field }) => (
                    <TextInput label="Colony / Village" required {...field} />
                  )}
                />

                <Controller
                  name="permMandal"
                  control={control}
                  render={({ field }) => (
                    <TextInput label="Mandal" required {...field} />
                  )}
                />

                <Controller
                  name="permState"
                  control={control}
                  render={({ field }) => (
                    <SelectInput label="Select State" required {...field}>
                      <option value="">Select State</option>
                      <option value="Telangana">Telangana</option>
                      <option value="Andhra Pradesh">Andhra Pradesh</option>
                    </SelectInput>
                  )}
                />

                <Controller
                  name="permCity"
                  control={control}
                  render={({ field }) => (
                    <SelectInput label="Select City" required {...field}>
                      <option value="">Select City</option>
                      <option value="Hyderabad">Hyderabad</option>
                      <option value="Vijayawada">Vijayawada</option>
                    </SelectInput>
                  )}
                />

                <Controller
                  name="permPincode"
                  control={control}
                  render={({ field }) => (
                    <TextInput label="Pincode" required {...field} />
                  )}
                />
              </div>
            </FormSectionWithDots>

            <FormSectionWithDots title="Communication Address">
              {/* Same As Above Checkbox */}
              <div className="mb-4">
                <Controller
                  name="sameAsPermanent"
                  control={control}
                  render={({ field }) => (
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      <span className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!field.value}
                          onChange={field.onChange}
                          className="accent-green-600"
                        />
                        <span>Same as Above</span>
                      </span>
                    </label>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Door No */}
                <Controller
                  name="commDoorNo"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      label="Door No / Flat No"
                      {...field}
                      disabled={sameAsPermanent}
                    />
                  )}
                />

                {/* Road No */}
                <Controller
                  name="commRoadNo"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      label="Road No"
                      {...field}
                      disabled={sameAsPermanent}
                    />
                  )}
                />

                {/* Colony */}
                <Controller
                  name="commColony"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      label="Colony / Village"
                      {...field}
                      disabled={sameAsPermanent}
                    />
                  )}
                />

                {/* Mandal */}
                <Controller
                  name="commMandal"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      label="Mandal"
                      {...field}
                      disabled={sameAsPermanent}
                    />
                  )}
                />

                {/* State */}
                <Controller
                  name="commState"
                  control={control}
                  render={({ field }) => (
                    <SelectInput
                      label="Select State"
                      {...field}
                      disabled={sameAsPermanent}
                    >
                      <option value="">Select State</option>
                      <option value="Telangana">Telangana</option>
                      <option value="Andhra Pradesh">Andhra Pradesh</option>
                    </SelectInput>
                  )}
                />

                {/* City */}
                <Controller
                  name="commCity"
                  control={control}
                  render={({ field }) => (
                    <SelectInput
                      label="Select City"
                      {...field}
                      disabled={sameAsPermanent}
                    >
                      <option value="">Select City</option>
                      <option value="Hyderabad">Hyderabad</option>
                      <option value="Vijayawada">Vijayawada</option>
                    </SelectInput>
                  )}
                />

                {/* Pincode */}
                <Controller
                  name="commPincode"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      label="Pincode"
                      {...field}
                      disabled={sameAsPermanent}
                    />
                  )}
                />
              </div>
            </FormSectionWithDots>
          </div>
        )}

        {currentStep === 3 && (
          <div className="max-w-4xl">
            <FormSectionWithDots title="Education Details">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Education Qualification */}
                <Controller
                  name="educationQualification"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      label="Education Qualification"
                      required
                      placeholder="Eg: B.Tech, Degree, MBA"
                      {...field}
                    />
                  )}
                />

                {/* Institution / University */}
                <Controller
                  name="institution"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      label="Institution / University"
                      required
                      placeholder="Enter institution name"
                      {...field}
                    />
                  )}
                />

                {/* Year of Passing */}
                <Controller
                  name="yearOfPassing"
                  control={control}
                  render={({ field }) => (
                    <SelectInput label="Year of Passing" required {...field}>
                      <option value="">Select Year</option>
                      {Array.from({ length: 30 }).map((_, i) => {
                        const year = new Date().getFullYear() - i;
                        return (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        );
                      })}
                    </SelectInput>
                  )}
                />

                {/* CGPA / Percentage */}
                <Controller
                  name="marks"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      label="CGPA / Percentage / Marks"
                      required
                      placeholder="Eg: 8.2 CGPA / 75%"
                      {...field}
                    />
                  )}
                />
              </div>

              {/* Add Qualification */}
              <div className="mt-4">
                <Button type="button">+ Add Qualification</Button>
              </div>
            </FormSectionWithDots>

            <FormSectionWithDots title="Experience Details">
              {/* Work Experience Radio */}
              <Controller
                name="hasWorkExperience"
                control={control}
                render={({ field }) => (
                  <div className="mb-4">
                    <label className="block text-xs font-medium mb-2 text-gray-300 text-opacity-100">
                      Do you have work experience?
                    </label>
                    <div className="flex gap-6">
                      <RadioButton
                        label="Yes"
                        name="hasWorkExperience"
                        value="yes"
                        checked={field.value === "yes"}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                      <RadioButton
                        label="No"
                        name="hasWorkExperience"
                        value="no"
                        checked={field.value === "no"}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              />

              {/* Show only if YES */}
              {watch("hasWorkExperience") === "yes" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Organization */}
                  <Controller
                    name="organization"
                    control={control}
                    render={({ field }) => (
                      <TextInput label="Organization" required {...field} />
                    )}
                  />

                  {/* Designation */}
                  <Controller
                    name="designation"
                    control={control}
                    render={({ field }) => (
                      <TextInput label="Designation" required {...field} />
                    )}
                  />

                  {/* From */}
                  <Controller
                    name="fromYear"
                    control={control}
                    render={({ field }) => (
                      <SelectInput label="From" required {...field}>
                        <option value="">Select Year</option>
                        {Array.from({ length: 30 }).map((_, i) => {
                          const year = new Date().getFullYear() - i;
                          return (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          );
                        })}
                      </SelectInput>
                    )}
                  />

                  {/* To */}
                  <Controller
                    name="toYear"
                    control={control}
                    render={({ field }) => (
                      <SelectInput label="To" required {...field}>
                        <option value="">Select Year</option>
                        {Array.from({ length: 30 }).map((_, i) => {
                          const year = new Date().getFullYear() - i;
                          return (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          );
                        })}
                      </SelectInput>
                    )}
                  />

                  {/* Roles & Responsibilities */}
                  <div className="md:col-span-2">
                    <Controller
                      name="rolesAndResponsibilities"
                      control={control}
                      render={({ field }) => (
                        <TextInput
                          label="Roles & Responsibilities"
                          placeholder="Describe responsibilities"
                          {...field}
                        />
                      )}
                    />
                  </div>

                  {/* Add Experience */}
                  <div className="md:col-span-2">
                    <Button type="button">+ Add Another</Button>
                  </div>

                  {/* Upload Pay Slips */}
                  <div className="md:col-span-2">
                    <Controller
                      name="paySlips"
                      control={control}
                      render={({ field }) => (
                        <div>
                          <label className="block text-xs font-medium mb-2 text-gray-300 text-opacity-100">
                            Upload Last 6 Months Pay Slips
                          </label>

                          <div
                            className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              const file = e.dataTransfer.files[0];
                              field.onChange(file);
                              handleFilePreview(file, setPaySlipPreview);
                            }}
                          >
                            <input
                              type="file"
                              accept="application/pdf,image/*"
                              hidden
                              id="paySlips"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                field.onChange(file);
                                handleFilePreview(file, setPaySlipPreview);
                              }}
                            />

                            <label
                              htmlFor="paySlips"
                              className="cursor-pointer"
                            >
                              {paySlipPreview ? (
                                <p className="text-xs text-green-600">
                                  File selected successfully
                                </p>
                              ) : (
                                <>
                                  <Upload
                                    size={20}
                                    className="mx-auto mb-2 text-gray-400"
                                  />
                                  <p className="text-xs text-gray-500">
                                    Click or drag to upload pay slips
                                  </p>
                                </>
                              )}
                            </label>
                          </div>
                        </div>
                      )}
                    />
                  </div>
                </div>
              )}
            </FormSectionWithDots>
          </div>
        )}

        {currentStep === 4 && (
          <div className="max-w-4xl">
            <FormSectionWithDots title="Documents">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Aadhaar Card */}
                <div>
                  <Controller
                    name="aadhaarCard"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="block text-xs font-medium mb-2 text-gray-300">
                          Aadhaar Card
                        </label>

                        <div
                          className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files[0];
                            field.onChange(file);
                            handleFilePreview(file, setAadhaarPreview);
                          }}
                        >
                          <input
                            type="file"
                            accept="application/pdf,image/*"
                            hidden
                            id="aadhaarCard"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              field.onChange(file);
                              handleFilePreview(file, setAadhaarPreview);
                            }}
                          />

                          <label
                            htmlFor="aadhaarCard"
                            className="cursor-pointer"
                          >
                            {aadhaarPreview ? (
                              <p className="text-xs text-green-600">
                                File selected
                              </p>
                            ) : (
                              <>
                                <Upload
                                  size={20}
                                  className="mx-auto mb-2 text-gray-400"
                                />
                                <p className="text-xs text-gray-500">
                                  Upload Aadhaar Card
                                </p>
                              </>
                            )}
                          </label>
                        </div>
                      </div>
                    )}
                  />
                </div>

                {/* PAN Card */}
                <div>
                  <Controller
                    name="panCard"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="block text-xs font-medium mb-2 text-gray-300">
                          PAN Card
                        </label>

                        <div
                          className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files[0];
                            field.onChange(file);
                            handleFilePreview(file, setPanPreview);
                          }}
                        >
                          <input
                            type="file"
                            accept="application/pdf,image/*"
                            hidden
                            id="panCard"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              field.onChange(file);
                              handleFilePreview(file, setPanPreview);
                            }}
                          />

                          <label htmlFor="panCard" className="cursor-pointer">
                            {panPreview ? (
                              <p className="text-xs text-green-600">
                                File selected
                              </p>
                            ) : (
                              <>
                                <Upload
                                  size={20}
                                  className="mx-auto mb-2 text-gray-400"
                                />
                                <p className="text-xs text-gray-500">
                                  Upload PAN Card
                                </p>
                              </>
                            )}
                          </label>
                        </div>
                      </div>
                    )}
                  />
                </div>

                {/* Driving License */}
                <div>
                  <Controller
                    name="drivingLicense"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="block text-xs font-medium mb-2 text-gray-300">
                          Driving License
                        </label>

                        <div
                          className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files[0];
                            field.onChange(file);
                            handleFilePreview(file, setDrivingLicensePreview);
                          }}
                        >
                          <input
                            type="file"
                            accept="application/pdf,image/*"
                            hidden
                            id="drivingLicense"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              field.onChange(file);
                              handleFilePreview(file, setDrivingLicensePreview);
                            }}
                          />

                          <label
                            htmlFor="drivingLicense"
                            className="cursor-pointer"
                          >
                            {drivingLicensePreview ? (
                              <p className="text-xs text-green-600">
                                File selected
                              </p>
                            ) : (
                              <>
                                <Upload
                                  size={20}
                                  className="mx-auto mb-2 text-gray-400"
                                />
                                <p className="text-xs text-gray-500">
                                  Upload Driving License
                                </p>
                              </>
                            )}
                          </label>
                        </div>
                      </div>
                    )}
                  />
                </div>

                {/* Passport Size Photo */}
                <div>
                  <Controller
                    name="passportPhoto"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="block text-xs font-medium mb-2 text-gray-300">
                          Passport Size Photo
                        </label>

                        <div
                          className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files[0];
                            field.onChange(file);
                            handleFilePreview(file, setPassportPhotoPreview);
                          }}
                        >
                          <input
                            type="file"
                            accept="image/*"
                            hidden
                            id="passportPhoto"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              field.onChange(file);
                              handleFilePreview(file, setPassportPhotoPreview);
                            }}
                          />

                          <label
                            htmlFor="passportPhoto"
                            className="cursor-pointer"
                          >
                            {passportPhotoPreview ? (
                              <img
                                src={passportPhotoPreview}
                                alt="Preview"
                                className="w-20 h-20 object-cover rounded-full mx-auto"
                              />
                            ) : (
                              <>
                                <Upload
                                  size={20}
                                  className="mx-auto mb-2 text-gray-400"
                                />
                                <p className="text-xs text-gray-500">
                                  Upload Passport Size Photo
                                </p>
                              </>
                            )}
                          </label>
                        </div>
                      </div>
                    )}
                  />
                </div>
              </div>
            </FormSectionWithDots>
          </div>
        )}

        {currentStep === 5 && (
          <div className="max-w-4xl">
            <FormSectionWithDots title="Bank and Settlement Data">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Account Holder Name */}
                <Controller
                  name="accountHolderName"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      label="Account Holder Name"
                      required
                      placeholder="Enter account holder name"
                      {...field}
                    />
                  )}
                />

                {/* Bank Name */}
                <Controller
                  name="bankName"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      label="Bank Name"
                      required
                      placeholder="Enter bank name"
                      {...field}
                    />
                  )}
                />

                {/* Branch */}
                <Controller
                  name="branchName"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      label="Branch"
                      required
                      placeholder="Enter branch name"
                      {...field}
                    />
                  )}
                />

                {/* Bank Account Number */}
                <Controller
                  name="bankAccountNumber"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      label="Bank Account Number"
                      required
                      placeholder="Enter account number"
                      {...field}
                    />
                  )}
                />

                {/* IFSC Code */}
                <Controller
                  name="ifscCode"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      label="Bank IFSC Code"
                      required
                      placeholder="Enter IFSC code"
                      {...field}
                    />
                  )}
                />

                {/* UPI ID (Optional) */}
                <Controller
                  name="upiId"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      label="UPI ID (Optional)"
                      placeholder="example@upi"
                      {...field}
                    />
                  )}
                />

                {/* Cancelled Cheque / Passbook Upload */}
                <div className="md:col-span-2">
                  <Controller
                    name="cancelledCheque"
                    control={control}
                    render={({ field }) => (
                      <div>
                        <label className="block text-xs font-medium mb-2 text-gray-300">
                          Upload Cancelled Cheque / Bank Passbook Front Page
                        </label>

                        <div
                          className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files[0];
                            field.onChange(file);
                            handleFilePreview(file, setCancelledChequePreview);
                          }}
                        >
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            hidden
                            id="cancelledCheque"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              field.onChange(file);
                              handleFilePreview(
                                file,
                                setCancelledChequePreview,
                              );
                            }}
                          />

                          <label
                            htmlFor="cancelledCheque"
                            className="cursor-pointer"
                          >
                            {cancelledChequePreview ? (
                              <p className="text-xs text-green-600">
                                File selected successfully
                              </p>
                            ) : (
                              <>
                                <Upload
                                  size={20}
                                  className="mx-auto mb-2 text-gray-400"
                                />
                                <p className="text-xs text-gray-500">
                                  Click or drag to upload cancelled cheque /
                                  passbook
                                </p>
                              </>
                            )}
                          </label>
                        </div>
                      </div>
                    )}
                  />
                </div>
              </div>
            </FormSectionWithDots>
          </div>
        )}

        {/* NAVIGATION */}
        <div className="flex items-center justify-between mt-6 border-t pt-4">
          <div>
            {currentStep > 1 && (
              <Button onClick={handlePrevious}>
                <ChevronLeft size={14} /> Back
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {currentStep < TOTAL_STEPS ? (
              <PrimaryButton type="button" onClick={handleNext}>
                Save & Next <ChevronRight size={14} />
              </PrimaryButton>
            ) : (
              <PrimaryButton type="submit">Submit</PrimaryButton>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddDeliveryAgent;
