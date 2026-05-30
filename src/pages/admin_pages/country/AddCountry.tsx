import { useNavigate } from 'react-router-dom';
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
import { useCreateCountry } from '../../../hooks/country';

interface CountryFormInputs {
  name: string;
  region: string;
  icon:
    | 'mapPin'
    | 'flag'
    | 'building'
    | 'landmark'
    | 'mountain'
    | 'wave';
}

interface ApiCountryPayload {
  name: string;
  region: string;
  icon: string;
}

const AddCountry = () => {
  const navigate = useNavigate();
  const { mutate, isPending } = useCreateCountry();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CountryFormInputs>({
    mode: 'onChange',
    defaultValues: {
      name: '',
      region: '',
      icon: 'mapPin',
    },
  });

  const onSubmit = (data: CountryFormInputs) => {
    const payload: ApiCountryPayload = {
      name: data.name.trim().toLowerCase(),
      region: data.region.trim().toLowerCase(),
      icon: data.icon,
    };

    mutate(payload, {
      onSuccess: () => {
        navigate('/master-setup/countries');
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
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
          Add Country
        </h1>
        <BackButton to="/master-setup/countries" />
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit(onSubmit, onError)}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6"
      >
        <div className="max-w-4xl">
          {/* Country Information */}
          <FormSectionWithDots title="Country Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="name"
                control={control}
                rules={{ required: 'Country name is required' }}
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

              <Controller
                name="region"
                control={control}
                rules={{ required: 'Region is required' }}
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

          {/* Submit Buttons */}
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
                  <span>Add Country</span>
                </>
              )}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddCountry;
