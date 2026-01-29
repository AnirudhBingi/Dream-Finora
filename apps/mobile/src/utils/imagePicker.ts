import * as ImagePicker from "expo-image-picker";
import { Alert, Platform } from "react-native";

export async function pickImageFromCamera(options?: {
  aspect?: [number, number];
  quality?: number;
  allowsEditing?: boolean;
}): Promise<string | null> {
  // Request camera permissions
  const { status } = await ImagePicker.requestCameraPermissionsAsync();

  if (status !== "granted") {
    Alert.alert(
      "Permission Required",
      "Camera permission is required to take photos",
    );
    return null;
  }

  // If aspect ratio is specified, enable editing (aspect only works with editing)
  // Otherwise, use allowsEditing from options or default to false
  const allowsEditing =
    options?.allowsEditing !== undefined
      ? options.allowsEditing
      : options?.aspect !== undefined;

  const pickerOptions: ImagePicker.ImagePickerOptions = {
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing,
    quality: options?.quality || 0.8,
  };

  // Only set aspect if editing is enabled (aspect only works with allowsEditing: true)
  if (allowsEditing && options?.aspect) {
    pickerOptions.aspect = options.aspect;
  }

  const result = await ImagePicker.launchCameraAsync(pickerOptions);

  if (result.canceled) {
    return null;
  }

  return result.assets[0].uri;
}

export async function pickImageFromGallery(options?: {
  aspect?: [number, number];
  quality?: number;
  allowsEditing?: boolean;
}): Promise<string | null> {
  // Request media library permissions
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (status !== "granted") {
    Alert.alert("Permission Required", "Media library permission is required");
    return null;
  }

  // If aspect ratio is specified, enable editing (aspect only works with editing)
  // Otherwise, use allowsEditing from options or default to false
  const allowsEditing =
    options?.allowsEditing !== undefined
      ? options.allowsEditing
      : options?.aspect !== undefined;

  const pickerOptions: ImagePicker.ImagePickerOptions = {
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing,
    quality: options?.quality || 0.8,
  };

  // Only set aspect if editing is enabled (aspect only works with allowsEditing: true)
  if (allowsEditing && options?.aspect) {
    pickerOptions.aspect = options.aspect;
  }

  const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);

  if (result.canceled) {
    return null;
  }

  return result.assets[0].uri;
}

export async function pickImage(options?: {
  aspect?: [number, number];
  quality?: number;
  allowsEditing?: boolean;
}): Promise<string | null> {
  // Show action sheet to choose camera or gallery
  return new Promise((resolve) => {
    Alert.alert(
      "Select Image",
      "Choose an option",
      [
        {
          text: "Camera",
          onPress: async () => {
            const uri = await pickImageFromCamera(options);
            resolve(uri);
          },
        },
        {
          text: "Gallery",
          onPress: async () => {
            const uri = await pickImageFromGallery(options);
            resolve(uri);
          },
        },
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => resolve(null),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

export async function pickSquareAvatarImage(options?: {
  quality?: number;
}): Promise<string | null> {
  return pickImage({
    aspect: [1, 1],
    allowsEditing: true,
    quality: options?.quality,
  });
}

export async function pickMultipleImages(options?: {
  maxImages?: number;
  quality?: number;
}): Promise<string[]> {
  // Show action sheet to choose camera or gallery
  return new Promise(async (resolve) => {
    Alert.alert(
      "Select Images",
      "Choose an option",
      [
        {
          text: "Camera",
          onPress: async () => {
            const uri = await pickImageFromCamera({
              quality: options?.quality,
            });
            resolve(uri ? [uri] : []);
          },
        },
        {
          text: "Gallery",
          onPress: async () => {
            // Request permissions
            const { status } =
              await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
              Alert.alert(
                "Permission Required",
                "Media library permission is required",
              );
              resolve([]);
              return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsMultipleSelection: true,
              quality: options?.quality || 0.8,
              selectionLimit: options?.maxImages || 10,
            });

            if (result.canceled) {
              resolve([]);
              return;
            }

            resolve(result.assets.map((asset) => asset.uri));
          },
        },
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => resolve([]),
        },
      ],
      { cancelable: true, onDismiss: () => resolve([]) },
    );
  });
}
