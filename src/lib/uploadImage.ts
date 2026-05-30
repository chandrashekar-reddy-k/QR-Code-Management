/**
 * Upload a file via the same endpoints used in product management:
 * tries partner base `/files/uploadFile`, then admin API `URL_ADMIN`.
 */
import { URL_ADMIN } from "../config";

export async function uploadImageFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  // Only use the admin API endpoint for uploads
  const base = URL_ADMIN.replace(/\/$/, "");
  const fullUrl = `${base}/files/uploadFile`;
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(fullUrl, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    const response = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg =
        (response as { response?: string; message?: string })?.response ||
        (response as { message?: string })?.message ||
        res.statusText ||
        "Upload failed";
      throw new Error(msg);
    }

    if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
      const item = response.data[0] as Record<string, unknown>;
      const imageUrl = item?.url || item?.location || item?.fileUrl || item?.path;
      if (imageUrl && typeof imageUrl === "string") return imageUrl;
    }
    if (response?.data && typeof response.data === "object" && !Array.isArray(response.data)) {
      const d = response.data as Record<string, unknown>;
      const imageUrl = d?.url || d?.location || d?.fileUrl || d?.path;
      if (imageUrl && typeof imageUrl === "string") return imageUrl;
    }
    if (response?.data && typeof response.data === "string") return response.data;
    if (typeof (response as { url?: string })?.url === "string")
      return (response as { url: string }).url;

    throw new Error("Image upload failed: No URL returned");
  } catch (error) {
    console.error(`Error uploading image via ${fullUrl}:`, error);
    const err = error as { message?: string } | null;
    throw new Error(err?.message || "Failed to upload image");
  }
}
