import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import fetchData from "../helper";
import { URL } from "../config";

interface BulkUploadResponse {
  status: boolean;
  response: string;
  data?: any;
}

const parseFilenameFromDisposition = (disposition: string | null): string | null => {
  if (!disposition) return null;
  // filename*=UTF-8''... (RFC 5987)
  const star = disposition.match(/filename\*\s*=\s*([^;]+)/i);
  if (star?.[1]) {
    const raw = star[1].trim().replace(/^UTF-8''/i, "").replace(/^["']|["']$/g, "");
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  // filename="..." or filename=...
  const plain = disposition.match(/filename\s*=\s*([^;]+)/i);
  if (!plain?.[1]) return null;
  return plain[1].trim().replace(/^["']|["']$/g, "");
};

const inferExtensionFromContentType = (contentType: string | null): "xlsx" | "csv" => {
  const ct = String(contentType || "").toLowerCase();
  if (
    ct.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") ||
    ct.includes("application/vnd.ms-excel")
  ) {
    return "xlsx";
  }
  return "csv";
};

const ensureMatchingExtension = (filename: string, contentType: string | null): string => {
  const preferredExt = inferExtensionFromContentType(contentType);
  const hasCsv = /\.csv$/i.test(filename);
  const hasXlsx = /\.(xlsx|xls)$/i.test(filename);
  if ((preferredExt === "xlsx" && hasXlsx) || (preferredExt === "csv" && hasCsv)) {
    return filename;
  }
  const base = filename.replace(/\.[^.]+$/, "");
  return `${base}.${preferredExt}`;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object") {
    const e = error as { message?: unknown; response?: unknown; data?: unknown };
    if (typeof e.message === "string" && e.message.trim()) return e.message;
    if (typeof e.response === "string" && e.response.trim()) return e.response;
    if (e.data && typeof e.data === "object") {
      const d = e.data as { message?: unknown; response?: unknown };
      if (typeof d.message === "string" && d.message.trim()) return d.message;
      if (typeof d.response === "string" && d.response.trim()) return d.response;
    }
  }
  return fallback;
};

const useBulkUpload = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const data = await fetchData<BulkUploadResponse>(
        "productmanagement/product/bulk",
        "POST",
        formData
      );
      return data;
    },
    onSuccess: (data: BulkUploadResponse) => {
      toast.success(data.response || "Bulk upload completed successfully!");
      queryClient.invalidateQueries({ queryKey: ["product"] });
    },
    onError: (error: unknown) => {
      const errorMessage = getErrorMessage(
        error,
        "Error uploading CSV file. Please try again."
      );
      toast.error(errorMessage);
    },
  });
};

const useDownloadSample = () => {
  return useMutation({
    mutationFn: async () => {
      const baseUrl = URL;
      if (!baseUrl) {
        throw new Error("Base URL not configured");
      }

      const fullUrl = `${baseUrl.replace(/\/$/, "")}/productmanagement/product/template/download`;

      const headers: HeadersInit = {};
      const token = sessionStorage.getItem("staffToken") || localStorage.getItem("partnerToken") || localStorage.getItem("token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(fullUrl, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error("Failed to download sample file");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const contentType = response.headers.get("Content-Type");
      const parsedName = parseFilenameFromDisposition(disposition);
      const fallback =
        inferExtensionFromContentType(contentType) === "xlsx"
          ? "product_bulk_upload_template.xlsx"
          : "product_bulk_upload_template.csv";
      const filename = ensureMatchingExtension(parsedName || fallback, contentType);
      return { blob, filename };
    },
    onSuccess: (result: { blob: Blob; filename: string }) => {
      const { blob, filename } = result;
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Sample file downloaded successfully!");
    },
    onError: (error: unknown) => {
      const errorMessage = getErrorMessage(
        error,
        "Error downloading sample file. Please try again."
      );
      toast.error(errorMessage);
    },
  });
};

const useBulkUpdate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const data = await fetchData<BulkUploadResponse>(
        "productmanagement/product/bulk/update",
        "POST",
        formData
      );
      return data;
    },
    onSuccess: (data: BulkUploadResponse) => {
      toast.success(data.response || "Bulk update completed successfully!");
      queryClient.invalidateQueries({ queryKey: ["product"] });
    },
    onError: (error: unknown) => {
      const errorMessage = getErrorMessage(
        error,
        "Error updating CSV file. Please try again."
      );
      toast.error(errorMessage);
    },
  });
};

export type BulkUpdateDownloadFilters = {
  categoryId?: string;
  subCategoryId?: string;
  brandId?: string;
};

const useDownloadBulkUpdateTemplate = () => {
  return useMutation({
    mutationFn: async (filters?: BulkUpdateDownloadFilters) => {
      const baseUrl = URL;
      if (!baseUrl) {
        throw new Error("Base URL not configured");
      }

      const params = new URLSearchParams();
      const cid = filters?.categoryId?.trim();
      const sid = filters?.subCategoryId?.trim();
      const bid = filters?.brandId?.trim();
      if (cid) params.set("categories", cid);
      if (sid) params.set("subcategories", sid);
      if (bid) params.set("brands", bid);
      const qs = params.toString();
      const fullUrl = `${baseUrl.replace(/\/$/, "")}/productmanagement/product/template/update/download${qs ? `?${qs}` : ""}`;

      const headers: HeadersInit = {};
      const token = sessionStorage.getItem("staffToken") || localStorage.getItem("partnerToken") || localStorage.getItem("token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(fullUrl, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error("Failed to download product data file");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const contentType = response.headers.get("Content-Type");
      const parsedName = parseFilenameFromDisposition(disposition);
      const fallback =
        inferExtensionFromContentType(contentType) === "xlsx"
          ? "product_bulk_update_template.xlsx"
          : "product_bulk_update_template.csv";
      const filename = ensureMatchingExtension(parsedName || fallback, contentType);
      return { blob, filename };
    },
    onSuccess: (result: { blob: Blob; filename: string }) => {
      const { blob, filename } = result;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Product data file downloaded successfully!");
    },
    onError: (error: unknown) => {
      const errorMessage = getErrorMessage(
        error,
        "Error downloading product data file. Please try again."
      );
      toast.error(errorMessage);
    },
  });
};

export type VariantBulkUpdateTemplateFilters = {
  productId?: string;
  categoryId?: string;
  subCategoryId?: string;
  brandId?: string;
};

const useBulkVariantUpdate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const data = await fetchData<BulkUploadResponse>(
        "productmanagement/variant/bulk-update",
        "POST",
        formData,
      );
      return data;
    },
    onSuccess: (data: BulkUploadResponse) => {
      toast.success(
        data.response || "Variant bulk update completed successfully!",
      );
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({ queryKey: ["variantIdNameList"] });
      queryClient.invalidateQueries({ queryKey: ["variantsByProduct"] });
    },
    onError: (error: unknown) => {
      const errorMessage = getErrorMessage(
        error,
        "Error updating variant file. Please try again.",
      );
      toast.error(errorMessage);
    },
  });
};

const useDownloadVariantBulkUpdateTemplate = () => {
  return useMutation({
    mutationFn: async (filters?: VariantBulkUpdateTemplateFilters) => {
      const baseUrl = URL;
      if (!baseUrl) {
        throw new Error("Base URL not configured");
      }

      const params = new URLSearchParams();
      const pid = filters?.productId?.trim();
      const cid = filters?.categoryId?.trim();
      const sid = filters?.subCategoryId?.trim();
      const bid = filters?.brandId?.trim() ?? "";
      if (pid) params.set("productId", pid);
      if (cid) params.set("categoryId", cid);
      if (sid) params.set("subCategoryId", sid);
      params.set("brandId", bid);

      const qs = params.toString();
      const fullUrl = `${baseUrl.replace(/\/$/, "")}/productmanagement/variant/bulk-update-template${qs ? `?${qs}` : ""}`;

      const headers: HeadersInit = {};
      const token = localStorage.getItem("token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(fullUrl, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error("Failed to download variant data file");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const contentType = response.headers.get("Content-Type");
      const parsedName = parseFilenameFromDisposition(disposition);
      const fallback =
        inferExtensionFromContentType(contentType) === "xlsx"
          ? "variant_bulk_update_template.xlsx"
          : "variant_bulk_update_template.csv";
      const filename = ensureMatchingExtension(
        parsedName || fallback,
        contentType,
      );
      return { blob, filename };
    },
    onSuccess: (result: { blob: Blob; filename: string }) => {
      const { blob, filename } = result;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Variant data file downloaded successfully!");
    },
    onError: (error: unknown) => {
      const errorMessage = getErrorMessage(
        error,
        "Error downloading variant data file. Please try again.",
      );
      toast.error(errorMessage);
    },
  });
};

export interface ProductZipUploadError {
  row: number;
  field: string;
  message: string;
}

export interface ProductZipUploadResponse {
  status: boolean;
  response?: string;
  data?: {
    totalRecords?: number;
    successCount?: number;
    failedCount?: number;
    imagesProcessed?: number;
    errors?: ProductZipUploadError[];
  };
}

/** Download partner product ZIP template - GET productmanagement/product/zip-template/download */
const useDownloadProductZipTemplate = () => {
  return useMutation({
    mutationFn: async (): Promise<{ blob: Blob; filename: string }> => {
      const baseUrl = URL;
      if (!baseUrl) {
        throw new Error("Base URL not configured");
      }

      const fullUrl = `${baseUrl.replace(/\/$/, "")}/productmanagement/product/zip-template/download`;
      const headers: HeadersInit = {};
      const token =
        sessionStorage.getItem("staffToken") ||
        localStorage.getItem("partnerToken") ||
        localStorage.getItem("token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(fullUrl, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(err?.message || `Request failed: ${response.status}`);
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const parsedName = parseFilenameFromDisposition(disposition);
      const filename = parsedName || "product_zip_template.zip";
      return { blob, filename };
    },
    onSuccess: (result: { blob: Blob; filename: string }) => {
      const { blob, filename } = result;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("ZIP sample template downloaded successfully!");
    },
    onError: (error: unknown) => {
      const errorMessage = getErrorMessage(
        error,
        "Error downloading ZIP template. Please try again."
      );
      toast.error(errorMessage);
    },
  });
};

/** Partner product ZIP bulk upload - POST productmanagement/product/bulk/zip */
const useProductZipUpload = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File): Promise<ProductZipUploadResponse> => {
      const baseUrl = URL;
      if (!baseUrl) {
        throw new Error("Base URL not configured");
      }

      const fullUrl = `${baseUrl.replace(/\/$/, "")}/productmanagement/product/bulk/zip`;
      const token =
        sessionStorage.getItem("staffToken") ||
        localStorage.getItem("partnerToken") ||
        localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          (data as { message?: string; response?: string })?.message ||
            (data as { message?: string; response?: string })?.response ||
            response.statusText ||
            "ZIP Upload failed"
        );
      }
      return data as ProductZipUploadResponse;
    },
    onSuccess: (data: ProductZipUploadResponse) => {
      const d = data?.data;
      const success = d?.successCount ?? 0;
      const failed = d?.failedCount ?? 0;
      const images = d?.imagesProcessed ?? 0;
      const hasErrors = (d?.errors?.length ?? 0) > 0;
      if (hasErrors && failed > 0) {
        toast.warning(
          `${data?.response || "ZIP upload completed."} Success: ${success}, Failed: ${failed}, Images Uploaded: ${images}. Check details below.`,
          { autoClose: 7000 }
        );
      } else {
        toast.success(
          `${data?.response || "ZIP upload completed successfully!"} Created: ${success} products, Processed: ${images} images.`
        );
      }
      queryClient.invalidateQueries({ queryKey: ["product"] });
    },
    onError: (error: unknown) => {
      const errorMessage = getErrorMessage(
        error,
        "Error uploading ZIP file. Please try again."
      );
      toast.error(errorMessage);
    },
  });
};

export {
  useBulkUpload,
  useDownloadSample,
  useBulkUpdate,
  useDownloadBulkUpdateTemplate,
  useBulkVariantUpdate,
  useDownloadVariantBulkUpdateTemplate,
  useDownloadProductZipTemplate,
  useProductZipUpload,
};

