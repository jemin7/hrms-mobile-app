import { useQuery } from "@tanstack/react-query";

import { getHolidays } from "../api/holidays";
import { useAuth } from "../auth/AuthProvider";

export function useHolidays() {
  const { user, accessToken } = useAuth();

  return useQuery({
    queryKey: ["holidays", user?.id],
    queryFn: () => getHolidays(accessToken),
    enabled: Boolean(user && accessToken),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
