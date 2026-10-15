import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { AppText as Text } from "../components/InterTypography";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../auth/AuthProvider";
import { useEmployeeProfile } from "../hooks/useEmployeeProfile";
import { useTheme } from "../theme/ThemeProvider";

function getName(profile: any, user: any): string {
  const firstName =
    profile?.employeeFirstName ??
    profile?.firstName ??
    user?.employee?.firstName ??
    "";

  const lastName =
    profile?.employeeLastName ??
    profile?.lastName ??
    user?.employee?.lastName ??
    "";

  return `${firstName} ${lastName}`.trim() || user?.username || "Employee";
}

function getEmail(profile: any, user: any): string {
  return (
    profile?.businessEmail ||
    profile?.personalEmail ||
    user?.employee?.email ||
    "—"
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();

  const { profile, isLoading, error } = useEmployeeProfile();

  const styles = createStyles(colors);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const fullName = getName(profile, user);

  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .map((part: string) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>

          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {error ? (
          <View style={styles.errorBox} accessibilityRole="alert">
            <Text style={styles.errorText}>
              Unable to load the latest profile information.
            </Text>
          </View>
        ) : null}

        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || "E"}</Text>
          </View>

          <Text style={styles.name}>{fullName}</Text>

          <Text style={styles.employeeId}>
            {profile?.employeeID ?? user?.employee?.employeeID ?? "—"}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <InfoRow
            label="Email"
            value={getEmail(profile, user)}
            colors={colors}
          />

          <InfoRow
            label="Phone"
            value={user?.employee?.phone || "—"}
            colors={colors}
          />

          <InfoRow
            label="Department"
            value={profile?.department ?? user?.employee?.department ?? "—"}
            colors={colors}
          />

          <InfoRow
            label="Designation"
            value={profile?.designation ?? user?.employee?.designation ?? "—"}
            colors={colors}
          />
        </View>

        <Text style={styles.sectionTitle}>Appearance</Text>

        <View style={styles.themeSelector}>
          {(["light", "dark"] as const).map((mode) => {
            const selected = theme === mode;

            return (
              <Pressable
                key={mode}
                onPress={() => setTheme(mode)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.themeOption,
                  selected && styles.themeOptionSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name={mode === "light" ? "sunny-outline" : "moon-outline"}
                  size={19}
                  color={selected ? colors.primary : colors.textSecondary}
                />

                <Text
                  style={[
                    styles.themeText,
                    selected && styles.themeTextSelected,
                  ]}
                >
                  {mode === "light" ? "Light" : "Dark"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => signOut()}
          accessibilityRole="button"
          accessibilityLabel="Log out"
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="log-out-outline" size={21} color="#FFFFFF" />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: {
    textPrimary: string;
    textSecondary: string;
    border: string;
  };
}) {
  const styles = stylesFactory(colors);

  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>

      <Text style={styles.infoValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function stylesFactory(colors: {
  textPrimary: string;
  textSecondary: string;
  border: string;
}) {
  return StyleSheet.create({
    infoRow: {
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },

    infoLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textSecondary,
    },

    infoValue: {
      marginTop: 4,
      fontSize: 15,
      fontWeight: "600",
      color: colors.textPrimary,
    },
  });
}

function createStyles(colors: {
  background: string;
  surface: string;
  surfaceSecondary: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  primary: string;
  danger: string;
}) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },

    content: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 40,
    },

    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 26,
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 12,
    },

    pressed: {
      opacity: 0.78,
    },

    headerTitle: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.textPrimary,
    },

    errorBox: {
      padding: 14,
      borderRadius: 14,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 20,
    },

    errorText: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary,
    },

    profileHeader: {
      alignItems: "center",
    },

    avatar: {
      width: 92,
      height: 92,
      borderRadius: 46,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
    },

    avatarText: {
      fontSize: 28,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    name: {
      marginTop: 14,
      fontSize: 22,
      fontWeight: "800",
      color: colors.textPrimary,
    },

    employeeId: {
      marginTop: 4,
      fontSize: 14,
      color: colors.textSecondary,
    },

    infoCard: {
      marginTop: 26,
      paddingHorizontal: 16,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    sectionTitle: {
      marginTop: 28,
      marginBottom: 12,
      fontSize: 18,
      fontWeight: "800",
      color: colors.textPrimary,
    },

    themeSelector: {
      flexDirection: "row",
      gap: 10,
    },

    themeOption: {
      flex: 1,
      minHeight: 50,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    themeOptionSelected: {
      backgroundColor: colors.surfaceSecondary,
      borderColor: colors.primary,
    },

    themeText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textSecondary,
    },

    themeTextSelected: {
      color: colors.primary,
    },

    logoutButton: {
      minHeight: 52,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 28,
      borderRadius: 16,
      backgroundColor: "#DC2626",
      borderWidth: 1,
      borderColor: "#DC2626",
    },

    logoutText: {
      fontSize: 15,
      fontWeight: "800",
      color: "#FFFFFF",
    },
  });
}
