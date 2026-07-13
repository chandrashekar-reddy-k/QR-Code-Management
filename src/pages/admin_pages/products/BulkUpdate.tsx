import { useState, useMemo, useEffect } from "react";
import { Upload, AlertCircle } from "lucide-react";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import CustomSearchableSelect from "../../../components/ui/Input/CustomSearchableSelect";
import {
  useBulkUpdate,
  useBulkVariantUpdate,
  useDownloadBulkUpdateTemplate,
  useDownloadVariantBulkUpdateTemplate,
} from "../../../hooks/bulkUpload";
import {
  useGetProductCategoriesList,
  useGetSubcategoriesByCategoryId,
  useGetVariantIdNameList,
} from "../../../hooks/product";
import { useGetBrandsFilteredByCategory } from "../../../hooks/brands";

const BULK_UPDATE_TABS = ["Product", "Variant"] as const;

type ApiCategoryItem = {
  id: string;
  name: string;
  isActive?: boolean;
};

function useCategoryOptions(categoriesData: unknown) {
  return useMemo(() => {
    if (!categoriesData) return [{ value: "", label: "All categories" }];
    const res = categoriesData as { data?: ApiCategoryItem[] };
    const list = Array.isArray(res?.data) ? res.data : [];
    const mapped = list
      .filter((cat) => cat.isActive !== false)
      .map((cat) => ({ value: cat.id, label: cat.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ value: "", label: "All categories" }, ...mapped];
  }, [categoriesData]);
}

function useSubCategoryOptions(
  categoryFilter: string,
  subcategoriesData: unknown,
  subcategoriesLoading: boolean,
) {
  return useMemo(() => {
    if (!categoryFilter) {
      return [{ value: "", label: "All sub-categories" }];
    }
    if (subcategoriesLoading) {
      return [{ value: "", label: "Loading sub-categories..." }];
    }

    const raw = subcategoriesData as
      | Record<string, unknown>
      | unknown[]
      | undefined;
    let list: Array<Record<string, unknown>> = [];

    if (Array.isArray(raw)) {
      list = raw as Array<Record<string, unknown>>;
    } else if (raw && typeof raw === "object") {
      const d = raw.data;
      if (Array.isArray(d)) {
        list = d as Array<Record<string, unknown>>;
      } else if (d && typeof d === "object" && !Array.isArray(d)) {
        const inner =
          (d as Record<string, unknown>).data ??
          (d as Record<string, unknown>).subCategories ??
          (d as Record<string, unknown>).subcategories ??
          (d as Record<string, unknown>).items;
        if (Array.isArray(inner)) list = inner as Array<Record<string, unknown>>;
      }
      if (list.length === 0) {
        const top =
          (raw as Record<string, unknown>).subCategories ??
          (raw as Record<string, unknown>).subcategories;
        if (Array.isArray(top)) list = top as Array<Record<string, unknown>>;
      }
    }

    const mapped = list
      .filter((sub) => sub.isActive !== false)
      .map((sub) => ({
        value: String(sub.id ?? sub._id ?? sub.subCategoryId ?? ""),
        name: String(sub.name ?? sub.title ?? sub.subCategoryName ?? ""),
      }))
      .filter((s) => s.value)
      .map((s) => ({ value: s.value, label: s.name }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return [{ value: "", label: "All sub-categories" }, ...mapped];
  }, [categoryFilter, subcategoriesData, subcategoriesLoading]);
}

const BulkUpdate = () => {
  const [activeTab, setActiveTab] = useState<string>("Product");

  /* —— Product tab —— */
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [subCategoryFilter, setSubCategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const { mutate: updateFile, isPending: uploading } = useBulkUpdate();
  const { mutate: downloadProductData, isPending: downloadingProductData } =
    useDownloadBulkUpdateTemplate();
  const { mutate: updateVariantFile, isPending: variantUploading } =
    useBulkVariantUpdate();
  const {
    mutate: downloadVariantTemplate,
    isPending: downloadingVariantData,
  } = useDownloadVariantBulkUpdateTemplate();

  /* —— Variant tab (same UI; APIs wired later) —— */
  const [variantCsvFile, setVariantCsvFile] = useState<File | null>(null);
  const [variantFileName, setVariantFileName] = useState("");
  const [variantDragging, setVariantDragging] = useState(false);
  const [variantCategoryFilter, setVariantCategoryFilter] = useState("");
  const [variantSubCategoryFilter, setVariantSubCategoryFilter] = useState("");
  const [variantBrandFilter, setVariantBrandFilter] = useState("");
  const [variantProductFilter, setVariantProductFilter] = useState("");

  const { data: categoriesData } = useGetProductCategoriesList();

  const { data: subcategoriesData, isLoading: subcategoriesLoading } =
    useGetSubcategoriesByCategoryId(categoryFilter);
  const {
    data: variantSubcategoriesData,
    isLoading: variantSubcategoriesLoading,
  } = useGetSubcategoriesByCategoryId(variantCategoryFilter);

  const { data: brandsList = [] } = useGetBrandsFilteredByCategory(
    categoryFilter,
    subCategoryFilter,
  );
  const { data: variantBrandsList = [] } = useGetBrandsFilteredByCategory(
    variantCategoryFilter,
    variantSubCategoryFilter,
  );

  const variantIdNameEnabled = activeTab === "Variant";

  const { data: variantIdNameData, isPending: variantIdNamePending } =
    useGetVariantIdNameList(variantIdNameEnabled);

  const categoryOptions = useCategoryOptions(categoriesData);
  const subCategoryOptions = useSubCategoryOptions(
    categoryFilter,
    subcategoriesData,
    subcategoriesLoading,
  );
  const variantSubCategoryOptions = useSubCategoryOptions(
    variantCategoryFilter,
    variantSubcategoriesData,
    variantSubcategoriesLoading,
  );

  const brandOptions = useMemo(() => {
    const mapped = brandsList.map((b) => ({ value: b.id, label: b.name }));
    return [{ value: "", label: "All brands" }, ...mapped];
  }, [brandsList]);

  const variantBrandOptions = useMemo(() => {
    const mapped = variantBrandsList.map((b) => ({
      value: b.id,
      label: b.name,
    }));
    return [{ value: "", label: "All brands" }, ...mapped];
  }, [variantBrandsList]);

  const variantProductOptions = useMemo(() => {
    const all = { value: "", label: "All products" };
    if (variantIdNamePending && variantIdNameData == null) return [all];
    const rows =
      (variantIdNameData as { data?: { productId?: string; productName?: string }[] })
        ?.data ?? [];
    const mapped = rows
      .map((r) => ({
        value: String(r.productId ?? "").trim(),
        label: String(r.productName ?? "").trim() || String(r.productId ?? "").trim(),
      }))
      .filter((o) => o.value)
      .sort((a, b) => a.label.localeCompare(b.label));
    return [all, ...mapped];
  }, [variantIdNameData, variantIdNamePending]);

  useEffect(() => {
    setSubCategoryFilter("");
    setBrandFilter("");
  }, [categoryFilter]);

  useEffect(() => {
    setBrandFilter("");
  }, [subCategoryFilter]);

  useEffect(() => {
    setVariantSubCategoryFilter("");
    setVariantBrandFilter("");
  }, [variantCategoryFilter]);

  useEffect(() => {
    setVariantBrandFilter("");
  }, [variantSubCategoryFilter]);

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

  const handleVariantFileSelect = (file: File) => {
    const isCsv = file.type === "text/csv" || file.name.endsWith(".csv");
    const isExcel =
      file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.name.endsWith(".xlsx") ||
      file.name.endsWith(".xls");
    if (isCsv || isExcel) {
      setVariantCsvFile(file);
      setVariantFileName(file.name);
    } else {
      alert("Please select a CSV or Excel (.xlsx) file");
      setVariantCsvFile(null);
      setVariantFileName("");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleVariantFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleVariantFileSelect(file);
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
    if (file) handleFileSelect(file);
  };

  const handleVariantDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setVariantDragging(true);
  };
  const handleVariantDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setVariantDragging(false);
  };
  const handleVariantDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setVariantDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleVariantFileSelect(file);
  };

  const handleDownloadProductData = () => {
    downloadProductData({
      categoryId: categoryFilter || undefined,
      subCategoryId: subCategoryFilter || undefined,
      brandId: brandFilter || undefined,
    });
  };

  const handleDownloadVariantData = () => {
    downloadVariantTemplate({
      productId: variantProductFilter || undefined,
      categoryId: variantCategoryFilter || undefined,
      subCategoryId: variantSubCategoryFilter || undefined,
      brandId: variantBrandFilter ?? "",
    });
  };

  const handleUpdate = () => {
    if (!csvFile) {
      alert("Please select a CSV or Excel file to update");
      return;
    }
    updateFile(csvFile, {
      onSuccess: () => handleClear(),
    });
  };

  const handleVariantUpdate = () => {
    if (!variantCsvFile) {
      alert("Please select a CSV or Excel file to update");
      return;
    }
    updateVariantFile(variantCsvFile, {
      onSuccess: () => handleVariantClear(),
    });
  };

  const handleClear = () => {
    setCsvFile(null);
    setFileName("");
    const fileInput = document.getElementById(
      "csv-file-input-update",
    ) as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleVariantClear = () => {
    setVariantCsvFile(null);
    setVariantFileName("");
    const fileInput = document.getElementById(
      "csv-file-input-variant-update",
    ) as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const tabSlug = (tab: string) => tab.toLowerCase();

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          Bulk Update
        </h1>
      </div>

      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Tabs — same pattern as ViewDeliveryAgent */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div
          className="flex border-b border-gray-200 overflow-x-auto tabs-scrollbar"
          role="tablist"
          aria-label="Bulk update type"
        >
          {BULK_UPDATE_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              id={`bulk-update-tab-${tabSlug(tab)}`}
              aria-controls={`bulk-update-panel-${tabSlug(tab)}`}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "text-gray-900 border-b-2 border-orange-500 dark:border-orange-400"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Product panel */}
      <div
        id="bulk-update-panel-product"
        role="tabpanel"
        aria-labelledby="bulk-update-tab-product"
        hidden={activeTab !== "Product"}
        className={activeTab !== "Product" ? "hidden" : undefined}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-3">
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
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-600 rounded-full flex items-center justify-center mb-3">
                    <Upload size={24} className="text-white" />
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-gray-800 mb-1.5">
                    Drag and Drop or Choose file to upload
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-600 mb-3">
                    Supported formats: CSV or Excel (.xlsx)
                  </p>
                  <input
                    id="csv-file-input-update"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="csv-file-input-update"
                    className="inline-block px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-[10px] sm:text-xs font-medium cursor-pointer"
                  >
                    Choose File
                  </label>
                  {csvFile && (
                    <p className="text-[10px] text-gray-600 mt-2">
                      Selected: {fileName} ({(csvFile.size / 1024).toFixed(2)}{" "}
                      KB)
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleUpdate}
                disabled={!csvFile || uploading}
                className="px-4 py-1.5 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? "Updating..." : "Update"}
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={!csvFile || uploading}
                className="text-xs text-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-4 sm:p-5">
              <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-3">
                Instructions
              </h4>
              <ul className="space-y-2 mb-4">
                <li className="flex gap-2.5 text-[11px] sm:text-xs text-blue-800 dark:text-blue-300 leading-snug">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-blue-800 dark:bg-blue-400"
                    aria-hidden
                  />
                  <span>Download Product Data file as CSV.</span>
                </li>
                <li className="flex gap-2.5 text-[11px] sm:text-xs text-blue-800 dark:text-blue-300 leading-snug">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-blue-800 dark:bg-blue-400"
                    aria-hidden
                  />
                  <span>
                    Change product name, price, stock relate information and
                    update.
                  </span>
                </li>
                <li className="flex gap-2.5 text-[11px] sm:text-xs text-blue-800 dark:text-blue-300 leading-snug">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-blue-800 dark:bg-blue-400"
                    aria-hidden
                  />
                  <span>
                    Optional: use filters below to narrow the export; leave as
                    &apos;All&apos; for everything.
                  </span>
                </li>
              </ul>
              <div className="space-y-3 mb-4">
                <CustomSearchableSelect
                  label="Category"
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  options={categoryOptions}
                  placeholder="Select"
                />
                <CustomSearchableSelect
                  label="Sub-category"
                  value={subCategoryFilter}
                  onChange={setSubCategoryFilter}
                  options={subCategoryOptions}
                  disabled={!categoryFilter || subcategoriesLoading}
                  placeholder="Select"
                />
                <div>
                  <CustomSearchableSelect
                    label="Brands"
                    value={brandFilter}
                    onChange={setBrandFilter}
                    options={brandOptions}
                    disabled={!categoryFilter || !subCategoryFilter}
                    placeholder="Select"
                  />
                  {!categoryFilter || !subCategoryFilter ? (
                    <p className="text-[10px] text-gray-500 mt-1">
                      Select category and sub-category to load brands.
                    </p>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadProductData}
                disabled={downloadingProductData}
                className="w-full px-3 py-2.5 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloadingProductData
                  ? "Downloading..."
                  : "Download Product Data File"}
              </button>
            </div>

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

      {/* Variant panel — same layout; APIs stubbed */}
      <div
        id="bulk-update-panel-variant"
        role="tabpanel"
        aria-labelledby="bulk-update-tab-variant"
        hidden={activeTab !== "Variant"}
        className={activeTab !== "Variant" ? "hidden" : undefined}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-3">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-5">
              <div
                className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors ${
                  variantDragging
                    ? "border-gray-400 dark:border-gray-500 bg-gray-50"
                    : "border-gray-300 dark:border-gray-600 bg-white hover:border-gray-400 dark:hover:border-gray-500"
                }`}
                onDragOver={handleVariantDragOver}
                onDragLeave={handleVariantDragLeave}
                onDrop={handleVariantDrop}
              >
                <div className="flex flex-col items-center justify-center">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-600 rounded-full flex items-center justify-center mb-3">
                    <Upload size={24} className="text-white" />
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-gray-800 mb-1.5">
                    Drag and Drop or Choose file to upload
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-600 mb-3">
                    Supported formats: CSV or Excel (.xlsx)
                  </p>
                  <input
                    id="csv-file-input-variant-update"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleVariantFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="csv-file-input-variant-update"
                    className="inline-block px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-[10px] sm:text-xs font-medium cursor-pointer"
                  >
                    Choose File
                  </label>
                  {variantCsvFile && (
                    <p className="text-[10px] text-gray-600 mt-2">
                      Selected: {variantFileName} (
                      {(variantCsvFile.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleVariantUpdate}
                disabled={!variantCsvFile || variantUploading}
                className="px-4 py-1.5 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {variantUploading ? "Updating..." : "Update"}
              </button>
              <button
                type="button"
                onClick={handleVariantClear}
                disabled={!variantCsvFile || variantUploading}
                className="text-xs text-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 p-4 sm:p-5">
              <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-3">
                Instructions
              </h4>
              <ul className="space-y-2 mb-4">
                <li className="flex gap-2.5 text-[11px] sm:text-xs text-blue-800 dark:text-blue-300 leading-snug">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-blue-800 dark:bg-blue-400"
                    aria-hidden
                  />
                  <span>Download variant data file as CSV.</span>
                </li>
                <li className="flex gap-2.5 text-[11px] sm:text-xs text-blue-800 dark:text-blue-300 leading-snug">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-blue-800 dark:bg-blue-400"
                    aria-hidden
                  />
                  <span>
                    Change variant fields as per the template, then upload to
                    update.
                  </span>
                </li>
                <li className="flex gap-2.5 text-[11px] sm:text-xs text-blue-800 dark:text-blue-300 leading-snug">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-blue-800 dark:bg-blue-400"
                    aria-hidden
                  />
                  <span>
                    Optional: use filters below to narrow the export; leave as
                    &apos;All&apos; for everything.
                  </span>
                </li>
              </ul>
              <div className="space-y-3 mb-4">
                <CustomSearchableSelect
                  label="Product"
                  value={variantProductFilter}
                  onChange={setVariantProductFilter}
                  options={variantProductOptions}
                  placeholder="Select"
                />
                <CustomSearchableSelect
                  label="Category"
                  value={variantCategoryFilter}
                  onChange={setVariantCategoryFilter}
                  options={categoryOptions}
                  placeholder="Select"
                />
                <CustomSearchableSelect
                  label="Sub-category"
                  value={variantSubCategoryFilter}
                  onChange={setVariantSubCategoryFilter}
                  options={variantSubCategoryOptions}
                  disabled={
                    !variantCategoryFilter || variantSubcategoriesLoading
                  }
                  placeholder="Select"
                />
                <div>
                  <CustomSearchableSelect
                    label="Brands"
                    value={variantBrandFilter}
                    onChange={setVariantBrandFilter}
                    options={variantBrandOptions}
                    disabled={
                      !variantCategoryFilter || !variantSubCategoryFilter
                    }
                    placeholder="Select"
                  />
                  {!variantCategoryFilter || !variantSubCategoryFilter ? (
                    <p className="text-[10px] text-gray-500 mt-1">
                      Select category and sub-category to load brands.
                    </p>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadVariantData}
                disabled={downloadingVariantData}
                className="w-full px-3 py-2.5 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloadingVariantData
                  ? "Downloading..."
                  : "Download Variant Data File"}
              </button>
            </div>

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
    </div>
  );
};

export default BulkUpdate;
