import { useMutation } from "@tanstack/react-query";
import authService from "../services/authService";

export function useLogin() {
    return useMutation({
        mutationFn: async (data: { email: string; password: string }) => {
            return await authService.login(data.email, data.password);
        }
    });
}