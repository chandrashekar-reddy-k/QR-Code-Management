import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X } from 'lucide-react';
import { PrimaryButton, Button, TextInput, SelectInput, FormSectionWithDots } from '../../../../components/ui';
import Breadcrumbs from '../../../../components/common/Breadcrumbs';
import BackButton from '../../../../components/common/BackButton';
import { useGetAttributeById, useUpdateAttribute } from '../../../../hooks/attribute';

interface Attribute {
  id: number;
  name: string;
  type: 'text' | 'select' | 'multiselect' | 'number' | 'boolean' | 'date';
  values: string[];
  isRequired: boolean;
  isFilterable: boolean;
  isSearchable: boolean;
  displayOrder: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

interface AttributeFormData {
  name: string;
  type: 'text' | 'select' | 'multiselect' | 'number' | 'boolean' | 'date';
  values: string[];
  valueInput: string;
  isRequired: boolean;
  isFilterable: boolean;
  isSearchable: boolean;
  displayOrder: number;
  status: 'active' | 'inactive';
}

// Mock data - in real app, this would come from API
const mockAttributes: Attribute[] = [
  {
    id: 123,
    name: 'Size',
    type: 'select',
    values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    isRequired: true,
    isFilterable: true,
    isSearchable: false,
    displayOrder: 1,
    status: 'inactive',
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  },
  {
    id: 2,
    name: 'Color',
    type: 'select',
    values: ['Red', 'Blue', 'Green', 'Yellow', 'Black', 'White', 'Gray', 'Pink', 'Orange', 'Purple'],
    isRequired: true,
    isFilterable: true,
    isSearchable: false,
    displayOrder: 2,
    status: 'active',
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  },
  {
    id: 3,
    name: 'Material',
    type: 'select',
    values: ['Cotton', 'Polyester', 'Silk', 'Wool', 'Leather', 'Denim', 'Linen', 'Nylon'],
    isRequired: false,
    isFilterable: true,
    isSearchable: true,
    displayOrder: 3,
    status: 'active',
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  },
  {
    id: 4,
    name: 'Weight',
    type: 'number',
    values: [],
    isRequired: false,
    isFilterable: true,
    isSearchable: false,
    displayOrder: 4,
    status: 'active',
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  },
  {
    id: 5,
    name: 'Dimensions',
    type: 'text',
    values: [],
    isRequired: false,
    isFilterable: false,
    isSearchable: false,
    displayOrder: 5,
    status: 'active',
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  },
  {
    id: 6,
    name: 'Warranty Period',
    type: 'text',
    values: [],
    isRequired: false,
    isFilterable: false,
    isSearchable: false,
    displayOrder: 6,
    status: 'active',
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  },
  {
    id: 7,
    name: 'Brand',
    type: 'select',
    values: ['Amul', 'Tata', 'MDH', 'Haldiram', 'Parle', 'Britannia', 'Cadbury', 'Nestle'],
    isRequired: false,
    isFilterable: true,
    isSearchable: true,
    displayOrder: 7,
    status: 'active',
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  },
  {
    id: 8,
    name: 'Expiry Date',
    type: 'date',
    values: [],
    isRequired: false,
    isFilterable: false,
    isSearchable: false,
    displayOrder: 8,
    status: 'active',
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  },
  {
    id: 9,
    name: 'Is Organic',
    type: 'boolean',
    values: [],
    isRequired: false,
    isFilterable: true,
    isSearchable: false,
    displayOrder: 9,
    status: 'active',
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  },
  {
    id: 10,
    name: 'Flavor',
    type: 'multiselect',
    values: ['Vanilla', 'Chocolate', 'Strawberry', 'Mango', 'Pineapple', 'Orange', 'Butterscotch'],
    isRequired: false,
    isFilterable: true,
    isSearchable: false,
    displayOrder: 10,
    status: 'active',
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  },
];

const EditAttribute = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useGetAttributeById(id);
  const { mutate: updateAttribute, isPending: isUpdating } = useUpdateAttribute(id || '');
  const [formData, setFormData] = useState<AttributeFormData>({
    name: '',
    type: 'text',
    values: [],
    valueInput: '',
    isRequired: false,
    isFilterable: false,
    isSearchable: false,
    displayOrder: 0,
    status: 'active',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Map API type to form type (uppercase to lowercase)
  const mapApiTypeToFormType = (apiType: string): 'text' | 'select' | 'multiselect' | 'number' | 'boolean' | 'date' => {
    const typeMap: Record<string, 'text' | 'select' | 'multiselect' | 'number' | 'boolean' | 'date'> = {
      TEXT: 'text',
      SINGLE_SELECT: 'select',
      MULTI_SELECT: 'multiselect',
      NUMBER: 'number',
      BOOLEAN: 'boolean',
      DATE: 'date',
    };
    return typeMap[apiType] || 'text';
  };

  // Map form type to API type (lowercase to uppercase)
  const mapFormTypeToApiType = (formType: string): string => {
    const typeMap: Record<string, string> = {
      text: 'TEXT',
      select: 'SINGLE_SELECT',
      multiselect: 'MULTI_SELECT',
      number: 'NUMBER',
      boolean: 'BOOLEAN',
      date: 'DATE',
    };
    return typeMap[formType] || 'TEXT';
  };

  useEffect(() => {
    if (data?.data && id) {
      const apiData = data.data;
      setFormData({
        name: apiData.name,
        type: mapApiTypeToFormType(apiData.type),
        values: [], // API response doesn't include values, set empty array
        valueInput: '',
        isRequired: apiData.isRequired,
        isFilterable: apiData.isFilterable,
        isSearchable: apiData.isSearchable,
        displayOrder: apiData.displayOrder,
        status: apiData.status === 'ACTIVE' ? 'active' : 'inactive',
      });
    }
  }, [data, id]);

  // Redirect if attribute not found
  useEffect(() => {
    if (!isLoading && id && data && !data.data) {
      alert('Attribute not found');
      navigate('/master-setup/attributes');
    }
  }, [isLoading, id, data, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) || 0 : value,
    }));
    
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleAddValue = () => {
    if (formData.valueInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        values: [...prev.values, prev.valueInput.trim()],
        valueInput: '',
      }));
    }
  };

  const handleRemoveValue = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      values: prev.values.filter((_, i) => i !== index),
    }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Attribute name is required';
    }

    if ((formData.type === 'select' || formData.type === 'multiselect') && formData.values.length === 0) {
      newErrors.values = 'At least one value is required for select/multiselect type';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    
    if (validate()) {
      try {
        // Prepare payload for API - convert form types to API types
        const payload = {
          name: formData.name.trim(),
          type: mapFormTypeToApiType(formData.type),
          displayOrder: formData.displayOrder,
          isRequired: formData.isRequired,
          isFilterable: formData.isFilterable,
          isSearchable: formData.isSearchable,
          status: formData.status === 'active' ? 'ACTIVE' : 'INACTIVE',
        };

        updateAttribute(payload as any, {
          onSuccess: () => {
            navigate('/master-setup/attributes');
          },
        });
      } catch (error: any) {
        console.error('Error updating attribute:', error);
        // Error is handled by the hook's error handling
      }
    }
  };

  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500">Loading attribute...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Edit Attribute</h1>
        <BackButton to="/master-setup/attributes" />
      </div>
      
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
        <form onSubmit={handleSubmit}>
          <FormSectionWithDots title="Attribute Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Attribute Name <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <TextInput
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Size, Color, Material"
                  error={errors.name}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Attribute Type <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <SelectInput
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  options={[
                    { value: 'text', label: 'Text' },
                    { value: 'select', label: 'Select (Single Choice)' },
                    { value: 'multiselect', label: 'Multi-Select (Multiple Choice)' },
                    { value: 'number', label: 'Number' },
                    { value: 'boolean', label: 'Boolean (Yes/No)' },
                    { value: 'date', label: 'Date' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Display Order</label>
                <TextInput
                  type="number"
                  name="displayOrder"
                  value={formData.displayOrder || ''}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
                <SelectInput
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                />
              </div>
            </div>
          </FormSectionWithDots>

          {/* Values Section (for select/multiselect types) */}
          {(formData.type === 'select' || formData.type === 'multiselect') && (
            <FormSectionWithDots title="Attribute Values">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Values <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <div className="flex gap-2 mb-2">
                  <TextInput
                    type="text"
                    value={formData.valueInput}
                    onChange={(e) => setFormData((prev) => ({ ...prev, valueInput: e.target.value }))}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddValue();
                      }
                    }}
                    placeholder="Enter value and press Enter or click Add"
                  />
                  <Button
                    type="button"
                    onClick={handleAddValue}
                    className="px-3 py-1.5 text-xs font-medium"
                  >
                    Add
                  </Button>
                </div>
                {errors.values && <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">{errors.values}</p>}
                {formData.values.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.values.map((value, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded text-xs"
                      >
                        {value}
                        <button
                          type="button"
                          onClick={() => handleRemoveValue(index)}
                          className="text-orange-700 dark:text-orange-300 hover:text-orange-900 dark:hover:text-orange-200"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </FormSectionWithDots>
          )}

          {/* Options Section */}
          <FormSectionWithDots title="Attribute Options">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="isRequired"
                  checked={formData.isRequired}
                  onChange={handleChange}
                  className="w-4 h-4 text-orange-600 border-gray-300 dark:border-gray-600 rounded focus:ring-orange-500 dark:focus:ring-orange-400"
                />
                <span className="text-xs text-gray-700">Required</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="isFilterable"
                  checked={formData.isFilterable}
                  onChange={handleChange}
                  className="w-4 h-4 text-orange-600 border-gray-300 dark:border-gray-600 rounded focus:ring-orange-500 dark:focus:ring-orange-400"
                />
                <span className="text-xs text-gray-700">Filterable</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="isSearchable"
                  checked={formData.isSearchable}
                  onChange={handleChange}
                  className="w-4 h-4 text-orange-600 border-gray-300 dark:border-gray-600 rounded focus:ring-orange-500 dark:focus:ring-orange-400"
                />
                <span className="text-xs text-gray-700">Searchable</span>
              </label>
            </div>
          </FormSectionWithDots>

          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/master-setup/attributes')}
              className="px-4 py-2 text-xs font-medium"
            >
              Cancel
            </Button>
            <PrimaryButton
              type="submit"
              disabled={isUpdating}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium"
            >
              <Save size={14} />
              <span>{isUpdating ? 'Updating...' : 'Update Attribute'}</span>
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAttribute;

