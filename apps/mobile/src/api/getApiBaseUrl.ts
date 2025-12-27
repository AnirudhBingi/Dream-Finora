import Constants from 'expo-constants';
import { NativeModules } from 'react-native';

function tryGetHostFromScriptURL(): string | null {
  const scriptURL: unknown = NativeModules?.SourceCode?.scriptURL;
  console.log('[API] Script URL:', scriptURL);
  
  if (typeof scriptURL !== 'string') return null;

  // Examples:
  // - exp://192.168.1.10:8081
  // - http://192.168.1.10:8081/index.bundle?platform=ios&dev=true...
  const withoutProtocol = scriptURL.split('://')[1];
  if (!withoutProtocol) return null;

  const hostPort = withoutProtocol.split('/')[0];
  if (!hostPort) return null;

  const host = hostPort.split(':')[0];
  console.log('[API] Extracted host from script URL:', host);
  return host || null;
}

function tryGetHostFromExpoConstants(): string | null {
  try {
    // Try expo-constants first (recommended way)
    const manifest = Constants.expoConfig || Constants.manifest;
    console.log('[API] Expo Constants manifest:', manifest);
    
    if (manifest) {
      // Check expoGo.debuggerHost (for Expo Go)
      const debuggerHost = (manifest as any)?.expoGo?.debuggerHost;
      if (typeof debuggerHost === 'string') {
        const host = debuggerHost.split(':')[0];
        console.log('[API] Extracted host from expoGo.debuggerHost:', host);
        return host;
      }
      
      // Check hostUri (alternative)
      const hostUri = (manifest as any)?.hostUri;
      if (typeof hostUri === 'string') {
        const host = hostUri.split(':')[0];
        console.log('[API] Extracted host from hostUri:', host);
        return host;
      }
    }
    
    // Fallback to NativeModules (for older Expo versions)
    const manifestRaw: unknown = (NativeModules as any)?.ExponentConstants?.manifest;
    console.log('[API] NativeModules manifest raw:', manifestRaw);
    
    const parsedManifest =
      typeof manifestRaw === 'string'
        ? (() => {
            try {
              return JSON.parse(manifestRaw) as any;
            } catch {
              return null;
            }
          })()
        : manifestRaw;

    const debuggerHost: unknown = parsedManifest?.expoGo?.debuggerHost || parsedManifest?.debuggerHost;
    console.log('[API] NativeModules debugger host:', debuggerHost);
    
    if (typeof debuggerHost === 'string') {
      const host = debuggerHost.split(':')[0];
      console.log('[API] Extracted host from NativeModules manifest:', host);
      return host;
    }
  } catch (error) {
    console.error('[API] Error getting host from Expo Constants:', error);
  }
  
  return null;
}

export function getApiBaseUrl(): string {
  const host = tryGetHostFromScriptURL() ?? tryGetHostFromExpoConstants();
  const url = host ? `http://${host}:3001` : 'http://localhost:3001';
  
  // Log for debugging
  console.log('[API] Detected host:', host || 'localhost (fallback)');
  console.log('[API] Base URL:', url);
  
  return url;
}


