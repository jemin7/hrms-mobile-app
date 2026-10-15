import type { EmployeeProfile, EmployeePermissions } from "../api/profile";

export const MOCK_PROFILE: EmployeeProfile = {
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
};

export const MOCK_PERMISSIONS: EmployeePermissions = {
  canViewAttendance: true,
  canViewLeave: true,
  canViewReimbursement: true,
  canViewPayout: true,
  canViewTasks: true,
};
