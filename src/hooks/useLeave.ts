import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createLeaveRequest,
  deleteLeaveRequest,
  getLeaveBalance,
  getLeaveRequest,
  getLeaveRequests,
  revokeLeaveRequest,
  type CreateLeaveRequest,
} from "../api/leave";

import { useAuth } from "../auth/AuthProvider";

function getEmployeeId(user: ReturnType<typeof useAuth>["user"]) {
  return user?.employee?.id ?? user?.id ?? null;
}

export function useLeaveRequests() {
  const { user, accessToken } = useAuth();
  const employeeId = getEmployeeId(user);

  return useQuery({
    queryKey: ["leave", "requests", employeeId],
    queryFn: () => {
      if (!employeeId) {
        throw new Error("Employee ID is not available.");
      }

      return getLeaveRequests(employeeId, accessToken);
    },
    enabled: !!employeeId && !!accessToken,
    staleTime: 30 * 1000,
    retry: 1,
  });
}

export function useLeaveBalance() {
  const { user, accessToken } = useAuth();
  const employeeId = getEmployeeId(user);

  return useQuery({
    queryKey: ["leave", "balance", employeeId],
    queryFn: () => {
      if (!employeeId) {
        throw new Error("Employee ID is not available.");
      }

      return getLeaveBalance(employeeId, accessToken);
    },
    enabled: !!employeeId && !!accessToken,
    staleTime: 30 * 1000,
    retry: 1,
  });
}

export function useLeaveRequest(id: number | undefined) {
  const { accessToken } = useAuth();

  return useQuery({
    queryKey: ["leave", "request", id],
    queryFn: () => {
      if (id === undefined) {
        throw new Error("Leave request ID is not available.");
      }
      return getLeaveRequest(id, accessToken);
    },
    enabled: id !== undefined && !!accessToken,
    staleTime: 30 * 1000,
    retry: 1,
  });
}

export function useCreateLeaveRequest() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLeaveRequest) =>
      createLeaveRequest(data, accessToken),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["leave", "requests"] }),
        queryClient.invalidateQueries({ queryKey: ["leave", "balance"] }),
      ]);
    },
  });
}

export function useRevokeLeaveRequest() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      revokedReason,
    }: {
      id: number;
      revokedReason?: string;
    }) => revokeLeaveRequest(id, revokedReason, accessToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["leave", "requests"] });
    },
  });
}

export function useDeleteLeaveRequest() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteLeaveRequest(id, accessToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["leave", "requests"] });
    },
  });
}
