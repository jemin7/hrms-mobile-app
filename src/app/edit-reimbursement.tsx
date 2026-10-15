import DateTimePicker from "@react-native-community/datetimepicker";

import { Ionicons } from "@expo/vector-icons";

import { useLocalSearchParams, useRouter } from "expo-router";

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import {
  AppText as Text,
  AppTextInput as TextInput,
} from "../components/InterTypography";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  useReimbursement,
  useUpdateReimbursement,
} from "../hooks/useReimbursement";

import { useTheme } from "../theme/ThemeProvider";

type ReimbursementItemForm = {
  localId: string;

  reimbursementType: string;

  amount: string;

  description: string;
};

const REIMBURSEMENT_TYPES = [
  "Travel",

  "Food",

  "Accommodation",

  "Medical",

  "Communication",

  "Other",
];

function formatDateForDisplay(date: Date | null) {
  if (!date) {
    return "Select date";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",

    month: "short",

    year: "numeric",
  });
}

function formatDateForApi(date: Date) {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDate(value: string) {
  if (!value) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

  if (match) {
    const year = Number(match[1]);

    const month = Number(match[2]) - 1;

    const day = Number(match[3]);

    const date = new Date();

    date.setFullYear(year, month, day);

    date.setHours(0, 0, 0, 0);

    return date;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  parsed.setHours(0, 0, 0, 0);

  return parsed;
}

function startOfToday() {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  return today;
}

function createLocalId() {
  return `${Date.now()}-${Math.random()}`;
}

export default function EditReimbursementScreen() {
  const router = useRouter();

  const { colors } = useTheme();

  const styles = createStyles(colors);

  const params = useLocalSearchParams<{ id?: string }>();

  const reimbursementId = Number(params.id);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (Number.isFinite(reimbursementId) && reimbursementId > 0) {
      router.replace({
        pathname: "/reimbursement-details",

        params: { id: String(reimbursementId) },
      });
    } else {
      router.replace("/(tabs)/reimbursement");
    }
  };

  const {
    data: reimbursement,

    isLoading,

    isError,

    error,

    refetch,
  } = useReimbursement(
    Number.isFinite(reimbursementId) ? reimbursementId : undefined,
  );

  const updateMutation = useUpdateReimbursement();

  const [date, setDate] = useState<Date | null>(null);

  const [items, setItems] = useState<ReimbursementItemForm[]>([]);

  const [showDatePicker, setShowDatePicker] = useState(false);

  const [showTypePicker, setShowTypePicker] = useState<string | null>(null);

  useEffect(() => {
    if (!reimbursement) {
      return;
    }

    setDate(parseDate(reimbursement.date));

    setItems(
      reimbursement.items.map((item) => ({
        localId: createLocalId(),

        reimbursementType: item.reimbursementType ?? "",

        amount: item.amount ?? "",

        description: item.description ?? "",
      })),
    );
  }, [reimbursement]);

  const updateItem = (
    localId: string,

    changes: Partial<ReimbursementItemForm>,
  ) => {
    setItems((current) =>
      current.map((item) =>
        item.localId === localId ? { ...item, ...changes } : item,
      ),
    );
  };

  const removeItem = (localId: string) => {
    setItems((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter((item) => item.localId !== localId);
    });
  };

  const addItem = () => {
    setItems((current) => [
      ...current,

      {
        localId: createLocalId(),

        reimbursementType: "",

        amount: "",

        description: "",
      },
    ]);
  };

  const handleSubmit = async () => {
    if (!reimbursement) {
      return;
    }

    if (reimbursement.status !== "Pending") {
      Alert.alert(
        "Editing unavailable",

        "Only pending reimbursement requests can be edited.",
      );

      return;
    }

    if (!date) {
      Alert.alert("Date required", "Please select the reimbursement date.");

      return;
    }

    if (date > startOfToday()) {
      Alert.alert(
        "Invalid date",

        "Reimbursement date cannot be in the future.",
      );

      return;
    }

    if (items.length === 0) {
      Alert.alert("No expenses", "Please add at least one reimbursement item.");

      return;
    }

    const invalidItem = items.find(
      (item) =>
        !item.reimbursementType.trim() ||
        !item.amount.trim() ||
        !item.description.trim(),
    );

    if (invalidItem) {
      Alert.alert(
        "Incomplete item",

        "Please enter the type, amount, and description for every reimbursement item.",
      );

      return;
    }

    const normalizedItems = items.map((item) => ({
      reimbursementType: item.reimbursementType.trim(),

      amount: Number(item.amount).toFixed(2),

      description: item.description.trim(),
    }));

    const hasInvalidAmount = normalizedItems.some(
      (item) =>
        !Number.isFinite(Number(item.amount)) || Number(item.amount) <= 0,
    );

    if (hasInvalidAmount) {
      Alert.alert(
        "Invalid amount",

        "Each reimbursement amount must be greater than zero.",
      );

      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: reimbursement.id,

        data: {
          date: formatDateForApi(date),

          taskProjectID: reimbursement.taskProjectID ?? null,

          items: normalizedItems,
        },
      });

      Alert.alert(
        "Updated",

        "Your reimbursement request has been updated successfully.",

        [
          {
            text: "Done",

            onPress: () =>
              router.replace({
                pathname: "/reimbursement-details",

                params: {
                  id: String(reimbursement.id),
                },
              }),
          },
        ],
      );
    } catch (updateError) {
      Alert.alert(
        "Unable to update reimbursement",

        updateError instanceof Error
          ? updateError.message
          : "Something went wrong while updating the request.",
      );
    }
  };

  if (!params.id || !Number.isFinite(reimbursementId)) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Invalid reimbursement request</Text>

        <Pressable style={styles.primaryButton} onPress={handleBack}>
          <Text style={styles.primaryButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
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
      </View>
    );
  }

  if (isError || !reimbursement) {
    return (
      <View style={styles.center}>
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
      </View>
    );
  }

  if (reimbursement.status !== "Pending") {
    return (
      <View style={styles.center}>
        <Ionicons
          name="lock-closed-outline"
          size={34}
          color={colors.textMuted}
        />

        <Text style={styles.errorTitle}>Editing unavailable</Text>

        <Text style={styles.errorMessage}>
          Only pending reimbursement requests can be edited.
        </Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() =>
            router.replace({
              pathname: "/reimbursement-details",

              params: {
                id: String(reimbursement.id),
              },
            })
          }
        >
          <Text style={styles.primaryButtonText}>View Details</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={handleBack}
            hitSlop={10}
          >
            <Text style={styles.backText}>‹</Text>
          </Pressable>

          <Text style={styles.headerTitle}>Edit Reimbursement</Text>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.requestBanner}>
            <Ionicons name="create-outline" size={20} color={colors.primary} />

            <View style={styles.requestBannerText}>
              <Text style={styles.requestBannerTitle}>
                Reimbursement #{reimbursement.id}
              </Text>

              <Text style={styles.requestBannerSubtitle}>Pending request</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Date</Text>

            <Pressable
              style={styles.dateField}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons
                name="calendar-outline"
                size={19}
                color={colors.textSecondary}
              />

              <Text
                style={[styles.dateFieldText, !date && styles.placeholderText]}
              >
                {formatDateForDisplay(date)}
              </Text>

              <Ionicons
                name="chevron-down"
                size={18}
                color={colors.textMuted}
              />
            </Pressable>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Expenses</Text>

              <Text style={styles.sectionCount}>
                {items.length} {items.length === 1 ? "item" : "items"}
              </Text>
            </View>

            <View style={styles.itemsList}>
              {items.map((item, index) => (
                <View key={item.localId} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemTitle}>Expense {index + 1}</Text>

                    {items.length > 1 && (
                      <Pressable
                        onPress={() => removeItem(item.localId)}
                        hitSlop={8}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={19}
                          color={colors.danger}
                        />
                      </Pressable>
                    )}
                  </View>

                  <Text style={styles.label}>Type</Text>

                  <Pressable
                    style={styles.inputContainer}
                    onPress={() => setShowTypePicker(item.localId)}
                  >
                    <Text
                      style={[
                        styles.inputText,

                        !item.reimbursementType && styles.placeholderText,
                      ]}
                    >
                      {item.reimbursementType || "Select expense type"}
                    </Text>

                    <Ionicons
                      name="chevron-down"
                      size={18}
                      color={colors.textMuted}
                    />
                  </Pressable>

                  <Text style={styles.label}>Amount</Text>

                  <View style={styles.amountInputContainer}>
                    <Text style={styles.currency}>₹</Text>

                    <TextInput
                      value={item.amount}
                      onChangeText={(value) =>
                        updateItem(item.localId, {
                          amount: value.replace(/[^0-9.]/g, ""),
                        })
                      }
                      placeholder="0.00"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                      style={styles.amountInput}
                    />
                  </View>

                  <Text style={styles.label}>Description</Text>

                  <TextInput
                    value={item.description}
                    onChangeText={(value) =>
                      updateItem(item.localId, {
                        description: value,
                      })
                    }
                    placeholder="Describe this expense"
                    placeholderTextColor={colors.textMuted}
                    multiline
                    maxLength={500}
                    textAlignVertical="top"
                    style={styles.descriptionInput}
                  />
                </View>
              ))}
            </View>

            <Pressable style={styles.addItemButton} onPress={addItem}>
              <Ionicons
                name="add-circle-outline"
                size={20}
                color={colors.primary}
              />

              <Text style={styles.addItemText}>Add another expense</Text>
            </Pressable>
          </View>

          <Pressable
            style={[
              styles.submitButton,

              updateMutation.isPending && styles.disabledButton,
            ]}
            onPress={handleSubmit}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <>
                <ActivityIndicator size="small" color={colors.white} />

                <Text style={styles.submitButtonText}>Saving...</Text>
              </>
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color={colors.white} />

                <Text style={styles.submitButtonText}>Save Changes</Text>
              </>
            )}
          </Pressable>

          <View style={styles.bottomSpace} />
        </ScrollView>

        {showDatePicker && Platform.OS === "android" && (
          <DateTimePicker
            value={date ?? startOfToday()}
            mode="date"
            maximumDate={startOfToday()}
            onValueChange={(_, selectedDate) => {
              setShowDatePicker(false);
              setDate(selectedDate);
            }}
            onDismiss={() => setShowDatePicker(false)}
          />
        )}

        <Modal
          visible={showDatePicker && Platform.OS === "ios"}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select date</Text>

                <Pressable onPress={() => setShowDatePicker(false)} hitSlop={8}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </Pressable>
              </View>

              <DateTimePicker
                value={date ?? startOfToday()}
                mode="date"
                maximumDate={startOfToday()}
                display="spinner"
                onValueChange={(_, selectedDate) => {
                  setDate(selectedDate);
                }}
                onDismiss={() => setShowDatePicker(false)}
              />

              <Pressable
                style={styles.modalDoneButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.modalDoneText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showTypePicker !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTypePicker(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Expense Type</Text>

                <Pressable onPress={() => setShowTypePicker(null)} hitSlop={8}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </Pressable>
              </View>

              <View style={styles.typeList}>
                {REIMBURSEMENT_TYPES.map((type) => (
                  <Pressable
                    key={type}
                    style={styles.typeOption}
                    onPress={() => {
                      if (showTypePicker) {
                        updateItem(showTypePicker, {
                          reimbursementType: type,
                        });
                      }

                      setShowTypePicker(null);
                    }}
                  >
                    <Text style={styles.typeOptionText}>{type}</Text>

                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.textMuted}
                    />
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
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

  primaryLight: string;

  danger: string;

  white: string;
}) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,

      backgroundColor: colors.background,
    },

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

      backgroundColor: colors.surface,

      borderBottomWidth: 1,

      borderBottomColor: colors.border,
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

    requestBanner: {
      flexDirection: "row",

      alignItems: "center",

      padding: 15,

      borderRadius: 16,

      backgroundColor: colors.primaryLight,

      borderWidth: 1,

      borderColor: colors.border,
    },

    requestBannerText: {
      flex: 1,

      marginLeft: 11,
    },

    requestBannerTitle: {
      color: colors.textPrimary,

      fontSize: 14,

      fontWeight: "800",
    },

    requestBannerSubtitle: {
      marginTop: 3,

      color: colors.textSecondary,

      fontSize: 12,
    },

    section: {
      marginTop: 24,
    },

    sectionHeader: {
      flexDirection: "row",

      alignItems: "center",

      justifyContent: "space-between",

      marginBottom: 12,
    },

    sectionTitle: {
      fontSize: 17,

      fontWeight: "800",

      color: colors.textPrimary,
    },

    sectionCount: {
      fontSize: 12,

      color: colors.textMuted,
    },

    label: {
      marginBottom: 7,

      fontSize: 12,

      fontWeight: "700",

      color: colors.textSecondary,
    },

    dateField: {
      minHeight: 52,

      paddingHorizontal: 15,

      borderRadius: 14,

      borderWidth: 1,

      borderColor: colors.border,

      backgroundColor: colors.surface,

      flexDirection: "row",

      alignItems: "center",

      gap: 10,
    },

    dateFieldText: {
      flex: 1,

      fontSize: 14,

      color: colors.textPrimary,

      fontWeight: "600",
    },

    placeholderText: {
      color: colors.textMuted,

      fontWeight: "400",
    },

    itemsList: {
      gap: 12,
    },

    itemCard: {
      padding: 16,

      borderRadius: 18,

      backgroundColor: colors.surface,

      borderWidth: 1,

      borderColor: colors.border,
    },

    itemHeader: {
      flexDirection: "row",

      alignItems: "center",

      justifyContent: "space-between",

      marginBottom: 16,
    },

    itemTitle: {
      color: colors.textPrimary,

      fontSize: 15,

      fontWeight: "800",
    },

    inputContainer: {
      minHeight: 50,

      paddingHorizontal: 14,

      marginBottom: 14,

      borderRadius: 13,

      borderWidth: 1,

      borderColor: colors.border,

      backgroundColor: colors.surfaceSecondary,

      flexDirection: "row",

      alignItems: "center",
    },

    inputText: {
      flex: 1,

      color: colors.textPrimary,

      fontSize: 14,
    },

    amountInputContainer: {
      height: 50,

      paddingHorizontal: 14,

      marginBottom: 14,

      borderRadius: 13,

      borderWidth: 1,

      borderColor: colors.border,

      backgroundColor: colors.surfaceSecondary,

      flexDirection: "row",

      alignItems: "center",
    },

    currency: {
      marginRight: 8,

      color: colors.textSecondary,

      fontSize: 16,

      fontWeight: "700",
    },

    amountInput: {
      flex: 1,

      color: colors.textPrimary,

      fontSize: 14,

      paddingVertical: 0,
    },

    descriptionInput: {
      minHeight: 100,

      paddingHorizontal: 14,

      paddingTop: 13,

      paddingBottom: 13,

      borderRadius: 13,

      borderWidth: 1,

      borderColor: colors.border,

      backgroundColor: colors.surfaceSecondary,

      color: colors.textPrimary,

      fontSize: 14,

      lineHeight: 20,
    },

    addItemButton: {
      minHeight: 50,

      marginTop: 12,

      borderRadius: 14,

      borderWidth: 1,

      borderColor: colors.primary,

      borderStyle: "dashed",

      alignItems: "center",

      justifyContent: "center",

      flexDirection: "row",

      gap: 8,
    },

    addItemText: {
      color: colors.primary,

      fontSize: 14,

      fontWeight: "700",
    },

    submitButton: {
      minHeight: 54,

      marginTop: 28,

      borderRadius: 16,

      backgroundColor: colors.primary,

      alignItems: "center",

      justifyContent: "center",

      flexDirection: "row",

      gap: 9,
    },

    submitButtonText: {
      color: colors.white,

      fontSize: 14,

      fontWeight: "800",
    },

    disabledButton: {
      opacity: 0.55,
    },

    bottomSpace: {
      height: 30,
    },

    modalOverlay: {
      flex: 1,

      justifyContent: "flex-end",

      backgroundColor: "rgba(0,0,0,0.35)",
    },

    modalCard: {
      backgroundColor: colors.surface,

      borderTopLeftRadius: 24,

      borderTopRightRadius: 24,

      padding: 20,

      paddingBottom: 30,
    },

    modalHeader: {
      flexDirection: "row",

      alignItems: "center",

      justifyContent: "space-between",

      marginBottom: 16,
    },

    modalTitle: {
      color: colors.textPrimary,

      fontSize: 18,

      fontWeight: "800",
    },

    modalDoneButton: {
      marginTop: 12,

      height: 48,

      borderRadius: 13,

      backgroundColor: colors.primary,

      alignItems: "center",

      justifyContent: "center",
    },

    modalDoneText: {
      color: colors.white,

      fontSize: 14,

      fontWeight: "800",
    },

    typeList: {
      gap: 8,
    },

    typeOption: {
      minHeight: 50,

      paddingHorizontal: 14,

      borderRadius: 13,

      backgroundColor: colors.surfaceSecondary,

      flexDirection: "row",

      alignItems: "center",

      justifyContent: "space-between",
    },

    typeOptionText: {
      color: colors.textPrimary,

      fontSize: 14,

      fontWeight: "600",
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
