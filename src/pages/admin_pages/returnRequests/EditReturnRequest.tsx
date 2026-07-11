import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetReturnRequestById, useUpdateReturnRequestStatus } from "../../../hooks/returnRequest";
import { toast } from "react-toastify";
import { ReturnRequest } from '../../../types';
import { FormSectionWithDots, SelectInput, Button, PrimaryButton } from '../../../components/ui';
import Breadcrumbs from '../../../components/common/Breadcrumbs';
import BackButton from '../../../components/common/BackButton';
import { Save } from 'lucide-react';



const EditReturnRequest = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    status: 'pending' as 'pending' | 'approved' | 'rejected' | 'completed',
    reason: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [request, setRequest] = useState<ReturnRequest | null>(null);

  const { data: apiData, isLoading: loading, isError } = useGetReturnRequestById(id);
  const updateStatusMutation = useUpdateReturnRequestStatus(id);

  useEffect(() => {
    if (apiData?.data) {
      const foundRequest = apiData.data;
      setRequest(foundRequest);
      setFormData({
        status: foundRequest.status,
        reason: foundRequest.reason || '',
      });
    }
  }, [apiData]);

  useEffect(() => {
    if (isError) {
      toast.error("Return request not found!");
      navigate('/return-requests');
    }
  }, [isError, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.status) {
      newErrors.status = 'Status is required';
    }
    if (!formData.reason.trim()) {
      newErrors.reason = 'Reason is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      try {
        await updateStatusMutation.mutateAsync({
          status: formData.status,
          reason: formData.reason,
        });
        navigate('/return-requests');
      } catch (error: unknown) {
        console.error('Error updating return request:', error);
      }
    }
  };

  if (loading && !request) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-gray-500">Loading return request...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
        <div className="p-8 text-center">
          <p className="text-gray-500 mb-4">Return request not found</p>
          <button
            onClick={() => navigate('/return-requests')}
            className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
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
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Edit Return Request
        </h1>
        <BackButton to="/return-requests" />
      </div>
      
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Request Info Card */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6 mb-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Request Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600">Request ID</label>
            <p className="text-sm font-semibold text-gray-900">{request.id}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">User ID</label>
            <p className="text-sm font-semibold text-gray-900">{request.userId}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Customer Name</label>
            <p className="text-sm font-semibold text-gray-900">{request.name}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Product Name</label>
            <p className="text-sm font-semibold text-gray-900">{request.productName}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Quantity</label>
            <p className="text-sm font-semibold text-gray-900">{request.quantity}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Total Amount</label>
            <p className="text-sm font-semibold text-gray-900">₹{request.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6">
        <div className="max-w-4xl">
          {/* Update Return Request Section */}
          <FormSectionWithDots title="Update Return Request">
            {/* Status */}
            <SelectInput
              label="Status"
              required
              name="status"
              value={formData.status}
              onChange={handleChange}
              error={errors.status}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
            </SelectInput>

            {/* Reason */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Reason <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                placeholder="Enter return reason"
                rows={4}
                className={`w-full px-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 bg-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400 ${
                  errors.reason ? 'border-red-300 dark:border-red-600 focus:ring-red-500 dark:focus:ring-red-400' : 'border-gray-300 dark:border-gray-600 focus:ring-gray-400 dark:focus:ring-gray-500'
                }`}
              />
              {errors.reason && <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">{errors.reason}</p>}
            </div>
          </FormSectionWithDots>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/return-requests')}
              className="px-4 py-2 text-xs font-medium"
            >
              Cancel
            </Button>
            <PrimaryButton
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium"
            >
              <Save size={14} />
              <span>Update Return Request</span>
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditReturnRequest;

