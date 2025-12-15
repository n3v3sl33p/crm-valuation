import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { Link } from "react-router-dom";
import * as z from "zod";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { authService } from "@/lib/api/authService";
import type { RegisterRequest } from "@/lib/api/types";

const registerSchema = z
    .object({
        lastName: z
            .string()
            .min(2, "Фамилия должна содержать минимум 2 символа")
            .max(50, "Фамилия должна содержать максимум 50 символов"),
        firstName: z
            .string()
            .min(2, "Имя должно содержать минимум 2 символа")
            .max(50, "Имя должно содержать максимум 50 символов"),
        middleName: z
            .string()
            .max(50, "Отчество должно содержать максимум 50 символов")
            .optional()
            .or(z.literal("")),
        phone: z
            .string()
            .min(10, "Номер телефона должен содержать минимум 10 цифр")
            .max(15, "Номер телефона должен содержать максимум 15 цифр"),
        email: z
            .string()
            .min(1, "Email обязателен для заполнения")
            .email("Введите корректный email адрес"),
        password: z
            .string()
            .min(6, "Пароль должен содержать минимум 8 символов")
            .max(50, "Пароль должен содержать максимум 50 символов"),
        confirmPassword: z.string().min(1, "Подтвердите пароль"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Пароли не совпадают",
        path: ["confirmPassword"],
    });

export function RegisterForm() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const form = useForm<z.infer<typeof registerSchema>>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            lastName: "",
            firstName: "",
            middleName: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    async function onSubmit(data: z.infer<typeof registerSchema>) {
        try {
            const { confirmPassword, ...rest } = data;
            const registerData: RegisterRequest = {
                email: rest.email,
                phone: rest.phone,
                first_name: rest.firstName,
                last_name: rest.lastName,
                middle_name: rest.middleName || "",
                role: "CLIENT",
                password: rest.password,
            };

            const response = await authService.register(registerData);
            console.log("Registration successful:", response);
            // TODO: Navigate to login or auto-login
        } catch (error) {
            console.error("Registration failed:", error);
            // TODO: Show error toast
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl">Регистрация</CardTitle>
                    <CardDescription>
                        Создайте аккаунт в системе оценки недвижимости
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form
                        id="register-form"
                        onSubmit={form.handleSubmit(onSubmit)}
                        noValidate
                    >
                        <FieldGroup>
                            <Controller
                                name="lastName"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="lastName">
                                            Фамилия
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="lastName"
                                            placeholder="Иванов"
                                            aria-invalid={fieldState.invalid}
                                        />
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />

                            <Controller
                                name="firstName"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="firstName">
                                            Имя
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="firstName"
                                            placeholder="Иван"
                                            aria-invalid={fieldState.invalid}
                                        />
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />

                            <Controller
                                name="middleName"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="middleName">
                                            Отчество{" "}
                                            <span className="text-muted-foreground">
                                                (необязательно)
                                            </span>
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="middleName"
                                            placeholder="Иванович"
                                            aria-invalid={fieldState.invalid}
                                        />
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />

                            <Controller
                                name="phone"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="phone">
                                            Телефон
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="phone"
                                            type="tel"
                                            placeholder="+7 (999) 123-45-67"
                                            aria-invalid={fieldState.invalid}
                                        />
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />

                            <Controller
                                name="email"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="email">
                                            Email
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="email"
                                            type="email"
                                            placeholder="example@mail.com"
                                            aria-invalid={fieldState.invalid}
                                        />
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />

                            <Controller
                                name="password"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="password">
                                            Пароль
                                        </FieldLabel>
                                        <div className="relative">
                                            <Input
                                                {...field}
                                                id="password"
                                                type={
                                                    showPassword
                                                        ? "text"
                                                        : "password"
                                                }
                                                placeholder="••••••••"
                                                className="pr-10"
                                                aria-invalid={
                                                    fieldState.invalid
                                                }
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowPassword(
                                                        !showPassword,
                                                    )
                                                }
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />

                            <Controller
                                name="confirmPassword"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="confirmPassword">
                                            Подтверждение пароля
                                        </FieldLabel>
                                        <div className="relative">
                                            <Input
                                                {...field}
                                                id="confirmPassword"
                                                type={
                                                    showConfirmPassword
                                                        ? "text"
                                                        : "password"
                                                }
                                                placeholder="••••••••"
                                                className="pr-10"
                                                aria-invalid={
                                                    fieldState.invalid
                                                }
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowConfirmPassword(
                                                        !showConfirmPassword,
                                                    )
                                                }
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                {showConfirmPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />
                        </FieldGroup>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button
                        type="submit"
                        form="register-form"
                        className="w-full"
                    >
                        Зарегистрироваться
                    </Button>
                    <p className="text-sm text-muted-foreground text-center">
                        Уже есть аккаунт?{" "}
                        <Link
                            to="/login"
                            className="text-primary hover:underline font-medium"
                        >
                            Войти
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
