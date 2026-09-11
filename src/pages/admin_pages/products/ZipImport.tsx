import { useState } from "react";
import { FolderArchive, Upload, Download, AlertCircle, X, AlertTriangle, FileText, Image, CheckCircle2 } from "lucide-react";
import { toast } from "react-toastify";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import {
  useDownloadProductZipTemplate,
  useProductZipUpload,
  type ProductZipUploadResponse
} from "../../../hooks/bulkUpload";

const ZipImport = () => {
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadResult, setUploadResult] = useState<ProductZipUploadResponse | null>(null);

  const { mutate: uploadZip, isPending: uploading } = useProductZipUpload();
  const { mutate: downloadZipTemplate, isPending: downloadingTemplate } =
    useDownloadProductZipTemplate();

  const handleFileSelect = (file: File) => {
    setUploadResult(null);
    const isZip = file.type === "application/zip" || file.type === "application/x-zip-compressed" || file.name.endsWith(".zip");
    if (isZip) {
      setZipFile(file);
      setFileName(file.name);
    } else {
      toast.error("Please select a valid ZIP archive (.zip) file");
      setZipFile(null);
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

  const handleDownloadTemplate = () => {
    downloadZipTemplate();
  };

  const handleUpload = () => {
    if (!zipFile) {
      toast.error("Please select a ZIP file to upload");
      return;
    }

    uploadZip(zipFile, {
      onSuccess: (data) => {
        setUploadResult(data ?? null);
        setZipFile(null);
        setFileName("");
        const fileInput = document.getElementById("zip-file-input") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      },
    });
  };

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title & Action Header */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FolderArchive className="text-blue-600 dark:text-blue-400" size={24} />
            ZIP Bulk Import
          </h1>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            Bulk upload products along with their images using a single ZIP archive.
          </p>
        </div>

        <button
          onClick={handleDownloadTemplate}
          disabled={downloadingTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <Download size={16} className="text-white" />
          {downloadingTemplate ? "Downloading Template..." : "Download Sample ZIP"}
        </button>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Section - File Upload & Submit */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-5">
            <div
              className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-all ${
                isDragging
                  ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
                  : "border-gray-300 dark:border-gray-600 hover:border-blue-400 bg-gray-50/30 dark:bg-gray-800/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center justify-center">
                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-3">
                  <FolderArchive size={28} />
                </div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                  Upload ZIP Archive
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 max-w-xs">
                  Archive must contain an Excel file (.xlsx) and an <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400 font-mono">images/</code> directory.
                </p>
                
                <input
                  id="zip-file-input"
                  type="file"
                  accept=".zip"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                <label
                  htmlFor="zip-file-input"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-xs font-medium cursor-pointer shadow-sm"
                >
                  <Upload size={14} />
                  Choose .ZIP File
                </label>

                {zipFile && (
                  <div className="mt-3 p-2 px-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md flex items-center gap-2 text-xs text-blue-800 dark:text-blue-300">
                    <FolderArchive size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <span className="truncate font-medium">{fileName}</span>
                    <span className="text-blue-500 dark:text-blue-400 text-[11px]">({(zipFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex justify-center">
              <button
                onClick={handleUpload}
                disabled={!zipFile || uploading}
                className="w-full sm:w-auto px-6 py-2.5 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Extracting & Uploading Products...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    Start ZIP Import
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Summary Section */}
          {uploadResult?.data && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <CheckCircle2 className="text-green-600" size={16} />
                  Import Execution Results
                </h3>
                <button
                  type="button"
                  onClick={() => setUploadResult(null)}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-gray-50 dark:bg-gray-750 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Total Rows</p>
                    <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{uploadResult.data.totalRecords ?? 0}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-2.5 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-[11px] text-green-700 dark:text-green-400 font-medium">Success</p>
                    <p className="text-lg font-bold text-green-700 dark:text-green-400">{uploadResult.data.successCount ?? 0}</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-[11px] text-blue-700 dark:text-blue-400 font-medium">Images Uploaded</p>
                    <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{uploadResult.data.imagesProcessed ?? 0}</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 p-2.5 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-[11px] text-red-700 dark:text-red-400 font-medium">Failed</p>
                    <p className="text-lg font-bold text-red-700 dark:text-red-400">{uploadResult.data.failedCount ?? 0}</p>
                  </div>
                </div>

                {uploadResult.data.errors && uploadResult.data.errors.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-1.5">
                      <AlertTriangle size={15} className="text-amber-500" />
                      Row Validation & Image Warnings ({uploadResult.data.errors.length})
                    </p>
                    <ul className="max-h-56 overflow-y-auto space-y-2 rounded-lg bg-red-50/50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-3">
                      {uploadResult.data.errors.map((err, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-gray-800 dark:text-gray-200 border-b border-red-100 dark:border-red-900/30 last:border-0 pb-2 last:pb-0"
                        >
                          <span className="font-semibold text-red-700 dark:text-red-400">
                            Row {err.row}
                          </span>
                          {err.field && (
                            <span className="text-gray-500 dark:text-gray-400 ml-1 font-mono text-[11px]">
                              [{err.field}]
                            </span>
                          )}
                          <p className="mt-0.5 text-gray-700 dark:text-gray-300 break-words">
                            {err.message}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Section - Instructions Card */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center">
                <AlertCircle size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">ZIP File Guidelines & Structure</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Follow these instructions for seamless zip bulk import.</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs text-gray-700 dark:text-gray-300">
              <div className="flex items-start gap-2.5 bg-gray-50 dark:bg-gray-750 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <FolderArchive size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200 mb-0.5">1. Folder Structure inside .ZIP</p>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    Keep an Excel sheet (<code className="bg-white dark:bg-gray-700 border dark:border-gray-600 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400 font-mono">Products_Template.xlsx</code>) and a folder named <code className="bg-white dark:bg-gray-700 border dark:border-gray-600 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400 font-mono">images/</code> inside the zip archive.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-gray-50 dark:bg-gray-750 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <Image size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200 mb-0.5">2. Image Filename Mapping</p>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    Place image files (e.g. <code className="bg-white dark:bg-gray-700 border dark:border-gray-600 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400 font-mono">apple.jpg</code>) inside the <code className="bg-white dark:bg-gray-700 border dark:border-gray-600 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400 font-mono">images/</code> folder.
                    In Excel, specify the filename in the <code className="bg-white dark:bg-gray-700 border dark:border-gray-600 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400 font-mono">images</code> or <code className="bg-white dark:bg-gray-700 border dark:border-gray-600 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400 font-mono">product image</code> column.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-gray-50 dark:bg-gray-750 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <FileText size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200 mb-0.5">3. Multiple Images per Product</p>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    To associate multiple images with a product, separate filenames with a comma in Excel: <code className="bg-white dark:bg-gray-700 border dark:border-gray-600 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400 font-mono">apple_front.jpg, apple_back.jpg</code>.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="font-semibold text-amber-800 dark:text-amber-300 mb-1 flex items-center gap-1">
                  <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400" />
                  Important Tip
                </p>
                <p className="text-amber-700 dark:text-amber-400 text-[11px] leading-relaxed">
                  Download the sample ZIP file above to see the exact Excel headers and directory structure. Ensure category, subcategory, unit, and prices are accurately filled out.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZipImport;
