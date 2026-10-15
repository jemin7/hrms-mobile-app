import { apiRequest } from "./client";

export type Holiday = {
  id: number | string;
  name: string;
  financialYear?: string | null;
  startDate: string;
  endDate?: string | null;
  isUpcoming: boolean;
};

const HOLIDAYS_REQUEST_TIMEOUT_MS = 7000;

export async function getHolidays(token: string | null): Promise<Holiday[]> {
  if (!token) {
    throw new Error("Please sign in to load holidays.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    HOLIDAYS_REQUEST_TIMEOUT_MS,
  );

  try {
    return await apiRequest<Holiday[]>("/emp-notifications/holidays", {
      method: "GET",
      token,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(
        "The holidays request timed out. The backend may be offline. Please try again when the server is running.",
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
