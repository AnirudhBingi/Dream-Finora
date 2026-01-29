import { api } from "./client";
import { getApiBaseUrl } from "./getApiBaseUrl";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

export async function exportExpensesCSV(token: string): Promise<string> {
  // CSV export returns text, not JSON - use direct fetch
  const response = await fetch(`${getApiBaseUrl()}/export/expenses/csv`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Failed to export expenses" }));
    throw new Error(
      error.message || `Failed to export expenses: ${response.status}`,
    );
  }

  return response.text();
}

export async function exportTransactionsCSV(token: string): Promise<string> {
  const response = await fetch(`${getApiBaseUrl()}/export/transactions/csv`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Failed to export transactions" }));
    throw new Error(
      error.message || `Failed to export transactions: ${response.status}`,
    );
  }

  const csv = await response.text();
  return csv;
}

export async function exportAllDataJSON(token: string): Promise<any> {
  return api.get<any>("/export/all/json", { token });
}

/**
 * Save CSV to file and share it
 */
export async function saveAndShareCSV(
  csv: string,
  filename: string,
): Promise<void> {
  const documentDirectory = (FileSystem as any).documentDirectory;
  if (!documentDirectory) {
    throw new Error("Document directory is not available");
  }
  const fileUri = `${documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: "utf8" });

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(fileUri);
  } else {
    throw new Error("Sharing is not available on this device");
  }
}

/**
 * Save JSON to file and share it
 */
export async function saveAndShareJSON(
  data: any,
  filename: string,
): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  const documentDirectory = (FileSystem as any).documentDirectory;
  if (!documentDirectory) {
    throw new Error("Document directory is not available");
  }
  const fileUri = `${documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, json, { encoding: "utf8" });

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(fileUri);
  } else {
    throw new Error("Sharing is not available on this device");
  }
}
