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

import { useReimbursements } from "../../hooks/useReimbursement";
import { useTheme } from "../../theme/ThemeProvider";

type ReimbursementColors = {
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

export default function ReimbursementScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const insets = useSafeAreaInsets();
  const tabBarBottomOffset = Math.max(insets.bottom + 8, 16);
  const fabBottomOffset = tabBarBottomOffset + 72 + 12;

  const {
    data: reimbursements = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useReimbursements();

  const openNewReimbursement = () => router.push("/new-reimbursement");

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
                name="receipt-outline"
                size={23}
                color={colors.primary}
              />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Reimburse</Text>
              <Text style={styles.subtitle}>
                Track your expense claims and their status
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Your claims</Text>
              {!isLoading && !isError ? (
                <Text style={styles.sectionSubtitle}>
                  {reimbursements.length}{" "}
                  {reimbursements.length === 1 ? "request" : "requests"}
                </Text>
              ) : (
                <Text style={styles.sectionSubtitle}>
                  Reimbursement history
                </Text>
              )}
            </View>
            {isFetching && !isLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : null}
          </View>

          {isLoading ? (
            <StateCard
              icon="hourglass-outline"
              title="Loading reimbursements"
              message="Your expense claims will appear here."
              loading
              colors={colors}
            />
          ) : isError ? (
            <StateCard
              icon="cloud-offline-outline"
              title="Couldn't load reimbursements"
              message={
                error instanceof Error && error.message
                  ? error.message
                  : "Try again when the service is available."
              }
              actionLabel="Try again"
              onAction={() => void refetch()}
              loading={isFetching}
              colors={colors}
            />
          ) : reimbursements.length === 0 ? (
            <StateCard
              icon="receipt-outline"
              title="No reimbursement requests"
              message="When you submit an expense claim, it will appear here."
              actionLabel="Create request"
              onAction={openNewReimbursement}
              colors={colors}
            />
          ) : (
            <View style={styles.list}>
              {reimbursements.map((reimbursement) => {
                const itemCount = Array.isArray(reimbursement.items)
                  ? reimbursement.items.length
                  : 0;

                return (
                  <Pressable
                    key={reimbursement.id}
                    style={({ pressed }) => [
                      styles.card,
                      pressed && styles.cardPressed,
                    ]}
                    onPress={() =>
                      router.push({
                        pathname: "/reimbursement-details",
                        params: { id: String(reimbursement.id) },
                      })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Reimbursement ${reimbursement.id}, ${reimbursement.status}`}
                  >
                    <View style={styles.cardTopRow}>
                      <View style={styles.iconContainer}>
                        <Ionicons
                          name="receipt-outline"
                          size={20}
                          color={colors.primary}
                        />
                      </View>

                      <View style={styles.cardMain}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          Claim #{reimbursement.id}
                        </Text>
                        <View style={styles.dateRow}>
                          <Ionicons
                            name="calendar-outline"
                            size={13}
                            color={colors.textMuted}
                          />
                          <Text style={styles.cardDate}>
                            {formatDate(reimbursement.date)}
                          </Text>
                        </View>
                      </View>

                      <StatusPill
                        status={reimbursement.status}
                        colors={colors}
                      />
                    </View>

                    <View style={styles.cardDivider} />

                    <View style={styles.cardBottomRow}>
                      <View>
                        <Text style={styles.itemLabel}>Expense items</Text>
                        <Text style={styles.itemValue}>{itemCount}</Text>
                      </View>

                      <View style={styles.amountContainer}>
                        <Text style={styles.itemLabel}>Claim total</Text>
                        <Text style={styles.amountValue}>
                          {formatCurrency(reimbursement.totalAmount)}
                        </Text>
                      </View>

                      <View style={styles.openIndicator}>
                        <Ionicons
                          name="chevron-forward"
                          size={17}
                          color={colors.textMuted}
                        />
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>

        <Pressable
          onPress={openNewReimbursement}
          style={({ pressed }) => [
            styles.fab,
            { bottom: fabBottomOffset },
            pressed && styles.fabPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Create reimbursement request"
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
  colors: ReimbursementColors;
}) {
  const styles = createStyles(colors);

  return (
    <View style={styles.stateCard}>
      <View style={styles.stateIcon}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name={icon} size={25} color={colors.textMuted} />
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

function StatusPill({
  status,
  colors,
}: {
  status: string;
  colors: ReimbursementColors;
}) {
  const styles = createStyles(colors);
  const normalized = status.trim().toLowerCase();

  let backgroundColor = colors.surfaceSecondary;
  let textColor = colors.textSecondary;

  if (normalized === "pending") {
    backgroundColor = colors.warningBackground;
    textColor = colors.warning;
  } else if (
    normalized === "approved" ||
    normalized === "paid" ||
    normalized === "partially approved"
  ) {
    backgroundColor = colors.successBackground;
    textColor = colors.success;
  } else if (normalized === "rejected") {
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

function formatDate(value: string) {
  if (!value) return "Date unavailable";

  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  const date = match ? new Date(`${match[1]}T00:00:00`) : new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value: unknown) {
  if (value === null || value === undefined || value === "") return "₹—";
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return `₹${String(value)}`;

  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function createStyles(colors: ReimbursementColors) {
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
      paddingTop: 14,
      paddingBottom: 150,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 26,
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
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
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
    list: {
      gap: 12,
    },
    card: {
      padding: 15,
      borderRadius: 19,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardPressed: {
      opacity: 0.75,
      transform: [{ scale: 0.99 }],
    },
    cardTopRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.primaryLight,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    cardMain: {
      flex: 1,
      minWidth: 0,
      marginRight: 9,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    dateRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 5,
      gap: 5,
    },
    cardDate: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    cardDivider: {
      height: 1,
      marginTop: 15,
      backgroundColor: colors.border,
    },
    cardBottomRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      marginTop: 13,
    },
    itemLabel: {
      fontSize: 11,
      color: colors.textMuted,
      marginBottom: 4,
    },
    itemValue: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    amountContainer: {
      alignItems: "flex-end",
      flex: 1,
      marginRight: 10,
    },
    amountValue: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    openIndicator: {
      width: 29,
      height: 29,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
    },
    statusPill: {
      maxWidth: 128,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
    },
    statusText: {
      fontSize: 10,
      fontWeight: "800",
    },
    stateCard: {
      minHeight: 180,
      paddingHorizontal: 22,
      paddingVertical: 26,
      borderRadius: 19,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    stateIcon: {
      width: 50,
      height: 50,
      borderRadius: 17,
      backgroundColor: colors.surfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
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
      marginTop: 6,
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary,
      textAlign: "center",
    },
    stateAction: {
      marginTop: 16,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.primaryLight,
      alignItems: "center",
      justifyContent: "center",
    },
    stateActionText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: "800",
    },
    disabledAction: {
      opacity: 0.6,
    },
    fab: {
      position: "absolute",
      right: 20,
      bottom: 92,
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
// 