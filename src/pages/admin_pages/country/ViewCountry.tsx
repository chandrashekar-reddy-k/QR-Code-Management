import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPin, Flag, Building2, Landmark, Mountain, Waves } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';

import { TextInput, FormSectionWithDots, Button } from '../../../components/ui';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import BackButton from '../../../components/common/BackButton';

import { useGetCountryDetailsById } from '../../../hooks/country';

/* ----------------------------------
   Types
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

interface ApiCountryResponse {
  name?: string;
  region?: string;
  icon?: CountryFormInputs['icon'];
}

interface CountryResponseData {
  data: ApiCountryResponse;
}

/* ----------------------------------
   Icon Helpers (UNCHANGED)
---------------------------------- */
const getCountryIcon = (iconType: CountryFormInputs['icon']) => {
  switch (iconType) {
    case 'mapPin':
      return <MapPin size={18} className="text-blue-600 dark:text-blue-400" />;
    case 'flag':
      return <Flag size={18} className="text-green-600 dark:text-green-400" />;
    case 'building':
      return <Building2 size={18} className="text-purple-600 dark:text-purple-400" />;
    case 'landmark':
      return <Landmark size={18} className="text-orange-600 dark:text-orange-400" />;
    case 'mountain':
      return <Mountain size={18} className="text-green-600 dark:text-green-400" />;
    case 'waves':
      return <Waves size={18} className="text-green-600 dark:text-green-400" />;
    default:
      return <MapPin size={18} className="text-blue-600 dark:text-blue-400" />;
  }
};

const getIconLabel = (iconType: CountryFormInputs['icon']) => {
  const labels: Record<CountryFormInputs['icon'], string> = {
    mapPin: 'Map Pin (Location)',
    flag: 'Flag (Country Flag)',
    building: 'Building (Major City)',
    landmark: 'Landmark (Famous Places)',
    mountain: 'Mountain (Hilly)',
    waves: 'Waves (Coastal)',
  };
  return labels[iconType];
};

const ViewCountry = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  /* ----------------------------------
     API Hook
  ---------------------------------- */
  const { data, refetch, isLoading } = useGetCountryDetailsById(id ?? '');

  /* ----------------------------------
     React Hook Form (VIEW MODE)
  ---------------------------------- */
  const {
    control,
    setValue,
  } = useForm<CountryFormInputs>({
    defaultValues: {
      name: '',
      region: '',
      icon: 'mapPin',
    },
  });

  /* ----------------------------------
     Fetch country
  ---------------------------------- */
  useEffect(() => {
    if (id) {
      refetch();
    }
  }, [id, refetch]);

  /* ----------------------------------
     Bind data to form
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
     Loading State
  ---------------------------------- */
  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500">
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
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          View Country
        </h1>
        <BackButton to="/master-setup/countries" />
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* View Form Wrapper (Same as AddCategory) */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
        <div className="max-w-4xl">
          <FormSectionWithDots title="Country Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Country Name */}
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextInput
                    label="Country Name"
                    type="text"
                    value={field.value}
                    disabled
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
                    type="text"
                    value={field.value}
                    disabled
                  />
                )}
              />

              {/* Icon */}
              <Controller
                name="icon"
                control={control}
                render={({ field }) => (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Country Icon
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      {getCountryIcon(field.value)}
                      <span className="text-sm text-gray-800">
                        {getIconLabel(field.value)}
                      </span>
                    </div>
                  </div>
                )}
              />
            </div>
          </FormSectionWithDots>

        </div>
      </div>
    </div>
  );
};

export default ViewCountry;
