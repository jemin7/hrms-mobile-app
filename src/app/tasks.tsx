import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
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

import type { TaskProject } from "../api/tasks";
import { useTasks } from "../hooks/useTasks";
import { useTheme } from "../theme/ThemeProvider";

type TaskStatus = "All" | "Requests" | "Open" | "WIP" | "Closed" | "Reopen";

const TASK_STATUSES: TaskStatus[] = [
  "All",
  "Requests",
  "Open",
  "WIP",
  "Closed",
  "Reopen",
];

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getTaskStatusLabel(status?: string | null) {
  if (!status) return "Unknown status";
  const normalized = status.trim().toLowerCase();
  if (normalized === "wip" || normalized === "work in progress") return "WIP";
  if (normalized === "closed" || normalized === "completed") return "Closed";
  return status;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "We couldn't load your tasks. Please try again.";
}

export default function TasksScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus>("All");

  const { data, error, isError, isLoading, isRefetching, refetch } = useTasks({
    search: searchQuery,
    status: selectedStatus === "All" ? undefined : selectedStatus,
    page: 1,
    limit: 50,
  });

  const tasks = data?.items ?? [];
  const styles = createStyles(colors);

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
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
            <Ionicons name="arrow-back" size={21} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.headerTextContainer}>
            <Text style={styles.eyebrow}>WORKSPACE</Text>
            <Text style={styles.title}>My Tasks</Text>
            <Text style={styles.subtitle}>
              Track your assigned work and progress.
            </Text>
          </View>
          <Pressable
            onPress={() => void refetch()}
            disabled={isRefetching}
            style={({ pressed }) => [
              styles.refreshButton,
              pressed && styles.pressed,
              isRefetching && styles.disabledButton,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Refresh tasks"
          >
            {isRefetching ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons
                name="refresh-outline"
                size={20}
                color={colors.textPrimary}
              />
            )}
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <View style={styles.searchContainer}>
            <Ionicons
              name="search-outline"
              size={20}
              color={colors.textSecondary}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search tasks by name or code"
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              returnKeyType="search"
              clearButtonMode="while-editing"
              accessibilityLabel="Search tasks"
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery("")}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Clear task search"
              >
                <Ionicons
                  name="close-circle"
                  size={19}
                  color={colors.textMuted}
                />
              </Pressable>
            )}
          </View>

          <View style={styles.statusSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Filter by status</Text>
              <Text style={styles.filterHint}>Select one</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statusScrollContent}
            >
              {TASK_STATUSES.map((status) => {
                const selected = selectedStatus === status;
                return (
                  <Pressable
                    key={status}
                    onPress={() => setSelectedStatus(status)}
                    style={({ pressed }) => [
                      styles.statusChip,
                      selected && styles.statusChipSelected,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Filter tasks by ${status}`}
                  >
                    {selected && (
                      <Ionicons
                        name="checkmark"
                        size={15}
                        color={colors.white}
                      />
                    )}
                    <Text
                      style={[
                        styles.statusText,
                        selected && styles.statusTextSelected,
                      ]}
                    >
                      {status}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.resultsHeader}>
            <View>
              <Text style={styles.resultsTitle}>
                {selectedStatus === "All"
                  ? "All tasks"
                  : selectedStatus === "WIP"
                    ? "Work in progress"
                    : selectedStatus}
              </Text>
              <Text style={styles.resultsSubtitle}>Tasks in this category</Text>
            </View>
            {!isLoading && !isError && (
              <View style={styles.resultsCountPill}>
                <Text style={styles.resultsCount}>
                  {data?.total ?? tasks.length}{" "}
                  {data?.total === 1 ? "task" : "tasks"}
                </Text>
              </View>
            )}
          </View>

          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.stateTitle}>Loading your tasks</Text>
              <Text style={styles.stateMessage}>
                Getting your latest assignments…
              </Text>
            </View>
          ) : isError ? (
            <View style={styles.stateCard}>
              <View style={styles.stateIconContainer}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={30}
                  color={colors.textMuted}
                />
              </View>
              <Text style={styles.stateTitle}>Couldn't load tasks</Text>
              <Text style={styles.stateMessage}>{getErrorMessage(error)}</Text>
              <Pressable
                onPress={() => void refetch()}
                disabled={isRefetching}
                style={({ pressed }) => [
                  styles.retryButton,
                  pressed && styles.pressed,
                  isRefetching && styles.disabledButton,
                ]}
                accessibilityRole="button"
              >
                {isRefetching ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Ionicons
                      name="refresh-outline"
                      size={17}
                      color={colors.white}
                    />
                    <Text style={styles.retryButtonText}>Try again</Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : tasks.length === 0 ? (
            <View style={styles.stateCard}>
              <View style={styles.stateIconContainer}>
                <Ionicons
                  name="clipboard-outline"
                  size={32}
                  color={colors.textMuted}
                />
              </View>
              <Text style={styles.stateTitle}>
                {searchQuery.trim() ? "No matching tasks" : "No tasks found"}
              </Text>
              <Text style={styles.stateMessage}>
                {searchQuery.trim()
                  ? "Try another task name or code, or clear your search."
                  : `There are no tasks to show in ${selectedStatus} right now.`}
              </Text>
              {searchQuery.trim() ? (
                <Pressable
                  onPress={() => setSearchQuery("")}
                  style={({ pressed }) => [
                    styles.clearSearchButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.clearSearchText}>Clear search</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View style={styles.taskList}>
              {tasks.map((task) => (
                <TaskCard
                  key={String(task.id)}
                  task={task}
                  colors={colors}
                  onPress={() =>
                    router.push({
                      pathname: "/task-details",
                      params: { task: JSON.stringify(task) },
                    })
                  }
                />
              ))}
              {data && data.total > tasks.length && (
                <Text style={styles.paginationNote}>
                  Showing {tasks.length} of {data.total} tasks.
                </Text>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function TaskCard({
  task,
  colors,
  onPress,
}: {
  task: TaskProject;
  onPress: () => void;
  colors: {
    surface: string;
    surfaceSecondary: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    primary: string;
    primaryLight: string;
    white: string;
    success?: string;
    successBackground?: string;
    warning?: string;
    warningBackground?: string;
    danger?: string;
    dangerBackground?: string;
  };
}) {
  const title = task.taskName?.trim() || `Task #${task.id}`;
  const statusLabel = getTaskStatusLabel(task.status);
  const dueDate = formatDate(task.dueAt ?? task.dueDate);
  const styles = createTaskCardStyles(colors);
  const statusVisual = getStatusVisual(statusLabel, colors);
  const priorityVisual = getPriorityVisual(task.priority, colors);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.taskCard, pressed && { opacity: 0.78 }]}
      accessibilityRole="button"
      accessibilityLabel={`Open task ${title}`}
    >
      <View style={styles.cardAccent} />
      <View style={styles.taskCardTopRow}>
        <View style={styles.taskTitleContainer}>
          {task.taskCode ? (
            <Text style={styles.taskCode}>{task.taskCode}</Text>
          ) : null}
          <Text style={styles.taskTitle}>{title}</Text>
        </View>
        <View
          style={[
            styles.taskStatusBadge,
            { backgroundColor: statusVisual.background },
          ]}
        >
          <View
            style={[styles.statusDot, { backgroundColor: statusVisual.color }]}
          />
          <Text
            style={[styles.taskStatusText, { color: statusVisual.color }]}
            numberOfLines={1}
          >
            {statusLabel}
          </Text>
        </View>
      </View>

      {task.description ? (
        <Text style={styles.taskDescription} numberOfLines={3}>
          {task.description}
        </Text>
      ) : null}

      {task.priority || dueDate ? (
        <View style={styles.taskMetadata}>
          {task.priority ? (
            <View style={styles.metadataItem}>
              <Ionicons
                name="flag-outline"
                size={15}
                color={priorityVisual.color}
              />
              <Text
                style={[styles.metadataText, { color: priorityVisual.color }]}
              >
                {task.priority}
              </Text>
            </View>
          ) : null}
          {dueDate ? (
            <View style={styles.metadataItem}>
              <Ionicons
                name="calendar-outline"
                size={15}
                color={colors.textSecondary}
              />
              <Text style={styles.metadataText}>Due {dueDate}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

function getStatusVisual(
  status: string,
  colors: {
    primary: string;
    primaryLight: string;
    success?: string;
    successBackground?: string;
    warning?: string;
    warningBackground?: string;
    danger?: string;
    dangerBackground?: string;
    surfaceSecondary: string;
    textSecondary: string;
  },
) {
  const normalized = status.toLowerCase();
  if (normalized === "closed" || normalized === "completed") {
    return {
      color: colors.success ?? colors.primary,
      background: colors.successBackground ?? colors.primaryLight,
    };
  }
  if (normalized === "wip" || normalized.includes("progress")) {
    return {
      color: colors.warning ?? colors.primary,
      background: colors.warningBackground ?? colors.primaryLight,
    };
  }
  if (normalized === "reopen") {
    return {
      color: colors.danger ?? colors.primary,
      background: colors.dangerBackground ?? colors.primaryLight,
    };
  }
  if (normalized === "requests") {
    return { color: colors.primary, background: colors.primaryLight };
  }
  return { color: colors.textSecondary, background: colors.surfaceSecondary };
}

function getPriorityVisual(
  priority: string | null | undefined,
  colors: {
    textSecondary: string;
    warning?: string;
    danger?: string;
    success?: string;
  },
) {
  const normalized = priority?.toLowerCase() ?? "";
  if (normalized.includes("high") || normalized.includes("urgent")) {
    return { color: colors.danger ?? colors.textSecondary };
  }
  if (normalized.includes("medium")) {
    return { color: colors.warning ?? colors.textSecondary };
  }
  if (normalized.includes("low")) {
    return { color: colors.success ?? colors.textSecondary };
  }
  return { color: colors.textSecondary };
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
  white: string;
}) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 12,
      gap: 12,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerTextContainer: { flex: 1 },
    eyebrow: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.4,
      color: colors.primary,
      marginBottom: 3,
    },
    title: {
      fontSize: 27,
      lineHeight: 32,
      fontWeight: "800",
      letterSpacing: -0.5,
      color: colors.textPrimary,
    },
    subtitle: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    refreshButton: {
      width: 42,
      height: 42,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    disabledButton: { opacity: 0.6 },
    content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
    searchContainer: {
      minHeight: 54,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 15,
      borderRadius: 17,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 0,
      fontSize: 14,
      color: colors.textPrimary,
    },
    statusSection: { marginTop: 24 },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 11,
    },
    sectionLabel: {
      fontSize: 14,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    filterHint: { fontSize: 11, color: colors.textMuted },
    statusScrollContent: { paddingRight: 20, gap: 8 },
    statusChip: {
      minHeight: 42,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      paddingHorizontal: 15,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statusChipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    statusText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textSecondary,
    },
    statusTextSelected: { color: colors.white },
    resultsHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 27,
      marginBottom: 13,
    },
    resultsTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    resultsSubtitle: {
      marginTop: 3,
      fontSize: 11,
      color: colors.textSecondary,
    },
    resultsCountPill: {
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 11,
      backgroundColor: colors.surfaceSecondary,
    },
    resultsCount: {
      fontSize: 12,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    stateCard: {
      minHeight: 290,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
      paddingVertical: 30,
      borderRadius: 22,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    stateIconContainer: {
      width: 68,
      height: 68,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceSecondary,
    },
    stateTitle: {
      marginTop: 17,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: "800",
      color: colors.textPrimary,
      textAlign: "center",
    },
    stateMessage: {
      marginTop: 7,
      maxWidth: 300,
      fontSize: 13,
      lineHeight: 20,
      color: colors.textSecondary,
      textAlign: "center",
    },
    retryButton: {
      minHeight: 45,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 19,
      paddingHorizontal: 20,
      borderRadius: 14,
      backgroundColor: colors.primary,
    },
    retryButtonText: { fontSize: 14, fontWeight: "800", color: colors.white },
    clearSearchButton: {
      marginTop: 16,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.primaryLight,
    },
    clearSearchText: { fontSize: 13, fontWeight: "800", color: colors.primary },
    taskList: { gap: 13, paddingBottom: 12 },
    paginationNote: {
      paddingVertical: 9,
      fontSize: 12,
      color: colors.textMuted,
      textAlign: "center",
    },
    pressed: { opacity: 0.76 },
  });
}

function createTaskCardStyles(colors: {
  surface: string;
  surfaceSecondary: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryLight: string;
}) {
  return StyleSheet.create({
    taskCard: {
      position: "relative",
      overflow: "hidden",
      padding: 16,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardAccent: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      backgroundColor: colors.primary,
    },
    taskCardTopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      paddingLeft: 3,
    },
    taskTitleContainer: { flex: 1 },
    taskCode: {
      marginBottom: 5,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.5,
      color: colors.textMuted,
    },
    taskTitle: {
      fontSize: 15,
      lineHeight: 22,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    taskStatusBadge: {
      maxWidth: 135,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 7,
      borderRadius: 11,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    taskStatusText: { fontSize: 10, fontWeight: "800" },
    taskDescription: {
      marginTop: 11,
      paddingLeft: 3,
      fontSize: 13,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    taskMetadata: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 13,
      marginTop: 15,
      paddingTop: 12,
      paddingLeft: 3,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    metadataItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    metadataText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textSecondary,
    },
  });
}
