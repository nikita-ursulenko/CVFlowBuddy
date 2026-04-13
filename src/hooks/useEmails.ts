import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agentServerAPI } from "@/lib/api/agent-server";
import { toast } from "sonner";

export interface EmailItem {
  id: string;
  company: string;
  jobTitle: string;
  email: string;
  content: string;
  subject?: string;
  jobUrl?: string;
  status: 'pending' | 'sent' | 'error';
  timestamp: string;
}

export const useEmails = () => {
  const queryClient = useQueryClient();

  const {
    data: emails = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["emails"],
    queryFn: () => agentServerAPI.getEmails(),
    refetchInterval: 10000, // Автообновление каждые 10 сек
  });

  const sendEmailMutation = useMutation({
    mutationFn: (emailId: string) => agentServerAPI.sendEmail(emailId),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message || "Письмо отправлено!");
        queryClient.invalidateQueries({ queryKey: ["emails"] });
      } else {
        toast.error(result.message || "Ошибка при отправке");
      }
    },
    onError: () => {
      toast.error("Произошла ошибка при отправке");
    },
  });

  const pendingEmails = emails.filter((e: EmailItem) => e.status !== "sent");
  const sentEmails = emails.filter((e: EmailItem) => e.status === "sent");

  return {
    emails,
    pendingEmails,
    sentEmails,
    isLoading,
    isError,
    refetch,
    sendEmail: sendEmailMutation.mutate,
    isSending: sendEmailMutation.isPending,
  };
};
