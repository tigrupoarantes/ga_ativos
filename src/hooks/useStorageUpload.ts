import { useState } from "react";
import { supabase } from "@/integrations/supabase/external-client";

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export function useStorageUpload(bucketName: string) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  const uploadFile = async (file: File, path: string): Promise<string> => {
    setIsUploading(true);
    setProgress({ loaded: 0, total: file.size, percentage: 0 });

    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(path, file, { 
          upsert: true,
          cacheControl: '3600'
        });

      if (error) throw error;

      setProgress({ loaded: file.size, total: file.size, percentage: 100 });

      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(path);

      return urlData.publicUrl;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteFile = async (path: string): Promise<void> => {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([path]);

    if (error) throw error;
  };

  const getPathFromUrl = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
      return pathMatch ? pathMatch[1] : null;
    } catch {
      return null;
    }
  };

  return { 
    uploadFile, 
    deleteFile, 
    getPathFromUrl,
    isUploading, 
    progress 
  };
}
