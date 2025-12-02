import {useMutation, useQueryClient} from "@tanstack/react-query";
import authService from "../services/authService";

export function useLogin() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: async (data: { email: string; password: string }) => {
            return await authService.login(data.email, data.password);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
            queryClient.invalidateQueries({ queryKey: ["cart", "items"] });
        },
    });
}