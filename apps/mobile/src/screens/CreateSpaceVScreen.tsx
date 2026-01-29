import React, { useMemo, useState, useRef, useEffect } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { pickMultipleImages } from "../utils/imagePicker";
import { useAuth } from "../auth/authContext";
import {
  createListing,
  CreateListingDto,
  ListingType,
  uploadListingImages,
  suggestCategory,
  getItemCategories,
  AccommodationMetadata,
  ItemMetadata,
  EventMetadata,
  RideMetadata,
} from "../api/listingApi";
import { DatePicker } from "../components/DatePicker";
import { Icon } from "../components/Icon";
import { normalizeCategoryName } from "../utils/categoryIcons";
import { MaterialIcons } from "@expo/vector-icons";
import { Header } from "../components/Header";
import { useTheme } from "../theme";

interface CreateSpaceVScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  groupId?: string;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToSettings?: () => void;
}

export function CreateSpaceVScreen({
  onBack,
  onSuccess,
  groupId,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToSettings,
}: CreateSpaceVScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();
  const [type, setType] = useState<ListingType>(ListingType.ROOMMATE);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [itemCategories, setItemCategories] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const categorySuggestTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const categoryScrollViewRef = useRef<ScrollView>(null);
  const categoryChipRefs = useRef<Record<string, any>>({});

  // Type-specific state
  // Roommate
  const [lookingFor, setLookingFor] = useState<boolean>(true);
  const [budget, setBudget] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [duration, setDuration] = useState<string>("long-term");
  const [smoking, setSmoking] = useState<boolean | undefined>(undefined);
  const [pets, setPets] = useState<boolean | undefined>(undefined);
  const [gender, setGender] = useState("");
  const [ageRange, setAgeRange] = useState("");

  // Accommodation
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [leaseDuration, setLeaseDuration] = useState("");
  const [utilitiesIncluded, setUtilitiesIncluded] = useState<
    boolean | undefined
  >(undefined);
  const [furnished, setFurnished] = useState<boolean | undefined>(undefined);

  // Item
  const [condition, setCondition] = useState<string>("used");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");

  // Event
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [maxAttendees, setMaxAttendees] = useState("");
  const [eventType, setEventType] = useState("");
  const [isPublic, setIsPublic] = useState<boolean>(true);

  // Ride
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [rideDate, setRideDate] = useState("");
  const [rideTime, setRideTime] = useState("");
  const [availableSeats, setAvailableSeats] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [pricePerPerson, setPricePerPerson] = useState("");
  // Load item categories on mount (only for ITEM type)
  useEffect(() => {
    if (type === ListingType.ITEM) {
      loadItemCategories();
    }
  }, [token, type]);

  // Auto-suggest category when title changes (for ITEM listings only)
  useEffect(() => {
    if (type !== ListingType.ITEM || !title.trim() || !token) return;

    // Clear previous timeout
    if (categorySuggestTimeoutRef.current) {
      clearTimeout(categorySuggestTimeoutRef.current);
    }

    // Debounce category suggestion
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
        console.error("Failed to suggest category:", err);
      }
    }, 500);

    return () => {
      if (categorySuggestTimeoutRef.current) {
        clearTimeout(categorySuggestTimeoutRef.current);
      }
    };
  }, [title, type, token]);

  async function loadItemCategories() {
    if (!token) return;

    try {
      setCategoriesLoading(true);
      const categories = await getItemCategories(token);
      setItemCategories(categories);
    } catch (err) {
      console.error("Failed to load item categories:", err);
    } finally {
      setCategoriesLoading(false);
    }
  }

  // Scroll to selected category
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

  // Handle manual category selection
  function handleCategorySelect(cat: string) {
    setCategory(cat);
    setIsAutoDetected(false);
    scrollToCategory(cat);
  }

  async function handleSave() {
    if (!token) return;

    if (!title.trim()) {
      Alert.alert("Error", "Please enter a title");
      return;
    }

    if (!description.trim()) {
      Alert.alert("Error", "Please enter a description");
      return;
    }

    const priceNum = price ? parseFloat(price) : undefined;
    if (price && (isNaN(priceNum!) || priceNum! < 0)) {
      Alert.alert("Error", "Please enter a valid price");
      return;
    }

    // Type-specific validation
    if (type === ListingType.RIDE) {
      if (!origin.trim()) {
        Alert.alert("Error", "Please enter origin");
        return;
      }
      if (!destination.trim()) {
        Alert.alert("Error", "Please enter destination");
        return;
      }
      if (!rideDate.trim()) {
        Alert.alert("Error", "Please enter ride date");
        return;
      }
    }

    if (type === ListingType.EVENT) {
      if (!eventDate.trim()) {
        Alert.alert("Error", "Please enter event date");
        return;
      }
      if (!location.trim()) {
        Alert.alert("Error", "Please enter event location");
        return;
      }
    }

    if (type === ListingType.ACCOMMODATION) {
      if (!location.trim()) {
        Alert.alert("Error", "Please enter location");
        return;
      }
      if (!priceNum) {
        Alert.alert("Error", "Please enter rent price");
        return;
      }
    }

    if (type === ListingType.ITEM) {
      if (!priceNum) {
        Alert.alert("Error", "Please enter item price");
        return;
      }
    }

    if (type === ListingType.ROOMMATE) {
      if (!location.trim()) {
        Alert.alert("Error", "Please enter location");
        return;
      }
    }

    try {
      setSaving(true);

      // Build type-specific metadata
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
          utilitiesIncluded:
            utilitiesIncluded !== undefined ? utilitiesIncluded : undefined,
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
          pricePerPerson: pricePerPerson
            ? parseFloat(pricePerPerson)
            : undefined,
        };
      }

      const listingData: CreateListingDto = {
        type,
        title: title.trim(),
        description: description.trim(),
        location: location.trim() || undefined,
        price: priceNum,
        currency: "USD",
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        groupId,
      };

      const listing = await createListing(token, listingData);

      // Upload images if any were selected
      if (imageUris.length > 0) {
        try {
          await uploadListingImages(token, listing.id, imageUris);
        } catch (err) {
          console.error("Failed to upload images:", err);
          Alert.alert(
            "Warning",
            "SpaceV listing created but image upload failed",
          );
        }
      }

      Alert.alert("Success", "SpaceV listing created successfully!", [
        { text: "OK", onPress: onSuccess },
      ]);
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to create SpaceV listing",
      );
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
      Alert.alert("Error", "Failed to pick images");
    }
  }

  function removeImage(index: number) {
    setImageUris(imageUris.filter((_, i) => i !== index));
  }

  function getListingTypeMeta(listingType: ListingType): {
    label: string;
    icon: keyof typeof MaterialIcons.glyphMap;
  } {
    const labels: Record<
      ListingType,
      { label: string; icon: keyof typeof MaterialIcons.glyphMap }
    > = {
      [ListingType.ROOMMATE]: { label: "Roommate", icon: "groups" },
      [ListingType.ACCOMMODATION]: {
        label: "Accommodation",
        icon: "apartment",
      },
      [ListingType.ITEM]: { label: "Item", icon: "sell" },
      [ListingType.EVENT]: { label: "Event", icon: "event" },
      [ListingType.RIDE]: { label: "Ride", icon: "directions-car" },
    };
    return labels[listingType] || { label: listingType, icon: "category" };
  }

  function renderTypeSpecificFields() {
    if (type === ListingType.ROOMMATE) {
      return (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Looking For / Offering</Text>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  lookingFor && styles.toggleButtonSelected,
                ]}
                onPress={() => setLookingFor(true)}
              >
                <Text
                  style={[
                    styles.toggleText,
                    lookingFor && styles.toggleTextSelected,
                  ]}
                >
                  Looking For
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  !lookingFor && styles.toggleButtonSelected,
                ]}
                onPress={() => setLookingFor(false)}
              >
                <Text
                  style={[
                    styles.toggleText,
                    !lookingFor && styles.toggleTextSelected,
                  ]}
                >
                  Offering
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., New York, NY"
              value={location}
              onChangeText={setLocation}
              autoCapitalize="words"
            />
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
                style={[
                  styles.toggleButton,
                  duration === "short-term" && styles.toggleButtonSelected,
                ]}
                onPress={() => setDuration("short-term")}
              >
                <Text
                  style={[
                    styles.toggleText,
                    duration === "short-term" && styles.toggleTextSelected,
                  ]}
                >
                  Short-term
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  duration === "long-term" && styles.toggleButtonSelected,
                ]}
                onPress={() => setDuration("long-term")}
              >
                <Text
                  style={[
                    styles.toggleText,
                    duration === "long-term" && styles.toggleTextSelected,
                  ]}
                >
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
                <View
                  style={[
                    styles.checkbox,
                    smoking === true && styles.checkboxChecked,
                  ]}
                >
                  {smoking === true && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Smoking OK</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setPets(pets === true ? undefined : true)}
              >
                <View
                  style={[
                    styles.checkbox,
                    pets === true && styles.checkboxChecked,
                  ]}
                >
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
            <Text style={styles.label}>Location *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 123 Main St, New York, NY"
              value={location}
              onChangeText={setLocation}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Monthly Rent *</Text>
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
                <View
                  style={[
                    styles.checkbox,
                    utilitiesIncluded === true && styles.checkboxChecked,
                  ]}
                >
                  {utilitiesIncluded === true && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Utilities Included</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setFurnished(furnished !== true)}
              >
                <View
                  style={[
                    styles.checkbox,
                    furnished === true && styles.checkboxChecked,
                  ]}
                >
                  {furnished === true && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
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
            <Text style={styles.label}>Price *</Text>
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
            <Text style={styles.label}>Condition</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.conditionScroll}
              contentContainerStyle={styles.conditionContainer}
            >
              {["new", "like-new", "used", "fair", "poor"].map((cond) => (
                <TouchableOpacity
                  key={cond}
                  style={[
                    styles.conditionChip,
                    condition === cond && styles.conditionChipSelected,
                  ]}
                  onPress={() => setCondition(cond)}
                >
                  <Text
                    style={[
                      styles.conditionChipText,
                      condition === cond && styles.conditionChipTextSelected,
                    ]}
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
                  <MaterialIcons
                    name="auto-awesome"
                    size={14}
                    color={theme.colors.success}
                  />
                  <Text style={styles.autoDetectedText}>Auto-detected</Text>
                </View>
              )}
            </View>
            {categoriesLoading ? (
              <ActivityIndicator size="small" color={theme.colors.blue} />
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
                      isAutoDetected &&
                        category === cat &&
                        styles.categoryChipAutoDetected,
                    ]}
                    onPress={() => handleCategorySelect(cat)}
                    activeOpacity={0.7}
                  >
                    <Icon
                      name={normalizeCategoryName(cat)}
                      size="sm"
                      color={
                        category === cat
                          ? theme.colors.textInverse
                          : theme.colors.textSecondary
                      }
                      style={styles.categoryIcon}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        category === cat && styles.categoryChipTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                    {isAutoDetected && category === cat && (
                      <MaterialIcons
                        name="check-circle"
                        size={16}
                        color={theme.colors.textInverse}
                        style={styles.checkIcon}
                      />
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., New York, NY"
              value={location}
              onChangeText={setLocation}
              autoCapitalize="words"
            />
          </View>
        </>
      );
    }

    if (type === ListingType.EVENT) {
      return (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Central Park, New York"
              value={location}
              onChangeText={setLocation}
              autoCapitalize="words"
            />
          </View>

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
            <Text style={styles.label}>Price (If Paid Event)</Text>
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
            <Text style={styles.label}>Visibility</Text>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  isPublic && styles.toggleButtonSelected,
                ]}
                onPress={() => setIsPublic(true)}
              >
                <Text
                  style={[
                    styles.toggleText,
                    isPublic && styles.toggleTextSelected,
                  ]}
                >
                  Public
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  !isPublic && styles.toggleButtonSelected,
                ]}
                onPress={() => setIsPublic(false)}
              >
                <Text
                  style={[
                    styles.toggleText,
                    !isPublic && styles.toggleTextSelected,
                  ]}
                >
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

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title="List Item"
        onBack={onBack}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToNotifications={onNavigateToNotifications}
        onNavigateToSettings={onNavigateToSettings}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          <View style={styles.form}>
            <View style={styles.heroSection}>
              <MaterialIcons
                name="local-mall"
                size={28}
                color={theme.colors.blue}
              />
              <Text style={styles.heroTitle}>Create a Listing</Text>
              <Text style={styles.heroSubtitle}>
                Post a listing in minutes with guided, Finora‑first fields.
              </Text>
            </View>
            <SectionCard title="Choose a path" icon="category">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.typeScroll}
                contentContainerStyle={styles.typeContainer}
              >
                {Object.values(ListingType).map((listingType) => (
                  <TouchableOpacity
                    key={listingType}
                    style={[
                      styles.typeChip,
                      type === listingType && styles.typeChipSelected,
                    ]}
                    onPress={() => setType(listingType)}
                  >
                    <MaterialIcons
                      name={getListingTypeMeta(listingType).icon}
                      size={16}
                      color={
                        type === listingType
                          ? theme.colors.textInverse
                          : theme.colors.gray700
                      }
                      style={styles.typeChipIcon}
                    />
                    <Text
                      style={[
                        styles.typeChipText,
                        type === listingType && styles.typeChipTextSelected,
                      ]}
                    >
                      {getListingTypeMeta(listingType).label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </SectionCard>

            <SectionCard title="Core details" icon="edit">
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder={
                    type === ListingType.ROOMMATE
                      ? "e.g., Looking for Roommate"
                      : type === ListingType.ACCOMMODATION
                        ? "e.g., 2BR Apartment for Rent"
                        : type === ListingType.ITEM
                          ? "e.g., iPhone 13 Pro"
                          : type === ListingType.EVENT
                            ? "e.g., Weekend BBQ Party"
                            : "e.g., Ride to Boston"
                  }
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
            </SectionCard>

            <SectionCard title="Details" icon="tune">
              {renderTypeSpecificFields()}
            </SectionCard>

            <SectionCard title="Photos" icon="photo-library">
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
                        <Text style={styles.removeImageText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
              <TouchableOpacity
                style={styles.imageUploadButton}
                onPress={pickImages}
              >
                <MaterialIcons
                  name="add-photo-alternate"
                  size={24}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.imageUploadButtonText}>
                  {imageUris.length > 0 ? "Add More Images" : "Add Images"}
                </Text>
              </TouchableOpacity>
            </SectionCard>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={theme.colors.textInverse} />
              ) : (
                <Text style={styles.saveButtonText}>List Item</Text>
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

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xl,
    },
    content: {
      paddingHorizontal: theme.spacing.xl,
    },
    form: {
      marginTop: theme.spacing.sm,
    },
    heroSection: {
      alignItems: "center",
      marginBottom: theme.spacing["2xl"],
      paddingTop: theme.spacing.sm,
    },
    heroTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
      marginTop: theme.spacing.sm,
    },
    heroSubtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginTop: theme.spacing.xs,
    },
    sectionCard: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.spacing.sm,
      padding: theme.spacing.base,
      marginBottom: theme.spacing.lg,
      backgroundColor: theme.colors.background,
      shadowColor: theme.colors.black,
      shadowOpacity: 0.04,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.base,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textPrimary,
    },
    inputGroup: {
      marginBottom: theme.spacing.xl,
    },
    label: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.gray700,
      marginBottom: theme.spacing.xs,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.borderDark,
      borderRadius: theme.spacing.sm,
      padding: theme.spacing.md,
      paddingHorizontal: theme.spacing.base,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textPrimary,
    },
    textArea: {
      minHeight: 100,
      paddingTop: theme.spacing.md,
    },
    marginTop: {
      marginTop: theme.spacing.sm,
    },
    typeScroll: {
      marginTop: theme.spacing.sm,
    },
    typeContainer: {
      paddingRight: theme.spacing.xl,
    },
    typeChip: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.base,
      borderRadius: 20,
      backgroundColor: theme.colors.backgroundTertiary,
      marginRight: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    typeChipSelected: {
      backgroundColor: theme.colors.blue,
      borderColor: theme.colors.blue,
    },
    typeChipText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray700,
      fontWeight: theme.typography.fontWeight.medium,
    },
    typeChipIcon: {
      marginRight: theme.spacing.xs,
    },
    typeChipTextSelected: {
      color: theme.colors.textInverse,
    },
    toggleContainer: {
      flexDirection: "row",
      gap: theme.spacing.md,
    },
    toggleButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: theme.spacing.base,
      borderRadius: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.borderDark,
      backgroundColor: theme.colors.backgroundSecondary,
      alignItems: "center",
    },
    toggleButtonSelected: {
      backgroundColor: theme.colors.blue,
      borderColor: theme.colors.blue,
    },
    toggleText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.gray700,
      fontWeight: theme.typography.fontWeight.medium,
    },
    toggleTextSelected: {
      color: theme.colors.textInverse,
    },
    priceContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.colors.borderDark,
      borderRadius: theme.spacing.sm,
      paddingHorizontal: theme.spacing.base,
    },
    currencySymbol: {
      fontSize: 20,
      fontWeight: "600",
      color: theme.colors.gray700,
      marginRight: 8,
    },
    priceInput: {
      flex: 1,
      padding: theme.spacing.md,
      fontSize: 20,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    checkboxContainer: {
      marginTop: theme.spacing.sm,
    },
    checkboxRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: theme.spacing.md,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderWidth: 2,
      borderColor: theme.colors.borderDark,
      borderRadius: 4,
      marginRight: 12,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.background,
    },
    checkboxChecked: {
      backgroundColor: theme.colors.blue,
      borderColor: theme.colors.blue,
    },
    checkmark: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: "bold",
    },
    checkboxLabel: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.gray700,
    },
    conditionScroll: {
      marginTop: theme.spacing.sm,
    },
    conditionContainer: {
      paddingRight: 24,
    },
    conditionChip: {
      paddingVertical: 8,
      paddingHorizontal: theme.spacing.base,
      borderRadius: 20,
      backgroundColor: theme.colors.backgroundTertiary,
      marginRight: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    conditionChipSelected: {
      backgroundColor: theme.colors.blue,
      borderColor: theme.colors.blue,
    },
    conditionChipText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.gray700,
      fontWeight: theme.typography.fontWeight.medium,
    },
    conditionChipTextSelected: {
      color: theme.colors.textInverse,
    },
    imageScroll: {
      marginBottom: theme.spacing.md,
    },
    imageContainer: {
      paddingRight: 24,
    },
    imageWrapper: {
      position: "relative",
      marginRight: 12,
    },
    imagePreview: {
      width: 100,
      height: 100,
      borderRadius: theme.spacing.sm,
      backgroundColor: theme.colors.backgroundTertiary,
    },
    removeImageButton: {
      position: "absolute",
      top: -8,
      right: -8,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.error,
      justifyContent: "center",
      alignItems: "center",
    },
    removeImageText: {
      color: theme.colors.textInverse,
      fontSize: 18,
      fontWeight: "bold",
    },
    imageUploadButton: {
      borderWidth: 2,
      borderColor: theme.colors.borderDark,
      borderStyle: "dashed",
      borderRadius: theme.spacing.sm,
      padding: theme.spacing.xl,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 100,
    },
    imageUploadButtonText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    saveButton: {
      backgroundColor: theme.colors.blue,
      borderRadius: theme.spacing.sm,
      paddingVertical: 12,
      paddingHorizontal: 24,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: theme.spacing.md,
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveButtonText: {
      color: theme.colors.textInverse,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
    cancelButton: {
      backgroundColor: "transparent",
      borderRadius: theme.spacing.sm,
      paddingVertical: 12,
      paddingHorizontal: 24,
      minHeight: 44,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.colors.blue,
    },
    cancelButtonText: {
      color: theme.colors.blue,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
    },
    categoryLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    autoDetectedBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.successBackground,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    autoDetectedText: {
      fontSize: 12,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.success,
    },
    categoryScroll: {
      marginHorizontal: -24,
      paddingHorizontal: 24,
    },
    categoryContainer: {
      gap: 8,
    },
    categoryChip: {
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: theme.spacing.base,
      marginRight: 8,
      borderWidth: 2,
      borderColor: "transparent",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    categoryChipSelected: {
      backgroundColor: theme.colors.blue,
      borderColor: theme.colors.blue,
    },
    categoryChipAutoDetected: {
      backgroundColor: theme.colors.success,
      borderColor: theme.colors.success,
      shadowColor: theme.colors.success,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    categoryIcon: {
      marginRight: 0,
    },
    categoryChipText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.gray700,
    },
    categoryChipTextSelected: {
      color: theme.colors.textInverse,
    },
    checkIcon: {
      marginLeft: 2,
    },
  });

interface SectionCardProps {
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  children: React.ReactNode;
}

function SectionCard({ title, icon, children }: SectionCardProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <MaterialIcons name={icon} size={18} color={theme.colors.blue} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}
