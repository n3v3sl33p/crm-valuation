import axios from "axios";

// Используем относительный путь для работы через nginx proxy в Docker
// или абсолютный URL для разработки
// В Docker: установите VITE_API_BASE_URL=/api/v1
// Локально: http://localhost:8000/api/v1 (по умолчанию)
const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

const apiClient = axios.create({
    baseURL: baseURL,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
});

// Request interceptor для добавления токена авторизации
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("access_token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    },
);

// Response interceptor для обработки ошибок
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            // Токен истек или невалиден
            localStorage.removeItem("access_token");
            window.location.href = "/login";
        }
        return Promise.reject(error);
    },
);

export default apiClient;
