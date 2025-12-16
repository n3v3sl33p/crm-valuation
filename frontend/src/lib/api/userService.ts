import apiClient from "./apiClient";
import type { User } from "./types";

export const userService = {
    getAppraiserById: async (id: number): Promise<User> => {
        const response = await apiClient.get<User>(
            `/api/v1/users/appraisers/${id}/`,
        );
        return response.data;
    },
    getUserById: async (id: number): Promise<User> => {
        const response = await apiClient.get<User>(`/api/v1/users/${id}`);
        return response.data;
    },
    getCurrentUser: async (): Promise<User> => {
        const response = await apiClient.get<User>("/api/v1/users/me");
        return response.data;
    },
    getAppraisers: async (): Promise<User[]> => {
        const response = await apiClient.get<User[]>("/api/v1/users/appraisers");
        return response.data;
    },
};

