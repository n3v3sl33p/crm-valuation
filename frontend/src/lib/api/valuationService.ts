import apiClient from "./apiClient";
import type {
    Valuation,
    CreateValuationRequest,
    UpdateValuationRequest,
} from "./types";

export const valuationService = {
    getValuations: async (): Promise<Valuation[]> => {
        const response = await apiClient.get<Valuation[]>(
            "/valuations/",
        );
        return response.data;
    },
    getValuationById: async (id: number): Promise<Valuation> => {
        const response = await apiClient.get<Valuation>(
            `/valuations/${id}`,
        );
        return response.data;
    },
    createValuation: async (
        data: CreateValuationRequest,
    ): Promise<Valuation> => {
        const response = await apiClient.post<Valuation>(
            "/valuations/",
            data,
        );
        return response.data;
    },
    updateValuation: async (
        id: number,
        data: UpdateValuationRequest,
    ): Promise<Valuation> => {
        const response = await apiClient.patch<Valuation>(
            `/valuations/${id}`,
            data,
        );
        return response.data;
    },
    deleteValuation: async (id: number): Promise<void> => {
        await apiClient.delete(`/valuations/${id}`);
    },
};

