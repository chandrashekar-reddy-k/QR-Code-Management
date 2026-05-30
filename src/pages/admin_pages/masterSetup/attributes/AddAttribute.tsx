import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate } from 'react-router-dom';
import { Save, X } from 'lucide-react';
import { PrimaryButton, Button, TextInput, SelectInput, FormSectionWithDots } from '../../../../components/ui';
import Breadcrumbs from '../../../../components/common/Breadcrumbs';
import BackButton from '../../../../components/common/BackButton';
import { attributeSchema } from '../../../../validationSchema/attribute';
import { useCreateAttribute } from '../../../../hooks/attribute';

interface AttributeFormInputs {
  name: string;
  type: 'SINGLE_SELECT' | 'MULTI_SELECT' | 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'DATE';
  displayOrder: number;
  isRequired: boolean;
  isFilterable: boolean;
  isSearchable: boolean;
}

// Interface for API payload
interface ApiAttributePayload {
  name: string;
  type: string;
  displayOrder: number;
  isRequired: boolean;
  isFilterable: boolean;
  isSearchable: boolean;
}

const AddAttribute = () => {
  const navigate = useNavigate();
  const { mutate, isPending } = useCreateAttribute();
  const [values, setValues] = useState<string[]>([]);
  const [valueInput, setValueInput] = useState('');
  const [valuesError, setValuesError] = useState('');

  // Initialize React Hook Form
  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<AttributeFormInputs>({
    resolver: yupResolver(attributeSchema) as any,
    mode: 'onChange',
    defaultValues: {
      name: '',
      type: 'TEXT',
      displayOrder: 0,
      isRequired: false,
      isFilterable: false,
      isSearchable: false,
    }
  });

  const attributeType = watch('type');

  const handleAddValue = () => {
    if (valueInput.trim()) {
      setValues((prev) => [...prev, valueInput.trim()]);
      setValueInput('');
      setValuesError('');
    }
  };

  const handleRemoveValue = (index: number) => {
    setValues((prev) => prev.filter((_, i) => i !== index));
    setValuesError('');
  };

  const onSubmit = async (data: AttributeFormInputs) => {
    // Validate values for select/multiselect types
    if ((data.type === 'SINGLE_SELECT' || data.type === 'MULTI_SELECT') && values.length === 0) {
      setValuesError('At least one value is required for select/multiselect type');
      return;
    }

    setValuesError('');

    // Prepare payload for API
    const payload: ApiAttributePayload = {
      name: data.name.trim(),
      type: data.type,
      displayOrder: data.displayOrder,
      isRequired: data.isRequired,
      isFilterable: data.isFilterable,
      isSearchable: data.isSearchable,
    };

    mutate(payload as any, {
      onSuccess: () => {
        navigate('/master-setup/attributes');
      },
    });
  };

  const onError = (errors: any) => {
    console.log('Form errors:', errors);
  };

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Add Attribute</h1>
        <BackButton to="/master-setup/attributes" />
      </div>
      
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <form onSubmit={handleSubmit(onSubmit, onError)}>
          <FormSectionWithDots title="Attribute Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Attribute Name <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      {...field}
                      type="text"
                      placeholder="e.g., Size, Color, Material"
                      error={errors.name?.message}
                    />
                  )}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Attribute Type <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <SelectInput
                      {...field}
                      options={[
                        { value: 'TEXT', label: 'Text' },
                        { value: 'SINGLE_SELECT', label: 'Single Select' },
                        { value: 'MULTI_SELECT', label: 'Multi Select' },
                        { value: 'NUMBER', label: 'Number' },
                        { value: 'BOOLEAN', label: 'Boolean (Yes/No)' },
                        { value: 'DATE', label: 'Date' },
                      ]}
                      error={errors.type?.message}
                    />
                  )}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Display Order <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <Controller
                  name="displayOrder"
                  control={control}
                  render={({ field }) => (
                    <TextInput
                      {...field}
                      type="number"
                      placeholder="0"
                      min="0"
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      error={errors.displayOrder?.message}
                    />
                  )}
                />
              </div>
            </div>
          </FormSectionWithDots>

          {/* Values Section (for select/multiselect types) */}
          {(attributeType === 'SINGLE_SELECT' || attributeType === 'MULTI_SELECT') && (
            <FormSectionWithDots title="Attribute Values">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Values <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <div className="flex gap-2 mb-2">
                  <TextInput
                    type="text"
                    value={valueInput}
                    onChange={(e) => setValueInput(e.target.value)}
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
                {valuesError && <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">{valuesError}</p>}
                {values.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {values.map((value, index) => (
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
              <Controller
                name="isRequired"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300">Required</span>
                  </label>
                )}
              />

              <Controller
                name="isFilterable"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300">Filterable</span>
                  </label>
                )}
              />

              <Controller
                name="isSearchable"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300">Searchable</span>
                  </label>
                )}
              />
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
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium"
              disabled={isPending}
            >
              <Save size={14} />
              <span>{isPending ? 'Saving...' : 'Save Attribute'}</span>
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAttribute;
