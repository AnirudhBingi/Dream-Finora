import React, { useMemo, useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import { Header } from "../components/Header";
import { Card } from "../components/Card";
import { Text } from "../components/Text";
import { Button } from "../components/Button";
import { InputField } from "../components/InputField";
import { Avatar } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";

/**
 * Design System Showcase Screen
 *
 * Displays all primitives in all variants/sizes/states for:
 * - Visual regression testing
 * - Component gallery/documentation
 * - Quick validation of light/dark themes
 *
 * Dev-only screen - not accessible in production builds
 */

export function ShowcaseScreen({ onBack }: { onBack: () => void }) {
  const { theme, mode, setMode } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [inputValue, setInputValue] = useState("");

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "left", "right"]}
    >
      <Header title="Design System Showcase" onBack={onBack} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          {/* Theme Toggle */}
          <Card padding="lg" style={styles.section}>
            <Text variant="h3" style={styles.sectionTitle}>
              Theme
            </Text>
            <Text variant="body2" color="secondary" style={styles.sectionDesc}>
              Current mode: {mode} (resolved: {theme.colors.background})
            </Text>
            <View style={styles.row}>
              <Button
                title="Light"
                variant={mode === "light" ? "primary" : "secondary"}
                onPress={() => setMode("light")}
                size="small"
              />
              <Button
                title="Dark"
                variant={mode === "dark" ? "primary" : "secondary"}
                onPress={() => setMode("dark")}
                size="small"
              />
              <Button
                title="System"
                variant={mode === "system" ? "primary" : "secondary"}
                onPress={() => setMode("system")}
                size="small"
              />
            </View>
          </Card>

          {/* Colors */}
          <Card padding="lg" style={styles.section}>
            <Text variant="h3" style={styles.sectionTitle}>
              Colors
            </Text>
            <View style={styles.colorGrid}>
              {Object.entries({
                primary: theme.colors.primary,
                success: theme.colors.success,
                error: theme.colors.error,
                warning: theme.colors.warning,
                info: theme.colors.info,
              }).map(([name, color]) => (
                <View key={name} style={styles.colorItem}>
                  <View
                    style={[styles.colorSwatch, { backgroundColor: color }]}
                  />
                  <Text variant="caption">{name}</Text>
                </View>
              ))}
            </View>
            <Text variant="label" color="secondary" style={{ marginTop: theme.spacing.base }}>
              SEMANTIC COLORS
            </Text>
            <View style={styles.colorGrid}>
              {Object.entries({
                background: theme.colors.background,
                backgroundSecondary: theme.colors.backgroundSecondary,
                backgroundTertiary: theme.colors.backgroundTertiary,
                textPrimary: theme.colors.textPrimary,
                textSecondary: theme.colors.textSecondary,
                border: theme.colors.border,
              }).map(([name, color]) => (
                <View key={name} style={styles.colorItem}>
                  <View
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: color, borderWidth: 1, borderColor: theme.colors.border },
                    ]}
                  />
                  <Text variant="caption">{name}</Text>
                </View>
              ))}
            </View>
          </Card>

          {/* Typography */}
          <Card padding="lg" style={styles.section}>
            <Text variant="h3" style={styles.sectionTitle}>
              Typography
            </Text>
            <View style={styles.column}>
              <Text variant="h1">Heading 1</Text>
              <Text variant="h2">Heading 2</Text>
              <Text variant="h3">Heading 3</Text>
              <Text variant="h4">Heading 4</Text>
              <Text variant="body">Body text (default)</Text>
              <Text variant="body2">Body text 2 (secondary)</Text>
              <Text variant="caption">Caption text</Text>
              <Text variant="label">Label text</Text>
              <Text variant="button">Button text</Text>
            </View>
            <View style={[styles.column, { marginTop: theme.spacing.base }]}>
              <Text variant="body" color="primary">Primary color</Text>
              <Text variant="body" color="secondary">Secondary color</Text>
              <Text variant="body" color="tertiary">Tertiary color</Text>
              <Text variant="body" color="success">Success color</Text>
              <Text variant="body" color="error">Error color</Text>
              <Text variant="body" color="warning">Warning color</Text>
              <Text variant="body" color="info">Info color</Text>
            </View>
          </Card>

          {/* Buttons */}
          <Card padding="lg" style={styles.section}>
            <Text variant="h3" style={styles.sectionTitle}>
              Buttons
            </Text>
            <Text variant="label" color="secondary">VARIANTS</Text>
            <View style={styles.column}>
              <Button title="Primary Button" variant="primary" onPress={() => {}} />
              <Button title="Secondary Button" variant="secondary" onPress={() => {}} />
              <Button title="Text Button" variant="text" onPress={() => {}} />
              <Button title="Danger Button" variant="danger" onPress={() => {}} />
            </View>
            <Text variant="label" color="secondary" style={{ marginTop: theme.spacing.base }}>
              SIZES
            </Text>
            <View style={styles.column}>
              <Button title="Small Button" variant="primary" size="small" onPress={() => {}} />
              <Button title="Medium Button" variant="primary" size="medium" onPress={() => {}} />
              <Button title="Large Button" variant="primary" size="large" onPress={() => {}} />
            </View>
            <Text variant="label" color="secondary" style={{ marginTop: theme.spacing.base }}>
              STATES
            </Text>
            <View style={styles.column}>
              <Button title="Disabled Button" variant="primary" disabled onPress={() => {}} />
              <Button title="Loading Button" variant="primary" loading onPress={() => {}} />
            </View>
          </Card>

          {/* Inputs */}
          <Card padding="lg" style={styles.section}>
            <Text variant="h3" style={styles.sectionTitle}>
              Input Fields
            </Text>
            <View style={styles.column}>
              <InputField
                label="Basic Input"
                placeholder="Enter text"
                value={inputValue}
                onChangeText={setInputValue}
              />
              <InputField
                label="Input with Helper"
                placeholder="Enter text"
                helperText="This is helper text"
              />
              <InputField
                label="Input with Error"
                placeholder="Enter text"
                error="This field is required"
              />
              <InputField
                label="Input with Left Icon"
                placeholder="Enter email"
                leftIcon="email"
              />
              <InputField
                label="Input with Right Icon"
                placeholder="Search"
                rightIcon="search"
              />
            </View>
          </Card>

          {/* Cards */}
          <Card padding="lg" style={styles.section}>
            <Text variant="h3" style={styles.sectionTitle}>
              Cards
            </Text>
            <Text variant="label" color="secondary">SURFACE LEVELS</Text>
            <Card surface={0} padding="md" style={{ marginBottom: theme.spacing.sm }}>
              <Text variant="body2">Surface 0 (page background level)</Text>
            </Card>
            <Card surface={1} padding="md" style={{ marginBottom: theme.spacing.sm }}>
              <Text variant="body2">Surface 1 (card level - default)</Text>
            </Card>
            <Card surface={2} padding="md" style={{ marginBottom: theme.spacing.sm }}>
              <Text variant="body2">Surface 2 (elevated/modal level)</Text>
            </Card>
            <Text variant="label" color="secondary" style={{ marginTop: theme.spacing.base }}>
              PADDING VARIANTS
            </Text>
            <Card padding="none" border style={{ marginBottom: theme.spacing.sm }}>
              <Text variant="body2">No padding</Text>
            </Card>
            <Card padding="sm" border style={{ marginBottom: theme.spacing.sm }}>
              <Text variant="body2">Small padding (12px)</Text>
            </Card>
            <Card padding="md" border style={{ marginBottom: theme.spacing.sm }}>
              <Text variant="body2">Medium padding (16px)</Text>
            </Card>
            <Card padding="lg" border>
              <Text variant="body2">Large padding (24px)</Text>
            </Card>
          </Card>

          {/* Avatars */}
          <Card padding="lg" style={styles.section}>
            <Text variant="h3" style={styles.sectionTitle}>
              Avatars
            </Text>
            <View style={styles.row}>
              <View style={styles.avatarItem}>
                <Avatar size={24} name="John Doe" />
                <Text variant="caption">XS (24)</Text>
              </View>
              <View style={styles.avatarItem}>
                <Avatar size={32} name="John Doe" />
                <Text variant="caption">SM (32)</Text>
              </View>
              <View style={styles.avatarItem}>
                <Avatar size={40} name="John Doe" />
                <Text variant="caption">MD (40)</Text>
              </View>
              <View style={styles.avatarItem}>
                <Avatar size={48} name="John Doe" />
                <Text variant="caption">LG (48)</Text>
              </View>
              <View style={styles.avatarItem}>
                <Avatar size={64} name="John Doe" />
                <Text variant="caption">XL (64)</Text>
              </View>
            </View>
          </Card>

          {/* Icons */}
          <Card padding="lg" style={styles.section}>
            <Text variant="h3" style={styles.sectionTitle}>
              Icons
            </Text>
            <View style={styles.row}>
              <Icon name="home" size="sm" color={theme.colors.textSecondary} />
              <Icon name="people" size="md" color={theme.colors.primary} />
              <Icon name="settings" size="lg" color={theme.colors.success} />
              <Icon name="notifications" size="xl" color={theme.colors.warning} />
            </View>
          </Card>

          {/* Empty States */}
          <Card padding="lg" style={styles.section}>
            <Text variant="h3" style={styles.sectionTitle}>
              Empty State
            </Text>
            <EmptyState
              icon="inbox"
              title="No items"
              message="Get started by creating your first item"
              actionLabel="Create"
              onAction={() => {}}
            />
          </Card>

          {/* Error States */}
          <Card padding="lg" style={styles.section}>
            <Text variant="h3" style={styles.sectionTitle}>
              Error State
            </Text>
            <ErrorState
              message="Failed to load data"
              onRetry={() => {}}
            />
          </Card>

          {/* Spacing Scale */}
          <Card padding="lg" style={styles.section}>
            <Text variant="h3" style={styles.sectionTitle}>
              Spacing Scale
            </Text>
            {Object.entries({
              xs: theme.spacing.xs,
              sm: theme.spacing.sm,
              md: theme.spacing.md,
              base: theme.spacing.base,
              lg: theme.spacing.lg,
              xl: theme.spacing.xl,
              "2xl": theme.spacing["2xl"],
              "3xl": theme.spacing["3xl"],
            }).map(([name, value]) => (
              <View key={name} style={styles.spacingRow}>
                <Text variant="caption" style={{ width: 60 }}>{name}</Text>
                <View
                  style={{
                    width: value,
                    height: 24,
                    backgroundColor: theme.colors.primary,
                  }}
                />
                <Text variant="caption" style={{ marginLeft: theme.spacing.sm }}>
                  {value}px
                </Text>
              </View>
            ))}
          </Card>

          {/* Border Radius Scale */}
          <Card padding="lg" style={styles.section}>
            <Text variant="h3" style={styles.sectionTitle}>
              Border Radius Scale
            </Text>
            <View style={styles.row}>
              {Object.entries({
                xs: theme.radii.xs,
                sm: theme.radii.sm,
                md: theme.radii.md,
                lg: theme.radii.lg,
                xl: theme.radii.xl,
                "2xl": theme.radii["2xl"],
              }).map(([name, value]) => (
                <View key={name} style={styles.radiiItem}>
                  <View
                    style={{
                      width: 60,
                      height: 60,
                      backgroundColor: theme.colors.primary,
                      borderRadius: value,
                    }}
                  />
                  <Text variant="caption">{name}</Text>
                  <Text variant="caption" color="secondary">{value}px</Text>
                </View>
              ))}
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: theme.spacing["2xl"],
    },
    content: {
      paddingHorizontal: theme.spacing.screenGutter,
      paddingTop: theme.spacing.base,
    },
    section: {
      marginBottom: theme.spacing.base,
    },
    sectionTitle: {
      marginBottom: theme.spacing.sm,
    },
    sectionDesc: {
      marginBottom: theme.spacing.base,
    },
    row: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
      alignItems: "center",
    },
    column: {
      gap: theme.spacing.md,
    },
    colorGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.base,
      marginTop: theme.spacing.sm,
    },
    colorItem: {
      alignItems: "center",
      width: 80,
    },
    colorSwatch: {
      width: 60,
      height: 60,
      borderRadius: theme.radii.md,
      marginBottom: theme.spacing.xs,
    },
    avatarItem: {
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    spacingRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: theme.spacing.sm,
    },
    radiiItem: {
      alignItems: "center",
      gap: theme.spacing.xs,
    },
  });
