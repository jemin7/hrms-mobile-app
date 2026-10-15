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
import { useCreateLeaveRequest } from "../hooks/useLeave";
import { useTheme } from "../theme/ThemeProvider";

type DateField = "from" | "to" | null;
type LeaveType = "Sick" | "Casual" | "Privileged" | "CompOff" | "MtL" | "PtL";

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
  white: string;
  warning: string;
  warningBackground: string;
};

const LEAVE_TYPES: LeaveType[] = [
  "Sick",
  "Casual",
  "Privileged",
  "CompOff",
  "MtL",
  "PtL",
];

function getLeaveTypeLabel(type: LeaveType) {
  switch (type) {
    case "Sick":
      return "Sick Leave";
    case "Casual":
      return "Casual Leave";
    case "Privileged":
      return "Privileged Leave";
    case "CompOff":
      return "Comp Off";
    case "MtL":
      return "Maternity Leave";
    case "PtL":
      return "Paternity Leave";
  }
}

function formatDate(date: Date | null) {
  if (!date) return "Select date";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function formatApiDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function countLeaveDays(fromDate: Date | null, toDate: Date | null) {
  if (!fromDate || !toDate || toDate < fromDate) return 0;
  const cursor = startOfDay(fromDate);
  const end = startOfDay(toDate);
  let count = 0;
  while (cursor <= end) {
    count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function buildDayStatuses(fromDate: Date, toDate: Date, leaveType: LeaveType) {
  const result: Array<{ date: string; status: LeaveType; dayType: "Full" }> =
    [];
  const cursor = startOfDay(fromDate);
  const end = startOfDay(toDate);

  while (cursor <= end) {
    result.push({
      date: formatApiDate(cursor),
      status: leaveType,
      dayType: "Full",
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

export default function NewLeaveRequestScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const createLeaveMutation = useCreateLeaveRequest();
  const styles = createStyles(colors);

  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [reason, setReason] = useState("");
  const [leaveType, setLeaveType] = useState<LeaveType | null>(null);
  const [showLeaveTypePicker, setShowLeaveTypePicker] = useState(false);
  const [activeDateField, setActiveDateField] = useState<DateField>(null);
  const [pickerDate, setPickerDate] = useState(new Date());

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/leave");
  };

  const isFormValid = Boolean(
    fromDate &&
    toDate &&
    leaveType &&
    reason.trim().length > 0 &&
    startOfDay(toDate) >= startOfDay(fromDate),
  );
  const leaveDays = countLeaveDays(fromDate, toDate);

  const openDatePicker = (field: "from" | "to") => {
    const initialDate =
      field === "from"
        ? (fromDate ?? new Date())
        : (toDate ?? fromDate ?? new Date());
    setPickerDate(initialDate);
    setActiveDateField(field);
  };

  const closeDatePicker = () => setActiveDateField(null);

  const handleDateValueChange = (_event: unknown, selectedDate: Date) => {
    setPickerDate(selectedDate);

    if (activeDateField === "from") {
      setFromDate(selectedDate);

      if (toDate && startOfDay(toDate) < startOfDay(selectedDate)) {
        setToDate(selectedDate);
      }
    } else if (activeDateField === "to") {
      setToDate(selectedDate);
    }

    if (Platform.OS === "android") {
      closeDatePicker();
    }
  };

  const handleDateDismiss = () => {
    closeDatePicker();
  };

  const handleSubmit = async () => {
    if (!fromDate || !toDate) {
      Alert.alert("Missing dates", "Please select both a start and end date.");
      return;
    }
    if (startOfDay(toDate) < startOfDay(fromDate)) {
      Alert.alert(
        "Invalid dates",
        "The end date cannot be earlier than the start date.",
      );
      return;
    }
    if (!leaveType) {
      Alert.alert("Missing leave type", "Please select a leave type.");
      return;
    }
    if (!reason.trim()) {
      Alert.alert("Missing reason", "Please enter a reason for your leave.");
      return;
    }

    const manageEmployeeID = user?.employee?.id ?? user?.id;
    if (
      user?.serviceProviderID == null ||
      user?.companyID == null ||
      user?.branchesID == null ||
      manageEmployeeID == null
    ) {
      Alert.alert(
        "Account information missing",
        "Your employee account is missing the information required to submit a leave request.",
      );
      return;
    }

    const dayStatuses = buildDayStatuses(fromDate, toDate, leaveType);

    try {
      await createLeaveMutation.mutateAsync({
        serviceProviderID: user.serviceProviderID,
        companyID: user.companyID,
        branchesID: user.branchesID,
        manageEmployeeID,
        appliedLeaveType: leaveType,
        fromDate: formatApiDate(fromDate),
        toDate: formatApiDate(toDate),
        purpose: reason.trim(),
        dayStatuses: JSON.stringify(dayStatuses),
        status: "Pending",
      });

      Alert.alert(
        "Request submitted",
        "Your leave request has been submitted successfully.",
        [{ text: "OK", onPress: handleBack }],
      );
    } catch (error) {
      Alert.alert(
        "Unable to submit",
        error instanceof Error
          ? error.message
          : "Something went wrong while submitting the leave request.",
      );
    }
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "left", "right", "bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
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
            <Text style={styles.headerTitle}>New Leave Request</Text>
            <Text style={styles.headerSubtitle}>
              Complete the details below
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <View style={styles.introCard}>
            <View style={styles.introIcon}>
              <Ionicons
                name="calendar-clear-outline"
                size={23}
                color={colors.primary}
              />
            </View>
            <View style={styles.introTextWrap}>
              <Text style={styles.introTitle}>Plan your time off</Text>
              <Text style={styles.introText}>
                Choose your dates and leave type, then tell us the reason for
                your request.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeadingRow}>
              <View style={styles.sectionNumber}>
                <Text style={styles.sectionNumberText}>1</Text>
              </View>
              <View style={styles.sectionHeadingText}>
                <Text style={styles.sectionTitle}>Leave dates</Text>
                <Text style={styles.sectionHint}>
                  Select the first and last day
                </Text>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>From date</Text>
              <Pressable
                onPress={() => openDatePicker("from")}
                style={({ pressed }) => [
                  styles.dateField,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Select from date"
              >
                <View style={styles.fieldLeadingIcon}>
                  <Ionicons
                    name="calendar-outline"
                    size={19}
                    color={colors.primary}
                  />
                </View>
                <Text
                  style={[styles.dateText, !fromDate && styles.placeholderText]}
                >
                  {formatDate(fromDate)}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={19}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>To date</Text>
              <Pressable
                onPress={() => openDatePicker("to")}
                style={({ pressed }) => [
                  styles.dateField,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Select to date"
              >
                <View style={styles.fieldLeadingIcon}>
                  <Ionicons
                    name="calendar-outline"
                    size={19}
                    color={colors.primary}
                  />
                </View>
                <Text
                  style={[styles.dateText, !toDate && styles.placeholderText]}
                >
                  {formatDate(toDate)}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={19}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>

            {fromDate &&
            toDate &&
            startOfDay(toDate) >= startOfDay(fromDate) ? (
              <View style={styles.durationCard}>
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles.durationText}>
                  {leaveDays} {leaveDays === 1 ? "day" : "days"} requested
                </Text>
                <Text style={styles.durationNote}>Full days</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeadingRow}>
              <View style={styles.sectionNumber}>
                <Text style={styles.sectionNumberText}>2</Text>
              </View>
              <View style={styles.sectionHeadingText}>
                <Text style={styles.sectionTitle}>Leave type</Text>
                <Text style={styles.sectionHint}>
                  Choose the category that applies
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => setShowLeaveTypePicker(true)}
              style={({ pressed }) => [
                styles.dateField,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Select leave type"
            >
              <View style={styles.fieldLeadingIcon}>
                <Ionicons
                  name="briefcase-outline"
                  size={19}
                  color={colors.primary}
                />
              </View>
              <Text
                style={[styles.dateText, !leaveType && styles.placeholderText]}
              >
                {leaveType ? getLeaveTypeLabel(leaveType) : "Select leave type"}
              </Text>
              <Ionicons
                name="chevron-down"
                size={19}
                color={colors.textMuted}
              />
            </Pressable>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeadingRow}>
              <View style={styles.sectionNumber}>
                <Text style={styles.sectionNumberText}>3</Text>
              </View>
              <View style={styles.sectionHeadingText}>
                <Text style={styles.sectionTitle}>Reason</Text>
                <Text style={styles.sectionHint}>
                  Provide a short explanation
                </Text>
              </View>
            </View>

            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Enter reason for leave..."
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
              style={styles.reasonInput}
              maxLength={500}
              accessibilityLabel="Reason for leave"
            />
            <Text style={styles.characterCount}>{reason.length}/500</Text>
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={!isFormValid || createLeaveMutation.isPending}
            style={({ pressed }) => [
              styles.submitButton,
              (!isFormValid || createLeaveMutation.isPending) &&
                styles.submitButtonDisabled,
              pressed &&
                isFormValid &&
                !createLeaveMutation.isPending &&
                styles.submitButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Submit leave request"
            accessibilityState={{
              disabled: !isFormValid || createLeaveMutation.isPending,
            }}
          >
            {createLeaveMutation.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Ionicons
                name="paper-plane-outline"
                size={19}
                color={isFormValid ? colors.white : colors.textMuted}
              />
            )}
            <Text
              style={[
                styles.submitButtonText,
                (!isFormValid || createLeaveMutation.isPending) &&
                  styles.submitButtonTextDisabled,
              ]}
            >
              {createLeaveMutation.isPending
                ? "Submitting request…"
                : "Submit request"}
            </Text>
          </Pressable>

          <Text style={styles.footerNote}>
            Your request will be submitted for review.
          </Text>
        </ScrollView>

        {showLeaveTypePicker ? (
          <Modal
            transparent
            animationType="slide"
            visible
            onRequestClose={() => setShowLeaveTypePicker(false)}
          >
            <View style={styles.modalOverlay}>
              <Pressable
                style={styles.modalBackdrop}
                onPress={() => setShowLeaveTypePicker(false)}
                accessibilityLabel="Close leave type picker"
              />
              <View style={styles.sheet}>
                <View style={styles.sheetHandle} />
                <View style={styles.sheetHeader}>
                  <View>
                    <Text style={styles.sheetTitle}>Select leave type</Text>
                    <Text style={styles.sheetSubtitle}>
                      Choose one category
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setShowLeaveTypePicker(false)}
                    style={styles.closeButton}
                    accessibilityRole="button"
                    accessibilityLabel="Close leave type picker"
                  >
                    <Ionicons
                      name="close"
                      size={22}
                      color={colors.textPrimary}
                    />
                  </Pressable>
                </View>
                {LEAVE_TYPES.map((type) => {
                  const selected = leaveType === type;
                  return (
                    <Pressable
                      key={type}
                      onPress={() => {
                        setLeaveType(type);
                        setShowLeaveTypePicker(false);
                      }}
                      style={({ pressed }) => [
                        styles.leaveTypeOption,
                        selected && styles.leaveTypeOptionSelected,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <View style={styles.optionIcon}>
                        <Ionicons
                          name="calendar-outline"
                          size={18}
                          color={
                            selected ? colors.primary : colors.textSecondary
                          }
                        />
                      </View>
                      <Text
                        style={[
                          styles.leaveTypeOptionText,
                          selected && styles.leaveTypeOptionTextSelected,
                        ]}
                      >
                        {getLeaveTypeLabel(type)}
                      </Text>
                      {selected ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={21}
                          color={colors.primary}
                        />
                      ) : (
                        <View style={styles.optionTrailing} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Modal>
        ) : null}

        {activeDateField && Platform.OS === "android" ? (
          <DateTimePicker
            value={pickerDate}
            mode="date"
            display="default"
            minimumDate={
              activeDateField === "to" ? (fromDate ?? new Date()) : undefined
            }
            onValueChange={handleDateValueChange}
onDismiss={handleDateDismiss}
          />
        ) : null}

        {activeDateField && Platform.OS === "ios" ? (
          <Modal
            transparent
            animationType="slide"
            visible
            onRequestClose={closeDatePicker}
          >
            <View style={styles.modalOverlay}>
              <Pressable
                style={styles.modalBackdrop}
                onPress={closeDatePicker}
                accessibilityLabel="Close date picker"
              />
              <View style={styles.sheet}>
                <View style={styles.sheetHandle} />
                <View style={styles.sheetHeader}>
                  <View>
                    <Text style={styles.sheetTitle}>
                      {activeDateField === "from"
                        ? "Select from date"
                        : "Select to date"}
                    </Text>
                    <Text style={styles.sheetSubtitle}>
                      Choose a calendar date
                    </Text>
                  </View>
                  <Pressable
                    onPress={closeDatePicker}
                    style={styles.closeButton}
                    accessibilityRole="button"
                    accessibilityLabel="Close date picker"
                  >
                    <Ionicons
                      name="close"
                      size={22}
                      color={colors.textPrimary}
                    />
                  </Pressable>
                </View>
                <DateTimePicker
                  value={pickerDate}
                  mode="date"
                  display="spinner"
                  minimumDate={
                    activeDateField === "to"
                      ? (fromDate ?? new Date())
                      : undefined
                  }
                  onValueChange={handleDateValueChange}
onDismiss={handleDateDismiss}
                  style={styles.iosDatePicker}
                />
                <Pressable
                  onPress={closeDatePicker}
                  style={styles.doneButton}
                  accessibilityRole="button"
                  accessibilityLabel="Done selecting date"
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: LeaveColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 12,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 12,
    },
    headerText: { flex: 1 },
    headerTitle: {
      fontSize: 22,
      lineHeight: 28,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    headerSubtitle: { marginTop: 2, fontSize: 12, color: colors.textSecondary },
    content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
    introCard: {
      flexDirection: "row",
      alignItems: "center",
      padding: 15,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    introIcon: {
      width: 46,
      height: 46,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primaryLight,
      marginRight: 12,
    },
    introTextWrap: { flex: 1 },
    introTitle: { fontSize: 15, fontWeight: "800", color: colors.textPrimary },
    introText: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    section: { marginTop: 26 },
    sectionHeadingRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 14,
    },
    sectionNumber: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primaryLight,
      marginRight: 11,
    },
    sectionNumberText: {
      color: colors.primary,
      fontWeight: "800",
      fontSize: 14,
    },
    sectionHeadingText: { flex: 1 },
    sectionTitle: {
      fontSize: 17,
      lineHeight: 22,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    sectionHint: {
      marginTop: 2,
      fontSize: 12,
      lineHeight: 17,
      color: colors.textSecondary,
    },
    fieldGroup: { marginBottom: 14 },
    fieldLabel: {
      marginBottom: 7,
      fontSize: 13,
      fontWeight: "700",
      color: colors.textSecondary,
    },
    dateField: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 13,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    fieldLeadingIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primaryLight,
      marginRight: 11,
    },
    dateText: {
      flex: 1,
      fontSize: 15,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    placeholderText: { color: colors.textMuted, fontWeight: "500" },
    durationCard: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 1,
      paddingVertical: 11,
      paddingHorizontal: 13,
      borderRadius: 13,
      backgroundColor: colors.primaryLight,
      gap: 8,
    },
    durationText: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.primary,
      flex: 1,
    },
    durationNote: { fontSize: 11, fontWeight: "700", color: colors.primary },
    reasonInput: {
      minHeight: 140,
      paddingHorizontal: 15,
      paddingTop: 14,
      paddingBottom: 14,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: 15,
      lineHeight: 22,
      color: colors.textPrimary,
    },
    characterCount: {
      marginTop: 7,
      textAlign: "right",
      fontSize: 12,
      color: colors.textMuted,
    },
    submitButton: {
      minHeight: 54,
      marginTop: 28,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 9,
      borderRadius: 16,
      backgroundColor: colors.primary,
    },
    submitButtonDisabled: {
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    submitButtonPressed: { opacity: 0.82 },
    submitButtonText: { fontSize: 15, fontWeight: "800", color: colors.white },
    submitButtonTextDisabled: { color: colors.textMuted },
    footerNote: {
      marginTop: 12,
      fontSize: 12,
      textAlign: "center",
      lineHeight: 18,
      color: colors.textMuted,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.38)",
    },
    modalBackdrop: { ...StyleSheet.absoluteFill },
    sheet: {
      paddingTop: 10,
      paddingHorizontal: 20,
      paddingBottom: 28,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      backgroundColor: colors.surface,
    },
    sheetHandle: {
      alignSelf: "center",
      width: 42,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.border,
      marginBottom: 18,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 13,
    },
    sheetTitle: { fontSize: 18, fontWeight: "800", color: colors.textPrimary },
    sheetSubtitle: { marginTop: 3, fontSize: 12, color: colors.textSecondary },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
    },
    leaveTypeOption: {
      minHeight: 58,
      paddingHorizontal: 12,
      borderRadius: 15,
      marginTop: 6,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surfaceSecondary,
    },
    leaveTypeOptionSelected: {
      backgroundColor: colors.primaryLight,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    optionIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 11,
      backgroundColor: colors.surface,
    },
    leaveTypeOptionText: {
      flex: 1,
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    leaveTypeOptionTextSelected: { color: colors.primary, fontWeight: "800" },
    optionTrailing: { width: 21 },
    iosDatePicker: { alignSelf: "center" },
    doneButton: {
      minHeight: 52,
      marginTop: 8,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
    },
    doneButtonText: { fontSize: 16, fontWeight: "800", color: colors.white },
    pressed: { opacity: 0.72 },
  });
}
