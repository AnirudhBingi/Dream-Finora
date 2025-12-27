import { NativeModules } from 'react-native';

function tryGetHostFromScriptURL(): string | null {
  const scriptURL: unknown = NativeModules?.SourceCode?.scriptURL;
  if (typeof scriptURL !== 'string') return null;

  // Examples:
  // - exp://192.168.1.10:8081
  // - http://192.168.1.10:8081/index.bundle?platform=ios&dev=true...
  const withoutProtocol = scriptURL.split('://')[1];
  if (!withoutProtocol) return null;

  const hostPort = withoutProtocol.split('/')[0];
  if (!hostPort) return null;

  const host = hostPort.split(':')[0];
  return host || null;
}

function tryGetHostFromExpoManifest(): string | null {
  // Expo Go exposes manifest/debuggerHost here on iOS/Android
  const manifestRaw: unknown = (NativeModules as any)?.ExponentConstants?.manifest;
  const manifest =
    typeof manifestRaw === 'string'
      ? (() => {
          try {
            return JSON.parse(manifestRaw) as any;
          } catch {
            return null;
          }
        })()
      : manifestRaw;

  const debuggerHost: unknown = manifest?.debuggerHost;
  if (typeof debuggerHost !== 'string') return null;
  // debuggerHost looks like: "192.168.1.10:8081"
  const host = debuggerHost.split(':')[0];
  return host || null;
}

export function getApiBaseUrl(): string {
  const host = tryGetHostFromScriptURL() ?? tryGetHostFromExpoManifest();
  if (host) return `http://${host}:3001`;
  // Fallback is only useful for Android emulator (localhost points to emulator);
  // on a physical phone, you must use your PC's LAN IP.
  return 'http://localhost:3001';
}


