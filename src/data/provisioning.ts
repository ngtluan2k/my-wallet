import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { parseProvisionExpiry } from '@/domain/provisioning';

/**
 * Expiry of the provisioning profile the app was signed with, or null when there is none
 * (Expo Go, simulator, App Store/TestFlight builds, Android, web) or it can't be read.
 */
export async function readProvisionExpiry(): Promise<Date | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    const file = new File(Paths.bundle, 'embedded.mobileprovision');
    if (!file.exists) return null;
    const bytes = await file.bytes();
    // Decode byte-for-byte: the profile isn't valid UTF-8, but the plist inside is ASCII.
    let text = '';
    for (let i = 0; i < bytes.length; i += 8192) {
      text += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    return parseProvisionExpiry(text);
  } catch {
    return null;
  }
}
