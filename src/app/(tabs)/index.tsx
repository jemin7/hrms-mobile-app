import { useRouter } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import HomeHeader from "../../components/HomeHeader";
import AttendanceHero from "../../components/AttendanceHero";
import Overview from "../../components/Overview";
import { useAuth } from "../../auth/AuthProvider";
import { useEmployeeProfile } from "../../hooks/useEmployeeProfile";
import { useTheme } from "../../theme/ThemeProvider";

function getDisplayName(profile: any, authUser: any) {
  const firstName =
    profile?.employeeFirstName ??
    profile?.firstName ??
    authUser?.employee?.firstName ??
    "";

  const lastName =
    profile?.employeeLastName ??
    profile?.lastName ??
    authUser?.employee?.lastName ??
    "";

  return `${firstName} ${lastName}`.trim() || authUser?.username || "Employee";
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "E";

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();

  const { profile } = useEmployeeProfile();

  const displayName = getDisplayName(profile, user);

  const initials = getInitials(displayName);

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <HomeHeader
          userName={displayName}
          initials={initials}
          unreadNotifications={0}
          onNotificationPress={() => router.push("/notifications")}
          onProfilePress={() => router.push("/profile")}
        />

        <AttendanceHero />

        <Overview />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: { background: string }) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    content: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 170,
    },
  });
}
