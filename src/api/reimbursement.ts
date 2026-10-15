import { apiRequest } from "./client";

export type ReimbursementStatus =
  | "Pending"
  | "Approved"
  | "Partially Approved"
  | "Rejected"
  | "Paid";

export type ReimbursementItem = {
  id: number;
  reimbursementType: string;
  amount: string;
  description: string;
  status?: string | null;
};

export type Reimbursement = {
  id: number;
  date: string;
  status: ReimbursementStatus;
  taskProjectID?: number | null;
  totalAmount: string;
  items: ReimbursementItem[];
};

type RawReimbursementItem = {
  id: number;
  reimbursementType?: string | null;
  amount?: string | number | null;
  description?: string | null;
  status?: string | null;
};

type RawReimbursement = {
  id: number;
  date?: string | null;
  status?: string | null;
  taskProjectID?: number | null;
  items?: RawReimbursementItem[] | null;
};

export type CreateReimbursementItem = {
  reimbursementType: string;
  amount: string;
  description: string;
};

export type CreateReimbursementRequest = {
  serviceProviderID: number;
  companyID: number;
  branchesID: number;
  manageEmployeeID: number;
  taskProjectID?: number | null;
  date: string;
  status?: "Pending";
  items: CreateReimbursementItem[];
};

export type UpdateReimbursementRequest = {
  taskProjectID?: number | null;
  date?: string;
  status?: ReimbursementStatus;
  items?: CreateReimbursementItem[];
};

export type ReimbursementItemDecision = {
  actorRole?: string;
};

function normalizeStatus(value?: string | null): ReimbursementStatus {
  switch (value) {
    case "Approved":
      return "Approved";

    case "Partially Approved":
      return "Partially Approved";

    case "Rejected":
      return "Rejected";

    case "Paid":
      return "Paid";

    default:
      return "Pending";
  }
}

function normalizeAmount(value?: string | number | null) {
  if (value === undefined || value === null || value === "") {
    return "0.00";
  }

  return String(value);
}

function mapItem(item: RawReimbursementItem): ReimbursementItem {
  return {
    id: item.id,
    reimbursementType: item.reimbursementType ?? "Other",
    amount: normalizeAmount(item.amount),
    description: item.description ?? "",
    status: item.status ?? null,
  };
}

function calculateTotal(items: ReimbursementItem[]) {
  return items
    .reduce((total, item) => {
      const amount = Number(item.amount);

      if (!Number.isFinite(amount)) {
        return total;
      }

      return total + amount;
    }, 0)
    .toFixed(2);
}

function mapReimbursement(item: RawReimbursement): Reimbursement {
  const mappedItems = (item.items ?? []).map(mapItem);

  return {
    id: item.id,
    date: item.date ?? "",
    status: normalizeStatus(item.status),
    taskProjectID: item.taskProjectID ?? null,
    totalAmount: calculateTotal(mappedItems),
    items: mappedItems,
  };
}

export async function getReimbursements(
  employeeId: number,
  token: string | null,
) {
  const response = await apiRequest<RawReimbursement[]>(
    `/reimbursement/employee/${employeeId}`,
    {
      method: "GET",
      token,
    },
  );

  return response.map(mapReimbursement);
}

export async function getReimbursement(id: number, token: string | null) {
  const response = await apiRequest<RawReimbursement>(`/reimbursement/${id}`, {
    method: "GET",
    token,
  });

  return mapReimbursement(response);
}

export async function createReimbursement(
  data: CreateReimbursementRequest,
  token: string | null,
) {
  const response = await apiRequest<RawReimbursement>("/reimbursement", {
    method: "POST",
    token,
    body: JSON.stringify(data),
  });

  return mapReimbursement(response);
}

export async function updateReimbursement(
  id: number,
  data: UpdateReimbursementRequest,
  token: string | null,
) {
  const response = await apiRequest<RawReimbursement>(`/reimbursement/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(data),
  });

  return mapReimbursement(response);
}

export async function deleteReimbursement(id: number, token: string | null) {
  return apiRequest<unknown>(`/reimbursement/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function approveReimbursementItem(
  reimbursementId: number,
  itemId: number,
  data: ReimbursementItemDecision,
  token: string | null,
) {
  const response = await apiRequest<RawReimbursement>(
    `/reimbursement/${reimbursementId}/items/${itemId}/approve`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    },
  );

  return mapReimbursement(response);
}

export async function rejectReimbursementItem(
  reimbursementId: number,
  itemId: number,
  data: ReimbursementItemDecision,
  token: string | null,
) {
  const response = await apiRequest<RawReimbursement>(
    `/reimbursement/${reimbursementId}/items/${itemId}/reject`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    },
  );

  return mapReimbursement(response);
}

export async function approveReimbursement(
  id: number,
  data: ReimbursementItemDecision,
  token: string | null,
) {
  const response = await apiRequest<RawReimbursement>(
    `/reimbursement/${id}/approval`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    },
  );

  return mapReimbursement(response);
}

export async function markReimbursementPaid(
  id: number,
  data: ReimbursementItemDecision,
  token: string | null,
) {
  const response = await apiRequest<RawReimbursement>(
    `/reimbursement/${id}/payment`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify(data),
    },
  );

  return mapReimbursement(response);
}
