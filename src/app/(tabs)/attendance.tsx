import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import {
  AppText as Text,
} from "../../components/InterTypography";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import AttendanceDateSelector from "../../components/attendance/AttendanceDateSelector";
import AttendanceHistoryItem from "../../components/attendance/AttendanceHistoryItem";

import { useAttendanceHistory } from "../../hooks/useAttendance";
import { useTheme } from "../../theme/ThemeProvider";

export default function AttendanceScreen() {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const {
    data: history = [],
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useAttendanceHistory(selectedDate);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable
            onPress={handleBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={21} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.headerIcon}>
            <Ionicons name="time-outline" size={23} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Attendance</Text>
            <Text style={styles.subtitle}>
              Track your daily time and recent attendance.
            </Text>
          </View>
        </View>

        

        <View style={styles.historySection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeadingText}>
              <Text style={styles.sectionTitle}>Attendance history</Text>
              <Text style={styles.sectionSubtitle}>
                Review your attendance by date.
              </Text>
            </View>
            {isFetching && !isLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : null}
          </View>

          <Text style={styles.searchLabel}>Search by date</Text>
          <AttendanceDateSelector
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />

          <Text style={styles.helperText}>
            {selectedDate
              ? "Showing attendance for the selected date."
              : "Choose a date to view its attendance details."}
          </Text>

          <View style={styles.historyList}>
            {isLoading ? (
              <View style={styles.stateCard}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.stateTitle}>Loading attendance</Text>
                <Text style={styles.stateMessage}>
                  Your attendance records will appear here.
                </Text>
              </View>
            ) : isError ? (
              <View style={styles.stateCard}>
                <View style={styles.stateIconError}>
                  <Ionicons
                    name="cloud-offline-outline"
                    size={27}
                    color={colors.danger}
                  />
                </View>
                <Text style={styles.stateTitle}>Couldn't load attendance</Text>
                <Text style={styles.stateMessage}>
                  Check your connection and try again.
                </Text>
                <Pressable
                  onPress={() => void refetch()}
                  style={({ pressed }) => [
                    styles.retryButton,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading attendance"
                >
                  <Ionicons
                    name="refresh-outline"
                    size={17}
                    color={colors.white}
                  />
                  <Text style={styles.retryButtonText}>Try again</Text>
                </Pressable>
              </View>
            ) : history.length === 0 ? (
              <View style={styles.stateCard}>
                <View style={styles.stateIcon}>
                  <Ionicons
                    name="calendar-clear-outline"
                    size={27}
                    color={colors.textSecondary}
                  />
                </View>
                <Text style={styles.stateTitle}>
                  {selectedDate
                    ? "No attendance for this date"
                    : "No attendance records yet"}
                </Text>
                <Text style={styles.stateMessage}>
                  {selectedDate
                    ? "Try another date to find an attendance record."
                    : "Your recent attendance history will appear here when available."}
                </Text>
                {selectedDate ? (
                  <Pressable
                    onPress={() => setSelectedDate(null)}
                    style={({ pressed }) => [
                      styles.clearDateButton,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                  >
                    <Text style={styles.clearDateButtonText}>
                      Clear date filter
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              history.map((item) => (
                <AttendanceHistoryItem
                  key={item.id}
                  date={formatHistoryDate(item.date)}
                  status={item.status}
                  checkIn={item.checkIn ?? "--:--"}
                  checkOut={item.checkOut ?? "--:--"}
                  breakIn={item.breakIn}
                  breakOut={item.breakOut}
                  workHours={item.workHours}
                  breakTime={item.breakTime}
                  checkInLocation={item.checkInLocation}
                  checkOutLocation={item.checkOutLocation}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatHistoryDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
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
  white: string;
}) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 170,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 22,
      gap: 12,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerText: {
      flex: 1,
    },
    title: {
      fontSize: 29,
      lineHeight: 35,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    subtitle: {
      marginTop: 4,
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary,
    },
    historySection: {
      marginTop: 30,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 18,
    },
    sectionHeadingText: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: 20,
      lineHeight: 26,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    sectionSubtitle: {
      marginTop: 4,
      fontSize: 13,
      color: colors.textSecondary,
    },
    searchLabel: {
      marginBottom: 8,
      fontSize: 13,
      fontWeight: "700",
      color: colors.textSecondary,
    },
    helperText: {
      marginTop: 8,
      fontSize: 12,
      lineHeight: 17,
      color: colors.textMuted,
    },
    historyList: {
      marginTop: 16,
      gap: 12,
    },
    stateCard: {
      minHeight: 208,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
      paddingVertical: 26,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    stateIcon: {
      width: 58,
      height: 58,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
      backgroundColor: colors.surfaceSecondary,
    },
    stateIconError: {
      width: 58,
      height: 58,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
      backgroundColor: colors.surfaceSecondary,
    },
    stateTitle: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: "800",
      textAlign: "center",
      color: colors.textPrimary,
    },
    stateMessage: {
      maxWidth: 270,
      marginTop: 6,
      fontSize: 13,
      lineHeight: 19,
      textAlign: "center",
      color: colors.textSecondary,
    },
    retryButton: {
      minHeight: 42,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 18,
      paddingHorizontal: 18,
      borderRadius: 13,
      backgroundColor: colors.primary,
    },
    retryButtonText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.white,
    },
    clearDateButton: {
      marginTop: 16,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    clearDateButtonText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.primary,
    },
    pressed: {
      opacity: 0.75,
    },
  });
}
