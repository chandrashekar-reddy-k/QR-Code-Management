import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Save } from 'lucide-react';
import { PrimaryButton, Button, TextInput, FormSectionWithDots } from '../../../components/ui';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import BackButton from '../../../components/common/BackButton';
import { taxSchema } from '../../../validationSchema/tax';
import { useCreateTax, useGetTaxDetailsById, useUpdateTax } from '../../../hooks/tax';

interface TaxFormInputs {
  title: string;
  percentage: number | null;
}

// Interface for API payload
interface ApiTaxPayload {
  title: string;
  percentage: number;
}

// Interface for API response
interface ApiTaxResponse {
  title: string;
  percentage: string | number;
  status?: string;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

// Interface for the hook response data structure
interface TaxResponseData {
  data: ApiTaxResponse;
  [key: string]: any;
}

const AddTax = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const { mutate, isPending } = useCreateTax();
  const { mutate: updateTax } = useUpdateTax(id || '');
  const { data: editData, refetch, isLoading: isEditLoading } = useGetTaxDetailsById(id ?? '');

  // Initialize React Hook Form with Controller
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<TaxFormInputs>({
    resolver: yupResolver(taxSchema) as any,
    mode: 'onChange',
    defaultValues: {
      title: '',
      percentage: null,
    }
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
      const taxResponseData = editData as TaxResponseData;
      const taxEditData = taxResponseData?.data as ApiTaxResponse;
      
      if (!taxEditData) return;
      
      // Set all form values
      setValue('title', taxEditData?.title || '');
      
      // Handle percentage - convert string to number if needed
      if (taxEditData?.percentage !== undefined && taxEditData?.percentage !== null) {
        const percentageValue = typeof taxEditData.percentage === 'string' 
          ? parseFloat(taxEditData.percentage) 
          : taxEditData.percentage;
        setValue('percentage', isNaN(percentageValue) ? null : percentageValue);
      } else {
        setValue('percentage', null);
      }
    }
  }, [editData, isEditMode, setValue]);

  const onSubmit = async (data: TaxFormInputs) => {
    try {
      setLoading(true);
      
      // Prepare payload for API
      const payload: ApiTaxPayload & { id?: string } = {
        title: data.title.trim(),
        percentage: data.percentage !== null && data.percentage !== undefined ? data.percentage : 0,
      };
      
      // Add id for edit mode and call appropriate mutation
      if (isEditMode && id) {
        payload.id = id;
        updateTax(payload as any);
      } else {
        mutate(payload as any);
      }
      
      navigate('/products/taxes');
    } catch (error: any) {
      console.error('Error saving tax:', error);
      alert(error.message || 'Error saving tax. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onError = (errors: any) => {
    console.log('Form errors:', errors);
  };

  if (isEditLoading && isEditMode) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500">Loading tax...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          {isEditMode ? 'Edit Tax' : 'Add Tax'}
        </h1>
        <BackButton to="/products/taxes" />
      </div>
      
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit, onError)} className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
        <div className="max-w-4xl">
          {/* Tax Information Section */}
          <FormSectionWithDots title="Tax Information">
            <Controller
              name="title"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="Title"
                  required
                  type="text"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Enter tax title"
                  error={errors.title?.message}
                />
              )}
            />
            <Controller
              name="percentage"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="Percentage"
                  required
                  type="number"
                  value={field.value !== null && field.value !== undefined ? field.value.toString() : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      field.onChange(null);
                    } else {
                      const numValue = parseFloat(value);
                      field.onChange(isNaN(numValue) ? null : numValue);
                    }
                  }}
                  onBlur={field.onBlur}
                  placeholder="10.00"
                  step="0.01"
                  min="0"
                  max="100"
                  error={errors.percentage?.message}
                />
              )}
            />
          </FormSectionWithDots>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/products/taxes')}
              className="px-4 py-2 text-xs font-medium"
              disabled={isPending}
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
                  <span>{isEditMode ? 'Update Tax' : 'Add Tax'}</span>
                </>
              )}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddTax;

