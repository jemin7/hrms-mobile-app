import { apiRequest } from "./client";

export type LeaveStatus =
  | "Pending"
  | "Approved"
  | "Accepted"
  | "Partially Approved"
  | "Rejected"
  | "RevokePending"
  | "Revoked";

export type LeaveRequest = {
  id: number;
  type: string;
  fromDate: string;
  toDate: string;
  days: string;
  status: LeaveStatus;
  purpose?: string | null;
};

export type LeaveBalance = Record<string, unknown> & {
  sick: number;
  casual: number;
  privileged: number;
  compOff: number | null;
  mtl: number;
  ptl: number;
  totalAvailable: number;
};

type RawLeaveApplication = {
  id: number;
  appliedLeaveType: string;
  fromDate: string;
  toDate: string;
  purpose?: string | null;
  status: LeaveStatus | string;
  dayStatuses?: unknown;
};

export type CreateLeaveRequest = {
  serviceProviderID: number;
  companyID: number;
  branchesID: number;
  manageEmployeeID: number;
  appliedLeaveType: string;
  fromDate: string;
  toDate: string;
  purpose: string;
  dayStatuses: string | unknown[];
  status?: "Pending";
};

function formatDateForDisplay(value: string) {
  const datePart = value.slice(0, 10);

  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return value;
  }

  const [, year, month, day] = match;

  const date = new Date(Number(year), Number(month) - 1, Number(day));

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function calculateDays(fromDate: string, toDate: string) {
  const from = parseDateOnly(fromDate);
  const to = parseDateOnly(toDate);

  const difference = to.getTime() - from.getTime();

  const days = Math.floor(difference / 86_400_000) + 1;

  return `${Math.max(1, days)} ${days === 1 ? "day" : "days"}`;
}

function parseDateOnly(value: string) {
  const datePart = value.slice(0, 10);

  const [year, month, day] = datePart.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function mapLeaveRequest(item: RawLeaveApplication): LeaveRequest {
  return {
    id: item.id,
    type: item.appliedLeaveType,
    fromDate: formatDateForDisplay(item.fromDate),
    toDate: formatDateForDisplay(item.toDate),
    days: calculateDays(item.fromDate, item.toDate),
    status: normalizeLeaveStatus(item.status),
    purpose: item.purpose ?? null,
  };
}

function normalizeLeaveStatus(value: string): LeaveStatus {
  const supported: LeaveStatus[] = [
    "Pending",
    "Approved",
    "Accepted",
    "Partially Approved",
    "Rejected",
    "RevokePending",
    "Revoked",
  ];

  return supported.includes(value as LeaveStatus)
    ? (value as LeaveStatus)
    : "Pending";
}

export async function getLeaveRequests(
  employeeId: number,
  token: string | null,
) {
  const response = await apiRequest<RawLeaveApplication[]>(
    `/leave-application/employee/${employeeId}`,
    {
      method: "GET",
      token,
    },
  );

  return response.map(mapLeaveRequest);
}

export async function getLeaveBalance(
  employeeId: number,
  token: string | null,
): Promise<LeaveBalance> {
  type UsageRecord = {
    sickUsed?: number | string | null;
    casualUsed?: number | string | null;
    privilegedUsed?: number | string | null;
    compOffUsed?: number | string | null;
    maternityUsed?: number | string | null;
    paternityUsed?: number | string | null;
  };

  type Policy = {
    sickLeaveCount?: number | string | null;
    casualLeaveCount?: number | string | null;
    maternityLeaveCount?: number | string | null;
    paternityLeaveCount?: number | string | null;
  };

  type EmployeePolicyResponse = {
    leavePolicy?: Policy | null;
    empLeavePolicy?: {
      effectFrom?: string | null;
      leavePolicy?: Policy | null;
    }[];
  };

  const [usage, employee, privilegedResponse] = await Promise.all([
    apiRequest<UsageRecord>(`/emp-leave-balance/employee/${employeeId}`, {
      token,
    }),
    apiRequest<EmployeePolicyResponse>(`/manage-emp/${employeeId}`, {
      token,
    }),
    apiRequest<{ balance?: number | string | null }>(
      `/privileged-leave/balance/${employeeId}`,
      { token },
    ).catch(() => null),
  ]);

  const policy =
    employee.leavePolicy ??
    [...(employee.empLeavePolicy ?? [])].sort(
      (a, b) =>
        new Date(b.effectFrom ?? 0).getTime() -
        new Date(a.effectFrom ?? 0).getTime(),
    )[0]?.leavePolicy ??
    {};

  const numberValue = (value: unknown): number => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  const remaining = (entitled: unknown, used: unknown) =>
    Math.max(numberValue(entitled) - numberValue(used), 0);

  const sick = remaining(policy.sickLeaveCount, usage.sickUsed);
  const casual = remaining(policy.casualLeaveCount, usage.casualUsed);

  const privileged = Math.max(numberValue(privilegedResponse?.balance), 0);

  // The current balance model has no Comp Off entitlement field.
  const compOff = null;

  const maternity = remaining(
    numberValue(policy.maternityLeaveCount) || 182,
    usage.maternityUsed,
  );

  const paternity = remaining(
    numberValue(policy.paternityLeaveCount) || 15,
    usage.paternityUsed,
  );

  return {
    sick,
    casual,
    privileged,
    compOff,
    mtl: maternity,
    ptl: paternity,
    totalAvailable: sick + casual + privileged,
  };
}

export async function getLeaveRequest(id: number, token: string | null) {
  return apiRequest<RawLeaveApplication>(`/leave-application/${id}`, {
    method: "GET",
    token,
  });
}

export async function createLeaveRequest(
  data: CreateLeaveRequest,
  token: string | null,
) {
  return apiRequest<RawLeaveApplication>("/leave-application", {
    method: "POST",
    token,
    body: JSON.stringify(data),
  });
}

export async function revokeLeaveRequest(
  id: number,
  revokedReason: string | undefined,
  token: string | null,
) {
  return apiRequest<RawLeaveApplication>(`/leave-application/revoke/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify({
      revokedReason,
    }),
  });
}

export async function deleteLeaveRequest(id: number, token: string | null) {
  return apiRequest<void>(`/leave-application/${id}`, {
    method: "DELETE",
    token,
  });
}
