import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { AppText as Text } from "../InterTypography";

import { useTheme } from "../../theme/ThemeProvider";
type AttendanceDateSelectorProps = {
  selectedDate: string | null;
  onDateChange: (date: string) => void;
};

export default function AttendanceDateSelector({
  selectedDate,
  onDateChange,
}: AttendanceDateSelectorProps) {
  const { colors } = useTheme();

  const [showPicker, setShowPicker] = useState(false);

  const styles = createStyles(colors);

  const selectedDateObject = selectedDate
    ? dateKeyToDate(selectedDate)
    : new Date();

  const displayText = selectedDate
    ? formatDisplayDate(selectedDate)
    : "Select date";

  const handleValueChange = (_event: unknown, date: Date) => {
    onDateChange(formatDateKey(date));

    if (Platform.OS === "android") {
      setShowPicker(false);
    }
  };

  const handleDismiss = () => {
    setShowPicker(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setShowPicker(true)}
        style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      >
        <Text style={[styles.text, selectedDate && styles.selectedText]}>
          {displayText}
        </Text>

        <Ionicons name="calendar-outline" size={21} color={colors.primary} />
      </Pressable>

      {Platform.OS === "android" && showPicker ? (
        <DateTimePicker
          value={selectedDateObject}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onValueChange={handleValueChange}
          onDismiss={handleDismiss}
        />
      ) : null}

      {Platform.OS === "ios" && (
        <Modal
          visible={showPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPicker(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Select date</Text>

              <DateTimePicker
                value={selectedDateObject}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onValueChange={handleValueChange}
                onDismiss={handleDismiss}
              />

              <Pressable
                onPress={() => setShowPicker(false)}
                style={({ pressed }) => [
                  styles.doneButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dateKeyToDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function formatDisplayDate(dateKey: string) {
  const date = dateKeyToDate(dateKey);

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function createStyles(colors: {
  surface: string;
  border: string;
  textMuted: string;
  textPrimary: string;
  primary: string;
  background: string;
}) {
  return StyleSheet.create({
    container: {
      minHeight: 56,

      paddingHorizontal: 16,

      borderRadius: 16,

      backgroundColor: colors.surface,

      borderWidth: 1,
      borderColor: colors.border,

      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    text: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textMuted,
    },

    selectedText: {
      color: colors.textPrimary,
    },

    pressed: {
      opacity: 0.75,
    },

    modalBackdrop: {
      flex: 1,

      alignItems: "center",
      justifyContent: "center",

      padding: 24,

      backgroundColor: "rgba(0, 0, 0, 0.45)",
    },

    modalCard: {
      width: "100%",

      borderRadius: 24,

      padding: 20,

      backgroundColor: colors.surface,
    },

    modalTitle: {
      marginBottom: 8,

      fontSize: 18,
      fontWeight: "800",

      color: colors.textPrimary,
    },

    doneButton: {
      marginTop: 8,

      minHeight: 48,

      borderRadius: 14,

      alignItems: "center",
      justifyContent: "center",

      backgroundColor: colors.primary,
    },

    doneButtonText: {
      fontSize: 15,
      fontWeight: "700",

      color: "#FFFFFF",
    },
  });
}
