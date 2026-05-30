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

import {
  useGetCountryDetailsById,
  useUpdateCountry,
} from '../../../hooks/country';

/* ----------------------------------
   Form Types
---------------------------------- */
interface CountryFormInputs {
  name: string;
  region: string;
  icon:
    | 'mapPin'
    | 'flag'
    | 'building'
    | 'landmark'
    | 'mountain'
    | 'waves';
}

/* ----------------------------------
   API Response Shape
---------------------------------- */
interface ApiCountryResponse {
  name?: string;
  region?: string;
  icon?: CountryFormInputs['icon'];
}

interface CountryResponseData {
  data: ApiCountryResponse;
}

const EditCountry = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  /* ----------------------------------
     Hooks
  ---------------------------------- */
  const { data, refetch, isLoading } = useGetCountryDetailsById(id ?? '');
  const { mutate, isPending } = useUpdateCountry(id ?? '');

  /* ----------------------------------
     React Hook Form
  ---------------------------------- */
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CountryFormInputs>({
    mode: 'onChange',
    defaultValues: {
      name: '',
      region: '',
      icon: 'mapPin',
    },
  });

  /* ----------------------------------
     Fetch country on edit
  ---------------------------------- */
  useEffect(() => {
    if (id) {
      refetch();
    }
  }, [id, refetch]);

  /* ----------------------------------
     Bind edit data to form
  ---------------------------------- */
  useEffect(() => {
    if (!data) return;

    const response = data as CountryResponseData;
    const country = response?.data;

    if (!country) return;

    setValue('name', country.name || '');
    setValue('region', country.region || '');
    setValue('icon', country.icon || 'mapPin');
  }, [data, setValue]);

  /* ----------------------------------
     Submit (UPDATE only)
  ---------------------------------- */
  const onSubmit = (formData: CountryFormInputs) => {
    const payload = {
      name: formData.name.trim().toLowerCase(),
      region: formData.region.trim().toLowerCase(),
      icon: formData.icon,
    };

    mutate(payload, {
      onSuccess: () => {
        navigate('/master-setup/countries');
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
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Loading country...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
          Edit Country
        </h1>
        <BackButton to="/master-setup/countries" />
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6"
      >
        <FormSectionWithDots title="Country Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Country Name */}
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="Country Name"
                  required
                  type="text"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.name?.message}
                  placeholder="Enter country name"
                />
              )}
            />

            {/* Region */}
            <Controller
              name="region"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="Region"
                  required
                  type="text"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.region?.message}
                  placeholder="Enter region (e.g. Asia, Europe)"
                />
              )}
            />

            {/* Icon */}
            <Controller
              name="icon"
              control={control}
              render={({ field }) => (
                <SelectInput
                  label="Country Icon"
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: 'mapPin', label: 'Map Pin (Location)' },
                    { value: 'flag', label: 'Flag (Country Flag)' },
                    { value: 'building', label: 'Building (Major City)' },
                    { value: 'landmark', label: 'Landmark (Famous Places)' },
                    { value: 'mountain', label: 'Mountain (Hilly)' },
                    { value: 'waves', label: 'Waves (Coastal)' },
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
            onClick={() => navigate('/master-setup/countries')}
            className="px-4 py-2 text-xs font-medium"
            disabled={isPending}
          >
            Cancel
          </Button>

          <PrimaryButton
            type="submit"
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium"
          >
            <Save size={14} />
            <span>Update Country</span>
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
};

export default EditCountry;
