import { useState } from "react";
import { Upload, Download, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import { useBulkUpload, useDownloadSample } from "../../../hooks/bulkUpload";

const BulkUpload = () => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const { mutate: uploadFile, isPending: uploading } = useBulkUpload();
  const { mutate: downloadSample, isPending: downloadingSample } =
    useDownloadSample();

  const handleFileSelect = (file: File) => {
    const isCsv = file.type === "text/csv" || file.name.endsWith(".csv");
    const isExcel =
      file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.name.endsWith(".xlsx") ||
      file.name.endsWith(".xls");
    if (isCsv || isExcel) {
      setCsvFile(file);
      setFileName(file.name);
    } else {
      alert("Please select a CSV or Excel (.xlsx) file");
      setCsvFile(null);
      setFileName("");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDownloadSample = () => {
    downloadSample();
  };

  const handleUpload = () => {
    if (!csvFile) {
      toast.error("Please select a CSV or Excel file to upload");
      return;
    }

    uploadFile(csvFile, {
      onSuccess: () => {
        setCsvFile(null);
        setFileName("");
        // Reset file input
        const fileInput = document.getElementById(
          "csv-file-input"
        ) as HTMLInputElement;
        if (fileInput) {
          fileInput.value = "";
        }
      },
    });
  };

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Bulk Uploads
        </h1>
        <button
          onClick={handleDownloadSample}
          disabled={downloadingSample}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={16} className="text-white" />
          {downloadingSample ? "Downloading..." : "Download Sample file"}
        </button>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Left Section - File Upload and Actions */}
        <div className="space-y-3">
          {/* Upload Area */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-5">
            <div
              className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors ${
                isDragging
                  ? "border-gray-400 dark:border-gray-500 bg-gray-50"
                  : "border-gray-300 dark:border-gray-600 bg-white hover:border-gray-400 dark:hover:border-gray-500"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center justify-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-600 dark:bg-green-700 rounded-full flex items-center justify-center mb-3">
                  <Upload size={24} className="text-white" />
                </div>
                <p className="text-[10px] sm:text-xs text-gray-600 mb-3">
                  Supported formats: CSV or Excel (.xlsx)
                </p>
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="csv-file-input"
                  className="inline-block px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-[10px] sm:text-xs font-medium cursor-pointer"
                >
                  Choose File
                </label>
                {csvFile && (
                  <p className="text-[10px] text-gray-600 mt-2">
                    Selected: {fileName} ({(csvFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <button
              onClick={handleUpload}
              disabled={!csvFile || uploading}
              className="px-4 py-1.5 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? "Uploading..." : "Submit File"}
            </button>
          </div>
        </div>

        {/* Right Section - Alert Box */}
        <div>
          <div className="bg-white rounded-xl shadow-md border-2 border-orange-200 dark:border-orange-700/50 p-3 sm:p-4">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-orange-500 dark:bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle size={14} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] sm:text-xs font-semibold text-gray-800 mb-1">
                  Always download and use new sample file if you did updated
                  partner panel version.
                </p>
                <p className="text-[10px] sm:text-xs text-gray-700">
                  Read and follow instructions carefully before proceed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkUpload;
