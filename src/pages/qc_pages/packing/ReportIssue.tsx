import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Camera, CheckCircle, FileText, X, Info } from 'lucide-react';
import { issueService } from '../../../api/packing/issueService';
import { qualityCheckService, PendingQCWorkOrder } from '../../../api/packing/qualityCheckService';
import { getQCUser } from './qcAuth';
import toast from 'react-hot-toast';

const issueTypes = [
  'PRODUCT_QUALITY',
  'PACKAGING_DEFECT',
  'BARCODE_LABEL_MISMATCH',
  'QUANTITY_MISMATCH',
  'BATCH_EXPIRY_ISSUE',
  'APP_SYSTEM_ISSUE',
  'OTHER',
];

export const ReportIssue: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getQCUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialWoId = location.state?.woId || '';
  const initialWoText = location.state?.woText || '';

  const [type, setType] = useState('PRODUCT_QUALITY');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('HIGH');

  // Job selection state
  const [woId, setWoId] = useState(initialWoId);
  const [activeJobs, setActiveJobs] = useState<PendingQCWorkOrder[]>([]);
  const [isJobLocked, setIsJobLocked] = useState(!!initialWoId);

  // Attachments
  const [photos, setPhotos] = useState<string[]>([]);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResponse, setSuccessResponse] = useState<any>(null);

  useEffect(() => {
    qualityCheckService
      .getPendingQCWorkOrders()
      .then((res) => {
        setActiveJobs(res || []);
      })
      .catch(console.error);
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (photos.length >= 3) {
        toast.error('Maximum 3 images allowed.');
        return;
      }
      const newFiles = Array.from(e.target.files);
      const remainingSlots = 3 - photos.length;
      const filesToProcess = newFiles.slice(0, remainingSlots);
      const newPhotoUrls = filesToProcess.map((file) => URL.createObjectURL(file));
      setPhotos((prev) => [...prev, ...newPhotoUrls]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const isFormValid = description.trim().length >= 10 && description.trim().length <= 500 && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    try {
      setIsSubmitting(true);
      const res = await issueService.reportIssue({
        type,
        description: description.trim(),
        priority,
        photoUrls: photos,
        woId: woId || null,
        reportedById: user.id,
      });
      toast.success('QC Defect / Issue reported successfully.');
      setSuccessResponse(res.data?.data?.issue || res.data?.issue || { id: `QC-ISS-${Date.now().toString().slice(-6)}`, woId });
    } catch (error: any) {
      console.error('Failed to report QC issue', error);
      toast.error(error?.response?.data?.message || 'Failed to submit issue. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successResponse) {
    return (
      <div className="max-w-md mx-auto md:max-w-2xl px-4 sm:px-6 py-12 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400 p-6 rounded-full mb-6 shadow-xs border border-green-200 dark:border-green-800">
          <CheckCircle size={64} className="mx-auto" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">QC Issue Reported</h2>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 max-w-sm">
          Plant Quality Manager and Operations Supervisor have been alerted for action.
        </p>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-8 w-full shadow-xs flex items-center justify-center">
          <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">Defect Ticket Ref:</span>
          <span className="font-mono font-bold text-gray-800 dark:text-gray-100">
            {typeof successResponse.id === 'string' ? successResponse.id.substring(0, 10).toUpperCase() : 'QC-ISS-LOG'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {woId && (
            <button
              onClick={() => navigate('/packer/qc/active-inspection')}
              className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 font-bold py-3 px-6 rounded-xl text-xs transition-colors w-full sm:w-auto shadow-xs cursor-pointer"
            >
              Back to Active QC Inspection
            </button>
          )}
          <button
            onClick={() => navigate('/packer/qc/dashboard')}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl text-xs transition-colors w-full sm:w-auto shadow-xs cursor-pointer"
          >
            Go to QC Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto md:max-w-4xl pb-24 px-4 sm:px-6">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6 pt-2">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-xs border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
        >
          <ArrowLeft size={18} className="text-gray-700 dark:text-gray-200" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Report Quality Defect</h1>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 md:p-8 shadow-xs border border-gray-100 dark:border-gray-700 mb-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-5">
            {/* Issue Type */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-2">
                Defect Category <span className="text-red-500">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-slate-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-3 font-semibold text-xs focus:ring-2 focus:ring-green-500 focus:outline-none"
                required
              >
                {issueTypes.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Related Job */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-2">Related Work Order</label>
              {isJobLocked && initialWoId ? (
                <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800 rounded-xl p-3">
                  <div className="flex items-center text-blue-800 dark:text-blue-300">
                    <FileText size={18} className="mr-2 opacity-70" />
                    <div className="flex flex-col">
                      <span className="font-bold text-xs leading-tight">{initialWoText.split(' - ')[0]}</span>
                      <span className="text-[11px] opacity-80">{initialWoText.split(' - ')[1]}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsJobLocked(false)}
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 px-3 py-1 rounded-lg shadow-xs cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <select
                  value={woId}
                  onChange={(e) => setWoId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-3 font-semibold text-xs focus:ring-2 focus:ring-green-500 focus:outline-none"
                >
                  <option value="">General Quality Defect (No Specific Work Order)</option>
                  {activeJobs.map((wo) => (
                    <option key={wo.id} value={wo.id}>
                      {wo.woNumber} - {wo.product?.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Severity / Priority */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-2">Severity / Priority</label>
              <div className="flex gap-2 p-1 bg-slate-100 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                {['LOW', 'MEDIUM', 'HIGH'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      priority === p
                        ? p === 'HIGH'
                          ? 'bg-red-500 text-white shadow-xs'
                          : p === 'MEDIUM'
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'bg-blue-500 text-white shadow-xs'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-5">
            {/* Description */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-200">
                  Defect Description <span className="text-red-500">*</span>
                </label>
                <span className={`text-[11px] font-medium ${description.length < 10 ? 'text-red-500' : 'text-gray-400'}`}>
                  {description.length}/500
                </span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.substring(0, 500))}
                placeholder="Describe the defect or mismatch details (min 10 characters)..."
                className="w-full bg-slate-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-3 text-xs font-medium focus:ring-2 focus:ring-green-500 focus:outline-none resize-none min-h-[130px]"
                required
              />
              {description.length > 0 && description.length < 10 && (
                <p className="text-red-500 text-[11px] mt-1 flex items-center">
                  <Info size={12} className="mr-1" /> Minimum 10 characters required.
                </p>
              )}
            </div>

            {/* Evidence Attachments */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-200">Defect Photo Evidence</label>
                <span className="text-[11px] font-medium text-gray-400">{photos.length}/3</span>
              </div>

              {photos.length > 0 && (
                <div className="flex gap-3 mb-3 overflow-x-auto pb-2">
                  {photos.map((src, index) => (
                    <div key={index} className="relative flex-none w-20 h-20 rounded-xl border border-gray-200 overflow-hidden bg-gray-100">
                      <img src={src} alt="Defect Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {photos.length < 3 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 bg-slate-50 dark:bg-gray-900 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <div className="flex gap-4 items-center">
                    <Camera size={20} className="text-gray-500" />
                    <span className="text-xs font-semibold">Take Defect Photo / Upload Evidence</span>
                  </div>
                </button>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
              />
            </div>
          </div>
        </form>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!isFormValid}
          className="w-full md:w-64 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl text-xs transition-all shadow-xs active:scale-95 cursor-pointer flex items-center justify-center"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Quality Defect'}
        </button>
      </div>
    </div>
  );
};

export default ReportIssue;
