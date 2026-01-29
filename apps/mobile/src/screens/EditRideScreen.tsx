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
import { updateRide, getRideById, Ride, UpdateRideDto } from "../api/rideApi";
import { getGroups, Group, getGroupById, GroupMember } from "../api/groupApi";
import {
  ParticipantPicker,
  SelectedParticipant,
} from "../components/ParticipantPicker";
import { DatePicker } from "../components/DatePicker";
import { Header } from "../components/Header";
import { useDataFetch } from "../hooks/useDataFetch";
import { useAsyncOperation } from "../hooks/useAsyncOperation";
import { ErrorState } from "../components/ErrorState";
import { useTheme } from "../theme";

interface EditRideScreenProps {
  rideId: string;
  onBack: () => void;
  onSuccess: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function EditRideScreen({
  rideId,
  onBack,
  onSuccess,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: EditRideScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token, user } = useAuth();
  const [type, setType] = useState<"giveRide" | "rideshare">("giveRide");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [distance, setDistance] = useState("");
  const [chargePerMile, setChargePerMile] = useState("");
  const [chargePerRide, setChargePerRide] = useState("");
  const [rideDate, setRideDate] = useState("");
  const [selectedPassengers, setSelectedPassengers] = useState<
    SelectedParticipant[]
  >([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(
    undefined,
  );

  const originInputRef = useRef<TextInput>(null);
  const destinationInputRef = useRef<TextInput>(null);
  const distanceInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const {
    data: ride,
    loading: loadingRide,
    error,
    refetch,
  } = useDataFetch<Ride>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getRideById(token, rideId);
    },
    immediate: true,
    deps: [token, rideId],
    transform: (data) => {
      setType(data.type);
      setOrigin(data.origin);
      setDestination(data.destination);
      setDistance(data.distance?.toString() || "");
      setChargePerMile(data.chargePerMile?.toString() || "");
      setChargePerRide(data.chargePerRide?.toString() || "");
      setRideDate(data.date ? data.date.split("T")[0] : "");

      // Convert existing participants to SelectedParticipant format
      // Filter out driver and current user (driver should never be a passenger, but add safety check)
      const passengers = data.participants
        .filter((p) => !p.isDriver && p.userId !== user?.id) // Exclude driver and current user
        .map((p) => ({
          userId: p.userId,
          type: "group-member" as const, // Default to group-member, adjust if needed
          name: p.user?.profile?.displayName || p.user?.email || "Unknown",
          email: p.user?.email || "",
        }));
      setSelectedPassengers(passengers);
      return data;
    },
  });

  // Fetch groups for participant picker
  const { data: groupsData } = useDataFetch<Group[]>({
    fetchFn: async () => {
      if (!token) throw new Error("Not authenticated");
      const groupsData = await getGroups(token);
      return Array.isArray(groupsData) ? groupsData : groupsData?.groups || [];
    },
    immediate: true,
    deps: [token],
  });

  const groups = groupsData || [];

  // Calculate total cost preview
  function calculateTotalCost(): number {
    if (chargePerMile && distance) {
      return parseFloat(chargePerMile) * parseFloat(distance);
    } else if (chargePerRide) {
      return parseFloat(chargePerRide);
    }
    return ride?.totalCost || 0;
  }

  // Calculate cost per person preview
  function getCostPerPersonPreview(): string {
    const totalCost = calculateTotalCost();
    if (totalCost <= 0) return "";

    const passengerIds = selectedPassengers.map((p) => p.userId);
    // For rideshare, include driver (current user); for giveRide, exclude driver
    const participantCount =
      type === "rideshare"
        ? passengerIds.length + 1 // +1 for driver
        : passengerIds.length; // Driver doesn't pay in giveRide

    if (participantCount === 0) {
      return type === "rideshare"
        ? "$0.00 each (you + 0 passengers)"
        : "Add passengers to see cost";
    }

    const costPerPerson = totalCost / participantCount;
    const driverText = type === "rideshare" ? "you + " : "";
    return `$${costPerPerson.toFixed(2)} each (${driverText}${passengerIds.length} ${passengerIds.length === 1 ? "passenger" : "passengers"})`;
  }

  const totalCost = calculateTotalCost();
  const costPreview = getCostPerPersonPreview();
  const canSubmit = origin.trim() && destination.trim() && totalCost > 0;

  const { execute: handleSubmit, loading } = useAsyncOperation({
    operationFn: async () => {
      if (!token) throw new Error("Not authenticated");

      if (!origin.trim() || !destination.trim()) {
        throw new Error("Please enter origin and destination");
      }

      if (!chargePerMile && !chargePerRide) {
        throw new Error(
          "Please enter either charge per mile or charge per ride",
        );
      }

      if (chargePerMile && !distance) {
        throw new Error("Please enter distance when using charge per mile");
      }

      // Filter out current user from passenger IDs (safety check - driver should never be a passenger)
      const passengerIds = selectedPassengers
        .filter((p) => p.userId !== user?.id)
        .map((p) => p.userId);

      const data: UpdateRideDto = {
        type,
        origin: origin.trim(),
        destination: destination.trim(),
        distance: distance ? parseFloat(distance) : undefined,
        chargePerMile: chargePerMile ? parseFloat(chargePerMile) : undefined,
        chargePerRide: chargePerRide ? parseFloat(chargePerRide) : undefined,
        passengerIds: passengerIds.length > 0 ? passengerIds : undefined,
        date: rideDate || undefined,
      };

      return updateRide(token, rideId, data);
    },
    onSuccess: () => {
      Alert.alert(
        "Success",
        "Ride updated successfully! Expense automatically updated.",
        [{ text: "OK", onPress: onSuccess }],
      );
    },
    onError: (errorMessage) => {
      Alert.alert("Error", errorMessage);
    },
  });

  if (loadingRide) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Edit Ride"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading ride...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !ride) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <Header
          title="Edit Ride"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <ErrorState message={error || "Ride not found"} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="Edit Ride"
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
          {/* Hero Total Cost Section */}
          {totalCost > 0 && (
            <View style={styles.heroSection}>
              <Text style={styles.heroLabel}>Total Cost</Text>
              <View style={styles.amountContainer}>
                <Text style={styles.currencySymbolLarge}>$</Text>
                <Text style={styles.amountDisplay}>{totalCost.toFixed(2)}</Text>
              </View>
              {costPreview && (
                <Text style={styles.costPreview}>{costPreview}</Text>
              )}
            </View>
          )}

          {/* Ride Type Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ride Type</Text>
            <View style={styles.typeButtons}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === "giveRide" && styles.typeButtonSelected,
                ]}
                onPress={() => setType("giveRide")}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="drive-eta"
                  size={20}
                  color={
                    type === "giveRide"
                      ? theme.colors.white
                      : theme.colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    type === "giveRide" && styles.typeButtonTextSelected,
                  ]}
                >
                  Charge Riders
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === "rideshare" && styles.typeButtonSelected,
                ]}
                onPress={() => setType("rideshare")}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="share"
                  size={20}
                  color={
                    type === "rideshare"
                      ? theme.colors.white
                      : theme.colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    type === "rideshare" && styles.typeButtonTextSelected,
                  ]}
                >
                  Split Cost
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.helperBox}>
              <MaterialIcons
                name="info-outline"
                size={16}
                color={theme.colors.primary}
              />
              <Text style={styles.helperText}>
                {type === "giveRide"
                  ? "You charge passengers - you don't pay"
                  : "Everyone splits the cost, including you"}
              </Text>
            </View>
          </View>

          {/* Route Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Route</Text>
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
                placeholder="Origin (e.g., 123 Main St)"
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
                placeholder="Destination (e.g., 456 Oak Ave)"
                placeholderTextColor={theme.colors.textTertiary}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => distanceInputRef.current?.focus()}
              />
            </View>
          </View>

          {/* Pricing Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pricing</Text>
            <View style={styles.pricingRow}>
              <View style={styles.pricingOption}>
                <View style={styles.inputRow}>
                  <MaterialIcons
                    name="straighten"
                    size={20}
                    color={theme.colors.primary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={distanceInputRef}
                    style={styles.input}
                    value={distance}
                    onChangeText={setDistance}
                    placeholder="Distance (miles)"
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType="decimal-pad"
                    returnKeyType="next"
                  />
                </View>
                <View style={styles.inputRow}>
                  <MaterialIcons
                    name="attach-money"
                    size={20}
                    color={theme.colors.primary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    value={chargePerMile}
                    onChangeText={setChargePerMile}
                    placeholder="Per mile (e.g., 0.50)"
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType="decimal-pad"
                    returnKeyType="next"
                  />
                </View>
                {chargePerMile && distance && (
                  <View style={styles.calculatedPreview}>
                    <MaterialIcons
                      name="calculate"
                      size={16}
                      color={theme.colors.success}
                    />
                    <Text style={styles.calculatedText}>
                      $
                      {(
                        parseFloat(chargePerMile || "0") *
                        parseFloat(distance || "0")
                      ).toFixed(2)}{" "}
                      total
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.pricingDivider}>
                <View
                  style={{
                    flex: 1,
                    height: 1,
                    backgroundColor: theme.colors.border,
                  }}
                />
                <Text style={styles.dividerText}>OR</Text>
                <View
                  style={{
                    flex: 1,
                    height: 1,
                    backgroundColor: theme.colors.border,
                  }}
                />
              </View>

              <View style={styles.pricingOption}>
                <View style={styles.inputRow}>
                  <MaterialIcons
                    name="money"
                    size={20}
                    color={theme.colors.primary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    value={chargePerRide}
                    onChangeText={setChargePerRide}
                    placeholder="Flat rate (e.g., 10.00)"
                    placeholderTextColor={theme.colors.textTertiary}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </View>
              </View>
            </View>
            <Text style={styles.helperTextSmall}>
              Use either distance-based or flat rate pricing
            </Text>
          </View>

          {/* Date Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Date (Optional)</Text>
            <DatePicker
              value={rideDate}
              onChange={setRideDate}
              placeholder="Select ride date"
            />
          </View>

          {/* Passengers Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Passengers</Text>
            <Text style={styles.helperTextSmall}>
              Update passengers from groups
            </Text>
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
              excludeCurrentUser={type === "giveRide"} // For Charge Riders, driver (current user) cannot be a passenger
            />
            {costPreview && (
              <View style={styles.costPreviewBox}>
                <MaterialIcons
                  name="info-outline"
                  size={16}
                  color={theme.colors.primary}
                />
                <Text style={styles.costPreviewText}>{costPreview}</Text>
              </View>
            )}
          </View>

          {/* Info Box - Editing consequences */}
          <View style={styles.infoBox}>
            <MaterialIcons
              name="info-outline"
              size={20}
              color={theme.colors.warning}
              style={styles.infoIcon}
            />
            <Text style={styles.infoText}>
              Editing this ride will recalculate expense splits for all
              participants and reset payment status.
            </Text>
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
            !canSubmit && styles.fabDisabled,
            loading && styles.fabDisabled,
          ]}
          onPress={() => handleSubmit()}
          disabled={!canSubmit || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.white} />
          ) : (
            <>
              <Text style={styles.fabText}>Update Ride</Text>
              {totalCost > 0 && (
                <Text style={styles.fabSubtext}>
                  ${totalCost.toFixed(2)} total
                </Text>
              )}
            </>
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
      paddingBottom: 100, // Space for floating button
    },
    content: {
      paddingHorizontal: theme.spacing.base,
      paddingTop: theme.spacing.base,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.xl,
    },
    loadingText: {
      marginTop: theme.spacing.base,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.gray500,
    },
    heroSection: {
      alignItems: "center",
      marginBottom: theme.spacing["2xl"],
      paddingTop: theme.spacing.sm,
    },
    heroLabel: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    amountContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: theme.spacing.sm,
    },
    currencySymbolLarge: {
      fontSize: 48,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
      marginRight: theme.spacing.xs,
    },
    amountDisplay: {
      fontSize: 48,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.textPrimary,
    },
    costPreview: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    card: {
      backgroundColor: theme.colors.background,
      borderRadius: 16,
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
    typeButtons: {
      flexDirection: "row",
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    typeButton: {
      flex: 1,
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.base,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    typeButtonSelected: {
      backgroundColor: theme.colors.blue,
      borderColor: theme.colors.blue,
    },
    typeButtonText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.gray700,
      fontWeight: theme.typography.fontWeight.medium,
    },
    typeButtonTextSelected: {
      color: theme.colors.white,
    },
    helperBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.blueLight,
      borderRadius: theme.spacing.sm,
    },
    helperText: {
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textPrimary,
      lineHeight: 20,
    },
    helperTextSmall: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.textTertiary,
      marginTop: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: theme.spacing.base,
      paddingVertical: theme.spacing.sm,
      marginBottom: theme.spacing.md,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    inputIcon: {
      marginRight: theme.spacing.sm,
    },
    input: {
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
      padding: 0,
      minHeight: 20,
    },
    pricingRow: {
      gap: theme.spacing.md,
    },
    pricingOption: {
      gap: theme.spacing.md,
    },
    pricingDivider: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    dividerText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.textTertiary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    calculatedPreview: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.successBackground,
      borderRadius: theme.spacing.sm,
      marginTop: -theme.spacing.sm,
    },
    calculatedText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.success,
    },
    costPreviewBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.blueLight,
      borderRadius: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    costPreviewText: {
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textPrimary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    infoBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.warningBackground,
      borderRadius: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    infoIcon: {
      marginTop: 2,
    },
    infoText: {
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textPrimary,
      lineHeight: 20,
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
    fabSubtext: {
      color: theme.colors.white,
      fontSize: theme.typography.fontSize.xs,
      opacity: 0.9,
      marginTop: 2,
    },
  });
