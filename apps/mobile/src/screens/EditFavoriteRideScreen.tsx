import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/authContext";
import {
  updateFavoriteRide,
  getFavoriteRides,
  RideFavorite,
  UpdateRideFavoriteDto,
} from "../api/rideApi";
import {
  ParticipantPicker,
  SelectedParticipant,
} from "../components/ParticipantPicker";
import { Header } from "../components/Header";
import { useDataFetch } from "../hooks/useDataFetch";
import { useAsyncOperation } from "../hooks/useAsyncOperation";
import { ErrorState } from "../components/ErrorState";
import { useTheme } from "../theme";

interface EditFavoriteRideScreenProps {
  favorite: RideFavorite;
  onBack: () => void;
  onSuccess: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function EditFavoriteRideScreen({
  favorite,
  onBack,
  onSuccess,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: EditFavoriteRideScreenProps) {
  const { token, user } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [name, setName] = useState(favorite.name);
  const [origin, setOrigin] = useState(favorite.origin || "");
  const [destination, setDestination] = useState(favorite.destination || "");
  const [chargePerMile, setChargePerMile] = useState(
    favorite.chargePerMile?.toString() || "",
  );
  const [chargePerRide, setChargePerRide] = useState(
    favorite.chargePerRide?.toString() || "",
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(
    favorite.groupId || undefined,
  );
  const [selectedPassengers, setSelectedPassengers] = useState<
    SelectedParticipant[]
  >([]);

  const nameInputRef = useRef<TextInput>(null);
  const originInputRef = useRef<TextInput>(null);
  const destinationInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Convert favorite passengers to SelectedParticipant format
  useEffect(() => {
    const passengers = favorite.passengers.map((p) => ({
      userId: p.id,
      type: "group-member" as const,
      name: p.displayName,
      email: p.email,
    }));
    setSelectedPassengers(passengers);
  }, [favorite]);

  const { execute: handleSubmit, loading } = useAsyncOperation({
    operationFn: async () => {
      if (!name.trim()) {
        throw new Error("Please enter a favorite name");
      }

      if (!chargePerMile && !chargePerRide) {
        throw new Error(
          "Please enter either charge per mile or charge per ride",
        );
      }

      if (!token) {
        throw new Error("Not authenticated");
      }

      // Filter out current user from passenger IDs (safety check)
      const passengerIds = selectedPassengers
        .filter((p) => p.userId !== user?.id)
        .map((p) => p.userId);

      if (passengerIds.length === 0) {
        throw new Error("At least one passenger is required");
      }

      const data: UpdateRideFavoriteDto = {
        name: name.trim(),
        passengerIds,
        chargePerMile: chargePerMile ? parseFloat(chargePerMile) : undefined,
        chargePerRide: chargePerRide ? parseFloat(chargePerRide) : undefined,
        origin: origin.trim() || undefined,
        destination: destination.trim() || undefined,
        groupId: selectedGroupId || undefined,
      };

      return updateFavoriteRide(token, favorite.id, data);
    },
    onSuccess: () => {
      Alert.alert("Success", "Favorite updated successfully!", [
        { text: "OK", onPress: onSuccess },
      ]);
    },
    onError: (errorMessage) => {
      Alert.alert("Error", errorMessage);
    },
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="Edit Favorite"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />
      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Name Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Favorite Name</Text>
            <View style={styles.inputRow}>
              <MaterialIcons
                name="label"
                size={20}
                color={theme.colors.primary}
                style={styles.inputIcon}
              />
              <TextInput
                ref={nameInputRef}
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Favorite name (e.g., School run with John)"
                placeholderTextColor={theme.colors.textTertiary}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => originInputRef.current?.focus()}
              />
            </View>
          </View>

          {/* Route Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Route (Optional)</Text>
            <View style={styles.inputRow}>
              <MaterialIcons
                name="place"
                size={20}
                color={theme.colors.success}
                style={styles.inputIcon}
              />
              <TextInput
                ref={originInputRef}
                style={styles.input}
                value={origin}
                onChangeText={setOrigin}
                placeholder="Origin (optional)"
                placeholderTextColor={theme.colors.textTertiary}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => destinationInputRef.current?.focus()}
              />
            </View>
            <View style={styles.inputRow}>
              <MaterialIcons
                name="place"
                size={20}
                color={theme.colors.error}
                style={styles.inputIcon}
              />
              <TextInput
                ref={destinationInputRef}
                style={styles.input}
                value={destination}
                onChangeText={setDestination}
                placeholder="Destination (optional)"
                placeholderTextColor={theme.colors.textTertiary}
                autoCapitalize="words"
                returnKeyType="done"
              />
            </View>
          </View>

          {/* Pricing Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pricing</Text>
            <View style={styles.inputRow}>
              <MaterialIcons
                name="attach-money"
                size={20}
                color={theme.colors.blue}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={chargePerRide}
                onChangeText={(text) => {
                  setChargePerRide(text);
                  if (text) setChargePerMile("");
                }}
                placeholder="Charge per ride (e.g., 10)"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            </View>
            <Text style={styles.inputDivider}>OR</Text>
            <View style={styles.inputRow}>
              <MaterialIcons
                name="straighten"
                size={20}
                color={theme.colors.blue}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={chargePerMile}
                onChangeText={(text) => {
                  setChargePerMile(text);
                  if (text) setChargePerRide("");
                }}
                placeholder="Charge per mile (e.g., 1.5)"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>
          </View>

          {/* Passengers Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Passengers</Text>
            <ParticipantPicker
              selectedParticipants={selectedPassengers}
              onSelectionChange={(participants) => {
                setSelectedPassengers(participants);
              }}
              allowMultiple={true}
              showGroups={true}
              showFriends={false}
              initialGroupId={selectedGroupId || null}
              onGroupChange={(groupId) => {
                setSelectedGroupId(groupId || undefined);
              }}
              excludeCurrentUser={true} // Driver cannot be a passenger
            />
          </View>

          {/* Bottom spacing for floating button */}
          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[
            styles.fab,
            (!name.trim() || (!chargePerMile && !chargePerRide)) &&
              styles.fabDisabled,
            loading && styles.fabDisabled,
          ]}
          onPress={() => handleSubmit()}
          disabled={
            !name.trim() || (!chargePerMile && !chargePerRide) || loading
          }
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.white} />
          ) : (
            <Text style={styles.fabText}>Update Favorite</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xl,
    },
    content: {
      paddingHorizontal: theme.spacing.base,
      paddingTop: theme.spacing.base,
    },
    card: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.spacing.md,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.base,
      ...theme.shadows.sm,
    },
    cardTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.gray700,
      marginBottom: theme.spacing.base,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    inputIcon: {
      marginRight: theme.spacing.xs,
    },
    input: {
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    inputDivider: {
      textAlign: "center",
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
      marginVertical: theme.spacing.sm,
    },
    bottomSpacer: {
      height: theme.spacing.xl,
    },
    fabContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: theme.spacing.base,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      ...theme.shadows.md,
    },
    fab: {
      backgroundColor: theme.colors.blue,
      borderRadius: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      minHeight: 56,
      alignItems: "center",
      justifyContent: "center",
      ...theme.shadows.md,
    },
    fabDisabled: {
      opacity: 0.6,
    },
    fabText: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
    },
  });
