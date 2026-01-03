import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface BottomNavigationProps {
  currentScreen: string;
  onNavigateToExpenses: () => void;
  onNavigateToChores: () => void;
  onNavigateToListings: () => void;
  onNavigateToRides: () => void;
  onNavigateToHome: () => void;
}

export function BottomNavigation({
  currentScreen,
  onNavigateToExpenses,
  onNavigateToChores,
  onNavigateToListings,
  onNavigateToRides,
  onNavigateToHome,
}: BottomNavigationProps) {
  const isActive = (screen: string) => currentScreen === screen;

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.navItem, isActive('home') && styles.navItemActive]}
          onPress={onNavigateToHome}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="home"
            size={24}
            color={isActive('home') ? '#2563EB' : '#6B7280'}
          />
          <Text style={[styles.navLabel, isActive('home') && styles.navLabelActive]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, isActive('expenses') && styles.navItemActive]}
          onPress={onNavigateToExpenses}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="receipt"
            size={24}
            color={isActive('expenses') ? '#10B981' : '#6B7280'}
          />
          <Text style={[styles.navLabel, isActive('expenses') && styles.navLabelActive]}>
            Billchop
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, isActive('chores') && styles.navItemActive]}
          onPress={onNavigateToChores}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="check-circle"
            size={24}
            color={isActive('chores') ? '#F59E0B' : '#6B7280'}
          />
          <Text style={[styles.navLabel, isActive('chores') && styles.navLabelActive]}>
            Chores
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, isActive('listings') && styles.navItemActive]}
          onPress={onNavigateToListings}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="store"
            size={24}
            color={isActive('listings') ? '#EC4899' : '#6B7280'}
          />
          <Text style={[styles.navLabel, isActive('listings') && styles.navLabelActive]}>
            Market
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, isActive('rides') && styles.navItemActive]}
          onPress={onNavigateToRides}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="directions-car"
            size={24}
            color={isActive('rides') ? '#06B6D4' : '#6B7280'}
          />
          <Text style={[styles.navLabel, isActive('rides') && styles.navLabelActive]}>
            Rides
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minHeight: 56,
  },
  navItemActive: {
    // Active state styling handled by icon/label colors
  },
  navLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
});

