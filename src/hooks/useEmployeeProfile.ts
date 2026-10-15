import { useQuery } from "@tanstack/react-query";

import { getEmployeePermissions, getEmployeeProfile } from "../api/profile";
import { useAuth } from "../auth/AuthProvider";

export function useEmployeeProfile() {
  const { accessToken, user } = useAuth();

  const employeeId = user?.employee?.id ?? user?.id ?? null;

  const profileQuery = useQuery({
    queryKey: ["employee-profile", employeeId],
    queryFn: () => getEmployeeProfile(employeeId!, accessToken),
    enabled: Boolean(employeeId && accessToken),
  });

  const permissionsQuery = useQuery({
    queryKey: ["employee-permissions"],
    queryFn: () => getEmployeePermissions(accessToken),
    enabled: Boolean(accessToken),
  });

  return {
    employeeId,
    profile: profileQuery.data ?? null,
    permissions: permissionsQuery.data ?? null,

    isLoading: profileQuery.isLoading || permissionsQuery.isLoading,

    isFetching: profileQuery.isFetching || permissionsQuery.isFetching,

    error: profileQuery.error ?? permissionsQuery.error ?? null,

    refetch: async () => {
      await Promise.all([profileQuery.refetch(), permissionsQuery.refetch()]);
    },
  };
}
