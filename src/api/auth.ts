import { ApiError, apiRequest } from "./client";

import {
  MOCK_LOGIN_RESPONSE,
  MOCK_PASSWORD,
  MOCK_USERNAME,
} from "../mock/auth";

export type EmployeeUser = {
  id: number;
  username: string;
  role: string;
  type: string;
  mustChangePassword?: boolean;
  isCompanyOwner?: boolean;
  ownerTitle?: string | null;

  employee?: {
    id: number;
    employeeID: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    department?: string;
    designation?: string;
    company?: string;
    branch?: string;
    allowCreateTaskOnMobile?: boolean;
    pwaShowLeaveBalance?: boolean;
    pwaShowLoanAdvances?: boolean;
  };

  serviceProviderID?: number | null;
  companyID?: number | null;
  branchesID?: number | null;
};

export type LoginResponse = {
  accessToken: string;
  user: EmployeeUser;
};

export type ForgotPasswordResponse = {
  message: string;
  resetToken: string;
  maskedEmail?: string;
};

export type VerifyForgotPasswordResponse = {
  message?: string;
};

function isMockAuthEnabled() {
  return __DEV__ && process.env.EXPO_PUBLIC_USE_MOCK_AUTH === "true";
}

export async function login(
  username: string,
  password: string,
): Promise<LoginResponse> {
  if (isMockAuthEnabled()) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (username.trim() !== MOCK_USERNAME || password !== MOCK_PASSWORD) {
      throw new ApiError(401, "Invalid username or password.");
    }

    return MOCK_LOGIN_RESPONSE;
  }

  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      username,
      password,
      client: "mobile",
    }),
  });
}

export async function forgotPassword(emailOrMobile: string) {
  return apiRequest<ForgotPasswordResponse>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({
      emailOrMobile,
    }),
  });
}

export async function verifyForgotPassword(data: {
  resetToken: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}) {
  return apiRequest<VerifyForgotPasswordResponse>(
    "/auth/forgot-password/verify",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function logout(token: string | null) {
  if (!token) return;

  if (isMockAuthEnabled()) {
    return;
  }

  await apiRequest<{ ok: boolean }>("/auth/logout", {
    method: "POST",
    token,
    body: JSON.stringify({}),
  });
}
