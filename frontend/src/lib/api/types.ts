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
    city: string;
    street: string;
    house_number: string;
    property_type: "APARTMENT" | "OFFICE" | "HOUSE" | "WAREHOUSE" | "COMMERCIAL";
    apartment_number?: string | null;
    office_number?: string | null;
    floor?: number | null;
    description?: string | null;
    id: number;
    status: "DRAFT" | "CREATED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "APPRAISER_ASSIGNED" | "APPROVED_BY_EMPLOYEE" | "REPORT_SUBMITTED" | "REPORT_APPROVED_BY_EMPLOYEE" | "RETURNED_TO_CLIENT" | "RETURNED_TO_APPRAISER";
    client_id: number;
    appraiser_id: number | null;
    assessment_date: string | null;
    report_url?: string | null;
    final_price?: number | null;
    condition_score?: number | null;
    location_score?: number | null;
    liquidity_score?: number | null;
    material_quality_score?: number | null;
    legal_purity_score?: number | null;
    comments: Comment[];
    created_at: string;
    updated_at: string;
}

export interface CreateValuationRequest {
    city: string;
    street: string;
    house_number: string;
    property_type: "APARTMENT" | "OFFICE" | "HOUSE";
    apartment_number?: string;
    office_number?: string;
    floor?: number;
    description?: string;
}

export interface UpdateValuationRequest {
    appraiser_id?: number;
    assessment_date?: string;
    status?: "DRAFT" | "CREATED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "APPRAISER_ASSIGNED" | "APPROVED_BY_EMPLOYEE" | "REPORT_SUBMITTED" | "REPORT_APPROVED_BY_EMPLOYEE" | "RETURNED_TO_CLIENT" | "RETURNED_TO_APPRAISER";
    comment_text?: string;
    city?: string;
    street?: string;
    house_number?: string;
    property_type?: "APARTMENT" | "OFFICE" | "HOUSE" | "WAREHOUSE" | "COMMERCIAL";
    apartment_number?: string | null;
    office_number?: string | null;
    floor?: number | null;
    description?: string | null;
    report_url?: string;
    final_price?: number;
    condition_score?: number;
    location_score?: number;
    liquidity_score?: number;
    material_quality_score?: number;
    legal_purity_score?: number;
}
