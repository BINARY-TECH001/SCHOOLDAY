import * as ImagePicker from "expo-image-picker";
import { toast } from "sonner-native";

const CLOUDINARY_CLOUD_NAME =
  process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || "b8wk22xs";
const CLOUDINARY_UPLOAD_PRESET =
  process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "school_covers";

export interface UploadOptions {
  aspect?: [number, number];
  quality?: number;
  allowsEditing?: boolean;
}

/**
 * Prompts user to pick an image from photo library and uploads directly to Cloudinary.
 * Returns the hosted Cloudinary secure HTTPS URL.
 */
export async function pickAndUploadImage(
  options: UploadOptions = { allowsEditing: true, quality: 0.8 },
): Promise<string | null> {
  try {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      toast.error("Permission Required", {
        description: "Please grant camera roll permissions to upload photos.",
      });
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: options.allowsEditing ?? true,
      aspect: options.aspect,
      quality: options.quality ?? 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    if (!asset) {
      return null;
    }
    const toastId = toast.loading("Uploading photo to cloud...");

    // Upload via base64 to Cloudinary
    const base64Data = asset.base64
      ? `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}`
      : asset.uri;

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          upload_preset: CLOUDINARY_UPLOAD_PRESET,
          file: base64Data,
        }),
      },
    );

    const json = await response.json();
    toast.dismiss(toastId);

    if (json.secure_url) {
      toast.success("Photo uploaded successfully!");
      return json.secure_url;
    } else {
      console.warn("Cloudinary error response:", json);
      toast.error("Upload failed", {
        description: json.error?.message || "Failed to upload image.",
      });
      return null;
    }
  } catch (error: any) {
    console.error("Image pick & upload error:", error);
    toast.error("Upload error", {
      description: error?.message || "An unexpected error occurred during upload.",
    });
    return null;
  }
}
