import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
];

interface CurrencyPickerProps {
  selectedCurrency: string;
  onSelectCurrency: (currency: string) => void;
  primaryCurrency?: string; // For showing conversion
  amount?: number; // For showing conversion
  onConvertAmount?: (amount: number, from: string, to: string) => Promise<number>;
}

export function CurrencyPicker({
  selectedCurrency,
  onSelectCurrency,
  primaryCurrency,
  amount,
  onConvertAmount,
}: CurrencyPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedCurrencyInfo = SUPPORTED_CURRENCIES.find(c => c.code === selectedCurrency) || SUPPORTED_CURRENCIES[0];

  React.useEffect(() => {
    if (primaryCurrency && amount && amount > 0 && selectedCurrency !== primaryCurrency && onConvertAmount) {
      setLoading(true);
      onConvertAmount(amount, selectedCurrency, primaryCurrency)
        .then(converted => {
          setConvertedAmount(converted);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } else {
      setConvertedAmount(null);
    }
  }, [amount, selectedCurrency, primaryCurrency, onConvertAmount]);

  return (
    <>
      <TouchableOpacity
        style={styles.currencyButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.currencyButtonContent}>
          <Text style={styles.currencyCode}>{selectedCurrencyInfo.code}</Text>
          <MaterialIcons name="arrow-drop-down" size={20} color="#374151" />
        </View>
        {primaryCurrency && convertedAmount !== null && amount && amount > 0 && (
          <Text style={styles.conversionText}>
            ≈ {formatCurrency(convertedAmount, primaryCurrency)}
          </Text>
        )}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={SUPPORTED_CURRENCIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.currencyItem,
                    selectedCurrency === item.code && styles.currencyItemSelected,
                  ]}
                  onPress={() => {
                    onSelectCurrency(item.code);
                    setModalVisible(false);
                  }}
                >
                  <View style={styles.currencyItemContent}>
                    <Text style={styles.currencySymbol}>{item.symbol}</Text>
                    <View style={styles.currencyItemDetails}>
                      <Text style={styles.currencyItemCode}>{item.code}</Text>
                      <Text style={styles.currencyItemName}>{item.name}</Text>
                    </View>
                  </View>
                  {selectedCurrency === item.code && (
                    <MaterialIcons name="check" size={24} color="#2563EB" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

const styles = StyleSheet.create({
  currencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    minHeight: 44,
  },
  currencyButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  conversionText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  currencyItemSelected: {
    backgroundColor: '#F0F9FF',
  },
  currencyItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '500',
    color: '#111827',
    width: 40,
    textAlign: 'center',
  },
  currencyItemDetails: {
    gap: 2,
  },
  currencyItemCode: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  currencyItemName: {
    fontSize: 14,
    color: '#6B7280',
  },
});

