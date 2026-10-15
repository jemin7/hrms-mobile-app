import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText as Text } from "./InterTypography";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../theme/ThemeProvider";

type TabConfig = {
  name: "chat" | "leave" | "index" | "reimbursement" | "payout";
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
};

const TAB_CONFIG: TabConfig[] = [
  {
    name: "chat",
    label: "Chat",
    icon: "chatbubbles-outline",
    activeIcon: "chatbubbles",
  },
  {
    name: "leave",
    label: "Leave",
    icon: "calendar-outline",
    activeIcon: "calendar",
  },
  {
    name: "index",
    label: "Home",
    icon: "home-outline",
    activeIcon: "home",
  },
  {
    name: "reimbursement",
    label: "Reimburse",
    icon: "receipt-outline",
    activeIcon: "receipt",
  },
  {
    name: "payout",
    label: "Payout",
    icon: "wallet-outline",
    activeIcon: "wallet",
  },
];

const TAB_BAR_HEIGHT = 72;
const MIN_BOTTOM_OFFSET = 16;
const SAFE_AREA_GAP = 8;

export default function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

 // Dock the navigation bar to the bottom while respecting the safe area.
const bottomInset = insets.bottom;
const styles = createStyles(colors, bottomInset);

  const focusedRoute = state.routes[state.index];

  const focusedOptions = focusedRoute
    ? descriptors[focusedRoute.key]?.options
    : undefined;

  const tabBarStyle = focusedOptions?.tabBarStyle as
    | { display?: string }
    | undefined;

  if (tabBarStyle?.display === "none") {
    return null;
  }

  return (
    <View style={styles.container}>
      {TAB_CONFIG.map((tab) => {
        const route = state.routes.find((item) => item.name === tab.name);

        if (!route) {
          return null;
        }

        const routeIndex = state.routes.findIndex(
          (item) => item.name === tab.name,
        );

        const isFocused = state.index === routeIndex;
        const options = descriptors[route.key]?.options;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={options?.tabBarAccessibilityLabel ?? tab.label}
          >
            {isFocused && tab.name === "index" ? (
              <View style={styles.homeButton}>
                <Ionicons
                  name={tab.activeIcon}
                  size={24}
                  color={colors.white}
                />
              </View>
            ) : (
              <Ionicons
                name={isFocused ? tab.activeIcon : tab.icon}
                size={22}
                color={isFocused ? colors.primary : colors.textMuted}
              />
            )}

            <Text
              style={[styles.label, isFocused && styles.activeLabel]}
              numberOfLines={1}
            >
              {options?.title ?? tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(
  colors: {
    surface: string;
    textMuted: string;
    primary: string;
    border: string;
    white: string;
  },
  bottomInset: number,
) {
 return StyleSheet.create({
   container: {
     position: "absolute",
     left: 0,
     right: 0,
     bottom: 0,
     height: TAB_BAR_HEIGHT + bottomInset,
     paddingBottom: bottomInset,
     backgroundColor: colors.surface,
     flexDirection: "row",
     alignItems: "center",
     justifyContent: "space-around",
     borderTopWidth: 1,
     borderTopColor: colors.border,
   },

   tab: {
     flex: 1,
     alignItems: "center",
     justifyContent: "center",
     gap: 4,
   },

   label: {
     fontSize: 10,
     fontWeight: "500",
     color: colors.textMuted,
     maxWidth: 72,
     textAlign: "center",
   },

   activeLabel: {
     color: colors.primary,
     fontWeight: "700",
   },

   homeButton: {
     width: 46,
     height: 46,
     borderRadius: 23,
     alignItems: "center",
     justifyContent: "center",
     backgroundColor: colors.primary,
   },

   pressed: {
     opacity: 0.7,
     transform: [{ scale: 0.97 }],
   },
 });
}
