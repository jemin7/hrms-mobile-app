import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText as Text } from "../../components/InterTypography";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../../theme/ThemeProvider";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export default function PayoutScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const currentMonth = startOfMonth(new Date());
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const monthLabel = selectedMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const canGoForward =
    selectedMonth.getFullYear() < currentMonth.getFullYear() ||
    (selectedMonth.getFullYear() === currentMonth.getFullYear() &&
      selectedMonth.getMonth() < currentMonth.getMonth());

  const goToPreviousMonth = () => {
    setSelectedMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1),
    );
  };

  const goToNextMonth = () => {
    if (!canGoForward) return;
    setSelectedMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Payout</Text>
            <Text style={styles.subtitle}>Your salary statements</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="wallet-outline" size={23} color={colors.primary} />
          </View>
        </View>

        <View style={styles.monthSelector}>
          <View style={styles.monthLeft}>
            <View style={styles.calendarIconContainer}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={colors.primary}
              />
            </View>
            <View style={styles.monthLabels}>
              <Text style={styles.monthCaption}>PAY PERIOD</Text>
              <Text style={styles.monthText}>{monthLabel}</Text>
            </View>
          </View>

          <View style={styles.monthActions}>
            <Pressable
              onPress={goToPreviousMonth}
              style={({ pressed }) => [
                styles.monthButton,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={colors.textPrimary}
              />
            </Pressable>
            <Pressable
              onPress={goToNextMonth}
              disabled={!canGoForward}
              style={({ pressed }) => [
                styles.monthButton,
                !canGoForward && styles.disabledMonthButton,
                pressed && canGoForward && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Next month"
              accessibilityState={{ disabled: !canGoForward }}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={canGoForward ? colors.textPrimary : colors.textMuted}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payslips</Text>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>Monthly</Text>
            </View>
          </View>

          <View style={styles.emptyState}>
            <View style={styles.emptyIllustration}>
              <View style={styles.documentIconContainer}>
                <Ionicons
                  name="document-text-outline"
                  size={32}
                  color={colors.primary}
                />
              </View>
              <View style={styles.emptySparkle}>
                <Ionicons name="ellipse" size={7} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.emptyTitle}>No payslip available</Text>
            <Text style={styles.emptyMessage}>
              Payslips for {monthLabel} will appear here once they are
              available.
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons
              name="information-circle-outline"
              size={19}
              color={colors.textSecondary}
            />
            <Text style={styles.infoText}>
              Need help with your salary? You can raise a query when a payslip
              is available.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
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
}) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 150,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 24,
    },
    title: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    subtitle: {
      marginTop: 4,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    headerIcon: {
      width: 46,
      height: 46,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    monthSelector: {
      minHeight: 76,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingLeft: 14,
      paddingRight: 8,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    monthLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },
    calendarIconContainer: {
      width: 42,
      height: 42,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
      backgroundColor: colors.surfaceSecondary,
    },
    monthLabels: {
      flex: 1,
    },
    monthCaption: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1,
      color: colors.textMuted,
      marginBottom: 3,
    },
    monthText: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    monthActions: {
      flexDirection: "row",
      alignItems: "center",
    },
    monthButton: {
      width: 40,
      height: 42,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    disabledMonthButton: {
      opacity: 0.55,
    },
    section: {
      marginTop: 30,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 13,
    },
    sectionTitle: {
      fontSize: 19,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    sectionBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textSecondary,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 26,
      paddingTop: 34,
      paddingBottom: 32,
      borderRadius: 22,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyIllustration: {
      width: 86,
      height: 86,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    documentIconContainer: {
      width: 72,
      height: 72,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptySparkle: {
      position: "absolute",
      top: 3,
      right: 2,
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: "800",
      textAlign: "center",
      color: colors.textPrimary,
    },
    emptyMessage: {
      maxWidth: 270,
      marginTop: 8,
      fontSize: 13,
      lineHeight: 20,
      textAlign: "center",
      color: colors.textSecondary,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 9,
      marginTop: 16,
      paddingHorizontal: 4,
    },
    infoText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    pressed: {
      opacity: 0.7,
    },
  });
}
