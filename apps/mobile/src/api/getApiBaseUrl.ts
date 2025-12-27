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

export function getApiBaseUrl(): string {
  const host = tryGetHostFromScriptURL();
  if (host) return `http://${host}:3001`;
  return 'http://localhost:3001';
}


