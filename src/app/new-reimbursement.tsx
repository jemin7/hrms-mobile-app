import DateTimePicker from "@react-native-community/datetimepicker";

import { Ionicons } from "@expo/vector-icons";

import { useRouter } from "expo-router";

import { useState } from "react";

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

import { useAuth } from "../auth/AuthProvider";

import { useCreateReimbursement } from "../hooks/useReimbursement";

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

function startOfToday() {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  return today;
}

function createItem(): ReimbursementItemForm {
  return {
    localId: `${Date.now()}-${Math.random()}`,
    reimbursementType: "",
    amount: "",
    description: "",
  };
}

function sanitizeAmount(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const decimalIndex = cleaned.indexOf(".");

  if (decimalIndex === -1) {
    return cleaned;
  }

  const whole = cleaned.slice(0, decimalIndex) || "0";
  const fraction = cleaned
    .slice(decimalIndex + 1)
    .replace(/\./g, "")
    .slice(0, 2);

  return `${whole}.${fraction}`;
}

export default function NewReimbursementScreen() {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/reimbursement");
    }
  };

  const { colors } = useTheme();

  const { user } = useAuth();

  const styles = createStyles(colors);

  const createMutation = useCreateReimbursement();

  const [date, setDate] = useState<Date | null>(null);

  const [items, setItems] = useState<ReimbursementItemForm[]>([createItem()]);

  const [showDatePicker, setShowDatePicker] = useState(false);

  const [showTypePicker, setShowTypePicker] = useState<string | null>(null);

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

  const totalAmount = items.reduce((sum, item) => {
    const amount = Number(item.amount);
    return Number.isFinite(amount) && amount > 0 ? sum + amount : sum;
  }, 0);

  const formattedTotal = totalAmount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const handleSubmit = async () => {
    const employeeId = user?.employee?.id ?? user?.id;

    const serviceProviderID = user?.serviceProviderID;

    const companyID = user?.companyID;

    const branchesID = user?.branchesID;

    if (
      typeof employeeId !== "number" ||
      typeof serviceProviderID !== "number" ||
      typeof companyID !== "number" ||
      typeof branchesID !== "number"
    ) {
      Alert.alert(
        "Unable to create reimbursement",

        "Employee or company information is missing from your account.",
      );

      return;
    }

    if (!date) {
      Alert.alert("Date required", "Please select the reimbursement date.");

      return;
    }

    const today = startOfToday();

    if (date > today) {
      Alert.alert(
        "Invalid date",

        "Reimbursement date cannot be in the future.",
      );

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
      await createMutation.mutateAsync({
        serviceProviderID,

        companyID,

        branchesID,

        manageEmployeeID: employeeId,

        date: formatDateForApi(date),

        status: "Pending",

        items: normalizedItems,
      });

      Alert.alert(
        "Reimbursement submitted",

        "Your reimbursement request has been submitted successfully.",

        [
          {
            text: "Done",

            onPress: handleBack,
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        "Unable to submit reimbursement",

        error instanceof Error
          ? error.message
          : "Something went wrong while submitting your request.",
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={handleBack}
            hitSlop={10}
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>

          <Text style={styles.headerTitle}>New Reimbursement</Text>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.introTitle}>Submit your expenses</Text>

          <Text style={styles.introText}>
            Add the reimbursement date and each expense you want to submit.
          </Text>

          <View style={styles.section}>
            <Text style={styles.label}>Date</Text>

            <Pressable
              style={styles.dateField}
              onPress={() => setShowDatePicker(true)}
              accessibilityRole="button"
              accessibilityLabel="Choose reimbursement date"
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
                        accessibilityRole="button"
                        accessibilityLabel={`Remove expense ${index + 1}`}
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
                    accessibilityRole="button"
                    accessibilityLabel={`Select expense type for expense ${index + 1}`}
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
                          amount: sanitizeAmount(value),
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
            <View style={styles.totalCard}>
              <View style={styles.totalInfo}>
                <Text style={styles.totalLabel}>Estimated claim total</Text>
                <Text style={styles.totalCaption}>
                  Based on the expenses above
                </Text>
              </View>
              <Text style={styles.totalValue}>₹{formattedTotal}</Text>
            </View>

            <Pressable
              style={styles.addItemButton}
              onPress={() => setItems((current) => [...current, createItem()])}
            >
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

              createMutation.isPending && styles.disabledButton,
            ]}
            onPress={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <ActivityIndicator size="small" color={colors.white} />

                <Text style={styles.submitButtonText}>Submitting...</Text>
              </>
            ) : (
              <>
                <Ionicons name="send-outline" size={18} color={colors.white} />

                <Text style={styles.submitButtonText}>
                  Submit Reimbursement
                </Text>
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

    introTitle: {
      fontSize: 23,

      fontWeight: "800",

      color: colors.textPrimary,
    },

    introText: {
      marginTop: 6,

      fontSize: 14,

      lineHeight: 21,

      color: colors.textSecondary,
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

    totalCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginTop: 18,
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderRadius: 16,
      backgroundColor: colors.primaryLight,
      borderWidth: 1,
      borderColor: colors.border,
    },

    totalInfo: {
      flex: 1,
    },

    totalLabel: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.textPrimary,
    },

    totalCaption: {
      marginTop: 4,
      fontSize: 11,
      lineHeight: 16,
      color: colors.textSecondary,
    },

    totalValue: {
      fontSize: 21,
      fontWeight: "900",
      color: colors.primary,
      fontVariant: ["tabular-nums"],
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
  });
}
