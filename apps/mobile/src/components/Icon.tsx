import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Path, Circle, Rect, Polygon, G } from 'react-native-svg';
import { MaterialIcons } from '@expo/vector-icons';
import { categoryIconMap, CategoryIconName, normalizeCategoryName } from '../utils/categoryIcons';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizeMap: Record<IconSize, number> = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
};

interface IconProps {
  name: CategoryIconName | string;
  size?: IconSize | number;
  color?: string;
  style?: ViewStyle;
  fallbackToMaterial?: boolean;
}

/**
 * Icon component that renders custom SVG icons or falls back to MaterialIcons
 * 
 * @example
 * <Icon name="groceries" size="md" color="#2563EB" />
 * <Icon name="restaurants" size={24} color="#10B981" />
 */
export function Icon({
  name,
  size = 'md',
  color = '#374151',
  style,
  fallbackToMaterial = true,
}: IconProps) {
  const iconSize = typeof size === 'number' ? size : sizeMap[size];
  
  // Normalize the category name first (handles variations like "Restaurants & Dining" -> "restaurants-dining")
  const normalizedName = normalizeCategoryName(name);
  
  // Check if we have a custom icon for this category
  const IconComponent = categoryIconMap[normalizedName];
  
  if (IconComponent) {
    return (
      <View style={[styles.container, style]}>
        <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24">
          <IconComponent color={color} />
        </Svg>
      </View>
    );
  }
  
  // Fallback to MaterialIcons if enabled
  if (fallbackToMaterial) {
    // Map common category names to MaterialIcons names
    const materialIconName = getMaterialIconName(name);
    return (
      <MaterialIcons
        name={materialIconName}
        size={iconSize}
        color={color}
        style={style}
      />
    );
  }
  
  return null;
}

/**
 * Maps category names to MaterialIcons names as fallback
 */
function getMaterialIconName(categoryName: string): any {
  const mapping: Record<string, any> = {
    // Food & Dining
    'groceries': 'shopping-cart',
    'restaurants': 'restaurant',
    'coffee': 'local-cafe',
    'food-delivery': 'delivery-dining',
    
    // Transportation
    'gas': 'local-gas-station',
    'transportation': 'directions-car',
    'parking': 'local-parking',
    'car-maintenance': 'build',
    
    // Bills & Utilities
    'utilities': 'bolt',
    'internet': 'wifi',
    'phone': 'phone',
    'water': 'water-drop',
    
    // Shopping
    'clothing': 'checkroom',
    'electronics': 'devices',
    'home-garden': 'home',
    'books': 'menu-book',
    'sports': 'sports',
    
    // Entertainment
    'movies': 'movie',
    'streaming': 'play-circle',
    'games': 'sports-esports',
    
    // Health
    'pharmacy': 'local-pharmacy',
    'medical': 'medical-services',
    'gym': 'fitness-center',
    'personal-care': 'spa',
    
    // Education
    'education': 'school',
    'software': 'code',
    
    // Travel
    'travel': 'flight',
    'hotels': 'hotel',
    
    // Other
    'gifts': 'card-giftcard',
    'pets': 'pets',
    'subscriptions': 'subscriptions',
    'other': 'more-horiz',
  };
  
  // Try direct match first
  if (mapping[categoryName.toLowerCase()]) {
    return mapping[categoryName.toLowerCase()];
  }
  
  // Try partial match
  const lowerName = categoryName.toLowerCase();
  for (const [key, value] of Object.entries(mapping)) {
    if (lowerName.includes(key) || key.includes(lowerName)) {
      return value;
    }
  }
  
  return 'category'; // Default fallback
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

