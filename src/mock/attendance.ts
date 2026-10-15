import type {
  AttendanceHistoryItem,
  AttendancePunch,
  TodayAttendance,
} from "../api/attendance";

export const MOCK_TODAY_ATTENDANCE: TodayAttendance = {
  date: "2026-10-08",

  status: "CHECKED_IN",

  isCheckedIn: true,
  isCheckedOut: false,
  isAbsentToday: false,

  checkIn: {
    id: 1,
    checkType: "CHECK_IN",
    time: "2026-10-08T10:07:00",
    location: "Kandivali West, Mumbai",
    latitude: 19.2074,
    longitude: 72.8342,
  },

  checkOut: null,
  breakIn: null,
  breakOut: null,

  workMinutes: 138,
  breakMinutes: 0,

  workHours: "2.18h",
  breakTime: "0m",

  checkInLocation: "Kandivali West, Mumbai",
  checkOutLocation: null,
};

export const MOCK_ATTENDANCE_HISTORY: AttendanceHistoryItem[] = [
  {
    id: 1,
    date: "2026-10-08",
    status: "PRESENT",
    checkIn: "10:07 AM",
    checkOut: null,
    breakIn: null,
    breakOut: null,
    workHours: "2.18h",
    breakTime: "0m",
    checkInLocation: "Kandivali West, Mumbai",
    checkOutLocation: null,
  },

  {
    id: 2,
    date: "2026-10-07",
    status: "PRESENT",
    checkIn: "09:58 AM",
    checkOut: "06:14 PM",
    breakIn: "01:05 PM",
    breakOut: "01:35 PM",
    workHours: "7.46h",
    breakTime: "30m",
    checkInLocation: "Kandivali West, Mumbai",
    checkOutLocation: "Kandivali West, Mumbai",
  },

  {
    id: 3,
    date: "2026-10-06",
    status: "PRESENT",
    checkIn: "10:02 AM",
    checkOut: "06:03 PM",
    breakIn: "01:10 PM",
    breakOut: "01:40 PM",
    workHours: "7.51h",
    breakTime: "30m",
    checkInLocation: "Kandivali West, Mumbai",
    checkOutLocation: "Kandivali West, Mumbai",
  },

  {
    id: 4,
    date: "2026-10-05",
    status: "PRESENT",
    checkIn: "09:54 AM",
    checkOut: "06:08 PM",
    breakIn: "01:00 PM",
    breakOut: "01:32 PM",
    workHours: "7.42h",
    breakTime: "32m",
    checkInLocation: "Kandivali West, Mumbai",
    checkOutLocation: "Kandivali West, Mumbai",
  },

  {
    id: 5,
    date: "2026-10-04",
    status: "HOLIDAY",
    checkIn: null,
    checkOut: null,
    breakIn: null,
    breakOut: null,
    workHours: "0h",
    breakTime: "0m",
    checkInLocation: null,
    checkOutLocation: null,
  },
];

/*
|--------------------------------------------------------------------------
| Mutable development state
|--------------------------------------------------------------------------
|
| This is temporary mock state.
| It will be removed completely during real backend integration.
|
*/

let currentTodayAttendance: TodayAttendance = clone(MOCK_TODAY_ATTENDANCE);

let currentAttendanceHistory: AttendanceHistoryItem[] =
  MOCK_ATTENDANCE_HISTORY.map((item) => ({
    ...item,
  }));

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/*
|--------------------------------------------------------------------------
| Mock data readers
|--------------------------------------------------------------------------
*/

export function getMockTodayAttendance(): TodayAttendance {
  return clone(currentTodayAttendance);
}

export function getMockAttendanceHistory(
  from: string,
  to: string,
): AttendanceHistoryItem[] {
  return currentAttendanceHistory
    .filter((item) => item.date >= from && item.date <= to)
    .map((item) => clone(item));
}

/*
|--------------------------------------------------------------------------
| Mock attendance action
|--------------------------------------------------------------------------
*/

export type MockPunchType = "CHECK_IN" | "CHECK_OUT";

export function mockPunchAttendance(checkType: MockPunchType): TodayAttendance {
  const now = new Date();

  const nowIso = toLocalWallClockIso(now);

  const nowTime = formatWallClockTime(now);

  const location = "Kandivali West, Mumbai";

  const latitude = 19.2074;
  const longitude = 72.8342;

  if (checkType === "CHECK_IN") {
    const punch: AttendancePunch = {
      id: Date.now(),
      checkType: "CHECK_IN",
      time: nowIso,
      location,
      latitude,
      longitude,
    };

    currentTodayAttendance = {
      ...currentTodayAttendance,

      date: getLocalDateKey(now),

      status: "CHECKED_IN",

      isCheckedIn: true,
      isCheckedOut: false,
      isAbsentToday: false,

      checkIn: punch,
      checkOut: null,

      checkInLocation: location,
      checkOutLocation: null,

      workMinutes: 0,
      breakMinutes: 0,

      workHours: "0h",
      breakTime: "0m",
    };
  }

  if (checkType === "CHECK_OUT") {
    if (
      !currentTodayAttendance.checkIn ||
      !currentTodayAttendance.isCheckedIn
    ) {
      throw new Error("You must check in before checking out.");
    }

    const checkInTime = currentTodayAttendance.checkIn.time;

    const workMinutes = checkInTime
      ? calculateMinutesBetween(checkInTime, nowIso)
      : currentTodayAttendance.workMinutes;

    const punch: AttendancePunch = {
      id: Date.now(),
      checkType: "CHECK_OUT",
      time: nowIso,
      location,
      latitude,
      longitude,
    };

    currentTodayAttendance = {
      ...currentTodayAttendance,

      date: getLocalDateKey(now),

      status: "CHECKED_OUT",

      isCheckedIn: false,
      isCheckedOut: true,
      isAbsentToday: false,

      checkOut: punch,

      checkOutLocation: location,

      workMinutes,

      workHours: formatWorkHours(workMinutes),
    };
  }

  updateTodayHistory();

  return getMockTodayAttendance();
}

/*
|--------------------------------------------------------------------------
| History synchronization
|--------------------------------------------------------------------------
*/

function updateTodayHistory() {
  const today = currentTodayAttendance.date;

  const historyItem: AttendanceHistoryItem = {
    id: currentTodayAttendance.checkIn?.id ?? Date.now(),

    date: today,

    status: currentTodayAttendance.isAbsentToday ? "ABSENT" : "PRESENT",

    checkIn: currentTodayAttendance.checkIn
      ? formatIsoTime(currentTodayAttendance.checkIn.time)
      : null,

    checkOut: currentTodayAttendance.checkOut
      ? formatIsoTime(currentTodayAttendance.checkOut.time)
      : null,

    breakIn: currentTodayAttendance.breakIn
      ? formatIsoTime(currentTodayAttendance.breakIn.time)
      : null,

    breakOut: currentTodayAttendance.breakOut
      ? formatIsoTime(currentTodayAttendance.breakOut.time)
      : null,

    workHours: currentTodayAttendance.workHours,

    breakTime: currentTodayAttendance.breakTime,

    checkInLocation: currentTodayAttendance.checkInLocation,

    checkOutLocation: currentTodayAttendance.checkOutLocation,
  };

  const existingIndex = currentAttendanceHistory.findIndex(
    (item) => item.date === today,
  );

  if (existingIndex >= 0) {
    currentAttendanceHistory[existingIndex] = historyItem;
  } else {
    currentAttendanceHistory.unshift(historyItem);
  }
}

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toLocalWallClockIso(date: Date) {
  const dateKey = getLocalDateKey(date);

  const hours = String(date.getHours()).padStart(2, "0");

  const minutes = String(date.getMinutes()).padStart(2, "0");

  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${dateKey}T${hours}:${minutes}:${seconds}`;
}

function formatWallClockTime(date: Date) {
  const hours = date.getHours();

  const minutes = String(date.getMinutes()).padStart(2, "0");

  const period = hours >= 12 ? "PM" : "AM";

  const displayHour = hours % 12 === 0 ? 12 : hours % 12;

  return `${displayHour}:${minutes} ${period}`;
}

function formatIsoTime(value?: string | null) {
  if (!value) {
    return null;
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

function calculateMinutesBetween(from: string, to: string) {
  const fromDate = parseWallClockDate(from);
  const toDate = parseWallClockDate(to);

  const difference = toDate.getTime() - fromDate.getTime();

  return Math.max(0, Math.floor(difference / 60000));
}

function parseWallClockDate(value: string) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/,
  );

  if (!match) {
    return new Date(value);
  }

  const [, year, month, day, hours, minutes, seconds] = match;

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
    Number(seconds),
  );
}

function formatWorkHours(minutes: number) {
  const safeMinutes = Math.max(0, Math.floor(minutes));

  const hours = Math.floor(safeMinutes / 60);

  const remainingMinutes = safeMinutes % 60;

  return `${hours}.${String(remainingMinutes).padStart(2, "0")}h`;
}
