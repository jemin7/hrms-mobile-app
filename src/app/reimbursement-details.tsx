import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import {
  useDeleteReimbursement,
  useReimbursement,
} from "../hooks/useReimbursement";
import { useTheme } from "../theme/ThemeProvider";

export default function ReimbursementDetailsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const styles = createStyles(colors);

  const params = useLocalSearchParams<{ id?: string }>();
  const reimbursementId = Number(params.id);

  const {
    data: reimbursement,
    isLoading,
    isError,
    error,
    refetch,
  } = useReimbursement(
    Number.isFinite(reimbursementId) ? reimbursementId : undefined,
  );

  const deleteMutation = useDeleteReimbursement();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/reimbursement");
    }
  };

  const handleDelete = () => {
    if (!reimbursement) {
      return;
    }

    Alert.alert(
      "Delete Reimbursement",
      "Are you sure you want to delete this reimbursement request?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(reimbursement.id);

              Alert.alert(
                "Deleted",
                "The reimbursement request has been deleted.",
                [
                  {
                    text: "OK",
                    onPress: () => {
                      router.replace("/(tabs)/reimbursement");
                    },
                  },
                ],
              );
            } catch (deleteError) {
              Alert.alert(
                "Unable to delete reimbursement",
                deleteError instanceof Error
                  ? deleteError.message
                  : "Something went wrong while deleting the request.",
              );
            }
          },
        },
      ],
    );
  };

  if (!params.id || !Number.isFinite(reimbursementId)) {
    return (
      <SafeAreaView style={styles.center} edges={["top", "left", "right"]}>
        <Text style={styles.errorTitle}>Invalid reimbursement request</Text>

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

        <Text style={styles.loadingText}>Loading reimbursement...</Text>
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

  if (isError || !reimbursement) {
    return (
      <SafeAreaView style={styles.center} edges={["top", "left", "right"]}>
        <Ionicons
          name="cloud-offline-outline"
          size={34}
          color={colors.textMuted}
        />

        <Text style={styles.errorTitle}>Unable to load reimbursement</Text>

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

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack} hitSlop={10}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Reimbursement Details</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View style={styles.receiptIcon}>
              <Ionicons
                name="receipt-outline"
                size={22}
                color={colors.primary}
              />
            </View>

            <StatusPill status={reimbursement.status} colors={colors} />
          </View>

          <Text style={styles.requestTitle}>
            Reimbursement #{reimbursement.id}
          </Text>

          <Text style={styles.requestDate}>
            {formatDate(reimbursement.date)}
          </Text>

          <View style={styles.summaryDivider} />

          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalLabel}>Total amount</Text>

              <Text style={styles.totalAmount}>
                ₹{reimbursement.totalAmount}
              </Text>
            </View>

            <View style={styles.itemsCount}>
              <Text style={styles.itemsCountNumber}>
                {reimbursement.items.length}
              </Text>

              <Text style={styles.itemsCountLabel}>
                {reimbursement.items.length === 1 ? "item" : "items"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reimbursement Items</Text>

          <View style={styles.itemsList}>
            {reimbursement.items.map((item, index) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemIndex}>
                    <Text style={styles.itemIndexText}>{index + 1}</Text>
                  </View>

                  <View style={styles.itemHeaderMain}>
                    <Text style={styles.itemType}>
                      {item.reimbursementType}
                    </Text>

                    {item.status ? (
                      <ItemStatus status={item.status} colors={colors} />
                    ) : null}
                  </View>

                  <Text style={styles.itemAmount}>₹{item.amount}</Text>
                </View>

                <View style={styles.itemDivider} />

                <Text style={styles.descriptionLabel}>Description</Text>

                <Text style={styles.description}>
                  {item.description?.trim() || "No description provided."}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {reimbursement.status === "Pending" && (
          <View style={styles.actionSection}>
            <Pressable
              style={styles.editButton}
              onPress={() =>
                router.push({
                  pathname: "/edit-reimbursement",
                  params: {
                    id: String(reimbursement.id),
                  },
                })
              }
            >
              <Ionicons
                name="create-outline"
                size={18}
                color={colors.primary}
              />

              <Text style={styles.editButtonText}>Edit Reimbursement</Text>
            </Pressable>

            <Pressable
              style={[
                styles.deleteButton,
                deleteMutation.isPending && styles.disabledButton,
              ]}
              onPress={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={colors.danger}
                />
              )}

              <Text style={styles.deleteButtonText}>
                {deleteMutation.isPending
                  ? "Deleting..."
                  : "Delete Reimbursement"}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusPill({
  status,
  colors,
}: {
  status: string;
  colors: {
    surfaceSecondary: string;
    warningBackground: string;
    successBackground: string;
    dangerBackground: string;
    textSecondary: string;
    warning: string;
    success: string;
    danger: string;
  };
}) {
  let backgroundColor = colors.surfaceSecondary;
  let textColor = colors.textSecondary;

  if (status === "Pending") {
    backgroundColor = colors.warningBackground;
    textColor = colors.warning;
  }

  if (status === "Approved" || status === "Paid") {
    backgroundColor = colors.successBackground;
    textColor = colors.success;
  }

  if (status === "Rejected") {
    backgroundColor = colors.dangerBackground;
    textColor = colors.danger;
  }

  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: "800",
          color: textColor,
        }}
      >
        {status}
      </Text>
    </View>
  );
}

function ItemStatus({
  status,
  colors,
}: {
  status: string;
  colors: {
    surfaceSecondary: string;
    successBackground: string;
    dangerBackground: string;
    textSecondary: string;
    success: string;
    danger: string;
  };
}) {
  let backgroundColor = colors.surfaceSecondary;
  let textColor = colors.textSecondary;

  if (status === "Approved" || status === "Paid") {
    backgroundColor = colors.successBackground;
    textColor = colors.success;
  }

  if (status === "Rejected") {
    backgroundColor = colors.dangerBackground;
    textColor = colors.danger;
  }

  return (
    <View
      style={{
        alignSelf: "flex-start",
        marginTop: 5,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: "700",
          color: textColor,
        }}
      >
        {status}
      </Text>
    </View>
  );
}

function formatDate(value: string) {
  if (!value) {
    return "—";
  }

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

function createStyles(colors: {
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
}) {
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

    summaryCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },

    summaryTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    receiptIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.primaryLight,
      alignItems: "center",
      justifyContent: "center",
    },

    requestTitle: {
      marginTop: 18,
      color: colors.textPrimary,
      fontSize: 22,
      fontWeight: "800",
    },

    requestDate: {
      marginTop: 5,
      color: colors.textSecondary,
      fontSize: 14,
    },

    summaryDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 20,
    },

    totalRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
    },

    totalLabel: {
      color: colors.textMuted,
      fontSize: 12,
      marginBottom: 5,
    },

    totalAmount: {
      color: colors.textPrimary,
      fontSize: 24,
      fontWeight: "800",
    },

    itemsCount: {
      alignItems: "flex-end",
    },

    itemsCountNumber: {
      color: colors.textPrimary,
      fontSize: 19,
      fontWeight: "800",
    },

    itemsCountLabel: {
      marginTop: 2,
      color: colors.textMuted,
      fontSize: 11,
    },

    section: {
      marginTop: 24,
    },

    sectionTitle: {
      color: colors.textPrimary,
      fontSize: 17,
      fontWeight: "800",
      marginBottom: 12,
    },

    itemsList: {
      gap: 12,
    },

    itemCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },

    itemHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
    },

    itemIndex: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: colors.surfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 11,
    },

    itemIndexText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: "800",
    },

    itemHeaderMain: {
      flex: 1,
      minWidth: 0,
      marginRight: 10,
    },

    itemType: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: "800",
    },

    itemAmount: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: "800",
    },

    itemDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 14,
    },

    descriptionLabel: {
      color: colors.textMuted,
      fontSize: 11,
      marginBottom: 5,
    },

    description: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
    },

    actionSection: {
      marginTop: 24,
    },

    editButton: {
      minHeight: 52,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      marginBottom: 10,
    },

    editButtonText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "700",
    },

    deleteButton: {
      minHeight: 52,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: colors.dangerBackground,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },

    deleteButtonText: {
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
      marginTop: 10,
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
