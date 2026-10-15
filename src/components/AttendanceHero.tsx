import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { AppText as Text } from "./InterTypography";

import LiveClock from "./LiveClock";
import { useAttendanceToday, usePunchAttendance } from "../hooks/useAttendance";
import { useTheme } from "../theme/ThemeProvider";
import { useRouter } from "expo-router";

export default function AttendanceHero() {
  const router = useRouter();
  const { colors } = useTheme();
  const {
    data: attendance,
    isLoading,
    isError,
    error,
    isRefetching,
    refetch,
  } = useAttendanceToday();
  const punchMutation = usePunchAttendance();
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const styles = createStyles(colors);

  const isCheckedIn = attendance?.isCheckedIn ?? false;
  const isCheckedOut = attendance?.isCheckedOut ?? false;
  const checkInTime = formatAttendanceTime(attendance?.checkIn?.time);
  const workedTime = formatWorkedTime(attendance?.workMinutes ?? 0);

  const location = attendance?.checkInLocation?.trim() || "—";
  const hasLocation = location !== "—";

  const statusText = isError
    ? "ATTENDANCE UNAVAILABLE"
    : isLoading
      ? "LOADING ATTENDANCE"
      : isCheckedOut
        ? "CHECKED OUT"
        : isCheckedIn
          ? "CHECKED IN"
          : "NOT MARKED";

  const buttonLabel = isLoading
    ? "LOADING..."
    : isError
      ? "UNAVAILABLE"
      : punchMutation.isPending
        ? "PROCESSING..."
        : isGettingLocation
          ? "GETTING LOCATION..."
          : isCheckedIn && !isCheckedOut
            ? "CHECK OUT"
            : "CHECK IN";

  async function handleAttendancePress() {
    if (isLoading || isError || punchMutation.isPending || isGettingLocation) {
      return;
    }

    const checkType = isCheckedIn && !isCheckedOut ? "CHECK_OUT" : "CHECK_IN";

    setIsGettingLocation(true);

    try {
      const coordinates = await getCurrentCoordinates();
      setIsGettingLocation(false);

      await punchMutation.mutateAsync({
        checkType,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        accuracy: coordinates.accuracy,
      });
    } catch (caughtError) {
      Alert.alert(
        "Attendance",
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update attendance. Please check your location and try again.",
      );
    } finally {
      setIsGettingLocation(false);
    }
  }

  async function handleRetry() {
    try {
      await refetch();
    } catch {
      // React Query exposes the failed request through its query state.
    }
  }

  const displayedError =
    error instanceof Error && error.message.trim()
      ? error.message
      : "We couldn't load today's attendance. Please try again.";

  const buttonDisabled =
    isLoading || isError || punchMutation.isPending || isGettingLocation;

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push("/(tabs)/attendance")}
      accessibilityRole="button"
      accessibilityLabel="Open attendance details"
    >
      <View style={styles.statusContainer}>
        <View style={styles.statusDetails}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  !isError && isCheckedIn && !isCheckedOut
                    ? colors.success
                    : colors.textMuted,
              },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              {
                color:
                  !isError && isCheckedIn && !isCheckedOut
                    ? colors.success
                    : colors.textSecondary,
              },
            ]}
          >
            {statusText}
          </Text>
        </View>

        <Pressable
          onPress={() => router.push("/(tabs)/attendance")}
          style={({ pressed }) => [
            styles.historyButton,
            pressed && styles.buttonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="View attendance history"
          hitSlop={8}
        >
          <Ionicons name="time-outline" size={19} color={colors.primary} />
        </Pressable>
      </View>

      {isError && (
        <View style={styles.errorPanel}>
          <Ionicons
            name="cloud-offline-outline"
            size={20}
            color={colors.textSecondary}
          />
          <View style={styles.errorContent}>
            <Text style={styles.errorMessage}>{displayedError}</Text>
            <Pressable
              onPress={() => void handleRetry()}
              disabled={isRefetching}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && !isRefetching && styles.buttonPressed,
                isRefetching && styles.buttonDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Retry loading attendance"
              accessibilityState={{
                disabled: isRefetching,
                busy: isRefetching,
              }}
            >
              {isRefetching ? (
                <>
                  <Ionicons
                    name="sync-outline"
                    size={15}
                    color={colors.primary}
                  />
                  <Text style={styles.retryText}>Retrying...</Text>
                </>
              ) : (
                <>
                  <Ionicons
                    name="refresh-outline"
                    size={15}
                    color={colors.primary}
                  />
                  <Text style={styles.retryText}>Try again</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.clockSection}>
        <Text style={styles.clockLabel}>CURRENT TIME</Text>
        <LiveClock />
        <Text style={styles.date}>
          {new Date().toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </Text>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>IN</Text>
          <Text style={styles.metricValue}>
            {isLoading || isError ? "—" : checkInTime}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>WORKED</Text>
          <Text style={styles.metricValue}>
            {isLoading || isError ? "—" : workedTime}
          </Text>
        </View>
      </View>

      <View style={styles.location}>
        <View
          style={[
            styles.locationIcon,
            !hasLocation && styles.locationIconUnavailable,
          ]}
        >
          <Ionicons
            name={hasLocation ? "checkmark" : "location-outline"}
            size={16}
            color={hasLocation ? colors.success : colors.textMuted}
          />
        </View>
        <View style={styles.locationContent}>
          <Text style={styles.locationTitle}>Check-in location</Text>
          <Text style={styles.locationSubtitle}>{location}</Text>
        </View>
      </View>

      <Pressable
        onPress={() => void handleAttendancePress()}
        disabled={buttonDisabled}
        style={({ pressed }) => [
          styles.button,
          buttonDisabled && styles.buttonDisabled,
          pressed && !buttonDisabled && styles.buttonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={buttonLabel}
        accessibilityState={{
          disabled: buttonDisabled,
          busy: punchMutation.isPending || isGettingLocation,
        }}
      >
        <Text style={styles.buttonText}>{buttonLabel}</Text>
      </Pressable>
    </Pressable>
  );
}

async function getCurrentCoordinates(): Promise<{
  latitude: number;
  longitude: number;
  accuracy?: number;
}> {
  let permission = await Location.getForegroundPermissionsAsync();

  if (permission.status !== "granted") {
    permission = await Location.requestForegroundPermissionsAsync();
  }

  if (permission.status !== "granted") {
    throw new Error(
      permission.canAskAgain
        ? "Location permission is required to record attendance. Allow location access and try again."
        : "Location permission is blocked. Enable location access for this app in your device settings, then try again.",
    );
  }

  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new Error(
      "Turn on your device's Location/GPS service and try again.",
    );
  }

  const position = await getCurrentPositionWithTimeout(20_000);

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy ?? undefined,
  };
}

function getCurrentPositionWithTimeout(
  timeoutMs: number,
): Promise<Location.LocationObject> {
  return new Promise((resolve, reject) => {
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      reject(
        new Error(
          "Couldn't get your current location within 20 seconds. Check your GPS signal and try again.",
        ),
      );
    }, timeoutMs);

    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      .then((position) => {
        if (timedOut) return;
        clearTimeout(timeoutId);
        resolve(position);
      })
      .catch((error: unknown) => {
        if (timedOut) return;
        clearTimeout(timeoutId);
        reject(
          error instanceof Error
            ? error
            : new Error("Unable to read your current location."),
        );
      });
  });
}

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

function formatWorkedTime(minutes: number) {
  const safeMinutes = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  return `${String(hours).padStart(2, "0")}h ${String(remainingMinutes).padStart(2, "0")}m`;
}

function createStyles(colors: {
  surface: string;
  surfaceSecondary: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  primary: string;
  success: string;
  successBackground: string;
  white: string;
}) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 3,
    },

    statusContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    statusDetails: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexShrink: 1,
    },
    historyButton: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },

    statusDot: { width: 9, height: 9, borderRadius: 5 },
    statusText: { fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },
    errorPanel: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      marginTop: 15,
      padding: 12,
      borderRadius: 14,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    errorContent: { flex: 1 },
    errorMessage: {
      fontSize: 12,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    retryButton: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginTop: 8,
      paddingVertical: 4,
    },
    retryText: { fontSize: 12, fontWeight: "800", color: colors.primary },
    clockSection: { alignItems: "center", marginTop: 22 },
    clockLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textMuted,
      letterSpacing: 1.2,
    },
    date: { marginTop: 6, fontSize: 14, color: colors.textSecondary },
    metrics: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 24,
    },
    metric: { flex: 1, alignItems: "center" },
    metricLabel: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
    metricValue: {
      marginTop: 5,
      fontSize: 15,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    divider: { width: 1, height: 36, backgroundColor: colors.border },
    location: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 22,
      padding: 12,
      borderRadius: 14,
      backgroundColor: colors.surfaceSecondary,
    },
    locationIcon: {
      width: 28,
      height: 28,
      marginRight: 10,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.successBackground,
    },
    locationIconUnavailable: { backgroundColor: colors.surface },
    locationContent: { flex: 1 },
    locationTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    locationSubtitle: {
      marginTop: 2,
      fontSize: 12,
      color: colors.textSecondary,
    },
    button: {
      height: 54,
      marginTop: 16,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
    },
    buttonText: {
      color: colors.white,
      fontSize: 15,
      fontWeight: "800",
      letterSpacing: 0.5,
    },
    buttonDisabled: { opacity: 0.55 },
    buttonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  });
}
