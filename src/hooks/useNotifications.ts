import { useQuery } from "@tanstack/react-query";

import { getNotificationFeed } from "../api/notifications";
import { useAuth } from "../auth/AuthProvider";

export function useNotifications() {
  const { user, accessToken } = useAuth();

  return useQuery({
    queryKey: ["notifications", "feed", user?.id],
    queryFn: () => {
      if (!accessToken) {
        throw new Error("Please sign in to load notifications.");
      }

      return getNotificationFeed(accessToken);
    },
    enabled: Boolean(user && accessToken),
    staleTime: 30 * 1000,
    retry: 1,
  });
}
