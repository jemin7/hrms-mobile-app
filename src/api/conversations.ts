import { apiRequest } from "./client";

export type ConversationRecipient = {
  id: number;
  employeeFirstName?: string | null;
  employeeLastName?: string | null;
  employeeID?: string | null;
};

export type ConversationReply = {
  id: number;
  description?: string | null;
  issuedBy?: string | null;
  createdAt?: string | null;
  senderEmployeeId?: number | null;
  attachmentPath?: string | null;
  undoneAt?: string | null;
};

export type EmployeeMemo = {
  id: number;
  serviceProviderID?: number | null;
  companyID?: number | null;
  branchesID?: number | null;
  employeeID?: number | null;
  employeeIDs?: number[];
  memoType?: string | null;
  subject?: string | null;
  description?: string | null;
  issuedDate?: string | null;
  issuedBy?: string | null;
  senderEmployeeId?: number | null;
  parentMemoId?: number | null;
  attachmentPath?: string | null;
  undoneAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  recipients?: ConversationRecipient[];
  manageEmployee?: {
    id?: number;
    employeeFirstName?: string | null;
    employeeLastName?: string | null;
    departmentName?: string | null;
    designation?: string | null;
    employeePhotoUrl?: string | null;
  };
  replies?: ConversationReply[];
};

export type CreateConversationMessage = {
  serviceProviderID?: number;
  companyID?: number;
  branchesID?: number;
  employeeID?: number;
  employeeIDs?: number[];
  memoType?: string;
  subject?: string;
  description?: string;
  issuedDate?: string;
  issuedBy?: string;
  issuedByRole?: string;
  senderEmployeeId?: number;
  attachmentPath?: string;
};

export type ReplyConversationMessage = {
  message: string;
  issuedBy?: string;
  issuedByRole?: string;
  senderEmployeeId?: number;
};

/** Load messages visible to the signed-in employee. */
export function getConversations(employeeId: number, token: string | null) {
  return apiRequest<EmployeeMemo[]>(
    `/employee-memo?employeeID=${encodeURIComponent(employeeId)}`,
    { method: "GET", token },
  );
}

/** Load one message and its replies. */
export function getConversationThread(messageId: number, token: string | null) {
  return apiRequest<EmployeeMemo>(`/employee-memo/${messageId}`, {
    method: "GET",
    token,
  });
}

/** Send a direct or group message using the existing backend. */
export function sendConversationMessage(
  data: CreateConversationMessage,
  token: string | null,
) {
  return apiRequest<EmployeeMemo>("/employee-memo", {
    method: "POST",
    token,
    body: JSON.stringify(data),
  });
}

/** Reply to an existing message thread. */
export function replyToConversation(
  messageId: number,
  data: ReplyConversationMessage,
  token: string | null,
) {
  return apiRequest<ConversationReply>(`/employee-memo/${messageId}/reply`, {
    method: "POST",
    token,
    body: JSON.stringify(data),
  });
}

/** Undo a message within the backend's allowed time window. */
export function undoConversationMessage(
  messageId: number,
  senderEmployeeId: number,
  token: string | null,
) {
  return apiRequest<EmployeeMemo>(
    `/employee-memo/${messageId}/undo?senderEmployeeId=${encodeURIComponent(senderEmployeeId)}`,
    { method: "POST", token },
  );
}

/** Delete a message using the existing endpoint. */
export function deleteConversationMessage(
  messageId: number,
  senderEmployeeId: number,
  token: string | null,
) {
  return apiRequest<EmployeeMemo>(
    `/employee-memo/${messageId}?senderEmployeeId=${encodeURIComponent(senderEmployeeId)}`,
    { method: "DELETE", token },
  );
}



export type ConversationContact = {
  id: number;
  employeeID?: string | null;
  employeeFirstName?: string | null;
  employeeLastName?: string | null;
  employeePhotoUrl?: string | null;
  designation?: string | null;
  departmentName?: string | null;
};

type TeamContactsResponse = {
  members?: ConversationContact[];
};

type ReporteesResponse = {
  reportees?: ConversationContact[];
};

type ColleaguesResponse = {
  colleagues?: {
    id: number;
    employeeID?: string | null;
    name?: string | null;
    employeePhotoUrl?: string | null;
  }[];
};

/** Load the same team, reportee, and colleague sources used by the website. */
export async function getConversationContacts(
  token: string | null,
): Promise<ConversationContact[]> {
  const results = await Promise.allSettled([
    apiRequest<TeamContactsResponse>(
      "/emp-manager-scope/team-today-status?scope=team",
      { token },
    ),
    apiRequest<ReporteesResponse>("/emp-manager-scope/reportees-today-status", {
      token,
    }),
    apiRequest<ColleaguesResponse>("/emp-manager-scope/delegation-colleagues", {
      token,
    }),
  ]);

  const byId = new Map<number, ConversationContact>();

  const add = (contact: ConversationContact) => {
    if (!Number.isFinite(contact.id) || contact.id <= 0) return;

    const existing = byId.get(contact.id);

    byId.set(contact.id, {
      ...existing,
      ...contact,
      employeeFirstName:
        contact.employeeFirstName ?? existing?.employeeFirstName,
      employeeLastName: contact.employeeLastName ?? existing?.employeeLastName,
      employeePhotoUrl: contact.employeePhotoUrl ?? existing?.employeePhotoUrl,
      designation: contact.designation ?? existing?.designation,
      departmentName: contact.departmentName ?? existing?.departmentName,
    });
  };

  const teamResult = results[0];
  if (teamResult.status === "fulfilled") {
    teamResult.value.members?.forEach(add);
  }

  const reporteesResult = results[1];
  if (reporteesResult.status === "fulfilled") {
    reporteesResult.value.reportees?.forEach(add);
  }

  const colleaguesResult = results[2];
  if (colleaguesResult.status === "fulfilled") {
    colleaguesResult.value.colleagues?.forEach((contact) => {
      const nameParts = (contact.name ?? "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

      add({
        id: contact.id,
        employeeID: contact.employeeID,
        employeeFirstName: nameParts[0] ?? null,
        employeeLastName: nameParts.slice(1).join(" ") || null,
        employeePhotoUrl: contact.employeePhotoUrl,
      });
    });
  }

  return [...byId.values()].sort((a, b) => {
    const nameA =
      `${a.employeeFirstName ?? ""} ${a.employeeLastName ?? ""}`.trim();
    const nameB =
      `${b.employeeFirstName ?? ""} ${b.employeeLastName ?? ""}`.trim();

    return nameA.localeCompare(nameB);
  });
}
