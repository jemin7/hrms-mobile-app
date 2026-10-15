import { useMemo } from "react";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { AppText as Text } from "./InterTypography";

import OverviewCard from "./OverviewCard";
import { useLeaveBalance } from "../hooks/useLeave";
import { useTasks } from "../hooks/useTasks";
import { useReimbursements } from "../hooks/useReimbursement";
import { useHolidays } from "../hooks/useHolidays";
import type { Holiday } from "../api/holidays";
import { useTheme } from "../theme/ThemeProvider";

function parseHolidayDate(value?: string | null): Date | null {
  if (!value) return null;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (dateOnly) {
    const date = new Date(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3]),
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatShortHolidayDate(value?: string | null): string | null {
  const date = parseHolidayDate(value);
  if (!date) return null;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function getNextHoliday(holidays: Holiday[]): Holiday | undefined {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return holidays
    .filter((holiday) => {
      const date = parseHolidayDate(holiday.startDate);
      return date ? date.getTime() >= today.getTime() : holiday.isUpcoming;
    })
    .sort((a, b) => {
      const aTime =
        parseHolidayDate(a.startDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime =
        parseHolidayDate(b.startDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    })[0];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function Overview() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const leaveBalanceQuery = useLeaveBalance();
  const tasksQuery = useTasks({ page: 1, limit: 100 });
  const reimbursementsQuery = useReimbursements();
  const holidaysQuery = useHolidays();

  const nextHoliday = useMemo(
    () => getNextHoliday(holidaysQuery.data ?? []),
    [holidaysQuery.data],
  );

  const reimbursements = reimbursementsQuery.data ?? [];
  const totalClaimed = reimbursements.reduce((total, reimbursement) => {
    const amount = Number(reimbursement.totalAmount);
    return Number.isFinite(amount) ? total + amount : total;
  }, 0);
  const pendingReimbursements = reimbursements.filter(
    (reimbursement) => reimbursement.status === "Pending",
  ).length;

  const taskTotal = tasksQuery.data?.total;
  const taskValue =
    tasksQuery.isLoading || tasksQuery.isError
      ? "—"
      : `${taskTotal ?? tasksQuery.data?.items.length ?? 0} ${
          (taskTotal ?? tasksQuery.data?.items.length ?? 0) === 1
            ? "task"
            : "tasks"
        }`;
  const taskSubtitle = tasksQuery.isLoading
    ? "Loading tasks…"
    : tasksQuery.isError
      ? "Tasks unavailable"
      : "Assigned to you";

  const reimbursementValue =
    reimbursementsQuery.isLoading || reimbursementsQuery.isError
      ? "—"
      : formatCurrency(totalClaimed);
  const reimbursementSubtitle = reimbursementsQuery.isLoading
    ? "Loading claims…"
    : reimbursementsQuery.isError
      ? "Claims unavailable"
      : `${pendingReimbursements} pending`;

  const holidayValue =
    holidaysQuery.isLoading || holidaysQuery.isError
      ? "—"
      : (nextHoliday?.name ?? "None listed");
  const holidaySubtitle = holidaysQuery.isLoading
    ? "Loading holidays…"
    : holidaysQuery.isError
      ? "Holidays unavailable"
      : nextHoliday
        ? (formatShortHolidayDate(nextHoliday.startDate) ?? "Date unavailable")
        : "Check holiday calendar";

  const leaveSubtitle = leaveBalanceQuery.isLoading
    ? "Loading balance…"
    : leaveBalanceQuery.isError
      ? "Balance unavailable"
      : "Open leave summary";
      const leaveValue =
        leaveBalanceQuery.isLoading || leaveBalanceQuery.isError
          ? "—"
          : `${Number(leaveBalanceQuery.data?.totalAvailable ?? 0)} days`;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Overview</Text>

      <View style={styles.grid}>
        <OverviewCard
          title="Leave Balance"
          value={leaveValue}
          subtitle={leaveSubtitle}
          icon="calendar-outline"
          iconBackground={colors.primaryLight}
          iconColor={colors.primary}
          onPress={() => router.navigate("/leave")}
        />

        <OverviewCard
          title="My Tasks"
          value={taskValue}
          subtitle={taskSubtitle}
          icon="checkmark-circle-outline"
          iconBackground={colors.successBackground}
          iconColor={colors.success}
          onPress={() => router.push("/tasks")}
        />

        <OverviewCard
          title="Reimbursement"
          value={reimbursementValue}
          subtitle={reimbursementSubtitle}
          icon="receipt-outline"
          iconBackground={colors.warningBackground}
          iconColor={colors.warning}
          onPress={() => router.navigate("/reimbursement")}
        />

        <OverviewCard
          title="Next Holiday"
          value={holidayValue}
          subtitle={holidaySubtitle}
          icon="sunny-outline"
          iconBackground={colors.primaryLight}
          iconColor={colors.primary}
          onPress={() => router.push("/holidays")}
        />
      </View>
    </View>
  );
}

function createStyles(colors: { textPrimary: string }) {
  return StyleSheet.create({
    container: {
      marginTop: 28,
    },

    sectionTitle: {
      marginBottom: 12,
      fontSize: 18,
      fontWeight: "800",
      color: colors.textPrimary,
    },

    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: 12,
    },
  });
}
