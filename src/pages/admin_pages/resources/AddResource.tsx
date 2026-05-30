import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle, Upload as UploadIcon } from "lucide-react";

import { TextInput, SelectInput, PrimaryButton } from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";

type AddResourceFormValues = {
  resourceName: string;
  resourceCategory: string;
  resourceType: string;
  resourceCode: string;
  purchaseDate: string;
  warrantyPeriod: string;
  purchaseCost: string;
  assignedTo: string;
  supplierName: string;
  supplierMobile: string;
  doorNo: string;
  colony: string;
  landmark: string;
  road: string;
  district: string;
  mandal: string;
  state: string;
  city: string;
  lastServiceDate: string;
  maintenanceNotes: string;
};

const TOTAL_STEPS = 3;

const AddResource: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = !!id;
  const [currentStep, setCurrentStep] = useState(1);
  const [isDragging, setIsDragging] = useState(false);

  const { register, handleSubmit } = useForm<AddResourceFormValues>({
    mode: "onChange",
    defaultValues: {
      resourceName: "",
      resourceCategory: "",
      resourceType: "",
      resourceCode: "",
      purchaseDate: "",
      warrantyPeriod: "",
      purchaseCost: "",
      assignedTo: "",
      supplierName: "",
      supplierMobile: "",
      doorNo: "",
      colony: "",
      landmark: "",
      road: "",
      district: "",
      mandal: "",
      state: "",
      city: "",
      lastServiceDate: "",
      maintenanceNotes: "",
    },
  });

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const onSubmit = (values: AddResourceFormValues) => {
    // For now just log and go back to list – hook into API later
    console.log("New resource:", values);
    navigate("/resource-management");
  };

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
          {isEditMode ? "Edit Resource" : "Add Resource"}
        </h1>
        <BackButton to="/resource-management" />
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
              {isEditMode ? "Edit Resource" : "Add Resource"}
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Step {currentStep} of {TOTAL_STEPS}
            </span>
          </div>
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((step) => {
              const isCompleted = step < currentStep;
              const isActive = step === currentStep;

              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                        isActive
                          ? "bg-green-600 text-white"
                          : isCompleted
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle size={16} className="text-white" />
                      ) : (
                        step
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium hidden sm:block ${
                        isActive || isCompleted
                          ? "text-green-600 dark:text-green-400"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {step === 1 && "Basic Details"}
                      {step === 2 && "Assignment Details"}
                      {step === 3 && "Supplier & Documents"}
                    </span>
                  </div>
                  {step < TOTAL_STEPS && (
                    <div className="flex-1 h-0.5 mx-2 bg-gray-200 dark:bg-gray-700">
                      <div
                        className={`h-full transition-all ${
                          step < currentStep
                            ? "bg-green-500"
                            : "bg-gray-200 dark:bg-gray-700"
                        }`}
                        style={{
                          width: step < currentStep ? "100%" : "0%",
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <form className="space-y-6">
          {/* Step 1: Basic Details */}
          {currentStep === 1 && (
            <div>
              <div className="mb-6 flex items-center">
                <h2 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200 mr-4">
                  Basic Details
                </h2>
                <div className="flex-1 border-t border-dashed border-gray-300 dark:border-gray-700" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Resource Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Resource Name
                  </label>
                  <TextInput
                    placeholder="Enter"
                    {...register("resourceName")}
                  />
                </div>

                {/* Resource Category */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Resource Category
                  </label>
                  <SelectInput
                    {...register("resourceCategory")}
                    options={[
                      { value: "", label: "Select" },
                      { value: "Electronics", label: "Electronics" },
                      { value: "Equipment", label: "Equipment" },
                      { value: "Furniture", label: "Furniture" },
                    ]}
                  />
                </div>

                {/* Resource Type */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Resource Type
                  </label>
                  <SelectInput
                    {...register("resourceType")}
                    options={[
                      { value: "", label: "Select" },
                      { value: "Billing Device", label: "Billing Device" },
                      { value: "Scanner", label: "Scanner" },
                      { value: "Rack", label: "Rack" },
                    ]}
                  />
                </div>

                {/* Resource Code */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Resource Code
                  </label>
                  <TextInput
                    placeholder="Enter"
                    {...register("resourceCode")}
                  />
                </div>

                {/* Purchase date */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Purchase date
                  </label>
                  <TextInput
                    type="date"
                    {...register("purchaseDate")}
                  />
                </div>

                {/* Warranty Period */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Warranty Period
                  </label>
                  <TextInput
                    placeholder="Enter"
                    {...register("warrantyPeriod")}
                  />
                </div>

                {/* Purchase Cost */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Purchase Cost (₹)
                  </label>
                  <TextInput
                    placeholder="Enter"
                    type="number"
                    {...register("purchaseCost")}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Locations and assignment */}
          {currentStep === 2 && (
            <div>
              <div className="mb-6 flex items-center">
                <h2 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200 mr-4">
                  Locations and assignmnet
                </h2>
                <div className="flex-1 border-t border-dashed border-gray-300 dark:border-gray-700" />
              </div>

              <div className="max-w-xs">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Assigned to
                </label>
                <SelectInput
                  {...register("assignedTo")}
                  options={[
                    { value: "", label: "Select" },
                    { value: "Warehouse 1", label: "Warehouse 1" },
                    { value: "Head office", label: "Head office" },
                  ]}
                />
              </div>
            </div>
          )}

          {/* Step 3: Supplier / Documents */}
          {currentStep === 3 && (
            <div>
              <div className="mb-6 flex items-center">
                <h2 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200 mr-4">
                  Supplier Details
                </h2>
                <div className="flex-1 border-t border-dashed border-gray-300 dark:border-gray-700" />
              </div>

              {/* Supplier Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {/* Supplier Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Supplier Name
                  </label>
                  <TextInput
                    placeholder="Enter"
                    {...register("supplierName")}
                  />
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Mobile Number
                  </label>
                  <TextInput
                    placeholder="Enter Mobile Number"
                    type="tel"
                    {...register("supplierMobile")}
                  />
                </div>

                {/* Door no./Flat No. */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Door no./Flat No.
                  </label>
                  <TextInput
                    placeholder="Enter Address"
                    {...register("doorNo")}
                  />
                </div>

                {/* Colony/Village */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Colony/Village
                  </label>
                  <TextInput
                    placeholder="Enter Address"
                    {...register("colony")}
                  />
                </div>

                {/* Landmark */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Landmark
                  </label>
                  <TextInput
                    placeholder="Enter Address"
                    {...register("landmark")}
                  />
                </div>

                {/* Road No./Street */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Road No./Street
                  </label>
                  <TextInput
                    placeholder="Enter Address"
                    {...register("road")}
                  />
                </div>

                {/* Select District */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Select District
                  </label>
                  <SelectInput
                    {...register("district")}
                    options={[
                      { value: "", label: "Option 1" },
                    ]}
                  />
                </div>

                {/* Select Mandal/Thaluk */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Select Mandal/Thaluk
                  </label>
                  <SelectInput
                    {...register("mandal")}
                    options={[
                      { value: "", label: "Option 1" },
                    ]}
                  />
                </div>

                {/* Select State */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Select State
                  </label>
                  <SelectInput
                    {...register("state")}
                    options={[
                      { value: "", label: "Option 1" },
                    ]}
                  />
                </div>

                {/* Select City */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Select City
                  </label>
                  <SelectInput
                    {...register("city")}
                    options={[
                      { value: "", label: "Option 1" },
                    ]}
                  />
                </div>
              </div>

              {/* Maintenance Details */}
              <div className="mb-6 flex items-center">
                <h2 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200 mr-4">
                  Maintainance Details
                </h2>
                <div className="flex-1 border-t border-dashed border-gray-300 dark:border-gray-700" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {/* Last Service Date */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Last Service Date
                  </label>
                  <TextInput
                    type="date"
                    {...register("lastServiceDate")}
                  />
                </div>

                {/* Maintenance Notes */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Maintenance Notes
                  </label>
                  <TextInput
                    placeholder="Enter"
                    {...register("maintenanceNotes")}
                  />
                </div>
              </div>

              {/* Documents Section */}
              <div className="mb-6 flex items-center">
                <h2 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200 mr-4">
                  Documents
                </h2>
                <div className="flex-1 border-t border-dashed border-gray-300 dark:border-gray-700" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Resource Image */}
                <div>
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 mb-2">
                    Resource Image
                  </p>
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors ${
                      isDragging
                        ? "border-gray-400 dark:border-gray-500 bg-gray-50 dark:bg-gray-700"
                        : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500"
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                    }}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-600 rounded-full flex items-center justify-center mb-3">
                        <UploadIcon size={24} className="text-white" />
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">
                        Drag and Drop or Choose file to upload
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                        supported formats PNG, JPEG, PDF
                      </p>
                    </div>
                  </div>
                </div>

                {/* Warranty */}
                <div>
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 mb-2">
                    Warranty
                  </p>
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors ${
                      isDragging
                        ? "border-gray-400 dark:border-gray-500 bg-gray-50 dark:bg-gray-700"
                        : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500"
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                    }}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-600 rounded-full flex items-center justify-center mb-3">
                        <UploadIcon size={24} className="text-white" />
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">
                        Drag and Drop or Choose file to upload
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                        supported formats PNG, JPEG, PDF
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bill Copy - full width */}
                <div className="md:col-span-2">
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 mb-2">
                    Bill Copy
                  </p>
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors ${
                      isDragging
                        ? "border-gray-400 dark:border-gray-500 bg-gray-50 dark:bg-gray-700"
                        : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500"
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                    }}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-600 rounded-full flex items-center justify-center mb-3">
                        <UploadIcon size={24} className="text-white" />
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">
                        Drag and Drop or Choose file to upload
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                        supported formats PNG, JPEG, PDF
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1}
              className={`px-5 h-10 rounded-lg border text-xs sm:text-sm font-medium ${
                currentStep === 1
                  ? "border-gray-300 text-gray-400 cursor-not-allowed bg-gray-100"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              Back
            </button>

            <div>
              {currentStep < TOTAL_STEPS ? (
                <PrimaryButton
                  type="button"
                  onClick={handleNext}
                  className="px-6 h-10 bg-green-600 hover:bg-green-700 text-xs sm:text-sm"
                >
                  Save &amp; Next
                </PrimaryButton>
              ) : (
                <PrimaryButton
                  type="button"
                  onClick={handleSubmit(onSubmit)}
                  className="px-6 h-10 bg-green-600 hover:bg-green-700 text-xs sm:text-sm"
                >
                  Save
                </PrimaryButton>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddResource;

