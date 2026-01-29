import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../auth/authContext";
import { getFavorites, Listing, toggleFavorite } from "../api/listingApi";
import { getApiBaseUrl } from "../api/getApiBaseUrl";
import { SkeletonListingList } from "../components/SkeletonLoader";
import { useDataFetch } from "../hooks/useDataFetch";
import { useAsyncOperation } from "../hooks/useAsyncOperation";
import { ErrorState } from "../components/ErrorState";
import { useTheme } from "../theme";

interface FavoritesScreenProps {
  onBack: () => void;
  onNavigateToListing?: (listingId: string) => void;
}

export function FavoritesScreen({
  onBack,
  onNavigateToListing,
}: FavoritesScreenProps) {
  const { token } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const {
    data: favorites,
    loading,
    refreshing,
    error,
    refresh,
    refetch,
  } = useDataFetch<Listing[]>({
    fetchFn: async () => {
      if (!token) throw new Error("No authentication token");
      return getFavorites(token);
    },
    immediate: true,
    deps: [token],
  });

  const { execute: executeToggleFavorite } = useAsyncOperation({
    operationFn: async (listingId: string) => {
      if (!token) throw new Error("No authentication token");
      return toggleFavorite(token, listingId);
    },
    onSuccess: () => {
      refetch();
    },
  });

  function handleToggleFavorite(listingId: string) {
    executeToggleFavorite(listingId);
  }

  function formatCurrency(amount: number, currency: string = "USD"): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  }

  function getListingTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      roommate: "Roommate",
      accommodation: "Accommodation",
      item: "Item",
      event: "Event",
      ride: "Ride",
    };
    return labels[type] || type;
  }

  const favoritesList = favorites ?? [];

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={theme.colors.blue}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Favorites</Text>
          <View style={styles.placeholder} />
        </View>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.content}>
            <SkeletonListingList count={5} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={theme.colors.blue}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Favorites</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons
            name="error-outline"
            size={48}
            color={theme.colors.error}
          />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={theme.colors.blue}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favorites</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
        {favoritesList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons
              name="favorite-border"
              size={64}
              color={theme.colors.textTertiary}
            />
            <Text style={styles.emptyText}>No favorites yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the heart icon on listings to add them to your favorites
            </Text>
          </View>
        ) : (
          favoritesList.map((listing) => (
            <TouchableOpacity
              key={listing.id}
              style={styles.listingCard}
              onPress={() => {
                if (onNavigateToListing) {
                  onNavigateToListing(listing.id);
                }
              }}
              activeOpacity={0.7}
            >
              {(() => {
                const validImages = (listing.images || []).filter(
                  (imageUrl) =>
                    imageUrl != null &&
                    typeof imageUrl === "string" &&
                    imageUrl.trim().length > 0,
                );
                const firstImage = validImages[0];
                return firstImage ? (
                  <Image
                    source={{
                      uri: firstImage.startsWith("http")
                        ? firstImage
                        : `${getApiBaseUrl()}${firstImage}`,
                    }}
                    style={styles.listingImage}
                    resizeMode="cover"
                  />
                ) : null;
              })()}
              <View style={styles.listingContent}>
                <View style={styles.listingHeader}>
                  <View style={styles.listingInfo}>
                    <Text style={styles.listingType}>
                      {getListingTypeLabel(listing.type)}
                    </Text>
                    <Text style={styles.listingTitle} numberOfLines={2}>
                      {listing.title}
                    </Text>
                  </View>
                  {listing.price && (
                    <Text style={styles.listingPrice}>
                      {formatCurrency(listing.price, listing.currency || "USD")}
                    </Text>
                  )}
                </View>
                {listing.location && (
                  <View style={styles.locationContainer}>
                    <MaterialIcons
                      name="location-on"
                      size={16}
                      color={theme.colors.textSecondary}
                    />
                    <Text style={styles.locationText} numberOfLines={1}>
                      {listing.location}
                    </Text>
                  </View>
                )}
                <View style={styles.listingFooter}>
                  <Text style={styles.viewsText}>{listing.views} views</Text>
                  <TouchableOpacity
                    style={styles.unfavoriteButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(listing.id);
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name="favorite"
                      size={20}
                      color={theme.colors.error}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
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
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: theme.colors.background,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      padding: 8,
      minWidth: 40,
      minHeight: 40,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    placeholder: {
      width: 40,
    },
    container: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 32,
    },
    content: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    errorText: {
      marginTop: 16,
      fontSize: 16,
      color: theme.colors.error,
      textAlign: "center",
    },
    retryButton: {
      marginTop: 16,
      backgroundColor: theme.colors.blue,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
      minHeight: 44,
    },
    retryButtonText: {
      color: theme.colors.white,
      fontSize: 16,
      fontWeight: "500",
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 48,
      minHeight: 300,
    },
    emptyText: {
      marginTop: 16,
      fontSize: 20,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    emptySubtext: {
      marginTop: 8,
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    listingCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      marginBottom: 12,
      overflow: "hidden",
      shadowColor: theme.colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    listingImage: {
      width: "100%",
      height: 200,
      backgroundColor: theme.colors.backgroundTertiary,
    },
    listingContent: {
      padding: 16,
    },
    listingHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 8,
    },
    listingInfo: {
      flex: 1,
      marginRight: 12,
    },
    listingType: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      marginBottom: 4,
    },
    listingTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    listingPrice: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    locationContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
      gap: 4,
    },
    locationText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    listingFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    viewsText: {
      fontSize: 12,
      color: theme.colors.textTertiary,
    },
    unfavoriteButton: {
      padding: 4,
    },
  });
