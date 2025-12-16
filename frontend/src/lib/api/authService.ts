import apiClient from "./apiClient";
import type {
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
} from "./types";

export const authService = {
    login: async (email: string, password: string): Promise<LoginResponse> => {
        const data: LoginRequest = {
            grant_type: "password",
            username: email,
            password: password,
            scope: "",
            client_id: null,
            client_secret: null,
        };

        const response = await apiClient.post<LoginResponse>(
            "/api/v1/auth/login",
            new URLSearchParams(data as any),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            },
        );
        return response.data;
    },

    register: async (data: RegisterRequest): Promise<RegisterResponse> => {
        const response = await apiClient.post<RegisterResponse>(
            "/api/v1/users/register",
            data,
        );
        return response.data;
    },

    logout: () => {
        localStorage.removeItem("access_token");
    },
};
