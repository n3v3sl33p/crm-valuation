import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { valuationService } from "@/lib/api/valuationService";
import { userService } from "@/lib/api/userService";
import type {
    Valuation,
    User,
    UpdateValuationRequest,
} from "@/lib/api/types";

const updateValuationSchema = z.object({
    address: z.string().min(1, "Адрес обязателен для заполнения"),
    property_type: z.string().min(1, "Тип недвижимости обязателен"),
    room_count: z
        .number()
        .min(1, "Количество комнат должно быть больше 0")
        .int("Количество комнат должно быть целым числом"),
    room_details: z.string().min(1, "Детали комнат обязательны"),
    comment_text: z.string().optional(),
});

const statusActionSchema = z.object({
    status: z.string().optional(),
    appraiser_id: z.number().optional(),
    comment_text: z.string().min(1, "Комментарий обязателен"),
});

type UpdateValuationForm = z.infer<typeof updateValuationSchema>;
type StatusActionForm = z.infer<typeof statusActionSchema>;

export function ValuationDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [valuation, setValuation] = useState<Valuation | null>(null);
    const [appraiser, setAppraiser] = useState<User | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [appraisers, setAppraisers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const form = useForm<UpdateValuationForm>({
        resolver: zodResolver(updateValuationSchema),
        defaultValues: {
            address: "",
            property_type: "",
            room_count: 1,
            room_details: "",
            comment_text: "",
        },
    });

    const statusForm = useForm<StatusActionForm>({
        resolver: zodResolver(statusActionSchema),
        defaultValues: {
            status: "",
            appraiser_id: undefined,
            comment_text: "",
        },
    });

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;

            try {
                setLoading(true);
                
                // Загружаем текущего пользователя
                const user = await userService.getCurrentUser();
                setCurrentUser(user);

                // Загружаем заявку
                const data = await valuationService.getValuationById(
                    parseInt(id),
                );
                setValuation(data);
                form.reset({
                    address: data.address,
                    property_type: data.property_type,
                    room_count: data.room_count,
                    room_details: data.room_details,
                    comment_text: "",
                });

                // Загружаем оценщика, если он назначен
                if (data.appraiser_id) {
                    try {
                        const appraiserData = await userService.getUserById(
                            data.appraiser_id,
                        );
                        setAppraiser(appraiserData);
                    } catch (err) {
                        console.error("Error fetching appraiser:", err);
                    }
                } else {
                    setAppraiser(null);
                }

                // Загружаем список оценщиков для EMPLOYEE
                if (user.role === "EMPLOYEE") {
                    try {
                        const appraisersList = await userService.getAppraisers();
                        setAppraisers(appraisersList);
                    } catch (err) {
                        console.error("Error fetching appraisers:", err);
                    }
                }

                setError(null);
            } catch (err) {
                setError("Не удалось загрузить данные");
                console.error("Error fetching data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, form]);

    const refreshValuation = async () => {
        if (!id) return;
        try {
            const data = await valuationService.getValuationById(parseInt(id));
            setValuation(data);
            
            if (data.appraiser_id) {
                const appraiserData = await userService.getUserById(
                    data.appraiser_id,
                );
                setAppraiser(appraiserData);
            } else {
                setAppraiser(null);
            }
        } catch (err) {
            console.error("Error refreshing valuation:", err);
        }
    };

    const handleUpdateValuation = async (data: UpdateValuationForm) => {
        if (!id || !valuation) return;

        try {
            setIsSubmitting(true);
            const updateData: UpdateValuationRequest = {
                address: data.address,
                property_type: data.property_type,
                room_count: data.room_count,
                room_details: data.room_details,
                status: "CREATED",
                appraiser_id: valuation.appraiser_id || 0,
            };

            if (data.comment_text && data.comment_text.trim()) {
                updateData.comment_text = data.comment_text;
            }

            await valuationService.updateValuation(parseInt(id), updateData);
            toast.success("Заявка успешно обновлена!");
            form.setValue("comment_text", "");
            await refreshValuation();
        } catch (err) {
            console.error("Error updating valuation:", err);
            toast.error("Не удалось обновить заявку");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStatusAction = async (data: StatusActionForm) => {
        if (!id || !valuation) return;

        try {
            setIsSubmitting(true);
            const updateData: UpdateValuationRequest = {
                comment_text: data.comment_text,
            };

            let successMessage = "Действие выполнено успешно!";

            if (data.status) {
                updateData.status = data.status as UpdateValuationRequest["status"];
                
                // Определяем сообщение в зависимости от статуса
                if (data.status === "APPROVED_BY_EMPLOYEE") {
                    successMessage = "Заявка успешно одобрена!";
                } else if (data.status === "REPORT_SUBMITTED") {
                    successMessage = "Отчет успешно сдан!";
                } else if (data.status === "REPORT_APPROVED_BY_EMPLOYEE") {
                    successMessage = "Отчет успешно утвержден!";
                } else if (data.status === "COMPLETED") {
                    successMessage = "Работа успешно принята!";
                }
            }

            if (data.appraiser_id !== undefined) {
                updateData.appraiser_id = data.appraiser_id;
                successMessage = "Оценщик успешно назначен!";
            }

            await valuationService.updateValuation(parseInt(id), updateData);
            toast.success(successMessage);
            statusForm.reset();
            await refreshValuation();
        } catch (err) {
            console.error("Error updating status:", err);
            toast.error("Не удалось выполнить действие");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteValuation = async () => {
        if (!id || !valuation || valuation.status !== "CREATED") {
            return;
        }

        try {
            setIsDeleting(true);
            await valuationService.deleteValuation(parseInt(id));
            toast.success("Заявка успешно удалена!");
            navigate("/dashboard/applications");
        } catch (err) {
            console.error("Error deleting valuation:", err);
            toast.error("Не удалось удалить заявку");
        } finally {
            setIsDeleting(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("ru-RU", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getStatusLabel = (status: string) => {
        const statusMap: Record<string, string> = {
            CREATED: "Создана",
            IN_PROGRESS: "В работе",
            COMPLETED: "Завершена",
            CANCELLED: "Отменена",
            APPRAISER_ASSIGNED: "Оценщик назначен",
            APPROVED_BY_EMPLOYEE: "Одобрена сотрудником",
            REPORT_SUBMITTED: "Отчет сдан",
            REPORT_APPROVED_BY_EMPLOYEE: "Отчет утвержден",
        };
        return statusMap[status] || status;
    };

    if (loading) {
        return (
            <div>
                <h1 className="text-3xl font-bold mb-4">Детали заявки</h1>
                <p className="text-muted-foreground">Загрузка...</p>
            </div>
        );
    }

    if (error || !valuation || !currentUser) {
        return (
            <div>
                <h1 className="text-3xl font-bold mb-4">Детали заявки</h1>
                <p className="text-red-500">
                    {error || "Заявка не найдена"}
                </p>
            </div>
        );
    }

    const canEdit = valuation.status === "CREATED" && currentUser.role === "CLIENT";
    const isEmployee = currentUser.role === "EMPLOYEE";
    const isAppraiser = currentUser.role === "APPRAISER";
    const isClient = currentUser.role === "CLIENT";

    // Определяем доступные действия в зависимости от роли и статуса
    const canApprove = isEmployee && valuation.status === "CREATED";
    const canAssignAppraiser = isEmployee && valuation.status === "APPROVED_BY_EMPLOYEE";
    const canSubmitReport = isAppraiser && valuation.status === "APPRAISER_ASSIGNED";
    const canApproveReport = isEmployee && valuation.status === "REPORT_SUBMITTED";
    const canComplete = isClient && valuation.status === "REPORT_APPROVED_BY_EMPLOYEE";

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold">Детали заявки</h1>
                {canEdit && (
                    <Button
                        variant="destructive"
                        onClick={handleDeleteValuation}
                        disabled={isDeleting}
                    >
                        {isDeleting ? "Удаление..." : "Удалить заявку"}
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Левая колонка - информация о заявке */}
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-muted-foreground">
                                ID
                            </label>
                            <p className="mt-1 text-sm">{valuation.id}</p>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted-foreground">
                                Статус
                            </label>
                            <p className="mt-1 text-sm">
                                {getStatusLabel(valuation.status)}
                            </p>
                        </div>
                    </div>

                    {canEdit ? (
                        <form
                            onSubmit={form.handleSubmit(handleUpdateValuation)}
                            className="space-y-3"
                        >
                            <FieldGroup>
                                <Controller
                                    name="address"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="address">
                                                Адрес
                                            </FieldLabel>
                                            <Input
                                                {...field}
                                                id="address"
                                                placeholder="Введите адрес"
                                                aria-invalid={fieldState.invalid}
                                                className="h-9"
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
                                    name="property_type"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="property_type">
                                                Тип недвижимости
                                            </FieldLabel>
                                            <Input
                                                {...field}
                                                id="property_type"
                                                placeholder="Например: Квартира, Дом"
                                                aria-invalid={fieldState.invalid}
                                                className="h-9"
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
                                    name="room_count"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="room_count">
                                                Количество комнат
                                            </FieldLabel>
                                            <Input
                                                {...field}
                                                id="room_count"
                                                type="number"
                                                min="1"
                                                onChange={(e) =>
                                                    field.onChange(
                                                        parseInt(
                                                            e.target.value,
                                                        ) || 0,
                                                    )
                                                }
                                                value={field.value}
                                                placeholder="Введите количество комнат"
                                                aria-invalid={fieldState.invalid}
                                                className="h-9"
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
                                    name="room_details"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="room_details">
                                                Детали комнат
                                            </FieldLabel>
                                            <Input
                                                {...field}
                                                id="room_details"
                                                placeholder="Опишите детали комнат"
                                                aria-invalid={fieldState.invalid}
                                                className="h-9"
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
                                    name="comment_text"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="comment_text">
                                                Комментарий (необязательно)
                                            </FieldLabel>
                                            <textarea
                                                {...field}
                                                id="comment_text"
                                                placeholder="Добавьте комментарий к заявке"
                                                aria-invalid={fieldState.invalid}
                                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                rows={3}
                                            />
                                            {fieldState.invalid && (
                                                <FieldError
                                                    errors={[fieldState.error]}
                                                />
                                            )}
                                        </Field>
                                    )}
                                />
                            </FieldGroup>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full"
                            >
                                {isSubmitting ? "Сохранение..." : "Сохранить"}
                            </Button>
                        </form>
                    ) : (
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground">
                                    Адрес
                                </label>
                                <p className="mt-1 text-sm">
                                    {valuation.address}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground">
                                    Тип недвижимости
                                </label>
                                <p className="mt-1 text-sm">
                                    {valuation.property_type}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground">
                                    Количество комнат
                                </label>
                                <p className="mt-1 text-sm">
                                    {valuation.room_count}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground">
                                    Детали комнат
                                </label>
                                <p className="mt-1 text-sm">
                                    {valuation.room_details}
                                </p>
                            </div>
                        </div>
                    )}

                    <Separator />

                    {/* Действия для EMPLOYEE */}
                    {canApprove && (
                        <form
                            onSubmit={statusForm.handleSubmit((data) =>
                                handleStatusAction({
                                    ...data,
                                    status: "APPROVED_BY_EMPLOYEE",
                                }),
                            )}
                            className="space-y-3 border rounded-lg p-4"
                        >
                            <h3 className="text-sm font-semibold mb-3">
                                Одобрить заявку
                            </h3>
                            <FieldGroup>
                                <Controller
                                    name="comment_text"
                                    control={statusForm.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="approve_comment">
                                                Комментарий
                                            </FieldLabel>
                                            <textarea
                                                {...field}
                                                id="approve_comment"
                                                placeholder="Например: Заявка принята. Ищем оценщика."
                                                aria-invalid={fieldState.invalid}
                                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                rows={3}
                                            />
                                            {fieldState.invalid && (
                                                <FieldError
                                                    errors={[fieldState.error]}
                                                />
                                            )}
                                        </Field>
                                    )}
                                />
                            </FieldGroup>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full"
                            >
                                {isSubmitting
                                    ? "Одобрение..."
                                    : "Одобрить заявку"}
                            </Button>
                        </form>
                    )}

                    {canAssignAppraiser && (
                        <form
                            onSubmit={statusForm.handleSubmit((data) =>
                                handleStatusAction({
                                    ...data,
                                    appraiser_id: data.appraiser_id,
                                }),
                            )}
                            className="space-y-3 border rounded-lg p-4"
                        >
                            <h3 className="text-sm font-semibold mb-3">
                                Назначить оценщика
                            </h3>
                            <FieldGroup>
                                <Controller
                                    name="appraiser_id"
                                    control={statusForm.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="appraiser_id">
                                                Оценщик
                                            </FieldLabel>
                                            <select
                                                {...field}
                                                id="appraiser_id"
                                                onChange={(e) =>
                                                    field.onChange(
                                                        e.target.value
                                                            ? parseInt(
                                                                  e.target.value,
                                                              )
                                                            : undefined,
                                                    )
                                                }
                                                value={field.value || ""}
                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            >
                                                <option value="">
                                                    Выберите оценщика
                                                </option>
                                                {appraisers.map((app) => (
                                                    <option
                                                        key={app.id}
                                                        value={app.id}
                                                    >
                                                        {app.first_name}{" "}
                                                        {app.last_name} (
                                                        {app.email})
                                                    </option>
                                                ))}
                                            </select>
                                            {fieldState.invalid && (
                                                <FieldError
                                                    errors={[fieldState.error]}
                                                />
                                            )}
                                        </Field>
                                    )}
                                />
                                <Controller
                                    name="comment_text"
                                    control={statusForm.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="assign_comment">
                                                Комментарий
                                            </FieldLabel>
                                            <textarea
                                                {...field}
                                                id="assign_comment"
                                                placeholder="Например: Назначен оценщик user3."
                                                aria-invalid={fieldState.invalid}
                                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                rows={3}
                                            />
                                            {fieldState.invalid && (
                                                <FieldError
                                                    errors={[fieldState.error]}
                                                />
                                            )}
                                        </Field>
                                    )}
                                />
                            </FieldGroup>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full"
                            >
                                {isSubmitting
                                    ? "Назначение..."
                                    : "Назначить оценщика"}
                            </Button>
                        </form>
                    )}

                    {/* Действия для APPRAISER */}
                    {canSubmitReport && (
                        <form
                            onSubmit={statusForm.handleSubmit((data) =>
                                handleStatusAction({
                                    ...data,
                                    status: "REPORT_SUBMITTED",
                                }),
                            )}
                            className="space-y-3 border rounded-lg p-4"
                        >
                            <h3 className="text-sm font-semibold mb-3">
                                Сдать отчет
                            </h3>
                            <FieldGroup>
                                <Controller
                                    name="comment_text"
                                    control={statusForm.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="report_comment">
                                                Содержание отчета
                                            </FieldLabel>
                                            <textarea
                                                {...field}
                                                id="report_comment"
                                                placeholder="Оценка завершена. Рыночная стоимость: 12 млн. руб. Ссылка на отчет: http://..."
                                                aria-invalid={fieldState.invalid}
                                                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                rows={5}
                                            />
                                            {fieldState.invalid && (
                                                <FieldError
                                                    errors={[fieldState.error]}
                                                />
                                            )}
                                        </Field>
                                    )}
                                />
                            </FieldGroup>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full"
                            >
                                {isSubmitting
                                    ? "Отправка..."
                                    : "Сдать отчет"}
                            </Button>
                        </form>
                    )}

                    {/* Действия для EMPLOYEE - утверждение отчета */}
                    {canApproveReport && (
                        <form
                            onSubmit={statusForm.handleSubmit((data) =>
                                handleStatusAction({
                                    ...data,
                                    status: "REPORT_APPROVED_BY_EMPLOYEE",
                                }),
                            )}
                            className="space-y-3 border rounded-lg p-4"
                        >
                            <h3 className="text-sm font-semibold mb-3">
                                Утвердить отчет
                            </h3>
                            <FieldGroup>
                                <Controller
                                    name="comment_text"
                                    control={statusForm.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="approve_report_comment">
                                                Комментарий
                                            </FieldLabel>
                                            <textarea
                                                {...field}
                                                id="approve_report_comment"
                                                placeholder="Отчет проверен, отправлен клиенту."
                                                aria-invalid={fieldState.invalid}
                                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                rows={3}
                                            />
                                            {fieldState.invalid && (
                                                <FieldError
                                                    errors={[fieldState.error]}
                                                />
                                            )}
                                        </Field>
                                    )}
                                />
                            </FieldGroup>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full"
                            >
                                {isSubmitting
                                    ? "Утверждение..."
                                    : "Утвердить отчет"}
                            </Button>
                        </form>
                    )}

                    {/* Действия для CLIENT - завершение заявки */}
                    {canComplete && (
                        <form
                            onSubmit={statusForm.handleSubmit((data) =>
                                handleStatusAction({
                                    ...data,
                                    status: "COMPLETED",
                                }),
                            )}
                            className="space-y-3 border rounded-lg p-4"
                        >
                            <h3 className="text-sm font-semibold mb-3">
                                Принять работу
                            </h3>
                            <FieldGroup>
                                <Controller
                                    name="comment_text"
                                    control={statusForm.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="complete_comment">
                                                Комментарий
                                            </FieldLabel>
                                            <textarea
                                                {...field}
                                                id="complete_comment"
                                                placeholder="Спасибо, работа принята."
                                                aria-invalid={fieldState.invalid}
                                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                rows={3}
                                            />
                                            {fieldState.invalid && (
                                                <FieldError
                                                    errors={[fieldState.error]}
                                                />
                                            )}
                                        </Field>
                                    )}
                                />
                            </FieldGroup>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full"
                            >
                                {isSubmitting
                                    ? "Принятие..."
                                    : "Принять работу"}
                            </Button>
                        </form>
                    )}

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-muted-foreground">
                                Дата создания
                            </label>
                            <p className="mt-1 text-xs">
                                {formatDate(valuation.created_at)}
                            </p>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted-foreground">
                                Дата обновления
                            </label>
                            <p className="mt-1 text-xs">
                                {formatDate(valuation.updated_at)}
                            </p>
                        </div>
                    </div>

                    {appraiser && (
                        <>
                            <Separator />
                            <div>
                                <h3 className="text-sm font-semibold mb-3">
                                    Оценщик
                                </h3>
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground">
                                            Имя
                                        </label>
                                        <p className="mt-1 text-sm">
                                            {appraiser.first_name}{" "}
                                            {appraiser.last_name}
                                            {appraiser.middle_name &&
                                                ` ${appraiser.middle_name}`}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground">
                                            Email
                                        </label>
                                        <p className="mt-1 text-sm">
                                            {appraiser.email}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground">
                                            Телефон
                                        </label>
                                        <p className="mt-1 text-sm">
                                            {appraiser.phone}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Правая колонка - комментарии */}
                <div>
                    {valuation.comments && valuation.comments.length > 0 ? (
                        <div>
                            <h2 className="text-lg font-semibold mb-4">
                                Комментарии ({valuation.comments.length})
                            </h2>
                            <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
                                {valuation.comments.map((comment, index) => (
                                    <div
                                        key={index}
                                        className="border rounded-lg p-3"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm font-medium">
                                                {comment.user_name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDate(comment.created_at)}
                                            </p>
                                        </div>
                                        <p className="text-sm">{comment.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <h2 className="text-lg font-semibold mb-4">
                                Комментарии
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Комментариев пока нет
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
