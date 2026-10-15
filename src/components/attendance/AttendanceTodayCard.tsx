import { StyleSheet, View } from "react-native";
import { AppText as Text } from "../InterTypography";
import { Ionicons } from "@expo/vector-icons";

import { useAttendanceToday } from "../../hooks/useAttendance";
import { useTheme } from "../../theme/ThemeProvider";

export default function AttendanceTodayCard() {
  const { colors } = useTheme();

  const { data: attendance, isLoading, isError } = useAttendanceToday();

  const styles = createStyles(colors);

  const isCheckedIn = attendance?.isCheckedIn ?? false;
  const isCheckedOut = attendance?.isCheckedOut ?? false;
  const isAbsent = attendance?.isAbsentToday ?? false;

  const statusLabel = isAbsent
    ? "ABSENT"
    : isCheckedOut
      ? "CHECKED OUT"
      : isCheckedIn
        ? "CHECKED IN"
        : "NOT MARKED";

  const statusColor = isAbsent ? colors.warning : colors.success;

  const date = attendance?.date ? formatAttendanceDate(attendance.date) : "—";

  const checkInTime = formatAttendanceTime(attendance?.checkIn?.time);

  const checkOutTime = formatAttendanceTime(attendance?.checkOut?.time);

  const breakInTime = formatAttendanceTime(attendance?.breakIn?.time);

  const breakOutTime = formatAttendanceTime(attendance?.breakOut?.time);

  const workHours = attendance?.workHours ?? "—";

  const breakTime = attendance?.breakTime ?? "—";

  const checkInLocation = attendance?.checkInLocation ?? "—";

  const checkOutLocation = attendance?.checkOutLocation ?? "—";

  const checkInCoordinates =
    attendance?.checkIn?.latitude != null &&
    attendance?.checkIn?.longitude != null
      ? `${attendance.checkIn.latitude.toFixed(5)}, ${attendance.checkIn.longitude.toFixed(5)}`
      : "";

  const checkOutCoordinates =
    attendance?.checkOut?.latitude != null &&
    attendance?.checkOut?.longitude != null
      ? `${attendance.checkOut.latitude.toFixed(5)}, ${attendance.checkOut.longitude.toFixed(5)}`
      : "";

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerContent}>
          <Text style={styles.cardTitle}>TODAY'S ATTENDANCE</Text>

          <Text style={styles.date}>{isLoading ? "Loading..." : date}</Text>
        </View>

        {!isError && (
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: isAbsent
                  ? colors.warningBackground
                  : colors.primaryLight,
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: statusColor,
                },
              ]}
            />

            <Text
              style={[
                styles.statusText,
                {
                  color: statusColor,
                },
              ]}
            >
              {statusLabel}
            </Text>
          </View>
        )}
      </View>

      {/* Attendance metrics */}
      <View style={styles.metricsGrid}>
        <AttendanceMetric
          label="MARK IN"
          value={checkInTime}
          colors={colors}
          isFirstRow
          isFirstColumn
        />

        <AttendanceMetric
          label="MARK OUT"
          value={checkOutTime}
          colors={colors}
          isFirstRow
        />

        <AttendanceMetric
          label="BREAK IN"
          value={breakInTime}
          colors={colors}
          isFirstColumn
        />

        <AttendanceMetric
          label="BREAK OUT"
          value={breakOutTime}
          colors={colors}
        />

        <AttendanceMetric
          label="WORKING HOURS"
          value={workHours}
          colors={colors}
          isFirstColumn
          valueColor={colors.success}
        />

        <AttendanceMetric
          label="BREAK TIME"
          value={breakTime}
          colors={colors}
          valueColor={colors.warning}
        />
      </View>

      {/* Locations */}
      <View style={styles.locationSection}>
        <LocationRow
          icon="log-in-outline"
          title="MARK IN LOCATION"
          location={checkInLocation}
          coordinates={checkInCoordinates}
          colors={colors}
        />

        <View style={styles.locationDivider} />

        <LocationRow
          icon="log-out-outline"
          title="MARK OUT LOCATION"
          location={checkOutLocation}
          coordinates={checkOutCoordinates}
          colors={colors}
        />
      </View>

      {isError && (
        <Text style={styles.errorText}>Unable to load today's attendance.</Text>
      )}
    </View>
  );
}

function formatAttendanceDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Attendance timestamps from the backend represent
 * the server's attendance wall-clock time.
 *
 * We intentionally do not convert them through the
 * device timezone here.
 */
function formatAttendanceTime(value?: string | null) {
  if (!value) {
    return "--:--";
  }

  const match = value.match(/T(\d{2}):(\d{2})/);

  if (!match) {
    return value;
  }

  const hours = Number(match[1]);
  const minutes = match[2];

  const period = hours >= 12 ? "PM" : "AM";

  const displayHour = hours % 12 === 0 ? 12 : hours % 12;

  return `${displayHour}:${minutes} ${period}`;
}

type AttendanceMetricProps = {
  label: string;
  value: string;
  colors: {
    surface: string;
    border: string;
    textPrimary: string;
    textMuted: string;
    success: string;
    warning: string;
  };
  valueColor?: string;
  isFirstRow?: boolean;
  isFirstColumn?: boolean;
};

function AttendanceMetric({
  label,
  value,
  colors,
  valueColor,
  isFirstRow = false,
  isFirstColumn = false,
}: AttendanceMetricProps) {
  const styles = createMetricStyles(colors);

  return (
    <View
      style={[
        styles.metric,
        !isFirstRow && styles.topBorder,
        !isFirstColumn && styles.leftBorder,
      ]}
    >
      <Text style={styles.label}>{label}</Text>

      <Text
        style={[
          styles.value,
          valueColor && {
            color: valueColor,
          },
          value === "--:--" && styles.emptyValue,
          value === "—" && styles.emptyValue,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

type LocationRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  location: string;
  coordinates: string;
  colors: {
    surfaceSecondary: string;
    textSecondary: string;
    textMuted: string;
    primary: string;
  };
};

function LocationRow({
  icon,
  title,
  location,
  coordinates,
  colors,
}: LocationRowProps) {
  const styles = createLocationStyles(colors);

  return (
    <View style={styles.locationRow}>
      <View style={styles.locationIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>

      <View style={styles.locationContent}>
        <Text style={styles.locationTitle}>{title}</Text>

        <Text style={styles.locationText}>{location}</Text>

        {coordinates ? (
          <Text style={styles.coordinates}>{coordinates}</Text>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(colors: {
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
}) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
    },

    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: 18,
    },

    headerContent: {
      flex: 1,
      marginRight: 12,
    },

    cardTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: colors.textSecondary,
      letterSpacing: 1,
    },

    date: {
      marginTop: 6,
      fontSize: 16,
      fontWeight: "500",
      color: colors.textSecondary,
    },

    statusPill: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 18,
    },

    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      marginRight: 7,
    },

    statusText: {
      fontSize: 11,
      fontWeight: "800",
    },

    metricsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      overflow: "hidden",
    },

    locationSection: {
      marginTop: 16,
      padding: 14,
      borderRadius: 18,
      backgroundColor: colors.surfaceSecondary,
    },

    locationDivider: {
      height: 1,
      marginVertical: 14,
      backgroundColor: colors.border,
    },

    errorText: {
      marginTop: 12,
      fontSize: 12,
      color: colors.warning,
    },
  });
}

function createMetricStyles(colors: {
  surface: string;
  border: string;
  textPrimary: string;
  textMuted: string;
}) {
  return StyleSheet.create({
    metric: {
      width: "50%",
      minHeight: 76,
      paddingHorizontal: 14,
      paddingVertical: 13,
      backgroundColor: colors.surface,
    },

    topBorder: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },

    leftBorder: {
      borderLeftWidth: 1,
      borderLeftColor: colors.border,
    },

    label: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.textMuted,
      letterSpacing: 0.6,
    },

    value: {
      marginTop: 6,
      fontSize: 17,
      fontWeight: "800",
      color: colors.textPrimary,
    },

    emptyValue: {
      color: colors.textMuted,
    },
  });
}

function createLocationStyles(colors: {
  surfaceSecondary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
}) {
  return StyleSheet.create({
    locationRow: {
      flexDirection: "row",
      alignItems: "flex-start",
    },

    locationIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
      marginRight: 10,
    },

    locationContent: {
      flex: 1,
    },

    locationTitle: {
      fontSize: 10,
      fontWeight: "800",
      color: colors.textMuted,
      letterSpacing: 0.6,
    },

    locationText: {
      marginTop: 4,
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary,
    },

    coordinates: {
      marginTop: 3,
      fontSize: 12,
      color: colors.textMuted,
    },
  });
}
