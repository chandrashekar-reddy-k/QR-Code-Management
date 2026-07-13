import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { Save } from 'lucide-react';

import {
  PrimaryButton,
  Button,
  TextInput,
  SelectInput,
  FormSectionWithDots,
} from '../../../components/ui';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import BackButton from '../../../components/common/BackButton';

import { useGetStateDetailsById, useUpdateState } from '../../../hooks/state';
import { useGetAllCountryList } from '../../../hooks/country';

/* ----------------------------------
   Form Types
---------------------------------- */
interface StateFormInputs {
  name: string;
  countryId: string;
  status: 'active' | 'inactive';
  stateIcon: 'mapPin' | 'flag' | 'building' | 'landmark' | 'mountain' | 'waves';
}

/* ----------------------------------
   API Response Shape
---------------------------------- */
interface ApiStateResponse {
  name?: string;
  country?: string;
  status?: 'active' | 'inactive';
  stateIcon?: StateFormInputs['stateIcon'];
}

interface StateResponseData {
  data: ApiStateResponse;
}

const EditState = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  /* ----------------------------------
     Hooks
  ---------------------------------- */
  const { data, refetch, isLoading } = useGetStateDetailsById(id ?? '');
  const { mutate, isPending } = useUpdateState(id ?? '');

  const { data: countryData } = useGetAllCountryList(1, 100);

  const countryOptions = [
    { value: '', label: 'Select Country', disabled: true },
    ...(countryData?.data?.countries?.map((country: any) => ({
      value: country.id,
      label: country.name,
    })) || []),
  ];

  /* ----------------------------------
     React Hook Form
  ---------------------------------- */
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<StateFormInputs>({
    mode: 'onChange',
    defaultValues: {
      name: '',
      countryId: '', // ✅
      status: 'active',
      stateIcon: 'mapPin',
    },
  });

  /* ----------------------------------
     Fetch state on edit
  ---------------------------------- */
  useEffect(() => {
    if (id) refetch();
  }, [id, refetch]);

  /* ----------------------------------
     Bind edit data to form
  ---------------------------------- */
  useEffect(() => {
    if (!data) return;

    const response = data as StateResponseData;
    const state = response?.data;
    if (!state) return;

    // Correct mapping from API fields
    setValue('name', state.stateName || ''); // <-- use stateName
    setValue('countryId', state.countryId || ''); // ✅ FIX
    setValue('status', state.status?.toLowerCase() === 'active' ? 'active' : 'inactive'); // map ACTIVE/INACTIVE to 'active'|'inactive'
    setValue('stateIcon', state.stateIcon || 'mapPin');
  }, [data, setValue]);


  /* ----------------------------------
     Submit (UPDATE only)
  ---------------------------------- */
  const onSubmit = (formData: StateFormInputs) => {
    const payload = {
      stateName: formData.name.trim(), // API expects "stateName"
      countryId: formData.countryId, // ✅
      stateIcon: formData.stateIcon,
      isActive: formData.status === 'active', // convert to boolean
    };

    mutate(payload, {
      onSuccess: () => {
        navigate('/master-setup/states');
      },
    });
  };

  /* ----------------------------------
     Loading State
  ---------------------------------- */
  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500">Loading state...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Edit State
        </h1>
        <BackButton to="/master-setup/states" />
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6"
      >
        <FormSectionWithDots title="State Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Country  */}
            <Controller
              name="countryId"
              control={control}
              rules={{ required: 'Country is required' }}
              render={({ field }) => (
                <SelectInput
                  label="Country"
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  options={countryOptions}
                  error={errors.countryId?.message}
                />
              )}
            />


            {/* State Name */}
            <Controller
              name="name"
              control={control}
              rules={{ required: 'State name is required' }}
              render={({ field }) => (
                <TextInput
                  label="State Name"
                  required
                  type="text"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.name?.message}
                  placeholder="Enter state name"
                />
              )}
            />

            {/* Status */}
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <SelectInput
                  label="Status"
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                />
              )}
            />

            {/* State Icon */}
            <Controller
              name="stateIcon"
              control={control}
              render={({ field }) => (
                <SelectInput
                  label="State Icon"
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: 'mapPin', label: 'Map Pin (Location)' },
                    { value: 'flag', label: 'Flag (State Flag)' },
                    { value: 'building', label: 'Building (Major State)' },
                    { value: 'landmark', label: 'Landmark (Famous Places)' },
                    { value: 'mountain', label: 'Mountain (Hilly State)' },
                    { value: 'waves', label: 'Waves (Coastal State)' },
                  ]}
                />
              )}
            />
          </div>
        </FormSectionWithDots>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/master-setup/states')}
            className="px-4 py-2 text-xs font-medium"
            disabled={isPending}
          >
            Cancel
          </Button>

          <PrimaryButton
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Update State</span>
              </>
            )}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
};

export default EditState;
