import { Upload, X } from "lucide-react";
import { TextInput } from "../../../../../components/ui";

interface StoreSettingTabProps {
  formData: {
    appName: string;
    supportNumber: string;
    supportEmail: string;
    logo: File | null;
    fssaiLicImage: File | null;
    panelLoginBackgroundImage: File | null;
    copyrightDetails: string;
  };
  logoPreview: string | null;
  fssaiPreview: string | null;
  backgroundPreview: string | null;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>, field: string) => void;
  onRemoveImage: (field: string) => void;
}

const StoreSettingTab = ({
  formData,
  logoPreview,
  fssaiPreview,
  backgroundPreview,
  onChange,
  onFileChange,
  onRemoveImage,
}: StoreSettingTabProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* App Name */}
      <div>
        <TextInput
          label="App Name"
          name="appName"
          value={formData.appName}
          onChange={onChange}
        />
      </div>

      {/* Support Number */}
      <div>
        <TextInput
          label="Support Number"
          name="supportNumber"
          value={formData.supportNumber}
          onChange={onChange}
        />
      </div>

      {/* Support Email */}
      <div>
        <TextInput
          label="Support Email"
          type="email"
          name="supportEmail"
          value={formData.supportEmail}
          onChange={onChange}
        />
      </div>

      {/* Logo */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Logo
        </label>
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center bg-gray-50">
          {logoPreview ? (
            <div className="relative">
              <img
                src={logoPreview}
                alt="Logo preview"
                className="max-h-32 mx-auto rounded"
              />
              <button
                type="button"
                onClick={() => onRemoveImage("logo")}
                className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div>
              <Upload
                size={24}
                className="mx-auto text-gray-400 mb-2"
              />
              <p className="text-xs text-gray-600 mb-2">
                Drop Files here or click to upload
              </p>
              <label className="cursor-pointer">
                <span className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 inline-block text-xs font-medium transition-colors">
                  Store Logo
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onFileChange(e, "logo")}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* FSSAI Lic Image */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Fssai Lic Image
        </label>
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center bg-gray-50">
          {fssaiPreview ? (
            <div className="relative">
              <img
                src={fssaiPreview}
                alt="FSSAI preview"
                className="max-h-32 mx-auto rounded"
              />
              <button
                type="button"
                onClick={() => onRemoveImage("fssaiLicImage")}
                className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div>
              <Upload
                size={24}
                className="mx-auto text-gray-400 mb-2"
              />
              <p className="text-xs text-gray-600 mb-2">
                Drop Files here or click to upload
              </p>
              <label className="cursor-pointer">
                <span className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 inline-block text-xs font-medium transition-colors">
                  Fssai Lic Image
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onFileChange(e, "fssaiLicImage")}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Panel Login Background Image */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Panel Login Background Image
        </label>
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center bg-gray-50">
          {backgroundPreview ? (
            <div className="relative">
              <img
                src={backgroundPreview}
                alt="Background preview"
                className="max-h-32 mx-auto rounded"
              />
              <button
                type="button"
                onClick={() => onRemoveImage("panelLoginBackgroundImage")}
                className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div>
              <Upload
                size={24}
                className="mx-auto text-gray-400 mb-2"
              />
              <p className="text-xs text-gray-600 mb-2">
                Drop Files here or click to upload
              </p>
              <label className="cursor-pointer">
                <span className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 inline-block text-xs font-medium transition-colors">
                  panel_login_background_img
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onFileChange(e, "panelLoginBackgroundImage")}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Copyright Details */}
      <div className="md:col-span-2">
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Copyright Details
        </label>
        <textarea
          name="copyrightDetails"
          value={formData.copyrightDetails}
          onChange={onChange}
          rows={4}
          className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 resize-none bg-white text-gray-900"
          placeholder="Enter copyright details"
        />
      </div>
    </div>
  );
};

export default StoreSettingTab;
