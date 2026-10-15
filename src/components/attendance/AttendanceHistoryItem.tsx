import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText as Text } from "../InterTypography";
import { useTheme } from "../../theme/ThemeProvider";

type AttendanceHistoryItemProps = {
  date: string;
  status?: string;
  checkIn: string;
  checkOut: string;
  breakIn?: string | null;
  breakOut?: string | null;
  workHours?: string;
  breakTime?: string;
  checkInLocation?: string | null;
  checkOutLocation?: string | null;
  onPress?: () => void;
};

export default function AttendanceHistoryItem({
  date,
  status = "PRESENT",
  checkIn,
  checkOut,
  breakIn = null,
  breakOut = null,
  workHours = "—",
  breakTime = "—",
  checkInLocation = null,
  checkOutLocation = null,
  onPress,
}: AttendanceHistoryItemProps) {
  const { colors } = useTheme();

  const [isExpanded, setIsExpanded] = useState(false);

  const styles = createStyles(colors);

  function handlePress() {
    setIsExpanded((current) => !current);
    onPress?.();
  }

  const isPresent = status === "PRESENT";

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {/* Header */}
      <View style={styles.dateRow}>
        <View style={styles.dateContent}>
          <Text style={styles.date}>{date}</Text>

          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: isPresent
                  ? colors.successBackground
                  : colors.surfaceSecondary,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: isPresent ? colors.success : colors.textSecondary,
                },
              ]}
            >
              {status}
            </Text>
          </View>
        </View>

        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.textMuted}
        />
      </View>

      {/* Basic times */}
      <View style={styles.times}>
        <View style={styles.timeBlock}>
          <Text style={styles.label}>MARK IN</Text>

          <Text style={styles.value}>{checkIn}</Text>
        </View>

        <View style={styles.arrowContainer}>
          <Ionicons name="arrow-forward" size={17} color={colors.textMuted} />
        </View>

        <View style={styles.timeBlock}>
          <Text style={styles.label}>MARK OUT</Text>

          <Text style={[styles.value, checkOut === "--:--" && styles.empty]}>
            {checkOut}
          </Text>
        </View>
      </View>

      {/* Expanded details */}
      {isExpanded && (
        <View style={styles.details}>
          <DetailRow
            label="WORKING HOURS"
            value={workHours}
            valueColor={colors.success}
            colors={colors}
          />

          <View style={styles.divider} />

          <LocationDetail
            icon="log-in-outline"
            label="MARK IN LOCATION"
            value={checkInLocation ?? "—"}
            colors={colors}
          />

          <LocationDetail
            icon="log-out-outline"
            label="MARK OUT LOCATION"
            value={checkOutLocation ?? "—"}
            colors={colors}
          />
        </View>
      )}
    </Pressable>
  );
}

type DetailRowProps = {
  label: string;
  value: string;
  valueColor?: string;
  colors: {
    textMuted: string;
    textPrimary: string;
    success: string;
    warning: string;
    border: string;
  };
};

function DetailRow({ label, value, valueColor, colors }: DetailRowProps) {
  return (
    <View style={detailStyles.row}>
      <Text style={[detailStyles.label, { color: colors.textMuted }]}>
        {label}
      </Text>

      <Text
        style={[
          detailStyles.value,
          {
            color: valueColor ?? colors.textPrimary,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

type LocationDetailProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: {
    surfaceSecondary: string;
    textMuted: string;
    textSecondary: string;
    primary: string;
  };
};

function LocationDetail({ icon, label, value, colors }: LocationDetailProps) {
  return (
    <View style={detailStyles.locationRow}>
      <View
        style={[
          detailStyles.locationIcon,
          {
            backgroundColor: colors.surfaceSecondary,
          },
        ]}
      >
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>

      <View style={detailStyles.locationContent}>
        <Text style={[detailStyles.label, { color: colors.textMuted }]}>
          {label}
        </Text>

        <Text
          style={[detailStyles.locationText, { color: colors.textSecondary }]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: {
    minHeight: 34,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  label: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  value: {
    fontSize: 13,
    fontWeight: "700",
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",

    marginBottom: 12,
  },

  locationIcon: {
    width: 32,
    height: 32,

    borderRadius: 10,

    alignItems: "center",
    justifyContent: "center",

    marginRight: 10,
  },

  locationContent: {
    flex: 1,
  },

  locationText: {
    marginTop: 3,

    fontSize: 12,
    lineHeight: 18,
  },
});

function createStyles(colors: {
  surface: string;
  border: string;
  textPrimary: string;
  textMuted: string;
  textSecondary: string;
  success: string;
  successBackground: string;
  warning: string;
  surfaceSecondary: string;
}) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,

      borderRadius: 18,

      borderWidth: 1,
      borderColor: colors.border,

      padding: 16,

      marginBottom: 10,
    },

    dateRow: {
      flexDirection: "row",

      alignItems: "center",
      justifyContent: "space-between",
    },

    dateContent: {
      flex: 1,

      flexDirection: "row",
      alignItems: "center",

      marginRight: 12,
    },

    date: {
      fontSize: 15,
      fontWeight: "800",

      color: colors.textPrimary,
    },

    statusPill: {
      marginLeft: 8,

      paddingHorizontal: 8,
      paddingVertical: 4,

      borderRadius: 10,
    },

    statusText: {
      fontSize: 9,
      fontWeight: "800",

      letterSpacing: 0.4,
    },

    times: {
      marginTop: 14,

      flexDirection: "row",
      alignItems: "flex-end",
    },

    timeBlock: {
      flex: 1,
    },

    label: {
      fontSize: 9,
      fontWeight: "700",

      color: colors.textMuted,

      letterSpacing: 0.5,
    },

    value: {
      marginTop: 4,

      fontSize: 14,
      fontWeight: "700",

      color: colors.textPrimary,
    },

    empty: {
      color: colors.textMuted,
    },

    arrowContainer: {
      marginHorizontal: 18,
      marginBottom: 2,
    },

    details: {
      marginTop: 16,

      paddingTop: 14,

      borderTopWidth: 1,
      borderTopColor: colors.border,
    },

    divider: {
      height: 1,

      marginVertical: 10,

      backgroundColor: colors.border,
    },

    pressed: {
      opacity: 0.78,

      transform: [{ scale: 0.99 }],
    },
  });
}
