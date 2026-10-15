import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../auth/AuthProvider";
import {
  approveReimbursement,
  approveReimbursementItem,
  createReimbursement,
  deleteReimbursement,
  getReimbursement,
  getReimbursements,
  markReimbursementPaid,
  rejectReimbursementItem,
  updateReimbursement,
  type CreateReimbursementRequest,
  type ReimbursementItemDecision,
  type UpdateReimbursementRequest,
} from "../api/reimbursement";

function getEmployeeId(user: ReturnType<typeof useAuth>["user"]) {
  const employeeId = user?.employee?.id ?? user?.id;
  return typeof employeeId === "number" ? employeeId : undefined;
}

export function useReimbursements() {
  const { user, accessToken } = useAuth();
  const employeeId = getEmployeeId(user);

  return useQuery({
    queryKey: ["reimbursement", "list", employeeId],
    queryFn: () => getReimbursements(employeeId!, accessToken),
    enabled: employeeId != null && !!accessToken,
  });
}

export function useReimbursement(id?: number) {
  const { accessToken } = useAuth();

  return useQuery({
    queryKey: ["reimbursement", "detail", id],
    queryFn: () => getReimbursement(id!, accessToken),
    enabled: !!id && !!accessToken,
  });
}

export function useCreateReimbursement() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReimbursementRequest) =>
      createReimbursement(data, accessToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reimbursement", "list"] });
    },
  });
}

export function useUpdateReimbursement() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: UpdateReimbursementRequest;
    }) => updateReimbursement(id, data, accessToken),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reimbursement", "list"] });
      queryClient.invalidateQueries({
        queryKey: ["reimbursement", "detail", variables.id],
      });
    },
  });
}

export function useDeleteReimbursement() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteReimbursement(id, accessToken),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["reimbursement", "list"] });
      queryClient.removeQueries({ queryKey: ["reimbursement", "detail", id] });
    },
  });
}

export function useApproveReimbursementItem() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reimbursementId,
      itemId,
      data,
    }: {
      reimbursementId: number;
      itemId: number;
      data: ReimbursementItemDecision;
    }) => approveReimbursementItem(reimbursementId, itemId, data, accessToken),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reimbursement", "list"] });
      queryClient.invalidateQueries({
        queryKey: ["reimbursement", "detail", variables.reimbursementId],
      });
    },
  });
}

export function useRejectReimbursementItem() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reimbursementId,
      itemId,
      data,
    }: {
      reimbursementId: number;
      itemId: number;
      data: ReimbursementItemDecision;
    }) => rejectReimbursementItem(reimbursementId, itemId, data, accessToken),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reimbursement", "list"] });
      queryClient.invalidateQueries({
        queryKey: ["reimbursement", "detail", variables.reimbursementId],
      });
    },
  });
}

export function useApproveReimbursement() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: ReimbursementItemDecision;
    }) => approveReimbursement(id, data, accessToken),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reimbursement", "list"] });
      queryClient.invalidateQueries({
        queryKey: ["reimbursement", "detail", variables.id],
      });
    },
  });
}

export function useMarkReimbursementPaid() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: ReimbursementItemDecision;
    }) => markReimbursementPaid(id, data, accessToken),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reimbursement", "list"] });
      queryClient.invalidateQueries({
        queryKey: ["reimbursement", "detail", variables.id],
      });
    },
  });
}
