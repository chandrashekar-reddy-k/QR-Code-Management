import { useState } from 'react';
import { Save, Upload, X } from 'lucide-react';
import { FormSectionWithDots, TextInput, Button, PrimaryButton } from '../../../components/ui';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import BackButton from '../../../components/common/BackButton';

const GeneralWebSettings = () => {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    siteTitle: 'Villag Kart',
    websiteUrl: 'https://uatweb.villagkart.com',
    metaTitle: 'Grocery',
    metaDescription: 'Grocery',
    websiteMaintenanceMode: false,
    webLogo: null as File | null,
    faviconIcon: null as File | null,
    placeholderImage: null as File | null,
    color: '#00891D',
    lightColor: '#ee8d2b',
    appTitle: '',
    shortDescriptions: '',
    androidApp: false,
    androidAppUrl: 'https://play.google.com/store/apps/details?id=com.google.android.gm',
    androidPlayStoreLogo: null as File | null,
    iosApp: false,
    iosAppUrl: 'https://play.google.com/store/apps/details?id=com.google.android.gm',
    iosStoreLogo: null as File | null,
  });

  const [previewImages, setPreviewImages] = useState({
    webLogo: null as string | null,
    faviconIcon: null as string | null,
    placeholderImage: null as string | null,
    androidPlayStoreLogo: null as string | null,
    iosStoreLogo: null as string | null,
  });

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (field: string, file: File | null) => {
    setFormData((prev) => ({ ...prev, [field]: file }));
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImages((prev) => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewImages((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent, field: string) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileChange(field, file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    alert('General Web Settings updated successfully!');
    setSaving(false);
  };

  const renderFileUpload = (
    field: string,
    label: string,
    previewKey: keyof typeof previewImages,
    required: boolean = false
  ) => (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, field)}
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer bg-gray-50"
      >
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleFileChange(field, e.target.files?.[0] || null)}
          className="hidden"
          id={field}
          required={required}
        />
        <label htmlFor={field} className="cursor-pointer block">
          {previewImages[previewKey] ? (
            <div className="space-y-2 relative">
              <img
                src={previewImages[previewKey]!}
                alt={label}
                className="mx-auto max-w-xs max-h-48 object-contain rounded-lg shadow-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleFileChange(field, null);
                  const input = document.getElementById(field) as HTMLInputElement;
                  if (input) input.value = '';
                }}
                className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              >
                <X size={14} />
              </Button>
              <p className="text-xs text-gray-600">Click to change image</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload size={24} className="mx-auto text-gray-400" />
              <p className="text-xs text-gray-600">Drop files here or click to upload</p>
            </div>
          )}
        </label>
      </div>
    </div>
  );

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          General Web Settings
        </h1>
        <BackButton to="/web-settings" />
      </div>
      
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
        <div className="max-w-4xl">
          {/* Header Settings Section */}
          <FormSectionWithDots title="Header Settings">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput
              label="Site Title"
              required
              type="text"
              value={formData.siteTitle}
              onChange={(e) => handleChange('siteTitle', e.target.value)}
            />

            <TextInput
              label="Website URL"
              required
              type="url"
              value={formData.websiteUrl}
              onChange={(e) => handleChange('websiteUrl', e.target.value)}
            />

            <TextInput
              label="Meta Title"
              required
              type="text"
              value={formData.metaTitle}
              onChange={(e) => handleChange('metaTitle', e.target.value)}
            />

            <TextInput
              label="Meta Description"
              required
              type="text"
              value={formData.metaDescription}
              onChange={(e) => handleChange('metaDescription', e.target.value)}
            />
          </div>

          <div className="bg-gray-50 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700">
                Website Maintenance Mode
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.websiteMaintenanceMode}
                  onChange={(e) => handleChange('websiteMaintenanceMode', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 dark:peer-focus:ring-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-gray-300 dark:after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-600 dark:peer-checked:bg-gray-400"></div>
              </label>
            </div>
          </div>
          </FormSectionWithDots>

          {/* Media & Assets Section */}
          <FormSectionWithDots title="Media & Assets">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderFileUpload('webLogo', 'Web Logo', 'webLogo', true)}
            {renderFileUpload('faviconIcon', 'Favicon Icon', 'faviconIcon', true)}
            {renderFileUpload('placeholderImage', 'Placeholder Image', 'placeholderImage', true)}
          </div>
          </FormSectionWithDots>

          {/* Color Settings Section */}
          <FormSectionWithDots title="Color Settings">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Color <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => handleChange('color', e.target.value)}
                  className="w-16 h-10 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-white"
                />
                <TextInput
                  type="text"
                  value={formData.color}
                  onChange={(e) => handleChange('color', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Light Color <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.lightColor}
                  onChange={(e) => handleChange('lightColor', e.target.value)}
                  className="w-16 h-10 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-white"
                />
                <TextInput
                  type="text"
                  value={formData.lightColor}
                  onChange={(e) => handleChange('lightColor', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          </FormSectionWithDots>

          {/* App Download Section */}
          <FormSectionWithDots title="App Download Section">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput
              label="App Title"
              type="text"
              value={formData.appTitle}
              onChange={(e) => handleChange('appTitle', e.target.value)}
              placeholder="Enter App Title"
            />

            <TextInput
              label="Short Descriptions"
              type="text"
              value={formData.shortDescriptions}
              onChange={(e) => handleChange('shortDescriptions', e.target.value)}
              placeholder="Enter App Short Description Here!"
            />
          </div>

          <div className="space-y-4 mt-4">
            {/* Android App Section */}
            <div className="bg-gray-50 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <label className="text-xs font-medium text-gray-700">
                  Android App <span className="text-red-500">*</span>
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.androidApp}
                    onChange={(e) => handleChange('androidApp', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 dark:peer-focus:ring-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-gray-300 dark:after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-600 dark:peer-checked:bg-gray-400"></div>
                </label>
              </div>
              {formData.androidApp && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextInput
                    label="Android Application's URL"
                    required={formData.androidApp}
                    type="url"
                    value={formData.androidAppUrl}
                    onChange={(e) => handleChange('androidAppUrl', e.target.value)}
                  />
                  <div>
                    {renderFileUpload('androidPlayStoreLogo', 'Android Play Store Logo', 'androidPlayStoreLogo', formData.androidApp)}
                  </div>
                </div>
              )}
            </div>

            {/* iOS App Section */}
            <div className="bg-gray-50 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <label className="text-xs font-medium text-gray-700">
                  iOS App <span className="text-red-500">*</span>
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.iosApp}
                    onChange={(e) => handleChange('iosApp', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 dark:peer-focus:ring-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-gray-300 dark:after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-600 dark:peer-checked:bg-gray-400"></div>
                </label>
              </div>
              {formData.iosApp && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextInput
                    label="iOS Application's URL"
                    required={formData.iosApp}
                    type="url"
                    value={formData.iosAppUrl}
                    onChange={(e) => handleChange('iosAppUrl', e.target.value)}
                  />
                  <div>
                    {renderFileUpload('iosStoreLogo', 'iOS Store Logo', 'iosStoreLogo', formData.iosApp)}
                  </div>
                </div>
              )}
            </div>
          </div>
          </FormSectionWithDots>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <PrimaryButton
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium"
            >
              <Save size={14} />
              <span>{saving ? 'Updating...' : 'Update Settings'}</span>
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
};

export default GeneralWebSettings;

