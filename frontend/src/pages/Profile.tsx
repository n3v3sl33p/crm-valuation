import { useEffect, useState } from "react";
import { userService } from "@/lib/api/userService";
import type { User } from "@/lib/api/types";

export function Profile() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                setLoading(true);
                const data = await userService.getCurrentUser();
                setUser(data);
                setError(null);
            } catch (err) {
                setError("Не удалось загрузить данные пользователя");
                console.error("Error fetching user:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    if (loading) {
        return (
            <div>
                <h1 className="text-3xl font-bold mb-4">Профиль</h1>
                <p className="text-muted-foreground">Загрузка...</p>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div>
                <h1 className="text-3xl font-bold mb-4">Профиль</h1>
                <p className="text-red-500">
                    {error || "Пользователь не найден"}
                </p>
            </div>
        );
    }

    const getRoleLabel = (role: string) => {
        const roleMap: Record<string, string> = {
            CLIENT: "Клиент",
            EMPLOYEE: "Сотрудник",
            APPRAISER: "Оценщик",
            ADMIN: "Администратор",
            MANAGER: "Менеджер",
        };
        return roleMap[role] || role;
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Профиль</h1>

            <div className="space-y-6 max-w-2xl">
                <div className="grid gap-6 md:grid-cols-2">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">
                            ID
                        </label>
                        <p className="mt-1 text-sm">{user.id}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">
                            Роль
                        </label>
                        <p className="mt-1 text-sm">{getRoleLabel(user.role)}</p>
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium text-muted-foreground">
                        Имя
                    </label>
                    <p className="mt-1 text-sm">
                        {user.first_name} {user.last_name}
                        {user.middle_name && ` ${user.middle_name}`}
                    </p>
                </div>

                <div>
                    <label className="text-sm font-medium text-muted-foreground">
                        Email
                    </label>
                    <p className="mt-1 text-sm">{user.email}</p>
                </div>

                <div>
                    <label className="text-sm font-medium text-muted-foreground">
                        Телефон
                    </label>
                    <p className="mt-1 text-sm">{user.phone}</p>
                </div>
            </div>
        </div>
    );
}

