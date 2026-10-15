import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppText as Text } from "../components/InterTypography";
import { SafeAreaView } from "react-native-safe-area-context";

import type { TaskProject } from "../api/tasks";
import { useTheme } from "../theme/ThemeProvider";

function parseTask(value?: string): TaskProject | null {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);

    if (typeof parsed === "object" && parsed !== null && "id" in parsed) {
      return parsed as TaskProject;
    }
  } catch {
    return null;
  }

  return null;
}

function formatDate(value?: string | null) {
  if (!value) return "Not set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not set";

  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TaskDetailsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ task?: string }>();
  const rawTask = Array.isArray(params.task) ? params.task[0] : params.task;
  const task = parseTask(rawTask);
  const styles = createStyles(colors);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/tasks");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={21} color={colors.textPrimary} />
        </Pressable>

        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>WORKSPACE</Text>
          <Text style={styles.headerTitle}>Task Details</Text>
        </View>
      </View>

      {!task ? (
        <View style={styles.emptyState}>
          <Ionicons
            name="alert-circle-outline"
            size={42}
            color={colors.textMuted}
          />
          <Text style={styles.emptyTitle}>Task unavailable</Text>
          <Text style={styles.description}>
            The task details could not be loaded. Return to My Tasks and select
            a task again.
          </Text>
          <Pressable onPress={handleBack} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Back to My Tasks</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.eyebrow}>
              {task.taskCode || `TASK #${task.id}`}
            </Text>

            <Text style={styles.taskTitle}>
              {task.taskName?.trim() || `Task #${task.id}`}
            </Text>

            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {task.status || "Unknown status"}
                </Text>
              </View>

              {task.priority ? (
                <View style={styles.badge}>
                  <Ionicons
                    name="flag-outline"
                    size={14}
                    color={colors.primary}
                  />
                  <Text style={styles.badgeText}>{task.priority}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>
              {task.description?.trim() || "No description provided."}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Task information</Text>

            <DetailRow
              label="Task ID"
              value={String(task.id)}
              styles={styles}
            />
            <DetailRow
              label="Task code"
              value={task.taskCode || "Not set"}
              styles={styles}
            />
            <DetailRow
              label="Due date"
              value={formatDate(task.dueAt ?? task.dueDate)}
              styles={styles}
            />
            <DetailRow
              label="Created"
              value={formatDate(task.createdAt)}
              styles={styles}
            />
            <DetailRow
              label="Last updated"
              value={formatDate(task.updatedAt)}
              styles={styles}
              last
            />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function DetailRow({
  label,
  value,
  styles,
  last = false,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
  last?: boolean;
}) {
  return (
    <View style={[styles.detailRow, last && styles.lastDetailRow]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      minHeight: 68,
      flexDirection: "row",
      alignItems: "center",
      gap: 13,
      paddingHorizontal: 18,
      paddingVertical: 10,
    },
    backButton: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerCopy: {
      flex: 1,
    },
    headerEyebrow: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.2,
      color: colors.textMuted,
    },
    headerTitle: {
      marginTop: 3,
      fontSize: 21,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    content: {
      padding: 16,
      paddingBottom: 32,
      gap: 14,
    },
    card: {
      padding: 18,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    eyebrow: {
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.7,
      color: colors.primary,
    },
    taskTitle: {
      marginTop: 8,
      fontSize: 23,
      lineHeight: 30,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 8,
      marginTop: 15,
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 10,
      backgroundColor: colors.primaryLight,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.primary,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 18,
    },
    sectionTitle: {
      marginBottom: 10,
      fontSize: 15,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    description: {
      fontSize: 14,
      lineHeight: 21,
      color: colors.textSecondary,
    },
    detailRow: {
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 5,
    },
    lastDetailRow: {
      borderBottomWidth: 0,
      paddingBottom: 0,
    },
    detailLabel: {
      fontSize: 12,
      color: colors.textMuted,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 28,
    },
    emptyTitle: {
      marginTop: 14,
      marginBottom: 8,
      fontSize: 19,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    primaryButton: {
      marginTop: 20,
      paddingHorizontal: 18,
      paddingVertical: 13,
      borderRadius: 13,
      backgroundColor: colors.primary,
    },
    primaryButtonText: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.white,
    },
  });
}
