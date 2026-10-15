import React from "react";

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { AppText as Text } from "../components/InterTypography";
import { SafeAreaView } from "react-native-safe-area-context";

import { useLocalSearchParams, useRouter } from "expo-router";

import { useLeaveRequest, useRevokeLeaveRequest } from "../hooks/useLeave";

import { useTheme } from "../theme/ThemeProvider";

function formatLeaveDays(
  fromDate?: string | null,
  toDate?: string | null,
): string {
  if (!fromDate || !toDate) {
    return "—";
  }

  const parseDate = (value: string): Date | null => {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

    if (!match) {
      return null;
    }

    const date = new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
    );

    return Number.isNaN(date.getTime()) ? null : date;
  };

  const start = parseDate(fromDate);
  const end = parseDate(toDate);

  if (!start || !end || end < start) {
    return "—";
  }

  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;

  return `${days} ${days === 1 ? "day" : "days"}`;
}
function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",

    month: "short",

    year: "numeric",
  });
}

function getStatusBackground(status: string, colors: any) {
  switch (status) {
    case "Approved":

    case "Accepted":
      return colors.successBackground;

    case "Rejected":

    case "Revoked":
      return colors.dangerBackground;

    case "RevokePending":

    case "Partially Approved":
      return colors.warningBackground;

    default:
      return colors.primaryLight;
  }
}

function getStatusTextColor(status: string, colors: any) {
  switch (status) {
    case "Approved":

    case "Accepted":
      return colors.success;

    case "Rejected":

    case "Revoked":
      return colors.danger;

    case "RevokePending":

    case "Partially Approved":
      return colors.warning;

    default:
      return colors.primary;
  }
}

export default function LeaveDetailsScreen() {
  const router = useRouter();

  const { colors } = useTheme();

  const params = useLocalSearchParams<{ id?: string }>();

  const leaveId = Number(params.id);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/leave");
    }
  };

  const {
    data: leave,

    isLoading,

    isError,

    error,

    refetch,
  } = useLeaveRequest(Number.isFinite(leaveId) ? leaveId : undefined);

  const revokeMutation = useRevokeLeaveRequest();

  const styles = createStyles(colors);

  const handleRevoke = () => {
    if (!leave) return;

    Alert.alert(
      "Revoke Leave",

      "Are you sure you want to request revocation of this leave?",

      [
        {
          text: "Cancel",

          style: "cancel",
        },

        {
          text: "Revoke",

          style: "destructive",

          onPress: async () => {
            try {
              await revokeMutation.mutateAsync({
                id: leave.id,

                revokedReason: "Employee requested leave revocation",
              });

              await refetch();

              Alert.alert("Success", "Leave revocation request submitted.");
            } catch (error) {
              Alert.alert(
                "Unable to revoke leave",

                error instanceof Error
                  ? error.message
                  : "Something went wrong.",
              );
            }
          },
        },
      ],
    );
  };

  if (!params.id || !Number.isFinite(leaveId)) {
    return (
      <SafeAreaView style={styles.center} edges={["top", "left", "right"]}>
        <Text style={styles.errorTitle}>Invalid leave request</Text>

        <Pressable style={styles.primaryButton} onPress={handleBack}>
          <Text style={styles.primaryButtonText}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center} edges={["top", "left", "right"]}>
        <ActivityIndicator size="large" color={colors.primary} />

        <Text style={styles.loadingText}>Loading leave request...</Text>
        <Pressable
          style={[styles.secondaryButton, { marginTop: 16 }]}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.secondaryButtonText}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (isError || !leave) {
    return (
      <SafeAreaView style={styles.center} edges={["top", "left", "right"]}>
        <Text style={styles.errorTitle}>Unable to load leave request</Text>

        <Text style={styles.errorMessage}>
          {error instanceof Error
            ? error.message
            : "Something went wrong while loading this request."}
        </Text>

        <View style={styles.errorActions}>
          <Pressable style={styles.primaryButton} onPress={() => refetch()}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={handleBack}>
            <Text style={styles.secondaryButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const statusBackground = getStatusBackground(leave.status, colors);

  const statusTextColor = getStatusTextColor(leave.status, colors);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack} hitSlop={10}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Leave Details</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statusRow}>
          <Text style={styles.requestLabel}>Leave Request</Text>

          <View
            style={[styles.statusBadge, { backgroundColor: statusBackground }]}
          >
            <Text style={[styles.statusText, { color: statusTextColor }]}>
              {leave.status}
            </Text>
          </View>
        </View>

        <View style={styles.mainCard}>
          <Text style={styles.leaveType}>{leave.appliedLeaveType}</Text>

          <Text style={styles.dateRange}>
            {formatDate(leave.fromDate)} — {formatDate(leave.toDate)}
          </Text>

          <View style={styles.divider} />

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>From</Text>

              <Text style={styles.infoValue}>{formatDate(leave.fromDate)}</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>To</Text>

              <Text style={styles.infoValue}>{formatDate(leave.toDate)}</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Days</Text>
              <Text style={styles.infoValue}>
                {formatLeaveDays(leave.fromDate, leave.toDate)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Purpose</Text>

          <View style={styles.detailCard}>
            <Text style={styles.purposeText}>
              {leave.purpose?.trim() || "No purpose provided."}
            </Text>
          </View>
        </View>

        {leave.status === "Approved" && (
          <View style={styles.actionSection}>
            <Pressable
              style={[
                styles.revokeButton,

                revokeMutation.isPending && styles.disabledButton,
              ]}
              onPress={handleRevoke}
              disabled={revokeMutation.isPending}
            >
              <Text style={styles.revokeButtonText}>
                {revokeMutation.isPending
                  ? "Submitting..."
                  : "Request Leave Revocation"}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,

      backgroundColor: colors.background,
    },

    header: {
      height: 64,

      flexDirection: "row",

      alignItems: "center",

      justifyContent: "space-between",

      paddingHorizontal: 20,

      borderBottomWidth: 1,

      borderBottomColor: colors.border,

      backgroundColor: colors.surface,
    },

    backButton: {
      width: 40,

      height: 40,

      alignItems: "center",

      justifyContent: "center",
    },

    backText: {
      color: colors.textPrimary,

      fontSize: 36,

      fontWeight: "300",

      lineHeight: 38,
    },

    headerTitle: {
      flex: 1,

      textAlign: "center",

      color: colors.textPrimary,

      fontSize: 18,

      fontWeight: "700",
    },

    headerSpacer: {
      width: 40,
    },

    content: {
      padding: 20,

      paddingBottom: 40,
    },

    statusRow: {
      flexDirection: "row",

      alignItems: "center",

      justifyContent: "space-between",

      marginBottom: 16,
    },

    requestLabel: {
      color: colors.textSecondary,

      fontSize: 14,

      fontWeight: "500",
    },

    statusBadge: {
      paddingHorizontal: 12,

      paddingVertical: 7,

      borderRadius: 999,
    },

    statusText: {
      fontSize: 12,

      fontWeight: "700",
    },

    mainCard: {
      backgroundColor: colors.surface,

      borderRadius: 20,

      padding: 20,

      borderWidth: 1,

      borderColor: colors.border,
    },

    leaveType: {
      color: colors.textPrimary,

      fontSize: 24,

      fontWeight: "700",

      marginBottom: 8,
    },

    dateRange: {
      color: colors.textSecondary,

      fontSize: 15,

      fontWeight: "500",
    },

    divider: {
      height: 1,

      backgroundColor: colors.border,

      marginVertical: 20,
    },

    infoGrid: {
      flexDirection: "row",

      justifyContent: "space-between",
    },

    infoItem: {
      flex: 1,
    },

    infoLabel: {
      color: colors.textMuted,

      fontSize: 12,

      marginBottom: 6,
    },

    infoValue: {
      color: colors.textPrimary,

      fontSize: 14,

      fontWeight: "600",
    },

    section: {
      marginTop: 24,
    },

    sectionTitle: {
      color: colors.textPrimary,

      fontSize: 16,

      fontWeight: "700",

      marginBottom: 10,
    },

    detailCard: {
      backgroundColor: colors.surface,

      borderRadius: 16,

      padding: 18,

      borderWidth: 1,

      borderColor: colors.border,
    },

    purposeText: {
      color: colors.textSecondary,

      fontSize: 14,

      lineHeight: 22,
    },

    actionSection: {
      marginTop: 24,
    },

    revokeButton: {
      backgroundColor: colors.dangerBackground,

      borderWidth: 1,

      borderColor: colors.danger,

      borderRadius: 14,

      paddingVertical: 15,

      alignItems: "center",
    },

    revokeButtonText: {
      color: colors.danger,

      fontSize: 14,

      fontWeight: "700",
    },

    disabledButton: {
      opacity: 0.5,
    },

    center: {
      flex: 1,

      alignItems: "center",

      justifyContent: "center",

      padding: 24,

      backgroundColor: colors.background,
    },

    loadingText: {
      marginTop: 12,

      color: colors.textSecondary,

      fontSize: 14,
    },

    errorTitle: {
      color: colors.textPrimary,

      fontSize: 18,

      fontWeight: "700",

      textAlign: "center",
    },

    errorMessage: {
      color: colors.textSecondary,

      fontSize: 14,

      lineHeight: 21,

      textAlign: "center",

      marginTop: 8,

      marginBottom: 20,
    },

    errorActions: {
      width: "100%",

      maxWidth: 280,

      gap: 10,
    },

    primaryButton: {
      backgroundColor: colors.primary,

      paddingHorizontal: 20,

      paddingVertical: 13,

      borderRadius: 12,

      alignItems: "center",
    },

    primaryButtonText: {
      color: colors.white,

      fontSize: 14,

      fontWeight: "700",
    },

    secondaryButton: {
      backgroundColor: colors.surface,

      paddingHorizontal: 20,

      paddingVertical: 13,

      borderRadius: 12,

      alignItems: "center",

      borderWidth: 1,

      borderColor: colors.border,
    },

    secondaryButtonText: {
      color: colors.textPrimary,

      fontSize: 14,

      fontWeight: "600",
    },
  });
}
