import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText as Text } from "./InterTypography";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../theme/ThemeProvider";

type HomeHeaderProps = {
  userName: string;
  initials: string;
  unreadNotifications?: number;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
};

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

  return "Good evening";
}

export default function HomeHeader({
  userName,
  initials,
  unreadNotifications = 0,
  onNotificationPress,
  onProfilePress,
}: HomeHeaderProps) {
  const { colors } = useTheme();

  const styles = createStyles(colors);
  const greeting = getGreeting();

  return (
    <View style={styles.container}>
      {/* Left side */}
      <View style={styles.textContainer}>
        <Text style={styles.greeting}>{greeting},</Text>

        <Text style={styles.name}>{userName}</Text>
      </View>

      {/* Right side */}
      <View style={styles.actions}>
        {/* Notifications */}
        <Pressable
          onPress={onNotificationPress}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Ionicons
            name="notifications-outline"
            size={25}
            color={colors.textPrimary}
          />

          {unreadNotifications > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </Text>
            </View>
          )}
        </Pressable>

        {/* Profile */}
        <Pressable
          onPress={onProfilePress}
          style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Profile"
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors: {
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  primary: string;
  danger: string;
  white: string;
}) {
  return StyleSheet.create({
    container: {
      width: "100%",

      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",

      marginBottom: 24,
    },

    textContainer: {
      flex: 1,
    },

    greeting: {
      fontSize: 16,
      fontWeight: "500",

      color: colors.textSecondary,

      marginBottom: 2,
    },

    name: {
      fontSize: 30,
      fontWeight: "800",

      color: colors.textPrimary,

      letterSpacing: -0.6,
    },

    actions: {
      flexDirection: "row",
      alignItems: "center",

      gap: 12,

      marginLeft: 16,
    },

    iconButton: {
      width: 44,
      height: 44,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 22,

      backgroundColor: colors.surface,

      borderWidth: 1,
      borderColor: colors.border,

      position: "relative",
    },

    avatar: {
      width: 46,
      height: 46,

      alignItems: "center",
      justifyContent: "center",

      borderRadius: 23,

      backgroundColor: colors.primary,
    },

    avatarText: {
      fontSize: 15,
      fontWeight: "800",

      color: colors.white,
    },

    badge: {
      position: "absolute",

      top: -2,
      right: -2,

      minWidth: 17,
      height: 17,

      paddingHorizontal: 4,

      borderRadius: 9,

      alignItems: "center",
      justifyContent: "center",

      backgroundColor: colors.danger,

      borderWidth: 2,
      borderColor: colors.background,
    },

    badgeText: {
      fontSize: 9,
      fontWeight: "800",

      color: colors.white,
    },

    pressed: {
      opacity: 0.7,
    },
  });
}
