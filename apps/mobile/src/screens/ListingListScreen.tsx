import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/authContext';
import { getListings, Listing, ListingType } from '../api/listingApi';
import { getApiBaseUrl } from '../api/getApiBaseUrl';

interface ListingListScreenProps {
  onCreateListing: () => void;
  onViewListing: (listingId: string) => void;
  onBack: () => void;
}

export function ListingListScreen({
  onCreateListing,
  onViewListing,
  onBack,
}: ListingListScreenProps) {
  const { token } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<ListingType | undefined>(undefined);

  useEffect(() => {
    loadListings();
  }, [token, selectedType, searchQuery]);

  async function loadListings() {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const listingsData = await getListings(token, {
        type: selectedType,
        search: searchQuery || undefined,
      });
      setListings(listingsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load market');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  function getUserDisplayName(user: Listing['user']): string {
    return user.profile?.displayName || user.email;
  }

  function getListingTypeLabel(type: ListingType): string {
    const labels: Record<ListingType, string> = {
      [ListingType.ROOMMATE]: 'Roommate',
      [ListingType.ACCOMMODATION]: 'Accommodation',
      [ListingType.ITEM]: 'Item',
      [ListingType.EVENT]: 'Event',
      [ListingType.RIDE]: 'Ride',
    };
    return labels[type] || type;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading market...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadListings} />
        }
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.createButton}
              onPress={onCreateListing}
              activeOpacity={0.7}
            >
              <Text style={styles.createButtonText}>List Item</Text>
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadListings}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search market..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContainer}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                !selectedType && styles.filterChipSelected,
              ]}
              onPress={() => setSelectedType(undefined)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  !selectedType && styles.filterChipTextSelected,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {Object.values(ListingType).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterChip,
                  selectedType === type && styles.filterChipSelected,
                ]}
                onPress={() => setSelectedType(type)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedType === type && styles.filterChipTextSelected,
                  ]}
                >
                  {getListingTypeLabel(type)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.sectionTitle}>Market</Text>

          {listings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No listings found</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery || selectedType
                  ? 'Try adjusting your search or filters'
                  : 'Create your first listing to get started!'}
              </Text>
              {!searchQuery && !selectedType && (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={onCreateListing}
                >
                  <Text style={styles.emptyButtonText}>Create Listing</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            listings.map((listing) => (
              <TouchableOpacity
                key={listing.id}
                style={styles.listingCard}
                onPress={() => onViewListing(listing.id)}
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
                    <Text style={styles.listingType}>
                      {getListingTypeLabel(listing.type)}
                    </Text>
                    {listing.price && (
                      <Text style={styles.listingPrice}>
                        {formatCurrency(listing.price, listing.currency || 'USD')}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.listingTitle}>{listing.title}</Text>
                  {listing.location && (
                    <Text style={styles.listingLocation}>📍 {listing.location}</Text>
                  )}
                  <View style={styles.listingFooter}>
                    <Text style={styles.listingCreator}>
                      {getUserDisplayName(listing.user)}
                    </Text>
                    <Text style={styles.listingViews}>{listing.views} views</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  content: {
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 44,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '500',
  },
  createButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
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
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  filterScroll: {
    marginBottom: 16,
  },
  filterContainer: {
    paddingRight: 24,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  filterChipTextSelected: {
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  listingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
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
    alignItems: 'center',
    marginBottom: 8,
  },
  listingType: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  listingPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  listingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  listingLocation: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  listingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listingCreator: {
    fontSize: 14,
    color: '#374151',
  },
  listingViews: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});

