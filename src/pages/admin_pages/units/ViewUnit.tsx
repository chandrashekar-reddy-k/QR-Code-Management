import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { Ruler, Calculator } from 'lucide-react';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import BackButton from '../../../components/common/BackButton';
import { useGetUnitDetailsById, useGetAllUnitList } from '../../../hooks/unit';

// Interface for API response
interface ApiUnitResponse {
  id: string;
  name: string;
  shortCode: string;
  parent: string | null;
  conversion: number;
  status?: string;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
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
  parent: string | null;
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

const ViewUnit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data, isLoading, refetch } = useGetUnitDetailsById(id || '');
  const { data: unitsData } = useGetAllUnitList(1, 1000);

  useEffect(() => {
    if (id) {
      refetch();
    }
  }, [id, refetch]);

  // Cast the response data to our interface
  const responseData = data as UnitResponseData | undefined;
  const unit = responseData?.data;

  // Get all units for parent lookup
  const apiUnitsData = unitsData as ApiResponse | undefined;
  const allUnits: ApiUnit[] = apiUnitsData?.data?.units || [];

  // Find parent unit
  const parentUnit = useMemo(() => {
    if (!unit?.parent) return null;
    return allUnits.find(u => u.id === unit.parent);
  }, [unit?.parent, allUnits]);

  if (isLoading) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Loading unit...</p>
        </div>
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Unit not found</p>
          <button
            onClick={() => navigate('/products/units')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Unit Details</h1>
        <BackButton to="/products/units" />
      </div>
      
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Details Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
              <Ruler size={18} className="text-green-600 dark:text-green-400" />
              Basic Information
            </h2>
            
            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">ID</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{unit.id.slice(0, 8)}...</p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Unit Name</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{unit.name}</p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Short Code</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{unit.shortCode}</p>
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Parent Unit</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {parentUnit ? `${parentUnit.name} (${parentUnit.shortCode})` : 'None (Main Unit)'}
              </p>
            </div>
          </div>

          {/* Conversion Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
              <Calculator size={18} className="text-green-600 dark:text-green-400" />
              Conversion Information
            </h2>
            
            <div>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Conversion Factor</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{unit.conversion || 0}</p>
            </div>

            {parentUnit && (
              <div>
                <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Conversion Formula</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  1 {parentUnit.name} ({parentUnit.shortCode}) = {unit.conversion} {unit.name} ({unit.shortCode})
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewUnit;

