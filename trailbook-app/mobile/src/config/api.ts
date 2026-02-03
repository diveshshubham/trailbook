// API Configuration for React Native
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// For physical devices, you need to use your computer's IP address instead of localhost
// Find your IP: Windows: ipconfig | findstr IPv4 | Mac/Linux: ifconfig | grep inet
// Example: http://192.168.1.100:3002/api
const DEFAULT_API_BASE_URL = "http://localhost:3002/api";

// Helper to get the correct API URL based on platform
function getDefaultApiUrl(): string {
  // If environment variable is set, use it
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL.replace(/\/$/, "");
  }
  
  // For physical devices, localhost won't work - you need your computer's IP
  // For emulator/simulator, localhost works
  // You can override this by setting EXPO_PUBLIC_API_BASE_URL in .env
  return DEFAULT_API_BASE_URL;
}

export function getApiBaseUrl(): string {
  return getDefaultApiUrl();
}

// Public feed might be on a different backend/port (default: port 3003)
export function getPublicFeedBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_PUBLIC_FEED_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_PUBLIC_FEED_API_BASE_URL.replace(/\/$/, "");
  }
  
  // Default to port 3003 for public feed (matches web app configuration)
  // Extract base URL and change port to 3003
  const mainUrl = getApiBaseUrl();
  try {
    const urlObj = new URL(mainUrl);
    urlObj.port = '3003';
    return urlObj.toString().replace(/\/$/, "");
  } catch {
    // Fallback: replace port 3002 with 3003 in the URL string
    return mainUrl.replace(':3002', ':3003');
  }
}

export async function getToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem("token");
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem("token", token);
  } catch (error) {
    console.error("Failed to save token:", error);
  }
}

export async function removeToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem("token");
  } catch (error) {
    console.error("Failed to remove token:", error);
  }
}
