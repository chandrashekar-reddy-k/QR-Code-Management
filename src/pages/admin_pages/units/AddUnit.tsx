import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Save } from 'lucide-react';
import { PrimaryButton, Button, TextInput, SelectInput, FormSectionWithDots } from '../../../components/ui';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import BackButton from '../../../components/common/BackButton';
import { unitSchema } from '../../../validationSchema/unit';
import { useCreateUnit, useGetUnitDetailsById, useUpdateUnit, useGetAllUnitList } from '../../../hooks/unit';

interface UnitFormInputs {
  name: string;
  shortCode: string;
  parentUnit: string;
  conversion: number | null;
}

// Interface for API payload
interface ApiUnitPayload {
  name: string;
  shortCode: string;
  parentUnit?: string;
  conversion?: number;
}

// Interface for API response
interface ApiUnitResponse {
  name: string;
  shortCode: string;
  parentUnit?: string | null;
  conversion?: number | null;
  [key: string]: any;
}

// Interface for the hook response data structure
interface UnitResponseData {
  data: ApiUnitResponse;
  [key: string]: any;
}

// Interface for API unit list response
interface ApiUnit {
  id: string;
  name: string;
  shortCode: string;
  parentId: string | null;
  conversion: number;
}

interface ApiResponse {
  status: boolean;
  response: string;
  data: {
    units: ApiUnit[];
  };
  [key: string]: any;
}

// Mock units for parent unit dropdown (fallback when API is not available)
const mockParentUnits: ApiUnit[] = [
  { id: '1', name: 'Kilogram', shortCode: 'kg', parentId: null, conversion: 1 },
  { id: '2', name: 'Liter', shortCode: 'L', parentId: null, conversion: 1 },
  { id: '3', name: 'Piece', shortCode: 'pc', parentId: null, conversion: 1 },
  { id: '4', name: 'Meter', shortCode: 'm', parentId: null, conversion: 1 },
  { id: '5', name: 'Box', shortCode: 'box', parentId: null, conversion: 1 },
  { id: '6', name: 'Pack', shortCode: 'pack', parentId: null, conversion: 1 },
];

const AddUnit = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const { mutate, isPending } = useCreateUnit();
  const { mutate: updateUnit } = useUpdateUnit(id || '');
  const { data: editData, refetch, isLoading: isEditLoading } = useGetUnitDetailsById(id ?? '');
  
  // Fetch all units for parent unit dropdown
  const { data: unitsData } = useGetAllUnitList(1, 1000);
  const apiUnitsData = unitsData as ApiResponse | undefined;
  const allUnits: ApiUnit[] = apiUnitsData?.data?.units || mockParentUnits;

  // Get main units (units without parent) for the parent unit dropdown
  const mainUnits = useMemo(() => {
    const units = allUnits.filter((unit) => unit.parentId === null);
    // Use mock data if no units from API
    return units.length > 0 ? units : mockParentUnits;
  }, [allUnits]);

  // Initialize React Hook Form with Controller
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<UnitFormInputs>({
    resolver: yupResolver(unitSchema) as any,
    mode: 'onChange',
    defaultValues: {
      name: '',
      shortCode: '',
      parentUnit: '',
      conversion: null,
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
      const unitResponseData = editData as UnitResponseData;
      const unitEditData = unitResponseData?.data as ApiUnitResponse;
      
      if (!unitEditData) return;
      
      // Set all form values
      setValue('name', unitEditData?.name || '');
      setValue('shortCode', unitEditData?.shortCode || '');
      
      // Handle parentUnit - API returns unit name
      if (unitEditData?.parentUnit) {
        setValue('parentUnit', unitEditData.parentUnit);
      } else {
        setValue('parentUnit', '');
      }
      
      // Handle conversion
      if (unitEditData?.conversion !== undefined && unitEditData?.conversion !== null) {
        setValue('conversion', unitEditData.conversion);
      } else {
        setValue('conversion', null);
      }
    }
  }, [editData, isEditMode, setValue]);

  const onSubmit = async (data: UnitFormInputs) => {
    try {
      setLoading(true);
      
      // Prepare payload for API
      const payload: ApiUnitPayload & { id?: string } = {
        name: data.name.trim(),
        shortCode: data.shortCode.trim(),
      };

      // Add optional fields if they have values
      if (data.parentUnit && data.parentUnit.trim()) {
        payload.parentUnit = data.parentUnit.trim();
      }

      if (data.conversion !== null && data.conversion !== undefined) {
        payload.conversion = data.conversion;
      }
      
      // Add id for edit mode and call appropriate mutation
      if (isEditMode && id) {
        payload.id = id;
        updateUnit(payload as any);
      } else {
        mutate(payload as any);
      }
      
      navigate('/products/units');
    } catch (error: any) {
      console.error('Error saving unit:', error);
      alert(error.message || 'Error saving unit. Please try again.');
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
          <p className="text-xs text-gray-500 dark:text-gray-400">Loading unit...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
          {isEditMode ? 'Edit Unit' : 'Add Unit'}
        </h1>
        <BackButton to="/products/units" />
      </div>
      
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit, onError)} className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <div className="max-w-4xl">
          {/* Basic Information Section */}
          <FormSectionWithDots title="Basic Information">
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="Unit Name"
                  required
                  type="text"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Enter unit name"
                  error={errors.name?.message}
                />
              )}
            />
            <Controller
              name="shortCode"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="Short Code"
                  required
                  type="text"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Enter short code"
                  error={errors.shortCode?.message}
                />
              )}
            />
          </FormSectionWithDots>

          {/* Parent Unit & Conversion Section */}
          <FormSectionWithDots title="Parent Unit & Conversion">
            <Controller
              name="parentUnit"
              control={control}
              render={({ field }) => (
                <SelectInput
                  label="Parent Unit"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Select parent unit (optional)"
                  options={[
                    { value: '', label: 'Main Unit' },
                    ...mainUnits.map((unit) => ({
                      value: unit.name,
                      label: `${unit.name} (${unit.shortCode})`,
                    })),
                  ]}
                  error={errors.parentUnit?.message}
                />
              )}
            />
            <Controller
              name="conversion"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="Conversion"
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
                  placeholder="Enter conversion factor"
                  step="0.01"
                  min="0"
                  error={errors.conversion?.message}
                />
              )}
            />
          </FormSectionWithDots>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/products/units')}
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
                  <span>{isEditMode ? 'Update Unit' : 'Add Unit'}</span>
                </>
              )}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddUnit;

