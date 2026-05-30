import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import fetchData from "../helper";
import { toast } from "react-toastify";

// Basic media item shape – keep flexible to match backend
export interface MediaItem {
  id: number;
  name: string;
  extension: string;
  type: string;
  subDirectory: string;
  size: string;
  vendorName?: string;
  url: string;
}

interface MediaResponse {
  status: boolean;
  response: string;
  data: object;
}

// Interface for API payload
interface ApiMediaPayload {
  fileName: string;
  extension: string;
  fileType: string;
  size: number;
  url: string;
  subDirectory: string;
  sellerName?: string;
  userId?: string;
}

// Get all media files
const useGetAllMediaList = () => {
  return useQuery({
    queryKey: ["media"],
    queryFn: () => fetchData("productmanagement/media", "GET"),
  });
};

const useUploadMedia = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ApiMediaPayload) =>
      fetchData<MediaResponse>("productmanagement/media", "POST", payload),

    onSuccess: (data: MediaResponse) => {
      toast.success(data.response || "Media uploaded successfully");
      queryClient.invalidateQueries({ queryKey: ["media"] });
    },
  });
};

const useDeleteMedia = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      fetchData(`productmanagement/media/${id}`, "DELETE"),

    onSuccess: () => {
      toast.success("Media deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["media"] });
    },
  });
};

export { useGetAllMediaList, useUploadMedia, useDeleteMedia };
