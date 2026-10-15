import { apiRequest } from "./client";

import {
  getMockAttendanceHistory,
  getMockTodayAttendance,
  mockPunchAttendance,
} from "../mock/attendance";

export type AttendancePunch = {
  id: number;

  checkType: "CHECK_IN" | "CHECK_OUT" | "BREAK_IN" | "BREAK_OUT";

  time: string | null;

  location?: string | null;

  latitude?: number | null;
  longitude?: number | null;
};

export type TodayAttendance = {
  date: string;

  status: "CHECKED_IN" | "CHECKED_OUT" | "ABSENT" | "NOT_MARKED";

  isCheckedIn: boolean;
  isCheckedOut: boolean;
  isAbsentToday: boolean;

  checkIn: AttendancePunch | null;
  checkOut: AttendancePunch | null;
  breakIn: AttendancePunch | null;
  breakOut: AttendancePunch | null;

  workMinutes: number;
  breakMinutes: number;

  workHours: string;
  breakTime: string;

  checkInLocation: string | null;
  checkOutLocation: string | null;
};

export type AttendanceHistoryItem = {
  id: number;

  date: string;

  status: "PRESENT" | "ABSENT" | "HALF_DAY" | "HOLIDAY";

  checkIn: string | null;
  checkOut: string | null;

  breakIn: string | null;
  breakOut: string | null;

  workHours: string;
  breakTime: string;

  checkInLocation: string | null;
  checkOutLocation: string | null;
};

export type PunchAttendanceRequest = {
  checkType: "CHECK_IN" | "CHECK_OUT" | "BREAK_IN" | "BREAK_OUT";

  latitude?: number;
  longitude?: number;
  accuracy?: number;
  deviceType?: string;
  browser?: string;
  operatingSystem?: string;
  userAgent?: string;
  photoUrl?: string;
};

function isMockDataEnabled() {
  return __DEV__ && process.env.EXPO_PUBLIC_USE_MOCK_DATA === "true";
}

type BackendAttendancePunch = AttendancePunch & {
  checkinTime?: string | null;
  address?: string | null;
};

function normalizeAttendancePunch(
  punch: AttendancePunch | null | undefined,
): AttendancePunch | null {
  if (!punch) return null;

  const backendPunch = punch as BackendAttendancePunch;

  return {
    ...punch,
    time: punch.time ?? backendPunch.checkinTime ?? null,
    location: punch.location ?? backendPunch.address ?? null,
  };
}

export async function getTodayAttendance(
  token: string,
): Promise<TodayAttendance> {
  if (isMockDataEnabled()) {
    return getMockTodayAttendance();
  }

  const response = await apiRequest<TodayAttendance>(
    "/emp-location-attendance/today",
    { token },
  );

  return {
    ...response,
    checkIn: normalizeAttendancePunch(response.checkIn),
    checkOut: normalizeAttendancePunch(response.checkOut),
    breakIn: normalizeAttendancePunch(response.breakIn),
    breakOut: normalizeAttendancePunch(response.breakOut),
  };
}

type BackendAttendanceRecord = {
  id: number;
  checkType: string;
  checkinTime: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

function getAttendanceDateKey(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function formatAttendancePunchTime(value?: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  const hours = date.getUTCHours();
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;

  return `${displayHour}:${minutes} ${period}`;
}

function formatAttendanceLocation(
  record?: BackendAttendanceRecord | null,
): string | null {
  if (!record) return null;

  if (record.address?.trim()) {
    return record.address.trim();
  }

  if (record.latitude != null && record.longitude != null) {
    return `${record.latitude}, ${record.longitude}`;
  }

  return null;
}

function formatAttendanceWorkHours(milliseconds: number): string {
  return `${(Math.max(0, milliseconds) / 3_600_000).toFixed(2)}h`;
}

function formatAttendanceBreakTime(milliseconds: number): string {
  const totalMinutes = Math.max(0, Math.floor(milliseconds / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  return `${minutes}m`;
}

export async function getAttendanceHistory(
  from: string,
  to: string,
  token: string,
): Promise<AttendanceHistoryItem[]> {
  if (isMockDataEnabled()) {
    return getMockAttendanceHistory(from, to);
  }

  const records = await apiRequest<BackendAttendanceRecord[]>(
    `/emp-location-attendance/my?from=${encodeURIComponent(
      from,
    )}&to=${encodeURIComponent(to)}`,
    { token },
  );

  const grouped = new Map<string, BackendAttendanceRecord[]>();

  for (const record of records) {
    const dateKey = getAttendanceDateKey(record.checkinTime);

    if (!dateKey) continue;

    const dayRecords = grouped.get(dateKey) ?? [];
    dayRecords.push(record);
    grouped.set(dateKey, dayRecords);
  }

  const now = new Date();

  const todayKey = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  return [...grouped.entries()]
    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
    .map(([dateKey, dayRecords]) => {
      const sorted = [...dayRecords].sort(
        (a, b) =>
          new Date(a.checkinTime).getTime() - new Date(b.checkinTime).getTime(),
      );

      const checkIns = sorted.filter(
        (record) => record.checkType === "CHECK_IN",
      );

      const checkOuts = sorted.filter(
        (record) => record.checkType === "CHECK_OUT",
      );

      const lastPunch = sorted[sorted.length - 1];

      const checkIn = checkIns[0] ?? null;

      const checkOut =
        lastPunch?.checkType === "CHECK_OUT"
          ? (checkOuts[checkOuts.length - 1] ?? null)
          : null;

      const breakIn =
        sorted.find((record) => record.checkType === "BREAK_IN") ?? null;

      const breakOut =
        [...sorted]
          .reverse()
          .find((record) => record.checkType === "BREAK_OUT") ?? null;

      const [year, month, day] = dateKey.split("-").map(Number);

      const endTime =
        dateKey === todayKey
          ? Date.UTC(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
              now.getHours(),
              now.getMinutes(),
              now.getSeconds(),
            )
          : Date.UTC(year, month - 1, day, 23, 59, 59, 999);

      let breakMilliseconds = 0;
      let activeBreakStart: number | null = null;

      for (const record of sorted) {
        const time = new Date(record.checkinTime).getTime();

        if (record.checkType === "BREAK_IN") {
          activeBreakStart = time;
        } else if (
          record.checkType === "BREAK_OUT" &&
          activeBreakStart !== null
        ) {
          breakMilliseconds += Math.max(0, time - activeBreakStart);
          activeBreakStart = null;
        }
      }

      if (activeBreakStart !== null) {
        breakMilliseconds += Math.max(0, endTime - activeBreakStart);
      }

      const startTime = checkIn
        ? new Date(checkIn.checkinTime).getTime()
        : null;

      const finishTime = checkOut
        ? new Date(checkOut.checkinTime).getTime()
        : endTime;

      const workMilliseconds =
        startTime === null
          ? 0
          : Math.max(0, finishTime - startTime - breakMilliseconds);

      return {
        id: checkIn?.id ?? sorted[0].id,
        date: dateKey,
        status: "PRESENT",
        checkIn: formatAttendancePunchTime(checkIn?.checkinTime),
        checkOut: formatAttendancePunchTime(checkOut?.checkinTime),
        breakIn: formatAttendancePunchTime(breakIn?.checkinTime),
        breakOut: formatAttendancePunchTime(breakOut?.checkinTime),
        workHours: formatAttendanceWorkHours(workMilliseconds),
        breakTime: formatAttendanceBreakTime(breakMilliseconds),
        checkInLocation: formatAttendanceLocation(checkIn),
        checkOutLocation: formatAttendanceLocation(checkOut),
      };
    });
}

export async function punchAttendance(
  data: PunchAttendanceRequest,
  token: string,
) {
  if (isMockDataEnabled()) {
    if (data.checkType === "BREAK_IN" || data.checkType === "BREAK_OUT") {
      throw new Error("Break is not available.");
    }

    return mockPunchAttendance(data.checkType);
  }

  if (data.latitude == null || data.longitude == null) {
    throw new Error("Location is required for attendance.");
  }

  return apiRequest<AttendancePunch>("/emp-location-attendance/punch", {
    method: "POST",
    body: JSON.stringify({
      ...data,
      latitude: data.latitude,
      longitude: data.longitude,
    }),
    token,
  });
}
