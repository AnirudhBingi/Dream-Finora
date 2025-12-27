import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getApiBaseUrl } from './src/api/getApiBaseUrl';

export default function App() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const [apiStatus, setApiStatus] = useState<string>('Checking backend...');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch(`${apiBaseUrl}/`);
        const json = (await res.json()) as { status?: string; message?: string };
        if (cancelled) return;
        setApiStatus(json.status ?? json.message ?? 'Backend responded');
      } catch (e) {
        if (cancelled) return;
        setApiStatus('Backend not reachable (check: backend running + same Wi‑Fi)');
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dream Finora</Text>
      <Text style={styles.subtitle}>Hello World!</Text>
      <Text style={styles.description}>Mobile app is working</Text>
      <Text style={styles.small}>API: {apiBaseUrl}</Text>
      <Text style={styles.small}>Backend: {apiStatus}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
  },
  small: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
  },
});
