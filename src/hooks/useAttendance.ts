import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../auth/AuthProvider";

import {
  getAttendanceHistory,
  getTodayAttendance,
  punchAttendance,
  type PunchAttendanceRequest,
} from "../api/attendance";

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayDate() {
  return formatDate(new Date());
}

function getDateDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);

  return formatDate(date);
}

/**
 * Today's attendance.
 */
export function useAttendanceToday() {
  const { accessToken } = useAuth();

  return useQuery({
    queryKey: ["attendance", "today"],
    queryFn: () => getTodayAttendance(accessToken!),
    enabled: Boolean(accessToken),
    staleTime: 30 * 1000,
    retry: 1,
  });
}

/**
 * Attendance history.
 *
 * Without selectedDate: returns the latest 5 days.
 * With selectedDate: returns attendance for that date.
 */
export function useAttendanceHistory(selectedDate?: string | null) {
  const { accessToken } = useAuth();

  const today = getTodayDate();
  const from = selectedDate ?? getDateDaysAgo(4);
  const to = selectedDate ?? today;

  return useQuery({
    queryKey: ["attendance", "history", from, to],
    queryFn: () => getAttendanceHistory(from, to, accessToken!),
    enabled: Boolean(accessToken),
    staleTime: 30 * 1000,
    retry: 1,
  });
}

/**
 * Check-in / Check-out mutation.
 */
export function usePunchAttendance() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PunchAttendanceRequest) => {
      if (!accessToken) {
        throw new Error("Your session has expired. Please log in again.");
      }

      return punchAttendance(data, accessToken);
    },

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["attendance", "today"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["attendance", "history"],
        }),
      ]);
    },
  });
}
