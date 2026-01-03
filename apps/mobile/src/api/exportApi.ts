import { getApiBaseUrl } from './getApiBaseUrl';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function exportExpensesCSV(token: string): Promise<string> {
  const response = await fetch(`${getApiBaseUrl()}/export/expenses/csv`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to export expenses' }));
    throw new Error(error.message || `Failed to export expenses: ${response.status}`);
  }

  const csv = await response.text();
  return csv;
}

export async function exportTransactionsCSV(token: string): Promise<string> {
  const response = await fetch(`${getApiBaseUrl()}/export/transactions/csv`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to export transactions' }));
    throw new Error(error.message || `Failed to export transactions: ${response.status}`);
  }

  const csv = await response.text();
  return csv;
}

export async function exportAllDataJSON(token: string): Promise<any> {
  const response = await fetch(`${getApiBaseUrl()}/export/all/json`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to export data' }));
    throw new Error(error.message || `Failed to export data: ${response.status}`);
  }

  return response.json();
}

/**
 * Save CSV to file and share it
 */
export async function saveAndShareCSV(csv: string, filename: string): Promise<void> {
  const fileUri = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(fileUri);
  } else {
    throw new Error('Sharing is not available on this device');
  }
}

/**
 * Save JSON to file and share it
 */
export async function saveAndShareJSON(data: any, filename: string): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  const fileUri = `${FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(fileUri);
  } else {
    throw new Error('Sharing is not available on this device');
  }
}

