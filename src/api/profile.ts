import { apiRequest } from "./client";

import { MOCK_PERMISSIONS, MOCK_PROFILE } from "../mock/profile";

export type EmployeeProfile = {
  id: number;
  employeeID?: string;

  firstName?: string;
  lastName?: string;

  email?: string;
  phone?: string;

  department?: string;
  designation?: string;

  company?: string;
  branch?: string;
};

export type EmployeePermissions = {
  [key: string]: unknown;
};

function isMockDataEnabled() {
  return __DEV__ && process.env.EXPO_PUBLIC_USE_MOCK_DATA === "true";
}

export async function getEmployeeProfile(
  employeeId: number,
  token: string | null,
): Promise<EmployeeProfile> {
  if (isMockDataEnabled()) {
    return MOCK_PROFILE;
  }

  return apiRequest<EmployeeProfile>(`/manage-emp/${employeeId}`, {
    method: "GET",
    token,
  });
}

export async function getEmployeePermissions(
  token: string | null,
): Promise<EmployeePermissions> {
  if (isMockDataEnabled()) {
    return MOCK_PERMISSIONS;
  }

  return apiRequest<EmployeePermissions>("/employee-permissions/me", {
    method: "GET",
    token,
  });
}
