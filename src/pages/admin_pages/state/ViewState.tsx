import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapPin, Flag, Building2, Landmark, Mountain, Waves } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';

import { TextInput, FormSectionWithDots, Badge, Button } from '../../../components/ui';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import BackButton from '../../../components/common/BackButton';

import { useGetStateDetailsById } from '../../../hooks/state';

/* ----------------------------------
   Types
---------------------------------- */
interface StateFormInputs {
  name: string;
  country: string;
  status: 'active' | 'inactive';
  stateIcon: 'mapPin' | 'flag' | 'building' | 'landmark' | 'mountain' | 'waves';
}

interface ApiStateResponse {
  name?: string;
  country?: string;
  status?: 'active' | 'inactive';
  stateIcon?: StateFormInputs['stateIcon'];
}

interface StateResponseData {
  data: ApiStateResponse;
}

/* ----------------------------------
   Icon Helpers
---------------------------------- */
const getStateIcon = (iconType: StateFormInputs['stateIcon']) => {
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

const getIconLabel = (iconType: StateFormInputs['stateIcon']) => {
  const labels: Record<StateFormInputs['stateIcon'], string> = {
    mapPin: 'Map Pin (Location)',
    flag: 'Flag (State Flag)',
    building: 'Building (Major State)',
    landmark: 'Landmark (Famous Places)',
    mountain: 'Mountain (Hilly State)',
    waves: 'Waves (Coastal State)',
  };
  return labels[iconType];
};

/* ----------------------------------
   Component
---------------------------------- */
const ViewState = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  /* ----------------------------------
     API Hook
  ---------------------------------- */
  const { data, refetch, isLoading } = useGetStateDetailsById(id ?? '');

  /* ----------------------------------
     React Hook Form (VIEW MODE)
  ---------------------------------- */
  const { control, setValue } = useForm<StateFormInputs>({
    defaultValues: {
      name: '',
      country: '',
      status: 'active',
      stateIcon: 'mapPin',
    },
  });

  /* ----------------------------------
     Fetch state on mount
  ---------------------------------- */
  useEffect(() => {
    if (id) refetch();
  }, [id, refetch]);

  /* ----------------------------------
     Bind API data to form
  ---------------------------------- */
  useEffect(() => {
  if (!data) return;

  const response = data as StateResponseData;
  const state = response.data;

  if (!state) return;

  setValue('name', state.stateName || ''); // map stateName -> name
  setValue('country', state.country || '');
  setValue('status', (state.status?.toLowerCase() === 'active' ? 'active' : 'inactive') as 'active' | 'inactive'); // normalize
  setValue('stateIcon', state.stateIcon || 'mapPin');
}, [data, setValue]);


  /* ----------------------------------
     Loading State
  ---------------------------------- */
  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Loading state...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
          View State
        </h1>
        <BackButton to="/master-setup/states" />
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* State Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <div className="max-w-4xl">
          <FormSectionWithDots title="State Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* State Name */}
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextInput label="State Name" type="text" value={field.value} disabled />
                )}
              />

              {/* Country */}
              <Controller
                name="country"
                control={control}
                render={({ field }) => (
                  <TextInput label="Country" type="text" value={field.value} disabled />
                )}
              />

              {/* Status */}
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Status
                    </label>
                    <Badge
                      status={field.value}
                      size="sm"
                      customColor={
                        field.value === 'active'
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-200 text-gray-800'
                      }
                      className="rounded"
                    />
                  </div>
                )}
              />

              {/* State Icon */}
              <Controller
                name="stateIcon"
                control={control}
                render={({ field }) => (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      State Icon
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      {getStateIcon(field.value)}
                      <span className="text-sm text-gray-800 dark:text-gray-200">{getIconLabel(field.value)}</span>
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

export default ViewState;
