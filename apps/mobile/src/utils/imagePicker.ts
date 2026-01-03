import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

export async function pickImageFromCamera(
  options?: { aspect?: [number, number]; quality?: number }
): Promise<string | null> {
  // Request camera permissions
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  
  if (status !== 'granted') {
    Alert.alert('Permission Required', 'Camera permission is required to take photos');
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: options?.aspect || [1, 1],
    quality: options?.quality || 0.8,
  });

  if (result.canceled) {
    return null;
  }

  return result.assets[0].uri;
}

export async function pickImageFromGallery(
  options?: { aspect?: [number, number]; quality?: number }
): Promise<string | null> {
  // Request media library permissions
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
  if (status !== 'granted') {
    Alert.alert('Permission Required', 'Media library permission is required');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: options?.aspect || [1, 1],
    quality: options?.quality || 0.8,
  });

  if (result.canceled) {
    return null;
  }

  return result.assets[0].uri;
}

export async function pickImage(
  options?: { aspect?: [number, number]; quality?: number }
): Promise<string | null> {
  // Show action sheet to choose camera or gallery
  return new Promise((resolve) => {
    Alert.alert(
      'Select Image',
      'Choose an option',
      [
        {
          text: 'Camera',
          onPress: async () => {
            const uri = await pickImageFromCamera(options);
            resolve(uri);
          },
        },
        {
          text: 'Gallery',
          onPress: async () => {
            const uri = await pickImageFromGallery(options);
            resolve(uri);
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(null),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  });
}

export async function pickMultipleImages(
  options?: { maxImages?: number; quality?: number }
): Promise<string[]> {
  // Show action sheet to choose camera or gallery
  return new Promise(async (resolve) => {
    Alert.alert(
      'Select Images',
      'Choose an option',
      [
        {
          text: 'Camera',
          onPress: async () => {
            const uri = await pickImageFromCamera({ quality: options?.quality });
            resolve(uri ? [uri] : []);
          },
        },
        {
          text: 'Gallery',
          onPress: async () => {
            // Request permissions
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Required', 'Media library permission is required');
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

            resolve(result.assets.map(asset => asset.uri));
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve([]),
        },
      ],
      { cancelable: true, onDismiss: () => resolve([]) }
    );
  });
}

