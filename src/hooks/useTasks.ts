import { useQuery } from "@tanstack/react-query";

import { getTasks } from "../api/tasks";
import { useAuth } from "../auth/AuthProvider";

type UseTasksOptions = {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
};

export function useTasks(options: UseTasksOptions = {}) {
  const { user, accessToken } = useAuth();

  const search = options.search?.trim() ?? "";
  const status = options.status?.trim() ?? "";
  const page = options.page ?? 1;
  const limit = options.limit ?? 50;

  return useQuery({
    queryKey: [
      "tasks",
      "list",
      user?.id,
      user?.employee?.id,
      search,
      status,
      page,
      limit,
    ],

    queryFn: () => {
      if (!user || !accessToken) {
        throw new Error("Please sign in to load your tasks.");
      }

      return getTasks(
        {
          user,
          search,
          status: status || undefined,
          page,
          limit,
        },
        accessToken,
      );
    },

    enabled: Boolean(user && accessToken),

    staleTime: 30 * 1000,

    retry: 1,
  });
}
