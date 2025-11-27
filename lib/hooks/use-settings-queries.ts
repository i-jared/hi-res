import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateSettings, Settings } from "@/lib/firebase/collections";

export function useSettings(userId?: string) {
  return useQuery({
    queryKey: ["settings", userId],
    queryFn: async () => {
      if (userId) {
        return getSettings(userId);
      }
      return null;
    },
    enabled: !!userId,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: string;
      data: Partial<Pick<Settings, "google_font" | "current_team_id">>;
    }) => {
      await updateSettings(userId, data);
      return { userId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["settings", result.userId] });
    },
  });
}

