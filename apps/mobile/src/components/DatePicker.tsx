import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../theme";

interface DatePickerProps {
  value: string; // ISO date string (YYYY-MM-DD) or empty string
  onChange: (date: string) => void; // Returns ISO date string (YYYY-MM-DD)
  label?: string;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onChange,
  label,
  placeholder = "Select date",
  minimumDate,
  maximumDate,
  disabled = false,
}: DatePickerProps) {
  const { theme, resolvedMode } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [showPicker, setShowPicker] = useState(false);

  // Convert ISO string to Date object
  const dateValue = value ? new Date(value) : new Date();

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }

    if (event.type === "set" && selectedDate) {
      // Format as YYYY-MM-DD
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      const formattedDate = `${year}-${month}-${day}`;
      onChange(formattedDate);

      if (Platform.OS === "ios") {
        setShowPicker(false);
      }
    } else if (event.type === "dismissed") {
      setShowPicker(false);
    }
  };

  const formatDisplayDate = (dateString: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handlePress = () => {
    if (!disabled) {
      setShowPicker(true);
    }
  };

  if (Platform.OS === "ios") {
    return (
      <View style={styles.container}>
        {label && <Text style={styles.label}>{label}</Text>}
        <TouchableOpacity
          style={[styles.input, disabled && styles.inputDisabled]}
          onPress={handlePress}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Text style={[styles.inputText, !value && styles.placeholderText]}>
            {value ? formatDisplayDate(value) : placeholder}
          </Text>
          <MaterialIcons
            name="calendar-today"
            size={20}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>

        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => setShowPicker(false)}
                  style={styles.modalButton}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Select Date</Text>
                <TouchableOpacity
                  onPress={() => {
                    const today = new Date();
                    const formatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
                    onChange(formatted);
                    setShowPicker(false);
                  }}
                  style={styles.modalButton}
                >
                  <Text style={styles.modalDoneText}>Today</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={dateValue}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                themeVariant={resolvedMode}
              />
              <TouchableOpacity
                style={styles.modalDoneButton}
                onPress={() => setShowPicker(false)}
              >
                <Text style={styles.modalDoneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Android
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.input, disabled && styles.inputDisabled]}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={[styles.inputText, !value && styles.placeholderText]}>
          {value ? formatDisplayDate(value) : placeholder}
        </Text>
        <MaterialIcons
          name="calendar-today"
          size={20}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    container: {
      gap: 8,
    },
    label: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
    },
    input: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: theme.spacing.base,
      borderWidth: 2,
      borderColor: theme.colors.border,
      minHeight: 52,
    },
    inputDisabled: {
      opacity: 0.6,
      backgroundColor: theme.colors.backgroundTertiary,
    },
    inputText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
      flex: 1,
    },
    placeholderText: {
      color: theme.colors.textTertiary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 32,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: theme.spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalButton: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xs,
      minWidth: 60,
    },
    modalCancelText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textSecondary,
    },
    modalTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    modalDoneText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    modalDoneButton: {
      marginHorizontal: 20,
      marginTop: theme.spacing.base,
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      paddingVertical: theme.spacing.base,
      alignItems: "center",
    },
    modalDoneButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
