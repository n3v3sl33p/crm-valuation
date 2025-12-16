export interface LoginRequest {
    grant_type: string;
    username: string;
    password: string;
    scope?: string;
    client_id?: string | null;
    client_secret?: string | null;
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
}

export interface RegisterRequest {
    email: string;
    phone: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
    role: "CLIENT" | "ADMIN" | "MANAGER";
    password: string;
}

export interface RegisterResponse {
    email: string;
    phone: string;
    first_name: string;
    last_name: string;
    middle_name: string;
    role: string;
    id: number;
}

export interface User {
    id: number;
    email: string;
    phone: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
    role: string;
}

export interface Comment {
    role: string;
    text: string;
    created_at: string;
    user_name: string;
}

export interface Valuation {
    address: string;
    property_type: string;
    room_count: number;
    room_details: string;
    id: number;
    status: "CREATED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "APPRAISER_ASSIGNED" | "APPROVED_BY_EMPLOYEE" | "REPORT_SUBMITTED" | "REPORT_APPROVED_BY_EMPLOYEE";
    client_id: number;
    appraiser_id: number | null;
    comments: Comment[];
    created_at: string;
    updated_at: string;
}

export interface CreateValuationRequest {
    address: string;
    property_type: string;
    room_count: number;
    room_details: string;
}

export interface UpdateValuationRequest {
    appraiser_id?: number;
    status?: "CREATED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "APPRAISER_ASSIGNED" | "APPROVED_BY_EMPLOYEE" | "REPORT_SUBMITTED" | "REPORT_APPROVED_BY_EMPLOYEE";
    comment_text?: string;
    address?: string;
    property_type?: string;
    room_count?: number;
    room_details?: string;
}
