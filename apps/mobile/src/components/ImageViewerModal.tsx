import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Platform,
  Pressable,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const HEADER_HEIGHT = Platform.OS === "ios" ? 60 : 52;
const VIEWER_HEIGHT = SCREEN_HEIGHT - HEADER_HEIGHT;

interface ImageViewerModalProps {
  images: string[];
  visible: boolean;
  initialIndex?: number;
  onClose: () => void;
}

export function ImageViewerModal({
  images,
  visible,
  initialIndex = 0,
  onClose,
}: ImageViewerModalProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (!visible) return;
    setCurrentIndex(initialIndex);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        x: SCREEN_WIDTH * initialIndex,
        animated: false,
      });
    });
  }, [visible, initialIndex]);

  function handleScroll(event: any) {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="close" size={24} color={theme.colors.white} />
          </TouchableOpacity>
          <Text style={styles.counterText}>
            {images.length > 0 ? `${currentIndex + 1} / ${images.length}` : ""}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {images.map((uri, index) => (
            <View key={`${uri}-${index}`} style={styles.imageWrapper}>
              <ScrollView
                maximumZoomScale={3}
                minimumZoomScale={1}
                centerContent
                pinchGestureEnabled
                bouncesZoom
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.zoomContent}
                style={styles.zoomContainer}
              >
                <Image
                  source={{ uri }}
                  style={styles.image}
                  resizeMode="contain"
                />
              </ScrollView>
            </View>
          ))}
        </ScrollView>
      </Pressable>
    </Modal>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>["theme"]) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.black,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.base,
      paddingTop: theme.spacing.sm,
      height: HEADER_HEIGHT,
      zIndex: 2,
    },
    closeButton: {
      padding: theme.spacing.xs,
    },
    headerSpacer: {
      width: 32,
    },
    counterText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.white,
    },
    imageWrapper: {
      width: SCREEN_WIDTH,
      height: VIEWER_HEIGHT,
      justifyContent: "center",
      alignItems: "center",
    },
    zoomContainer: {
      width: SCREEN_WIDTH,
      height: VIEWER_HEIGHT,
    },
    zoomContent: {
      width: SCREEN_WIDTH,
      height: VIEWER_HEIGHT,
      justifyContent: "center",
      alignItems: "center",
    },
    image: {
      width: SCREEN_WIDTH,
      height: VIEWER_HEIGHT,
    },
  });
