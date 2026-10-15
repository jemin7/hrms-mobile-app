import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { AppText as Text } from "../../components/InterTypography";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useLeaveBalance, useLeaveRequests } from "../../hooks/useLeave";
import { useTheme } from "../../theme/ThemeProvider";

type LeaveColors = {
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
  danger: string;
  dangerBackground: string;
  warning: string;
  warningBackground: string;
  white: string;
};

export default function LeaveScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const insets = useSafeAreaInsets();
  const tabBarBottomOffset = Math.max(insets.bottom + 8, 16);
  const fabBottomOffset = tabBarBottomOffset + 72 + 12;

  const styles = createStyles(colors);

  const {
    data: leaveRequests = [],
    isLoading: requestsLoading,
    isError: requestsError,
    refetch: refetchRequests,
    isFetching: requestsFetching,
  } = useLeaveRequests();

  const {
    data: leaveBalance,
    isLoading: balanceLoading,
    isError: balanceError,
    refetch: refetchBalance,
    isFetching: balanceFetching,
  } = useLeaveBalance();

  const openNewRequest = () => router.push("/new-leave-request");

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons
                name="calendar-clear-outline"
                size={23}
                color={colors.primary}
              />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Leave</Text>
              <Text style={styles.subtitle}>Leave balance and requests</Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Leave balance</Text>
                <Text style={styles.sectionSubtitle}>
                  Your available leave days
                </Text>
              </View>
              {balanceFetching && !balanceLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : null}
            </View>

            {balanceLoading ? (
              <StateCard
                icon="hourglass-outline"
                title="Loading leave balance"
                message="Your available leave days will appear here."
                loading
                colors={colors}
              />
            ) : balanceError ? (
              <StateCard
                icon="cloud-offline-outline"
                title="Unable to load leave balance"
                message="Check your connection and try again when the service is available."
                actionLabel="Try again"
                onAction={() => void refetchBalance()}
                loading={balanceFetching}
                colors={colors}
              />
            ) : !leaveBalance || Object.keys(leaveBalance).length === 0 ? (
              <StateCard
                icon="wallet-outline"
                title="No leave balance available"
                message="Leave balance information isn't available for this account yet."
                colors={colors}
              />
            ) : (
              <View style={styles.balanceGrid}>
                <BalanceCard
                  label="Sick"
                  value={getBalanceValue(leaveBalance, [
                    "sick",
                    "sickLeave",
                    "Sick",
                  ])}
                  colors={colors}
                />
                <BalanceCard
                  label="Casual"
                  value={getBalanceValue(leaveBalance, [
                    "casual",
                    "casualLeave",
                    "Casual",
                  ])}
                  colors={colors}
                />
                <BalanceCard
                  label="Privileged"
                  value={getBalanceValue(leaveBalance, [
                    "privileged",
                    "privilegedLeave",
                    "Privileged",
                  ])}
                  colors={colors}
                />
                <BalanceCard
                  label="Comp off"
                  value={getBalanceValue(leaveBalance, [
                    "compOff",
                    "compOffLeave",
                    "CompOff",
                  ])}
                  colors={colors}
                />
                <BalanceCard
                  label="Maternity"
                  value={getBalanceValue(leaveBalance, [
                    "mtl",
                    "maternity",
                    "maternityLeave",
                    "MtL",
                  ])}
                  colors={colors}
                />
                <BalanceCard
                  label="Paternity"
                  value={getBalanceValue(leaveBalance, [
                    "ptl",
                    "paternity",
                    "paternityLeave",
                    "PtL",
                  ])}
                  colors={colors}
                />
              </View>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Leave requests</Text>
                <Text style={styles.sectionSubtitle}>
                  Track the status of your applications
                </Text>
              </View>
              {requestsFetching && !requestsLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : null}
            </View>

            {requestsLoading ? (
              <StateCard
                icon="hourglass-outline"
                title="Loading leave requests"
                message="Your submitted applications will appear here."
                loading
                colors={colors}
              />
            ) : requestsError ? (
              <StateCard
                icon="cloud-offline-outline"
                title="Unable to load leave requests"
                message="Check your connection and try again when the service is available."
                actionLabel="Try again"
                onAction={() => void refetchRequests()}
                loading={requestsFetching}
                colors={colors}
              />
            ) : leaveRequests.length === 0 ? (
              <StateCard
                icon="document-text-outline"
                title="No leave requests yet"
                message="When you submit a leave application, its details and status will appear here."
                actionLabel="Request leave"
                onAction={openNewRequest}
                colors={colors}
              />
            ) : (
              <View style={styles.requestList}>
                {leaveRequests.map((request) => {
                  const fromDate = formatLeaveDate(request.fromDate);
                  const toDate = formatLeaveDate(request.toDate);
                  const dateText =
                    request.fromDate === request.toDate
                      ? fromDate
                      : `${fromDate} – ${toDate}`;

                  return (
                    <Pressable
                      key={request.id}
                      style={({ pressed }) => [
                        styles.requestCard,
                        pressed && styles.cardPressed,
                      ]}
                      onPress={() =>
                        router.push({
                          pathname: "/leave-details",
                          params: { id: String(request.id) },
                        })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`${formatLeaveType(request.type)}, ${request.status}, ${dateText}`}
                    >
                      <View style={styles.requestIcon}>
                        <Ionicons
                          name="calendar-outline"
                          size={19}
                          color={colors.primary}
                        />
                      </View>

                      <View style={styles.requestInfo}>
                        <View style={styles.cardTopRow}>
                          <Text style={styles.requestType} numberOfLines={1}>
                            {formatLeaveType(request.type)}
                          </Text>
                          <StatusPill status={request.status} colors={colors} />
                        </View>

                        <Text style={styles.requestDates} numberOfLines={2}>
                          {dateText}
                        </Text>

                        <Text style={styles.requestDays}>
                          {request.days}{" "}
                          {Number(request.days) === 1 ? "day" : "days"}
                        </Text>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={colors.textMuted}
                      />
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>

        <Pressable
          onPress={openNewRequest}
          style={({ pressed }) => [
            styles.fab,
            { bottom: fabBottomOffset },
            pressed && styles.fabPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Create leave request"
        >
          <Ionicons name="add" size={28} color={colors.white} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function StateCard({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  loading = false,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
  colors: LeaveColors;
}) {
  const styles = createStyles(colors);

  return (
    <View style={styles.stateCard}>
      <View style={styles.stateIcon}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name={icon} size={24} color={colors.textMuted} />
        )}
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateText}>{message}</Text>

      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          disabled={loading}
          style={({ pressed }) => [
            styles.stateAction,
            pressed && !loading && styles.cardPressed,
            loading && styles.disabledAction,
          ]}
          accessibilityRole="button"
        >
          <Text style={styles.stateActionText}>
            {loading ? "Please wait…" : actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function BalanceCard({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: LeaveColors;
}) {
  const styles = createStyles(colors);

  return (
    <View style={styles.balanceCard}>
      <View style={styles.balanceIcon}>
        <Ionicons name="calendar-outline" size={16} color={colors.primary} />
      </View>
      <Text style={styles.balanceLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.balanceValue}>{value}</Text>
      <Text style={styles.balanceUnit}>days</Text>
    </View>
  );
}

function getBalanceValue(balance: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = balance[key];

    if (value !== undefined && value !== null && value !== "") {
      if (typeof value === "number") {
        return Number.isInteger(value) ? String(value) : value.toFixed(2);
      }

      if (typeof value === "string" || typeof value === "boolean") {
        return String(value);
      }
    }
  }

  return "—";
}

function StatusPill({
  status,
  colors,
}: {
  status: string;
  colors: LeaveColors;
}) {
  const styles = createStyles(colors);
  const normalized = status.trim().toLowerCase();

  let backgroundColor = colors.surfaceSecondary;
  let textColor = colors.textSecondary;

  if (normalized === "pending" || normalized === "revokepending") {
    backgroundColor = colors.warningBackground;
    textColor = colors.warning;
  } else if (
    normalized === "approved" ||
    normalized === "accepted" ||
    normalized === "partially approved"
  ) {
    backgroundColor = colors.successBackground;
    textColor = colors.success;
  } else if (normalized === "rejected" || normalized === "revoked") {
    backgroundColor = colors.dangerBackground;
    textColor = colors.danger;
  }

  return (
    <View style={[styles.statusPill, { backgroundColor }]}>
      <Text style={[styles.statusText, { color: textColor }]} numberOfLines={1}>
        {status}
      </Text>
    </View>
  );
}

function formatLeaveType(type: string) {
  const normalized = type.trim().toLowerCase();

  switch (normalized) {
    case "sick":
      return "Sick Leave";
    case "casual":
      return "Casual Leave";
    case "privileged":
      return "Privileged Leave";
    case "compoff":
    case "comp off":
      return "Comp Off";
    case "mtl":
      return "Maternity Leave";
    case "ptl":
      return "Paternity Leave";
    default:
      return type;
  }
}

function formatLeaveDate(value: string) {
  if (!value) return "Date unavailable";

  const dateOnlyMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
  const date = dateOnlyMatch
    ? new Date(`${dateOnlyMatch[1]}T00:00:00`)
    : new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function createStyles(colors: LeaveColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
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
      marginBottom: 8,
    },
    headerIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 13,
      backgroundColor: colors.primaryLight,
    },
    headerText: {
      flex: 1,
    },
    title: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    subtitle: {
      marginTop: 3,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    section: {
      marginTop: 24,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 13,
    },
    sectionTitle: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    sectionSubtitle: {
      marginTop: 3,
      fontSize: 12,
      lineHeight: 17,
      color: colors.textSecondary,
    },
    balanceGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    balanceCard: {
      flexGrow: 1,
      flexBasis: "30%",
      minWidth: "29%",
      paddingHorizontal: 13,
      paddingVertical: 14,
      borderRadius: 17,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    balanceIcon: {
      width: 32,
      height: 32,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
      backgroundColor: colors.primaryLight,
    },
    balanceLabel: {
      marginBottom: 6,
      fontSize: 12,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    balanceValue: {
      fontSize: 23,
      lineHeight: 28,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    balanceUnit: {
      marginTop: 1,
      fontSize: 11,
      color: colors.textMuted,
    },
    requestList: {
      gap: 11,
    },
    requestCard: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderRadius: 17,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    requestIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
      backgroundColor: colors.primaryLight,
    },
    requestInfo: {
      flex: 1,
      minWidth: 0,
      marginRight: 9,
    },
    cardTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    requestType: {
      flex: 1,
      fontSize: 14,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    requestDates: {
      marginTop: 6,
      fontSize: 12,
      lineHeight: 17,
      color: colors.textSecondary,
    },
    requestDays: {
      marginTop: 5,
      fontSize: 12,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    statusPill: {
      maxWidth: 130,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
    },
    statusText: {
      fontSize: 10,
      fontWeight: "800",
    },
    stateCard: {
      minHeight: 170,
      paddingHorizontal: 22,
      paddingVertical: 23,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    stateIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
    },
    stateTitle: {
      marginTop: 12,
      fontSize: 15,
      lineHeight: 21,
      fontWeight: "800",
      color: colors.textPrimary,
      textAlign: "center",
    },
    stateText: {
      marginTop: 5,
      fontSize: 12,
      lineHeight: 18,
      color: colors.textSecondary,
      textAlign: "center",
    },
    stateAction: {
      minHeight: 38,
      marginTop: 14,
      paddingHorizontal: 15,
      paddingVertical: 9,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primaryLight,
    },
    stateActionText: {
      fontSize: 12,
      fontWeight: "800",
      color: colors.primary,
    },
    disabledAction: {
      opacity: 0.6,
    },
    cardPressed: {
      opacity: 0.75,
      transform: [{ scale: 0.99 }],
    },
    fab: {
      position: "absolute",
      right: 20,
      width: 58,
      height: 58,
      borderRadius: 29,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      elevation: 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 8,
    },
    fabPressed: {
      opacity: 0.78,
      transform: [{ scale: 0.96 }],
    },
  });
}
