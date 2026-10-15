import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { AppText as Text } from "../components/InterTypography";
import { SafeAreaView } from "react-native-safe-area-context";

import { useHolidays } from "../hooks/useHolidays";
import type { Holiday } from "../api/holidays";
import { useTheme } from "../theme/ThemeProvider";

function parseHolidayDate(value?: string | null): Date | null {
  if (!value) return null;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatHolidayDate(value?: string | null): string {
  const date = parseHolidayDate(value);
  if (!date) return "Date unavailable";

  const weekday = new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(
    date,
  );
  const day = new Intl.DateTimeFormat("en-IN", { day: "numeric" }).format(date);
  const month = new Intl.DateTimeFormat("en-IN", { month: "short" }).format(
    date,
  );
  const year = new Intl.DateTimeFormat("en-IN", { year: "numeric" }).format(
    date,
  );

  return `${weekday}, ${day} ${month}, ${year}`;
}

function getHolidayTimestamp(holiday: Holiday): number {
  return parseHolidayDate(holiday.startDate)?.getTime() ?? 0;
}

export default function HolidaysScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const {
    data: holidays = [],
    isLoading,
    isError,
    error,
    isRefetching,
    refetch,
  } = useHolidays();
  const styles = createStyles(colors, theme === "dark");

  const { upcoming, past } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingItems: Holiday[] = [];
    const pastItems: Holiday[] = [];

    for (const holiday of holidays) {
      const date = parseHolidayDate(holiday.startDate);
      if (date ? date.getTime() >= today.getTime() : holiday.isUpcoming) {
        upcomingItems.push(holiday);
      } else {
        pastItems.push(holiday);
      }
    }

    upcomingItems.sort(
      (a, b) => getHolidayTimestamp(a) - getHolidayTimestamp(b),
    );
    pastItems.sort((a, b) => getHolidayTimestamp(b) - getHolidayTimestamp(a));

    return { upcoming: upcomingItems, past: pastItems };
  }, [holidays]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isLoading}
            onRefresh={() => {
              void refetch();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
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
          <View style={styles.headerText}>
            <Text style={styles.title}>Holiday list</Text>
            <Text style={styles.subtitle}>
              Public holidays for your company from the leave policy calendar.
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.statusState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.stateMessage}>Loading holidays…</Text>
          </View>
        ) : isError ? (
          <View style={styles.statusState}>
            <View style={styles.stateIcon}>
              <Ionicons
                name="cloud-offline-outline"
                size={30}
                color={colors.textSecondary}
              />
            </View>
            <Text style={styles.stateTitle}>Couldn't load holidays</Text>
            <Text style={styles.stateMessage}>
              {error instanceof Error
                ? error.message
                : "Please check your connection and try again."}
            </Text>
            <Pressable
              onPress={() => {
                void refetch();
              }}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
            >
              <Ionicons name="refresh-outline" size={17} color={colors.white} />
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : holidays.length === 0 ? (
          <View style={styles.statusState}>
            <View style={styles.stateIcon}>
              <Ionicons
                name="calendar-clear-outline"
                size={30}
                color={colors.textSecondary}
              />
            </View>
            <Text style={styles.stateTitle}>No holidays available</Text>
            <Text style={styles.stateMessage}>
              Company holidays will appear here when they are available.
            </Text>
          </View>
        ) : (
          <>
            {upcoming.length > 0 && (
              <HolidaySection
                title="UPCOMING & TODAY"
                holidays={upcoming}
                styles={styles}
              />
            )}
            {past.length > 0 && (
              <HolidaySection
                title="PAST"
                holidays={past}
                styles={styles}
                past
              />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type HolidaySectionProps = {
  title: string;
  holidays: Holiday[];
  styles: ReturnType<typeof createStyles>;
  past?: boolean;
};

function HolidaySection({
  title,
  holidays,
  styles,
  past = false,
}: HolidaySectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.holidayList}>
        {holidays.map((holiday) => (
          <View key={String(holiday.id)} style={styles.holidayCard}>
            <View
              style={[styles.calendarIcon, past && styles.pastCalendarIcon]}
            >
              <Ionicons
                name="calendar"
                size={23}
                color={
                  past ? styles.pastIconColor.color : styles.iconColor.color
                }
              />
            </View>
            <View style={styles.holidayInfo}>
              <Text style={styles.holidayName}>{holiday.name}</Text>
              <Text style={styles.holidayDate}>
                {formatHolidayDate(holiday.startDate)}
              </Text>
              {holiday.endDate &&
              holiday.endDate.slice(0, 10) !==
                holiday.startDate.slice(0, 10) ? (
                <Text style={styles.holidayEndDate}>
                  Through {formatHolidayDate(holiday.endDate)}
                </Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function createStyles(
  colors: {
    background: string;
    surface: string;
    surfaceSecondary: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    primary: string;
    white: string;
  },
  isDark: boolean,
) {
  const accentBackground = isDark ? "#3A1C29" : "#FBE6EE";
  const accentColor = isDark ? "#F4A4BD" : "#BA3C69";

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 40,
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 26,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 12,
      marginTop: 1,
    },
    headerText: {
      flex: 1,
    },
    title: {
      fontSize: 28,
      lineHeight: 35,
      fontWeight: "800",
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    subtitle: {
      marginTop: 7,
      fontSize: 15,
      lineHeight: 23,
      color: colors.textSecondary,
    },
    section: {
      marginBottom: 26,
    },
    sectionTitle: {
      marginBottom: 12,
      marginLeft: 4,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "800",
      letterSpacing: 0.6,
      color: colors.textSecondary,
    },
    holidayList: {
      gap: 10,
    },
    holidayCard: {
      minHeight: 96,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    calendarIcon: {
      width: 56,
      height: 56,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: accentBackground,
      marginRight: 13,
    },
    pastCalendarIcon: {
      opacity: 0.65,
    },
    iconColor: {
      color: accentColor,
    },
    pastIconColor: {
      color: colors.textMuted,
    },
    holidayInfo: {
      flex: 1,
      justifyContent: "center",
    },
    holidayName: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    holidayDate: {
      marginTop: 5,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    holidayEndDate: {
      marginTop: 3,
      fontSize: 12,
      lineHeight: 17,
      color: colors.textMuted,
    },
    statusState: {
      minHeight: 300,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
      paddingVertical: 40,
    },
    stateIcon: {
      width: 66,
      height: 66,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 15,
    },
    stateTitle: {
      marginTop: 2,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: "800",
      color: colors.textPrimary,
      textAlign: "center",
    },
    stateMessage: {
      marginTop: 10,
      fontSize: 14,
      lineHeight: 21,
      color: colors.textSecondary,
      textAlign: "center",
    },
    retryButton: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 18,
      borderRadius: 22,
      backgroundColor: colors.primary,
      marginTop: 18,
      gap: 8,
    },
    retryText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: "700",
    },
    pressed: {
      opacity: 0.75,
    },
  });
}
