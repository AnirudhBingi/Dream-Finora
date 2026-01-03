import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../auth/authContext';
import { getFavorites, Listing, toggleFavorite } from '../api/listingApi';
import { getApiBaseUrl } from '../api/getApiBaseUrl';
import { SkeletonListingList } from '../components/SkeletonLoader';

interface FavoritesScreenProps {
  onBack: () => void;
  onNavigateToListing?: (listingId: string) => void;
}

export function FavoritesScreen({ onBack, onNavigateToListing }: FavoritesScreenProps) {
  const { token } = useAuth();
  const [favorites, setFavorites] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFavorites();
  }, [token]);

  async function loadFavorites() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const favoritesData = await getFavorites(token);
      setFavorites(favoritesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load favorites');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleToggleFavorite(listingId: string) {
    if (!token) return;

    try {
      await toggleFavorite(token, listingId);
      await loadFavorites(); // Reload to update list
    } catch (err) {
      // Silently fail - user can retry
      console.error('Failed to toggle favorite:', err);
    }
  }

  function formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  function getListingTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      roommate: 'Roommate',
      accommodation: 'Accommodation',
      item: 'Item',
      event: 'Event',
      ride: 'Ride',
    };
    return labels[type] || type;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#2563EB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Favorites</Text>
          <View style={styles.placeholder} />
        </View>
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <SkeletonListingList count={5} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#2563EB" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Favorites</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadFavorites}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color="#2563EB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favorites</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadFavorites} />}
      >
        {favorites.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="favorite-border" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>No favorites yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the heart icon on listings to add them to your favorites
            </Text>
          </View>
        ) : (
          favorites.map((listing) => (
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
              {listing.images && listing.images.length > 0 && (
                <Image
                  source={{
                    uri: listing.images[0].startsWith('http')
                      ? listing.images[0]
                      : `${getApiBaseUrl()}${listing.images[0]}`,
                  }}
                  style={styles.listingImage}
                  resizeMode="cover"
                />
              )}
              <View style={styles.listingContent}>
                <View style={styles.listingHeader}>
                  <View style={styles.listingInfo}>
                    <Text style={styles.listingType}>{getListingTypeLabel(listing.type)}</Text>
                    <Text style={styles.listingTitle} numberOfLines={2}>
                      {listing.title}
                    </Text>
                  </View>
                  {listing.price && (
                    <Text style={styles.listingPrice}>
                      {formatCurrency(listing.price, listing.currency || 'USD')}
                    </Text>
                  )}
                </View>
                {listing.location && (
                  <View style={styles.locationContainer}>
                    <MaterialIcons name="location-on" size={16} color="#6B7280" />
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
                    <MaterialIcons name="favorite" size={20} color="#EF4444" />
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    minHeight: 300,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  listingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  listingImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#F3F4F6',
  },
  listingContent: {
    padding: 16,
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  listingInfo: {
    flex: 1,
    marginRight: 12,
  },
  listingType: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  listingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  listingPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  listingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  viewsText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  unfavoriteButton: {
    padding: 4,
  },
});

