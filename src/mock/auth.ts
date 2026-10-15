import type { LoginResponse } from "../api/auth";

export const MOCK_USERNAME = "test";
export const MOCK_PASSWORD = "test123";

export const MOCK_LOGIN_RESPONSE: LoginResponse = {
  accessToken: "mock-access-token",
  user: {
    id: 1,
    username: MOCK_USERNAME,
    role: "EMPLOYEE",
    type: "EMPLOYEE",
    mustChangePassword: false,
    isCompanyOwner: false,
    employee: {
      id: 1,
      employeeID: "EMP001",
      firstName: "Test",
      lastName: "Employee",
      email: "test@example.com",
      phone: "9999999999",
      department: "IT",
      designation: "Software Developer",
      company: "Demo Company",
      branch: "Mumbai",
      allowCreateTaskOnMobile: true,
      pwaShowLeaveBalance: true,
      pwaShowLoanAdvances: false,
    },
    serviceProviderID: 1,
    companyID: 1,
    branchesID: 1,
  },
};
