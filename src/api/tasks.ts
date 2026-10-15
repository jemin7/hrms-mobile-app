import { apiRequest } from "./client";
import type { EmployeeUser } from "./auth";

export type TaskProject = {
  id: number | string;
  taskName?: string | null;
  taskCode?: string | null;
  status?: string | null;
  priority?: string | null;
  description?: string | null;
  dueDate?: string | null;
  dueAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  [key: string]: unknown;
};

export type TaskListResponse = {
  items: TaskProject[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  statusCounts?: Record<string, number>;
};

export type GetTasksParams = {
  user: EmployeeUser;
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
};

export async function getTasks(
  params: GetTasksParams,
  token: string,
): Promise<TaskListResponse> {
  if (!token) {
    throw new Error("You must be signed in to load tasks.");
  }

  const { user, page = 1, limit = 50, search, status } = params;

  const query = new URLSearchParams();

  query.set("page", String(Math.max(1, page)));
  query.set("limit", String(Math.min(100, Math.max(1, limit))));
  query.set("assignedToMe", "1");
  query.set("viewerRole", "EMPLOYEE");
  query.set("viewerUserId", String(user.id));

  const employeeId = user.employee?.id;

  if (employeeId != null) {
    query.set("viewerEmployeeId", String(employeeId));
  }

  if (user.companyID != null) {
    query.set("companyID", String(user.companyID));
  }

  if (user.serviceProviderID != null) {
    query.set("serviceProviderID", String(user.serviceProviderID));
  }

  const trimmedSearch = search?.trim();

  if (trimmedSearch) {
    query.set("search", trimmedSearch);
  }

  if (status?.trim()) {
    query.set("status", status.trim());
  }

  return apiRequest<TaskListResponse>(`/task-projects?${query.toString()}`, {
    method: "GET",
    token,
  });
}
