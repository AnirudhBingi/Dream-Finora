import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { pickMultipleImages } from '../utils/imagePicker';
import { useAuth } from '../auth/authContext';
import {
  getListingById,
  updateListing,
  CreateListingDto,
  ListingType,
  uploadListingImages,
  suggestCategory,
  getItemCategories,
  Listing,
  RoommateMetadata,
  AccommodationMetadata,
  ItemMetadata,
  EventMetadata,
  RideMetadata,
} from '../api/listingApi';
import { DatePicker } from '../components/DatePicker';
import { MaterialIcons } from '@expo/vector-icons';
import { getApiBaseUrl } from '../api/getApiBaseUrl';
import { Header } from '../components/Header';

interface EditSpaceVScreenProps {
  spacevId: string;
  onBack: () => void;
  onSuccess: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function EditSpaceVScreen({ 
  spacevId, 
  onBack, 
  onSuccess,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: EditSpaceVScreenProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState<Listing | null>(null);
  const [type, setType] = useState<ListingType>(ListingType.ROOMMATE);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [itemCategories, setItemCategories] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const categorySuggestTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const categoryScrollViewRef = useRef<ScrollView>(null);
  const categoryChipRefs = useRef<Record<string, any>>({});

  // Type-specific state
  const [lookingFor, setLookingFor] = useState<boolean>(true);
  const [budget, setBudget] = useState('');
  const [moveInDate, setMoveInDate] = useState('');
  const [duration, setDuration] = useState<string>('long-term');
  const [smoking, setSmoking] = useState<boolean | undefined>(undefined);
  const [pets, setPets] = useState<boolean | undefined>(undefined);
  const [gender, setGender] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');
  const [leaseDuration, setLeaseDuration] = useState('');
  const [utilitiesIncluded, setUtilitiesIncluded] = useState<boolean | undefined>(undefined);
  const [furnished, setFurnished] = useState<boolean | undefined>(undefined);
  const [condition, setCondition] = useState<string>('used');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [maxAttendees, setMaxAttendees] = useState('');
  const [eventType, setEventType] = useState('');
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [rideDate, setRideDate] = useState('');
  const [rideTime, setRideTime] = useState('');
  const [availableSeats, setAvailableSeats] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [pricePerPerson, setPricePerPerson] = useState('');

  useEffect(() => {
    loadListing();
  }, [token, spacevId]);

  useEffect(() => {
    if (type === ListingType.ITEM && token) {
      loadItemCategories();
    }
  }, [token, type]);

  useEffect(() => {
    if (type !== ListingType.ITEM || !title.trim() || !token) return;

    if (categorySuggestTimeoutRef.current) {
      clearTimeout(categorySuggestTimeoutRef.current);
    }

    categorySuggestTimeoutRef.current = setTimeout(async () => {
      if (!token || !title.trim()) return;
      try {
        const result = await suggestCategory(token, title);
        if (result.category) {
          setCategory(result.category);
          setIsAutoDetected(true);
          setTimeout(() => {
            scrollToCategory(result.category!);
          }, 100);
        }
      } catch (err) {
        console.error('Failed to suggest category:', err);
      }
    }, 500);

    return () => {
      if (categorySuggestTimeoutRef.current) {
        clearTimeout(categorySuggestTimeoutRef.current);
      }
    };
  }, [title, type, token]);

  async function loadListing() {
    if (!token) return;

    try {
      setLoading(true);
      const listingData = await getListingById(token, spacevId);
      setListing(listingData);
      setType(listingData.type);
      setTitle(listingData.title);
      setDescription(listingData.description);
      setLocation(listingData.location || '');
      setPrice(listingData.price?.toString() || '');
      
      // Load existing images
      if (listingData.images && listingData.images.length > 0) {
        const imageUrls = listingData.images.map(img =>
          img.startsWith('http') ? img : `${getApiBaseUrl()}${img}`
        );
        setImageUris(imageUrls);
      }

      // Load metadata
      const metadata = listingData.metadata as any;
      if (metadata) {
        if (listingData.type === ListingType.ROOMMATE) {
          const m = metadata as RoommateMetadata;
          setLookingFor(m.lookingFor ?? true);
          setBudget(m.budget?.toString() || '');
          setMoveInDate(m.moveInDate || '');
          setDuration(m.duration || 'long-term');
          setSmoking(m.preferences?.smoking);
          setPets(m.preferences?.pets);
          setGender(m.preferences?.gender || '');
          setAgeRange(m.preferences?.ageRange || '');
        } else if (listingData.type === ListingType.ACCOMMODATION) {
          const m = metadata as AccommodationMetadata;
          setBedrooms(m.bedrooms?.toString() || '');
          setBathrooms(m.bathrooms?.toString() || '');
          setAvailableFrom(m.availableFrom || '');
          setLeaseDuration(m.leaseDuration || '');
          setUtilitiesIncluded(m.utilitiesIncluded);
          setFurnished(m.furnished);
        } else if (listingData.type === ListingType.ITEM) {
          const m = metadata as ItemMetadata;
          setCondition(m.condition || 'used');
          setCategory(m.category || '');
          setBrand(m.brand || '');
        } else if (listingData.type === ListingType.EVENT) {
          const m = metadata as EventMetadata;
          setEventDate(m.eventDate || '');
          setEventTime(m.eventTime || '');
          setMaxAttendees(m.maxAttendees?.toString() || '');
          setEventType(m.eventType || '');
          setIsPublic(m.isPublic ?? true);
        } else if (listingData.type === ListingType.RIDE) {
          const m = metadata as RideMetadata;
          setOrigin(m.origin || '');
          setDestination(m.destination || '');
          setRideDate(m.rideDate || '');
          setRideTime(m.rideTime || '');
          setAvailableSeats(m.availableSeats?.toString() || '');
          setVehicleType(m.vehicleType || '');
          setPricePerPerson(m.pricePerPerson?.toString() || '');
        }
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load SpaceV listing');
      onBack();
    } finally {
      setLoading(false);
    }
  }

  async function loadItemCategories() {
    if (!token) return;
    try {
      setCategoriesLoading(true);
      const categories = await getItemCategories(token);
      setItemCategories(categories);
    } catch (err) {
      console.error('Failed to load item categories:', err);
    } finally {
      setCategoriesLoading(false);
    }
  }

  function scrollToCategory(cat: string) {
    if (!categoryScrollViewRef.current || !itemCategories.length) return;
    const categoryIndex = itemCategories.indexOf(cat);
    if (categoryIndex === -1) return;
    requestAnimationFrame(() => {
      if (!categoryScrollViewRef.current) return;
      const chipWidth = 140;
      const scrollPosition = categoryIndex * chipWidth;
      categoryScrollViewRef.current.scrollTo({
        x: Math.max(0, scrollPosition - 40),
        animated: true,
      });
    });
  }

  function handleCategorySelect(cat: string) {
    setCategory(cat);
    setIsAutoDetected(false);
    scrollToCategory(cat);
  }

  async function handleSave() {
    if (!token || !listing) return;

    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    const priceNum = price ? parseFloat(price) : undefined;
    if (price && (isNaN(priceNum!) || priceNum! < 0)) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    try {
      setSaving(true);

      // Build type-specific metadata (same as CreateListingScreen)
      let metadata: any = {};
      if (type === ListingType.ROOMMATE) {
        metadata = {
          lookingFor,
          budget: budget ? parseFloat(budget) : undefined,
          moveInDate: moveInDate || undefined,
          duration,
          preferences: {
            smoking: smoking !== undefined ? smoking : undefined,
            pets: pets !== undefined ? pets : undefined,
            gender: gender || undefined,
            ageRange: ageRange || undefined,
          },
        };
      } else if (type === ListingType.ACCOMMODATION) {
        metadata = {
          bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
          bathrooms: bathrooms ? parseFloat(bathrooms) : undefined,
          availableFrom: availableFrom || undefined,
          leaseDuration: leaseDuration || undefined,
          utilitiesIncluded: utilitiesIncluded !== undefined ? utilitiesIncluded : undefined,
          furnished: furnished !== undefined ? furnished : undefined,
        };
      } else if (type === ListingType.ITEM) {
        metadata = {
          condition: condition || undefined,
          category: category || undefined,
          brand: brand || undefined,
        };
      } else if (type === ListingType.EVENT) {
        metadata = {
          eventDate: eventDate || undefined,
          eventTime: eventTime || undefined,
          maxAttendees: maxAttendees ? parseInt(maxAttendees) : undefined,
          eventType: eventType || undefined,
          isPublic,
        };
      } else if (type === ListingType.RIDE) {
        metadata = {
          origin: origin || undefined,
          destination: destination || undefined,
          rideDate: rideDate || undefined,
          rideTime: rideTime || undefined,
          availableSeats: availableSeats ? parseInt(availableSeats) : undefined,
          vehicleType: vehicleType || undefined,
          pricePerPerson: pricePerPerson ? parseFloat(pricePerPerson) : undefined,
        };
      }

      const updateData: Partial<CreateListingDto> = {
        type,
        title: title.trim(),
        description: description.trim(),
        location: location.trim() || undefined,
        price: priceNum,
        currency: listing.currency || 'USD',
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      };

      // Filter out new local images (file://) from existing URLs
      const existingImages = imageUris.filter(uri => !uri.startsWith('file://'));
      const newImages = imageUris.filter(uri => uri.startsWith('file://'));
      
      updateData.images = existingImages.map(img => {
        // Convert back to relative path if needed
        if (img.startsWith(getApiBaseUrl())) {
          return img.replace(getApiBaseUrl(), '');
        }
        return img;
      });

      await updateListing(token, spacevId, updateData);

      // Upload new images if any
      if (newImages.length > 0) {
        try {
          await uploadListingImages(token, spacevId, newImages);
        } catch (err) {
          console.error('Failed to upload new images:', err);
          Alert.alert('Warning', 'SpaceV listing updated but some image uploads failed');
        }
      }

      Alert.alert('Success', 'SpaceV listing updated successfully!', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update SpaceV listing');
    } finally {
      setSaving(false);
    }
  }

  async function pickImages() {
    try {
      const newUris = await pickMultipleImages({ maxImages: 10 });
      if (newUris.length > 0) {
        setImageUris([...imageUris, ...newUris]);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick images');
    }
  }

  function removeImage(index: number) {
    setImageUris(imageUris.filter((_, i) => i !== index));
  }

  function getListingTypeLabel(listingType: ListingType): string {
    const labels: Record<ListingType, string> = {
      [ListingType.ROOMMATE]: 'Roommate',
      [ListingType.ACCOMMODATION]: 'Accommodation',
      [ListingType.ITEM]: 'Item',
      [ListingType.EVENT]: 'Event',
      [ListingType.RIDE]: 'Ride',
    };
    return labels[listingType] || listingType;
  }

  function renderTypeSpecificFields() {
    if (type === ListingType.ROOMMATE) {
      return (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Looking For / Offering</Text>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, lookingFor && styles.toggleButtonSelected]}
                onPress={() => setLookingFor(true)}
              >
                <Text style={[styles.toggleText, lookingFor && styles.toggleTextSelected]}>
                  Looking For
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, !lookingFor && styles.toggleButtonSelected]}
                onPress={() => setLookingFor(false)}
              >
                <Text style={[styles.toggleText, !lookingFor && styles.toggleTextSelected]}>
                  Offering
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Budget (Monthly)</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="0.00"
                value={budget}
                onChangeText={setBudget}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <DatePicker
              value={moveInDate}
              onChange={setMoveInDate}
              label="Move-in Date"
              placeholder="Select move-in date"
              minimumDate={new Date()}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Duration</Text>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, duration === 'short-term' && styles.toggleButtonSelected]}
                onPress={() => setDuration('short-term')}
              >
                <Text style={[styles.toggleText, duration === 'short-term' && styles.toggleTextSelected]}>
                  Short-term
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, duration === 'long-term' && styles.toggleButtonSelected]}
                onPress={() => setDuration('long-term')}
              >
                <Text style={[styles.toggleText, duration === 'long-term' && styles.toggleTextSelected]}>
                  Long-term
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Preferences</Text>
            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setSmoking(smoking === true ? undefined : true)}
              >
                <View style={[styles.checkbox, smoking === true && styles.checkboxChecked]}>
                  {smoking === true && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Smoking OK</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setPets(pets === true ? undefined : true)}
              >
                <View style={[styles.checkbox, pets === true && styles.checkboxChecked]}>
                  {pets === true && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Pets OK</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, styles.marginTop]}
              placeholder="Preferred gender (optional)"
              value={gender}
              onChangeText={setGender}
            />
            <TextInput
              style={[styles.input, styles.marginTop]}
              placeholder="Age range (optional)"
              value={ageRange}
              onChangeText={setAgeRange}
            />
          </View>
        </>
      );
    }

    if (type === ListingType.ACCOMMODATION) {
      return (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bedrooms</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 2"
              value={bedrooms}
              onChangeText={setBedrooms}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bathrooms</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 1.5"
              value={bathrooms}
              onChangeText={setBathrooms}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <DatePicker
              value={availableFrom}
              onChange={setAvailableFrom}
              label="Available From"
              placeholder="Select available date"
              minimumDate={new Date()}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Lease Duration</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 1 year, month-to-month"
              value={leaseDuration}
              onChangeText={setLeaseDuration}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Details</Text>
            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setUtilitiesIncluded(utilitiesIncluded !== true)}
              >
                <View style={[styles.checkbox, utilitiesIncluded === true && styles.checkboxChecked]}>
                  {utilitiesIncluded === true && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Utilities Included</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setFurnished(furnished !== true)}
              >
                <View style={[styles.checkbox, furnished === true && styles.checkboxChecked]}>
                  {furnished === true && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Furnished</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      );
    }

    if (type === ListingType.ITEM) {
      return (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Condition</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.conditionScroll}
              contentContainerStyle={styles.conditionContainer}
            >
              {['new', 'like-new', 'used', 'fair', 'poor'].map((cond) => (
                <TouchableOpacity
                  key={cond}
                  style={[styles.conditionChip, condition === cond && styles.conditionChipSelected]}
                  onPress={() => setCondition(cond)}
                >
                  <Text
                    style={[styles.conditionChipText, condition === cond && styles.conditionChipTextSelected]}
                  >
                    {cond.charAt(0).toUpperCase() + cond.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.categoryLabelRow}>
              <Text style={styles.label}>Category</Text>
              {isAutoDetected && category && (
                <View style={styles.autoDetectedBadge}>
                  <MaterialIcons name="auto-awesome" size={14} color="#10B981" />
                  <Text style={styles.autoDetectedText}>Auto-detected</Text>
                </View>
              )}
            </View>
            {categoriesLoading ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <ScrollView
                ref={categoryScrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
                contentContainerStyle={styles.categoryContainer}
              >
                {itemCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    ref={(ref) => {
                      if (ref) categoryChipRefs.current[cat] = ref;
                    }}
                    style={[
                      styles.categoryChip,
                      category === cat && styles.categoryChipSelected,
                      isAutoDetected && category === cat && styles.categoryChipAutoDetected,
                    ]}
                    onPress={() => handleCategorySelect(cat)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        category === cat && styles.categoryChipTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                    {isAutoDetected && category === cat && (
                      <MaterialIcons name="check-circle" size={16} color="#fff" style={styles.checkIcon} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Brand (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Apple, IKEA"
              value={brand}
              onChangeText={setBrand}
            />
          </View>
        </>
      );
    }

    if (type === ListingType.EVENT) {
      return (
        <>
          <View style={styles.inputGroup}>
            <DatePicker
              value={eventDate}
              onChange={setEventDate}
              label="Event Date *"
              placeholder="Select event date"
              minimumDate={new Date()}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Event Time</Text>
            <TextInput
              style={styles.input}
              placeholder="HH:MM (e.g., 18:00)"
              value={eventTime}
              onChangeText={setEventTime}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Event Type</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Party, Meetup, Workshop"
              value={eventType}
              onChangeText={setEventType}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Max Attendees</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 50"
              value={maxAttendees}
              onChangeText={setMaxAttendees}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Visibility</Text>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleButton, isPublic && styles.toggleButtonSelected]}
                onPress={() => setIsPublic(true)}
              >
                <Text style={[styles.toggleText, isPublic && styles.toggleTextSelected]}>
                  Public
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, !isPublic && styles.toggleButtonSelected]}
                onPress={() => setIsPublic(false)}
              >
                <Text style={[styles.toggleText, !isPublic && styles.toggleTextSelected]}>
                  Private
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      );
    }

    if (type === ListingType.RIDE) {
      return (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Origin *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., New York, NY"
              value={origin}
              onChangeText={setOrigin}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Destination *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Boston, MA"
              value={destination}
              onChangeText={setDestination}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <DatePicker
              value={rideDate}
              onChange={setRideDate}
              label="Ride Date *"
              placeholder="Select ride date"
              minimumDate={new Date()}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ride Time</Text>
            <TextInput
              style={styles.input}
              placeholder="HH:MM (e.g., 09:00)"
              value={rideTime}
              onChangeText={setRideTime}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Available Seats</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 3"
              value={availableSeats}
              onChangeText={setAvailableSeats}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Vehicle Type</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Sedan, SUV, Van"
              value={vehicleType}
              onChangeText={setVehicleType}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Price Per Person</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="0.00"
                value={pricePerPerson}
                onChangeText={setPricePerPerson}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </>
      );
    }

    return null;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="Edit Listing"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading SpaceV listing...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!listing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <Header
          title="Edit Listing"
          onBack={onBack}
          onNavigateToProfile={onNavigateToProfile}
          onNavigateToNotifications={onNavigateToNotifications}
          onNavigateToSettings={onNavigateToSettings}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>SpaceV listing not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Header
        title="Edit Listing"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter title"
                value={title}
                onChangeText={setTitle}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your SpaceV listing..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., New York, NY"
                value={location}
                onChangeText={setLocation}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Price</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="0.00"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Images</Text>
              {imageUris.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.imageScroll}
                  contentContainerStyle={styles.imageContainer}
                >
                  {imageUris.map((uri, index) => (
                    <View key={index} style={styles.imageWrapper}>
                      <Image source={{ uri }} style={styles.imagePreview} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeImage(index)}
                      >
                        <MaterialIcons name="close" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
              <TouchableOpacity
                style={styles.imageUploadButton}
                onPress={pickImages}
              >
                <MaterialIcons name="add-photo-alternate" size={24} color="#6B7280" />
                <Text style={styles.imageUploadButtonText}>
                  {imageUris.length > 0 ? 'Add More Images' : 'Add Images'}
                </Text>
              </TouchableOpacity>
            </View>

            {renderTypeSpecificFields()}

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={onBack}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
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
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  form: {
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    padding: 12,
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  imageScroll: {
    marginBottom: 12,
  },
  imageContainer: {
    paddingRight: 24,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 24,
    minHeight: 100,
  },
  imageUploadButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  cancelButtonText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '500',
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  toggleButtonSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  toggleText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  toggleTextSelected: {
    color: '#fff',
  },
  checkboxContainer: {
    marginTop: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#374151',
  },
  marginTop: {
    marginTop: 8,
  },
  conditionScroll: {
    marginTop: 8,
  },
  conditionContainer: {
    paddingRight: 24,
  },
  conditionChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  conditionChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  conditionChipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  conditionChipTextSelected: {
    color: '#fff',
  },
  categoryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  autoDetectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  autoDetectedText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#10B981',
  },
  categoryScroll: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  categoryContainer: {
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  categoryChipAutoDetected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
  checkIcon: {
    marginLeft: 2,
  },
});

