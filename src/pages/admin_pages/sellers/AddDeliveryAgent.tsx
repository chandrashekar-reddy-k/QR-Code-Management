import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, CheckCircle, ChevronRight, ChevronLeft, User, MapPin, GraduationCap, Briefcase, Upload, FileText, Trash2, CreditCard } from "lucide-react";
import { FormSection, TextInput, SelectInput } from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";

const AddDeliveryAgent = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const totalSteps = 5; // Will be updated as more steps are added
  const [sameAsAbove, setSameAsAbove] = useState(false);
  const [hasExperience, setHasExperience] = useState("no");
  const [isDragging, setIsDragging] = useState(false);
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);
  const [drivingLicenseFile, setDrivingLicenseFile] = useState<File | null>(null);
  const [passportPhotoFile, setPassportPhotoFile] = useState<File | null>(null);
  const [drivingLicensePreview, setDrivingLicensePreview] = useState<string | null>(null);
  const [passportPhotoPreview, setPassportPhotoPreview] = useState<string | null>(null);
  const [chequeFile, setChequeFile] = useState<File | null>(null);
  const [declaration1, setDeclaration1] = useState(false);
  const [declaration2, setDeclaration2] = useState(false);

  // Check if step is completed
  const isStepCompleted = (step: number): boolean => {
    return completedSteps.includes(step);
  };

  // Go to specific step
  const goToStep = (step: number) => {
    if (step <= currentStep || isStepCompleted(step)) {
      setCurrentStep(step);
    }
  };

  // Handle next step
  const handleNext = () => {
    setCompletedSteps([...completedSteps, currentStep]);
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // File upload handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent, field: string) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith("image/") || file.type === "application/pdf")) {
      handleFileSelect(file, field);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file, field);
    }
  };

  const handleFileSelect = (file: File, field: string) => {
    if (field === "aadhaar") {
      setAadhaarFile(file);
    } else if (field === "pan") {
      setPanFile(file);
    } else if (field === "drivingLicense") {
      setDrivingLicenseFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setDrivingLicensePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (field === "passportPhoto") {
      setPassportPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPassportPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (field === "cheque") {
      setChequeFile(file);
    }
  };

  const handleRemoveFile = (field: string) => {
    if (field === "aadhaar") {
      setAadhaarFile(null);
    } else if (field === "pan") {
      setPanFile(null);
    } else if (field === "drivingLicense") {
      setDrivingLicenseFile(null);
      setDrivingLicensePreview(null);
    } else if (field === "passportPhoto") {
      setPassportPhotoFile(null);
      setPassportPhotoPreview(null);
    } else if (field === "cheque") {
      setChequeFile(null);
    }
  };

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
          Add Delivery Agent
        </h1>
        <BackButton to="/delivery-boys/manage" />
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Add Delivery Agent Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
              Add Delivery Agent
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
                    {step === 1 && "Personal Info"}
                    {step === 2 && "Address Info"}
                    {step === 3 && "Education & Experience"}
                    {step === 4 && "Documents"}
                    {step === 5 && "Bank & Settlement"}
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

        <form className="space-y-6">
          {/* Step 1: Personal Information */}
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Row 1 */}
                  <TextInput
                    label="Full Name"
                    type="text"
                    placeholder="Enter Name"
                  />

                  <TextInput
                    label="Surname"
                    type="text"
                    placeholder="Enter Name"
                  />

                  <TextInput
                    label="Father's / Spouse Name"
                    type="text"
                    placeholder="Enter Email ID"
                  />

                  {/* Row 2 */}
                  <TextInput
                    label="EmailID"
                    type="email"
                    placeholder="Enter Email ID"
                  />

                  <TextInput
                    label="Date of Birth"
                    type="text"
                    placeholder="Date of birth"
                  />

                  <SelectInput label="Gender">
                    <option value="">Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </SelectInput>

                  {/* Row 3 */}
                  <TextInput
                    label="Mobile Number"
                    type="tel"
                    placeholder="Enter Mobile Number"
                  />

                  <TextInput
                    label="Alternate Mobile Number"
                    type="tel"
                    placeholder="Enter Email ID"
                  />

                  <SelectInput label="Marital Status">
                    <option value="">Select</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </SelectInput>

                  {/* Row 4 */}
                  <SelectInput label="Nationality">
                    <option value="">Select</option>
                    <option value="indian">Indian</option>
                    <option value="other">Other</option>
                  </SelectInput>
                </div>
              </FormSection>
            </div>
          )}

          {/* Step 2: Address Information */}
          {currentStep === 2 && (
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                <MapPin size={16} className="text-green-600 dark:text-green-400" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Step 2: Address Information
                </h3>
                {isStepCompleted(2) && (
                  <CheckCircle size={16} className="text-green-500 dark:text-green-400" />
                )}
              </div>

              {/* Permanent Address Section */}
              <div className="mb-6">
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Permanent Address
                  </h4>
                  <div className="mt-1 border-t border-dashed border-gray-300 dark:border-gray-600" />
                </div>
                <FormSection variant="white">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <TextInput
                      label="Door no./Flat No."
                      type="text"
                      placeholder="Enter Address"
                    />

                    <TextInput
                      label="Road No./Street"
                      type="text"
                      placeholder="Enter Address"
                    />

                    <TextInput
                      label="Colony/Village"
                      type="text"
                      placeholder="Enter Address"
                    />

                    <TextInput
                      label="Mandal"
                      type="text"
                      placeholder="Enter Address"
                    />

                    <SelectInput label="Select State">
                      <option value="">Select</option>
                      <option value="state1">State 1</option>
                      <option value="state2">State 2</option>
                    </SelectInput>

                    <SelectInput label="Select City">
                      <option value="">Select</option>
                      <option value="city1">City 1</option>
                      <option value="city2">City 2</option>
                    </SelectInput>

                    <TextInput
                      label="Pincode"
                      type="text"
                      placeholder="Enter Pincode"
                    />
                  </div>
                </FormSection>
              </div>

              {/* Communication Address Section */}
              <div>
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Communication Address
                  </h4>
                  <div className="mt-1 border-t border-dashed border-gray-300 dark:border-gray-600" />
                </div>
                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sameAsAbove}
                      onChange={(e) => setSameAsAbove(e.target.checked)}
                      className="w-4 h-4 text-gray-600 border-0 rounded focus:ring-gray-400 dark:bg-gray-700"
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300">
                      Same as Above
                    </span>
                  </label>
                </div>
                <FormSection variant="white">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <TextInput
                      label="Door no./Flat No."
                      type="text"
                      placeholder="Enter Address"
                      value={sameAsAbove ? "Filled" : ""}
                      onChange={() => {}}
                      disabled={sameAsAbove}
                    />

                    <TextInput
                      label="Road No./Street"
                      type="text"
                      placeholder="Enter Address"
                      value={sameAsAbove ? "Filled" : ""}
                      onChange={() => {}}
                      disabled={sameAsAbove}
                    />

                    <TextInput
                      label="Colony/Village"
                      type="text"
                      placeholder="Enter Address"
                      value={sameAsAbove ? "Filled" : ""}
                      onChange={() => {}}
                      disabled={sameAsAbove}
                    />

                    <TextInput
                      label="Mandal"
                      type="text"
                      placeholder="Enter Address"
                      value={sameAsAbove ? "Filled" : ""}
                      onChange={() => {}}
                      disabled={sameAsAbove}
                    />

                    <SelectInput label="Select State" value={sameAsAbove ? "filled" : ""} onChange={() => {}} disabled={sameAsAbove}>
                      <option value="">Select</option>
                      <option value="filled">Filled</option>
                    </SelectInput>

                    <SelectInput label="Select City" value={sameAsAbove ? "filled" : ""} onChange={() => {}} disabled={sameAsAbove}>
                      <option value="">Select</option>
                      <option value="filled">Filled</option>
                    </SelectInput>

                    <TextInput
                      label="Pincode"
                      type="text"
                      placeholder="Enter Pincode"
                      value={sameAsAbove ? "Filled" : ""}
                      onChange={() => {}}
                      disabled={sameAsAbove}
                    />
                  </div>
                </FormSection>
              </div>
            </div>
          )}

          {/* Step 3: Education & Experience */}
          {currentStep === 3 && (
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                <GraduationCap size={16} className="text-green-600 dark:text-green-400" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Step 3: Education & Experience
                </h3>
                {isStepCompleted(3) && (
                  <CheckCircle size={16} className="text-green-500 dark:text-green-400" />
                )}
              </div>

              {/* Education Details Section */}
              <div className="mb-6">
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Education Details
                  </h4>
                  <div className="mt-1 border-t border-dashed border-gray-300 dark:border-gray-600" />
                </div>
                <FormSection variant="white">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <TextInput
                      label="Education Qualification"
                      type="text"
                      placeholder="Enter Name"
                    />

                    <TextInput
                      label="Institution/University"
                      type="text"
                      placeholder="Enter Name"
                    />

                    <SelectInput label="Year of Passing">
                      <option value="">Select</option>
                      <option value="2024">2024</option>
                      <option value="2023">2023</option>
                      <option value="2022">2022</option>
                    </SelectInput>

                    <TextInput
                      label="CGPA/Percentage/Marks"
                      type="text"
                      placeholder="Enter Name"
                    />
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      className="text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
                    >
                      + Add Qualification
                    </button>
                  </div>
                </FormSection>
              </div>

              {/* Experience Details Section */}
              <div className="mb-6">
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Experience Details
                  </h4>
                  <div className="mt-1 border-t border-dashed border-gray-300 dark:border-gray-600" />
                </div>
                <FormSection variant="white">
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Do you have work experience?
                    </p>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="hasExperience"
                          value="yes"
                          checked={hasExperience === "yes"}
                          onChange={(e) => setHasExperience(e.target.value)}
                          className="w-4 h-4 text-green-600 border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700"
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300">Yes</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="hasExperience"
                          value="no"
                          checked={hasExperience === "no"}
                          onChange={(e) => setHasExperience(e.target.value)}
                          className="w-4 h-4 text-green-600 border-gray-300 dark:border-gray-600 focus:ring-green-500 dark:bg-gray-700"
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300">No</span>
                      </label>
                    </div>
                  </div>

                  {hasExperience === "yes" && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <TextInput
                          label="Organization"
                          type="text"
                          placeholder="Enter Name"
                        />

                        <TextInput
                          label="Designation"
                          type="text"
                          placeholder="Enter Name"
                        />

                        <TextInput
                          label="From"
                          type="text"
                          placeholder="From"
                        />

                        <TextInput
                          label="To"
                          type="text"
                          placeholder="To"
                        />

                        <div className="md:col-span-4">
                          <TextInput
                            label="Roles and responsibilities"
                            type="text"
                            placeholder="Enter Name"
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <button
                          type="button"
                          className="text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
                        >
                          + Add Another
                        </button>
                      </div>
                    </>
                  )}
                </FormSection>
              </div>

              {/* Upload Pay Slips Section */}
              <div>
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Upload last 6 months pay slips
                  </h4>
                </div>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors ${
                    isDragging
                      ? "border-gray-400 dark:border-gray-500 bg-gray-50 dark:bg-gray-700"
                      : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept=".png,.jpeg,.jpg,.pdf"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    id="paySlips-upload"
                  />
                  <label htmlFor="paySlips-upload" className="cursor-pointer block">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-600 rounded-full flex items-center justify-center mb-3">
                        <Upload size={24} className="text-white" />
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">
                        Drag and Drop or Choose file to upload
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                        supported formats PNG, JPEG, PDF
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Documents */}
          {currentStep === 4 && (
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                <FileText size={16} className="text-green-600 dark:text-green-400" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Step 4: Documents
                </h3>
                {isStepCompleted(4) && (
                  <CheckCircle size={16} className="text-green-500 dark:text-green-400" />
                )}
              </div>

              {/* Documents Section */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Documents
                </h4>
                <div className="mt-1 border-t border-dashed border-gray-300 dark:border-gray-600 mb-6" />
              </div>

              <div className="space-y-6">
                {/* Aadhaar Card */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Aadhaar Card
                  </label>
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex-1 border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors ${
                        isDragging
                          ? "border-gray-400 dark:border-gray-500 bg-gray-50 dark:bg-gray-700"
                          : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, "aadhaar")}
                    >
                      <input
                        type="file"
                        accept=".png,.jpeg,.jpg,.pdf"
                        onChange={(e) => handleFileChange(e, "aadhaar")}
                        className="hidden"
                        id="aadhaar-upload"
                      />
                      <label htmlFor="aadhaar-upload" className="cursor-pointer block">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-600 rounded-full flex items-center justify-center mb-3">
                            <Upload size={24} className="text-white" />
                          </div>
                          <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">
                            Drag and Drop or Choose file to upload
                          </p>
                          <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                            supported formats PNG, JPEG, PDF
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Pan Card */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pan Card
                  </label>
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex-1 border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors ${
                        isDragging
                          ? "border-gray-400 dark:border-gray-500 bg-gray-50 dark:bg-gray-700"
                          : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, "pan")}
                    >
                      <input
                        type="file"
                        accept=".png,.jpeg,.jpg,.pdf"
                        onChange={(e) => handleFileChange(e, "pan")}
                        className="hidden"
                        id="pan-upload"
                      />
                      <label htmlFor="pan-upload" className="cursor-pointer block">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-600 rounded-full flex items-center justify-center mb-3">
                            <Upload size={24} className="text-white" />
                          </div>
                          <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">
                            Drag and Drop or Choose file to upload
                          </p>
                          <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                            supported formats PNG, JPEG, PDF
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Driving License */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Driving License
                  </label>
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex-1 border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors ${
                        isDragging
                          ? "border-gray-400 dark:border-gray-500 bg-gray-50 dark:bg-gray-700"
                          : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, "drivingLicense")}
                    >
                      <input
                        type="file"
                        accept=".png,.jpeg,.jpg,.pdf"
                        onChange={(e) => handleFileChange(e, "drivingLicense")}
                        className="hidden"
                        id="drivingLicense-upload"
                      />
                      <label htmlFor="drivingLicense-upload" className="cursor-pointer block">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-600 rounded-full flex items-center justify-center mb-3">
                            <Upload size={24} className="text-white" />
                          </div>
                          <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">
                            Drag and Drop or Choose file to upload
                          </p>
                          <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                            supported formats PNG, JPEG, PDF
                          </p>
                        </div>
                      </label>
                    </div>
                    {drivingLicensePreview && (
                      <div className="relative w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 flex items-center justify-center">
                        <img
                          src={drivingLicensePreview}
                          alt="Driving License Preview"
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveFile("drivingLicense")}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload Passport size Photo */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Upload Passport size Photo
                  </label>
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex-1 border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors ${
                        isDragging
                          ? "border-gray-400 dark:border-gray-500 bg-gray-50 dark:bg-gray-700"
                          : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, "passportPhoto")}
                    >
                      <input
                        type="file"
                        accept=".png,.jpeg,.jpg,.pdf"
                        onChange={(e) => handleFileChange(e, "passportPhoto")}
                        className="hidden"
                        id="passportPhoto-upload"
                      />
                      <label htmlFor="passportPhoto-upload" className="cursor-pointer block">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-600 rounded-full flex items-center justify-center mb-3">
                            <Upload size={24} className="text-white" />
                          </div>
                          <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">
                            Drag and Drop or Choose file to upload
                          </p>
                          <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                            supported formats PNG, JPEG, PDF
                          </p>
                        </div>
                      </label>
                    </div>
                    {passportPhotoPreview && (
                      <div className="relative w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 flex items-center justify-center">
                        <img
                          src={passportPhotoPreview}
                          alt="Passport Photo Preview"
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveFile("passportPhoto")}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Bank and Settlement Data */}
          {currentStep === 5 && (
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                <CreditCard size={16} className="text-green-600 dark:text-green-400" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Step 5: Bank and settlement Data
                </h3>
                {isStepCompleted(5) && (
                  <CheckCircle size={16} className="text-green-500 dark:text-green-400" />
                )}
              </div>

              <FormSection variant="white">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Row 1 */}
                  <TextInput
                    label="Account Holder Name"
                    type="text"
                    placeholder="Enter Account Holder Name"
                  />

                  <TextInput
                    label="Bank Name"
                    type="text"
                    placeholder="Enter Name"
                  />

                  <TextInput
                    label="Branch Name"
                    type="text"
                    placeholder="Enter Name"
                  />

                  {/* Row 2 */}
                  <TextInput
                    label="Bank Account Number"
                    type="text"
                    placeholder="Enter Account Number"
                  />

                  <TextInput
                    label="Bank IFSC Code"
                    type="text"
                    placeholder="Enter IFSC Code"
                  />

                  <TextInput
                    label="UPI ID (Optional)"
                    type="text"
                    placeholder="Enter IFSC Code"
                  />
                </div>
              </FormSection>

              {/* Cancelled Cheque Upload Section */}
              <div className="mt-6">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cancelled Cheque or Bank Passbook Front Page Upload
                </label>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors ${
                    isDragging
                      ? "border-gray-400 dark:border-gray-500 bg-gray-50 dark:bg-gray-700"
                      : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, "cheque")}
                >
                  <input
                    type="file"
                    accept=".png,.jpeg,.jpg,.pdf"
                    onChange={(e) => handleFileChange(e, "cheque")}
                    className="hidden"
                    id="cheque-upload"
                  />
                  <label htmlFor="cheque-upload" className="cursor-pointer block">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-600 rounded-full flex items-center justify-center mb-3">
                        <Upload size={24} className="text-white" />
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">
                        Drag and Drop or Choose file to upload
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                        supported formats PNG, JPEG, PDF
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Declaration Checkboxes */}
              <div className="mt-6 space-y-3">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={declaration1}
                    onChange={(e) => setDeclaration1(e.target.checked)}
                    className="w-4 h-4 text-green-600 border-gray-300 dark:border-gray-600 rounded focus:ring-green-500 dark:bg-gray-700 mt-0.5"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    I hereby declare that all the information provided above is true and correct.
                  </span>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={declaration2}
                    onChange={(e) => setDeclaration2(e.target.checked)}
                    className="w-4 h-4 text-green-600 border-gray-300 dark:border-gray-600 rounded focus:ring-green-500 dark:bg-gray-700 mt-0.5"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    I authorize VillagKart to verify my KYC, and banking details.
                  </span>
                </label>
              </div>
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
                onClick={() => navigate("/delivery-agents/manage")}
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
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
                >
                  Create Delivery Agent
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDeliveryAgent;

