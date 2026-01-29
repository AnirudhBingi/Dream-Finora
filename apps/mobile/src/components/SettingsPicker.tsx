import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../theme";

export interface SettingsPickerOption {
  label: string;
  value: string;
}

interface SettingsPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SettingsPickerOption[];
  description?: string;
  disabled?: boolean;
  loading?: boolean;
}

export function SettingsPicker({
  label,
  value,
  onChange,
  options,
  description,
  disabled = false,
  loading = false,
}: SettingsPickerProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption?.label || "Select...";

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.container, (disabled || loading) && styles.disabled]}
        onPress={() => !disabled && !loading && setModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.content}>
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
          {description && (
            <Text style={styles.description} numberOfLines={2}>
              {description}
            </Text>
          )}
        </View>
        <View style={styles.valueContainer}>
          <Text style={styles.value} numberOfLines={1} ellipsizeMode="tail">
            {displayLabel}
          </Text>
          <MaterialIcons
            name={modalVisible ? "expand-less" : "expand-more"}
            size={24}
            color={theme.colors.textSecondary}
          />
        </View>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons
                  name="close"
                  size={24}
                  color={theme.colors.textPrimary}
                />
              </TouchableOpacity>
            </View>

            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => handleSelect(item.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionLabel,
                      item.value === value && styles.optionLabelSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === value && (
                    <MaterialIcons
                      name="check"
                      size={24}
                      color={theme.colors.primary}
                    />
                  )}
                </TouchableOpacity>
              )}
              scrollEnabled={options.length > 5}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
    },
    disabled: {
      opacity: 0.5,
    },
    content: {
      flex: 1,
      marginRight: theme.spacing.md,
    },
    label: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    description: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textTertiary,
    },
    valueContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      flexShrink: 1,
    },
    value: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textSecondary,
      flexShrink: 1,
      textAlign: "right",
    },
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: "80%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: theme.spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    option: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
    },
    optionLabel: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
    },
    optionLabelSelected: {
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
    },
  });
