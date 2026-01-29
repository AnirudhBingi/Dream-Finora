import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Path, G, Defs, LinearGradient, Stop } from "react-native-svg";
import { useTheme } from "../theme";

interface SpaceVIconProps {
  size?: number;
  color?: string;
  active?: boolean;
}

/**
 * SpaceV Icon - A modern, Gen-Z oriented icon representing the marketplace feature
 *
 * Design: A stylized "V" shape with space/astronaut theme elements
 * - Represents "Space" (cosmic/exploration theme)
 * - The "V" shape is bold and modern
 * - Can be filled or outlined based on active state
 */
export function SpaceVIcon({
  size = 24,
  color,
  active = false,
}: SpaceVIconProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const iconSize = size;
  const resolvedColor = color ?? theme.colors.textInverse;
  const strokeWidth = active ? 2.5 : 2;
  const fillColor = active ? resolvedColor : "transparent";
  const strokeColor = resolvedColor;

  return (
    <View style={[styles.container, { width: iconSize, height: iconSize }]}>
      <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
        <Defs>
          <LinearGradient
            id="spaceVGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <Stop offset="0%" stopColor={resolvedColor} stopOpacity="1" />
            <Stop
              offset="100%"
              stopColor={resolvedColor}
              stopOpacity={active ? "0.8" : "0.6"}
            />
          </LinearGradient>
        </Defs>

        {/* Main V shape - representing SpaceV */}
        <Path
          d="M12 2L3 20L8 20L12 12L16 20L21 20L12 2Z"
          fill={active ? fillColor : "transparent"}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Small accent dots for "space" theme */}
        {active && (
          <G>
            <Path
              d="M6 16C6.55228 16 7 15.5523 7 15C7 14.4477 6.55228 14 6 14C5.44772 14 5 14.4477 5 15C5 15.5523 5.44772 16 6 16Z"
              fill={resolvedColor}
            />
            <Path
              d="M18 16C18.5523 16 19 15.5523 19 15C19 14.4477 18.5523 14 18 14C17.4477 14 17 14.4477 17 15C17 15.5523 17.4477 16 18 16Z"
              fill={resolvedColor}
            />
          </G>
        )}
      </Svg>
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
  return StyleSheet.create({
    container: {
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
