import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText as Text } from "./InterTypography";

import { useTheme } from "../theme/ThemeProvider";

type OverviewCardProps = {
  title: string;
  value: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBackground: string;
  iconColor: string;
  onPress?: () => void;
};

export default function OverviewCard({
  title,
  value,
  subtitle,
  icon,
  iconBackground,
  iconColor,
  onPress,
}: OverviewCardProps) {
  const { colors } = useTheme();

  const styles = createStyles(colors);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: iconBackground,
          },
        ]}
      >
        <Ionicons name={icon} size={19} color={iconColor} />
      </View>

      <View style={styles.textContent}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>

        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

function createStyles(colors: {
  surface: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
}) {
  return StyleSheet.create({
    card: {
      width: "48.2%",
      minHeight: 142,

      padding: 16,

      backgroundColor: colors.surface,

      borderRadius: 20,

      borderWidth: 1,
      borderColor: colors.border,

      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
    },

    iconContainer: {
      width: 40,
      height: 40,

      borderRadius: 13,

      alignItems: "center",
      justifyContent: "center",

      marginBottom: 14,
    },

    textContent: {
      flex: 1,
      justifyContent: "flex-end",
    },

    title: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textSecondary,
    },

    value: {
      marginTop: 5,

      fontSize: 21,
      fontWeight: "800",
      color: colors.textPrimary,
    },

    subtitle: {
      marginTop: 3,

      fontSize: 11,
      color: colors.textMuted,
    },

    pressed: {
      opacity: 0.85,
      transform: [{ scale: 0.98 }],
    },
  });
}
