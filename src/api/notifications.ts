import { apiRequest } from "./client";

export type EmployeeNotificationKind =
  | "birthday"
  | "holiday"
  | "leave"
  | "reimbursement"
  | "payslip"
  | "memo"
  | "general";

export type EmployeeNotification = {
  id: string | number;
  kind: EmployeeNotificationKind;
  title: string;
  body: string;
  emoji?: string | null;
  at: string;
  href?: string | null;
  subjectEmployeeId?: number | null;
  subjectEmployeeName?: string | null;
  isTeamItem?: boolean;
};

export type NotificationFeedResponse = {
  recent: EmployeeNotification[];
  older: EmployeeNotification[];
  hasMore: boolean;
};

export async function getNotificationFeed(
  token: string,
): Promise<NotificationFeedResponse> {
  if (!token) {
    throw new Error("Please sign in to load notifications.");
  }

  return apiRequest<NotificationFeedResponse>(
    "/emp-notifications/feed?recentDays=7&olderDays=90",
    {
      method: "GET",
      token,
    },
  );
}
