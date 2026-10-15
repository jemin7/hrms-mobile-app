import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { AppText as Text } from "../components/InterTypography";
import { SafeAreaView } from "react-native-safe-area-context";

import type { EmployeeNotification } from "../api/notifications";
import { useNotifications } from "../hooks/useNotifications";
import { useTheme } from "../theme/ThemeProvider";

type NotificationColors = {
  background: string;
  surface: string;
  surfaceSecondary: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryLight: string;
  success: string;
  successBackground: string;
  warning: string;
  warningBackground: string;
  white: string;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { data, isLoading, isError, error, refetch, isRefetching } =
    useNotifications();
  const styles = createStyles(colors);

  const recentNotifications = data?.recent ?? [];
  const olderNotifications = data?.older ?? [];
  const hasNotifications =
    recentNotifications.length > 0 || olderNotifications.length > 0;

  const feedError = useMemo(() => {
    if (error instanceof Error && error.message.trim()) return error.message;
    return "Please check your connection and try again.";
  }, [error]);

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  };

  const openNotification = (notification: EmployeeNotification) => {
    const href = notification.href?.trim();
    const messageId =
      typeof notification.id === "string"
        ? /^memo-(\d+)$/i.exec(notification.id)?.[1]
        : undefined;
    const hrefTarget = href ? getHrefTarget(href, messageId) : null;

    if (hrefTarget) {
      navigateToTarget(router, hrefTarget);
      return;
    }

    switch (notification.kind) {
      case "leave":
        router.push("/(tabs)/leave");
        break;
      case "reimbursement":
        router.push("/(tabs)/reimbursement");
        break;
      case "payslip":
        router.push("/(tabs)/payout");
        break;
      case "holiday":
        router.push("/holidays");
        break;
      case "birthday":
        router.push("/(tabs)");
        break;
      case "memo":
      case "general":
      default:
        // There is no separate memo/general notification detail route yet.
        break;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={21} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>YOUR UPDATES</Text>
            <Text style={styles.headerTitle}>Notifications</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons
              name="notifications-outline"
              size={21}
              color={colors.primary}
            />
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.introCard}>
            <View style={styles.introIcon}>
              <Ionicons name="notifications" size={22} color={colors.primary} />
            </View>
            <View style={styles.introCopy}>
              <Text style={styles.introTitle}>Stay in the loop</Text>
              <Text style={styles.introSubtitle}>
                Updates about your leave, reimbursements, payroll and more.
              </Text>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.stateCard}>
              <View style={styles.stateIcon}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
              <Text style={styles.stateTitle}>Loading notifications</Text>
              <Text style={styles.stateMessage}>
                Getting your latest updates…
              </Text>
            </View>
          ) : isError ? (
            <View style={styles.stateCard}>
              <View style={styles.stateIcon}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={29}
                  color={colors.textSecondary}
                />
              </View>
              <Text style={styles.stateTitle}>Couldn't load notifications</Text>
              <Text style={styles.stateMessage}>{feedError}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void refetch()}
                disabled={isRefetching}
                style={({ pressed }) => [
                  styles.retryButton,
                  pressed && styles.pressed,
                  isRefetching && styles.disabledButton,
                ]}
              >
                {isRefetching ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Ionicons
                      name="refresh-outline"
                      size={17}
                      color={colors.white}
                    />
                    <Text style={styles.retryText}>Try again</Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : !hasNotifications ? (
            <View style={styles.stateCard}>
              <View style={styles.stateIcon}>
                <Ionicons
                  name="notifications-off-outline"
                  size={30}
                  color={colors.textSecondary}
                />
              </View>
              <Text style={styles.stateTitle}>You're all caught up</Text>
              <Text style={styles.stateMessage}>
                There are no notifications to show right now. New updates will
                appear here.
              </Text>
            </View>
          ) : (
            <>
              {recentNotifications.length > 0 && (
                <NotificationSection
                  title="Recent"
                  subtitle="Your latest updates"
                  notifications={recentNotifications}
                  onPress={openNotification}
                  colors={colors}
                />
              )}
              {olderNotifications.length > 0 && (
                <NotificationSection
                  title="Earlier"
                  subtitle="Previous updates"
                  notifications={olderNotifications}
                  onPress={openNotification}
                  colors={colors}
                />
              )}
              {data?.hasMore && (
                <Text style={styles.moreHint}>
                  Showing the most recent notifications available.
                </Text>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

type NotificationSectionProps = {
  title: string;
  subtitle: string;
  notifications: EmployeeNotification[];
  onPress: (notification: EmployeeNotification) => void;
  colors: NotificationColors;
};

function NotificationSection({
  title,
  subtitle,
  notifications,
  onPress,
  colors,
}: NotificationSectionProps) {
  const styles = createSectionStyles(colors);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{notifications.length}</Text>
        </View>
      </View>
      <View style={styles.panel}>
        {notifications.map((notification, index) => (
          <NotificationRow
            key={`${notification.kind}-${notification.id}-${notification.at}`}
            notification={notification}
            onPress={onPress}
            colors={colors}
            isLast={index === notifications.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

type NotificationRowProps = {
  notification: EmployeeNotification;
  onPress: (notification: EmployeeNotification) => void;
  isLast: boolean;
  colors: NotificationColors;
};

function NotificationRow({
  notification,
  onPress,
  isLast,
  colors,
}: NotificationRowProps) {
  const styles = createRowStyles(colors);
  const visual = getNotificationVisual(notification, colors);

  return (
    <Pressable
      onPress={() => onPress(notification)}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowBorder,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Open notification: ${notification.title}`}
    >
      <View
        style={[styles.iconContainer, { backgroundColor: visual.background }]}
      >
        <Ionicons name={visual.icon} size={20} color={visual.color} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.title} numberOfLines={2}>
          {notification.title}
        </Text>
        <Text style={styles.message} numberOfLines={3}>
          {notification.body}
        </Text>
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={12} color={colors.textMuted} />
          <Text style={styles.time}>
            {formatNotificationTime(notification.at)}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
    </Pressable>
  );
}

function getNotificationVisual(
  notification: EmployeeNotification,
  colors: NotificationColors,
): {
  icon: keyof typeof Ionicons.glyphMap;
  background: string;
  color: string;
} {
  const text =
    `${notification.title} ${notification.body} ${notification.href ?? ""}`.toLowerCase();

  if (text.includes("task")) {
    return {
      icon: "checkmark-circle-outline",
      background: colors.successBackground,
      color: colors.success,
    };
  }

  switch (notification.kind) {
    case "leave":
      return {
        icon: "calendar-outline",
        background: colors.primaryLight,
        color: colors.primary,
      };
    case "reimbursement":
      return {
        icon: "receipt-outline",
        background: colors.warningBackground,
        color: colors.warning,
      };
    case "payslip":
      return {
        icon: "wallet-outline",
        background: colors.successBackground,
        color: colors.success,
      };
    case "holiday":
      return {
        icon: "sunny-outline",
        background: colors.surfaceSecondary,
        color: colors.primary,
      };
    case "birthday":
      return {
        icon: "gift-outline",
        background: colors.primaryLight,
        color: colors.primary,
      };
    case "memo":
      return {
        icon: "document-text-outline",
        background: colors.surfaceSecondary,
        color: colors.textSecondary,
      };
    case "general":
    default:
      return {
        icon: "notifications-outline",
        background: colors.surfaceSecondary,
        color: colors.textSecondary,
      };
  }
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const elapsedMinutes = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 60_000),
  );
  if (elapsedMinutes < 1) return "Just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes} min ago`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24)
    return `${elapsedHours} hr${elapsedHours === 1 ? "" : "s"} ago`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays === 1) return "Yesterday";
  if (elapsedDays < 7) return `${elapsedDays} days ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type NotificationTarget =
  | {
      route:
        | "/holidays"
        | "/tasks"
        | "/(tabs)/leave"
        | "/(tabs)/reimbursement"
        | "/(tabs)/payout"
        | "/(tabs)";
    }
  | { route: "/(tabs)/chat"; messageId?: string }
  | { route: "/leave-details" | "/reimbursement-details"; id: string };

function getHrefTarget(
  href: string,
  messageId?: string,
): NotificationTarget | null {
  const lower = safeDecode(href).toLowerCase();
  const id = extractRelatedId(href);

  // Open chat notifications in the mobile Chat screen.
  if (
    /\/chat(?:\/|[?#]|$)/.test(lower) ||
    /[?&]tab=messaging(?:&|$)/.test(lower) ||
    /employee[-_]?memo/.test(lower)
  ) {
    return {
      route: "/(tabs)/chat",
      ...(messageId ? { messageId } : {}),
    };
  }

  if (/holiday|calendar/.test(lower)) return { route: "/holidays" };
  if (/task|mytasks|my-tasks/.test(lower)) return { route: "/tasks" };

  if (/leave/.test(lower)) {
    return id ? { route: "/leave-details", id } : { route: "/(tabs)/leave" };
  }

  if (/reimburse|expense/.test(lower)) {
    return id
      ? { route: "/reimbursement-details", id }
      : { route: "/(tabs)/reimbursement" };
  }

  if (/payslip|salary|payout|payroll/.test(lower)) {
    return { route: "/(tabs)/payout" };
  }

  return null;
}

function extractRelatedId(href: string): string | null {
  try {
    const parsed = new URL(href, "https://mobile.local");
    for (const key of [
      "id",
      "leaveId",
      "leaveApplicationId",
      "reimbursementId",
      "requestId",
    ]) {
      const value = parsed.searchParams.get(key);
      if (value && /^[a-zA-Z0-9_-]+$/.test(value)) return value;
    }
  } catch {
    // Continue with path parsing for non-standard relative href values.
  }

  try {
    const parsed = new URL(href, "https://mobile.local");
    const segments = parsed.pathname.split("/").filter(Boolean);
    const numericId = [...segments]
      .reverse()
      .find((segment) => /^\d+$/.test(segment));
    if (numericId) return numericId;
  } catch {
    // No numeric identifier could be recovered from the path.
  }

  return null;
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function navigateToTarget(
  router: ReturnType<typeof useRouter>,
  target: NotificationTarget,
) {
  if ("messageId" in target && target.messageId) {
    router.push({
      pathname: target.route,
      params: { messageId: target.messageId },
    });
  } else if ("id" in target) {
    router.push({
      pathname: target.route,
      params: { id: target.id },
    });
  } else {
    router.push(target.route);
  }
}

function createStyles(colors: NotificationColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      minHeight: 62,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 5,
      paddingBottom: 12,
      gap: 13,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerCopy: { flex: 1 },
    headerEyebrow: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.4,
      color: colors.primary,
      marginBottom: 2,
    },
    headerTitle: {
      fontSize: 23,
      lineHeight: 28,
      fontWeight: "800",
      letterSpacing: -0.4,
      color: colors.textPrimary,
    },
    headerIcon: {
      width: 42,
      height: 42,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primaryLight,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 9,
      paddingBottom: 36,
      flexGrow: 1,
    },
    introCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 13,
      padding: 16,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 25,
    },
    introIcon: {
      width: 46,
      height: 46,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primaryLight,
    },
    introCopy: { flex: 1 },
    introTitle: { fontSize: 15, fontWeight: "800", color: colors.textPrimary },
    introSubtitle: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    stateCard: {
      flexGrow: 1,
      minHeight: 320,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 25,
      paddingVertical: 30,
      borderRadius: 22,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    stateIcon: {
      width: 66,
      height: 66,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
    },
    stateTitle: {
      marginTop: 17,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: "800",
      color: colors.textPrimary,
      textAlign: "center",
    },
    stateMessage: {
      marginTop: 7,
      fontSize: 13,
      lineHeight: 20,
      color: colors.textSecondary,
      textAlign: "center",
    },
    retryButton: {
      marginTop: 20,
      minHeight: 46,
      flexDirection: "row",
      gap: 8,
      borderRadius: 14,
      backgroundColor: colors.primary,
      paddingHorizontal: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    retryText: { color: colors.white, fontSize: 14, fontWeight: "800" },
    disabledButton: { opacity: 0.65 },
    moreHint: {
      textAlign: "center",
      fontSize: 12,
      lineHeight: 18,
      color: colors.textMuted,
      marginTop: 0,
      marginBottom: 18,
    },
    pressed: { opacity: 0.76 },
  });
}

function createSectionStyles(colors: NotificationColors) {
  return StyleSheet.create({
    section: { marginBottom: 25 },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 11,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    sectionSubtitle: {
      marginTop: 3,
      fontSize: 11,
      color: colors.textSecondary,
    },
    countPill: {
      minWidth: 29,
      height: 29,
      paddingHorizontal: 8,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
    },
    countText: { fontSize: 12, fontWeight: "800", color: colors.textPrimary },
    panel: {
      backgroundColor: colors.surface,
      borderRadius: 21,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
  });
}

function createRowStyles(colors: NotificationColors) {
  return StyleSheet.create({
    row: {
      minHeight: 105,
      paddingHorizontal: 14,
      paddingVertical: 15,
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: colors.surface,
    },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    iconContainer: {
      width: 43,
      height: 43,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    rowContent: { flex: 1, paddingRight: 8 },
    title: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    message: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    timeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 7,
    },
    time: { fontSize: 11, color: colors.textMuted },
    pressed: { opacity: 0.75 },
  });
}
