import Constants from "expo-constants";
import { NativeModules } from "react-native";

function tryGetHostFromScriptURL(): string | null {
  const scriptURL: unknown = NativeModules?.SourceCode?.scriptURL;

  if (typeof scriptURL !== "string") return null;

  // Examples:
  // - exp://192.168.1.10:8081
  // - http://192.168.1.10:8081/index.bundle?platform=ios&dev=true...
  const withoutProtocol = scriptURL.split("://")[1];
  if (!withoutProtocol) return null;

  const hostPort = withoutProtocol.split("/")[0];
  if (!hostPort) return null;

  const host = hostPort.split(":")[0];
  return host || null;
}

function tryGetHostFromExpoConstants(): string | null {
  try {
    // Try expo-constants first (recommended way)
    const manifest = Constants.expoConfig || Constants.manifest;

    if (manifest) {
      // Check expoGo.debuggerHost (for Expo Go)
      const debuggerHost = (manifest as any)?.expoGo?.debuggerHost;
      if (typeof debuggerHost === "string") {
        const host = debuggerHost.split(":")[0];
        return host;
      }

      // Check hostUri (alternative)
      const hostUri = (manifest as any)?.hostUri;
      if (typeof hostUri === "string") {
        const host = hostUri.split(":")[0];
        return host;
      }
    }

    // Fallback to NativeModules (for older Expo versions)
    const manifestRaw: unknown = (NativeModules as any)?.ExponentConstants
      ?.manifest;

    const parsedManifest =
      typeof manifestRaw === "string"
        ? (() => {
            try {
              return JSON.parse(manifestRaw) as any;
            } catch {
              return null;
            }
          })()
        : manifestRaw;

    const debuggerHost: unknown =
      parsedManifest?.expoGo?.debuggerHost || parsedManifest?.debuggerHost;

    if (typeof debuggerHost === "string") {
      const host = debuggerHost.split(":")[0];
      return host;
    }
  } catch (error) {
    // Silently fail - only log in development if needed
    if (__DEV__) {
      console.error("[API] Error getting host from Expo Constants:", error);
    }
  }

  return null;
}

// Cache the API base URL to avoid recalculating on every call
let cachedApiBaseUrl: string | null = null;

export function getApiBaseUrl(): string {
  // Return cached value if available
  if (cachedApiBaseUrl) {
    return cachedApiBaseUrl;
  }

  const host = tryGetHostFromScriptURL() ?? tryGetHostFromExpoConstants();
  const url = host ? `http://${host}:3001` : "http://localhost:3001";

  // Cache the result
  cachedApiBaseUrl = url;

  // Only log once on first call (for debugging)
  if (__DEV__) {
    console.log("[API] Detected host:", host || "localhost (fallback)");
    console.log("[API] Base URL:", url);
  }

  return url;
}
