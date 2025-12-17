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
    city: z.string().min(1, "Город обязателен для заполнения"),
    street: z.string().min(1, "Улица обязательна для заполнения"),
    house_number: z.string().min(1, "Номер дома обязателен для заполнения"),
    property_type: z.enum(["APARTMENT", "OFFICE", "HOUSE", "WAREHOUSE", "COMMERCIAL"]),
    apartment_number: z.string().optional(),
    office_number: z.string().optional(),
    floor: z
        .number()
        .int("Этаж должен быть целым числом")
        .optional(),
    description: z.string().optional(),
    comment_text: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.property_type === "APARTMENT" && !data.apartment_number) {
        ctx.addIssue({
            code: "custom",
            message: "Номер квартиры обязателен для квартир",
            path: ["apartment_number"],
        });
    }
    if (data.property_type === "APARTMENT" && !data.floor) {
        ctx.addIssue({
            code: "custom",
            message: "Этаж обязателен для квартир",
            path: ["floor"],
        });
    }
    if (data.property_type === "OFFICE" && !data.office_number) {
        ctx.addIssue({
            code: "custom",
            message: "Номер офиса обязателен для офисов",
            path: ["office_number"],
        });
    }
});

const statusActionSchema = z.object({
    status: z.string().optional(),
    appraiser_id: z.number().optional(),
    assessment_date: z.string().optional(),
    comment_text: z.string().optional(),
    report_url: z.string().optional(),
    final_price: z.number().positive("Финальная стоимость должна быть больше 0").optional(),
    condition_score: z
        .number()
        .min(1, "Оценка состояния должна быть от 1 до 10")
        .max(10, "Оценка состояния должна быть от 1 до 10")
        .int("Оценка состояния должна быть целым числом")
        .optional(),
    location_score: z
        .number()
        .min(1, "Оценка локации должна быть от 1 до 10")
        .max(10, "Оценка локации должна быть от 1 до 10")
        .int("Оценка локации должна быть целым числом")
        .optional(),
    liquidity_score: z
        .number()
        .min(1, "Ликвидность должна быть от 1 до 10")
        .max(10, "Ликвидность должна быть от 1 до 10")
        .int("Ликвидность должна быть целым числом")
        .optional(),
    material_quality_score: z
        .number()
        .min(1, "Качество материалов должно быть от 1 до 10")
        .max(10, "Качество материалов должно быть от 1 до 10")
        .int("Качество материалов должно быть целым числом")
        .optional(),
    legal_purity_score: z
        .number()
        .min(1, "Юр. чистота должна быть от 1 до 10")
        .max(10, "Юр. чистота должна быть от 1 до 10")
        .int("Юр. чистота должна быть целым числом")
        .optional(),
}).superRefine((data, ctx) => {
    // При назначении оценщика оба поля обязательны
    // Проверяем, если указан appraiser_id или assessment_date, то оба должны быть заполнены
    const hasAppraiserId = data.appraiser_id !== undefined && data.appraiser_id !== null;
    const hasAssessmentDate = data.assessment_date !== undefined && data.assessment_date !== null && data.assessment_date.trim() !== "";
    
    if (hasAppraiserId || hasAssessmentDate) {
        if (!hasAppraiserId) {
            ctx.addIssue({
                code: "custom",
                message: "Выберите оценщика",
                path: ["appraiser_id"],
            });
        }
        if (!hasAssessmentDate) {
            ctx.addIssue({
                code: "custom",
                message: "Дата оценки обязательна при назначении оценщика",
                path: ["assessment_date"],
            });
        }
    }

    // Комментарий обязателен для некоторых действий
    const actionsRequiringComment = [
        "RETURNED_TO_CLIENT",
        "RETURNED_TO_APPRAISER",
        "APPROVED_BY_EMPLOYEE",
        "REPORT_APPROVED_BY_EMPLOYEE",
    ];
    if (data.status && actionsRequiringComment.includes(data.status) && !data.comment_text?.trim()) {
        ctx.addIssue({
            code: "custom",
            message: "Комментарий обязателен для этого действия",
            path: ["comment_text"],
        });
    }

    if (data.status === "REPORT_SUBMITTED") {
        // Проверка report_url - обязателен и должен быть валидным URL
        if (!data.report_url || data.report_url.trim() === "") {
            ctx.addIssue({
                code: "custom",
                message: "Ссылка на отчет обязательна",
                path: ["report_url"],
            });
        } else {
            // Проверка формата URL
            try {
                new URL(data.report_url);
            } catch {
                ctx.addIssue({
                    code: "custom",
                    message: "Ссылка на отчет должна быть валидной",
                    path: ["report_url"],
                });
            }
        }

        const requiredFields: Array<{ key: keyof typeof data; message: string }> = [
            { key: "final_price", message: "Финальная стоимость обязательна" },
            { key: "condition_score", message: "Заполните оценку состояния" },
            { key: "location_score", message: "Заполните оценку локации" },
            { key: "liquidity_score", message: "Заполните оценку ликвидности" },
            { key: "material_quality_score", message: "Заполните оценку качества материалов" },
            { key: "legal_purity_score", message: "Заполните оценку юридической чистоты" },
        ];

        requiredFields.forEach(({ key, message }) => {
            const value = data[key];
            if (value === undefined || value === null || value === "") {
                ctx.addIssue({
                    code: "custom",
                    message,
                    path: [key],
                });
            }
        });
    }
});

const rejectSchema = z.object({
    comment_text: z.string().min(1, "Причина отказа обязательна"),
});

type UpdateValuationForm = z.infer<typeof updateValuationSchema>;
type StatusActionForm = z.infer<typeof statusActionSchema>;
type RejectForm = z.infer<typeof rejectSchema>;

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
    const [returnComment, setReturnComment] = useState("");
    const [approveComment, setApproveComment] = useState("");
    const [approveReportComment, setApproveReportComment] = useState("");

    const form = useForm<UpdateValuationForm>({
        resolver: zodResolver(updateValuationSchema),
        defaultValues: {
            city: "",
            street: "",
            house_number: "",
            property_type: "APARTMENT",
            apartment_number: "",
            office_number: "",
            floor: undefined,
            description: "",
            comment_text: "",
        },
    });

    const propertyType = form.watch("property_type");

    const statusForm = useForm<StatusActionForm>({
        resolver: zodResolver(statusActionSchema),
        defaultValues: {
            status: "",
            appraiser_id: undefined,
            assessment_date: "",
            comment_text: "",
            report_url: "",
            final_price: undefined,
            condition_score: undefined,
            location_score: undefined,
            liquidity_score: undefined,
            material_quality_score: undefined,
            legal_purity_score: undefined,
        },
    });

    const rejectForm = useForm<RejectForm>({
        resolver: zodResolver(rejectSchema),
        defaultValues: {
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
                    city: data.city,
                    street: data.street,
                    house_number: data.house_number,
                    property_type: data.property_type as "APARTMENT" | "OFFICE" | "HOUSE" | "WAREHOUSE" | "COMMERCIAL",
                    apartment_number: data.apartment_number || "",
                    office_number: data.office_number || "",
                    floor: data.floor || undefined,
                    description: data.description || "",
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
                city: data.city,
                street: data.street,
                house_number: data.house_number,
                property_type: data.property_type,
                apartment_number: data.apartment_number || null,
                office_number: data.office_number || null,
                floor: data.floor || null,
                description: data.description || null,
                // Сохраняем текущий статус при редактировании
                status: valuation.status,
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
        if (!id || !valuation || !currentUser) return;

        try {
            setIsSubmitting(true);
            const updateData: UpdateValuationRequest = {};

            const trimmedComment = data.comment_text?.trim();
            if (trimmedComment) {
                updateData.comment_text = trimmedComment;
            }

            let successMessage = "Действие выполнено успешно!";

            if (data.status) {
                updateData.status = data.status as UpdateValuationRequest["status"];
                
                // Определяем сообщение в зависимости от статуса
                if (data.status === "CREATED") {
                    successMessage = "Заявка отправлена на согласование!";
                } else if (data.status === "APPROVED_BY_EMPLOYEE") {
                    // Проверяем, это отказ оценщика или одобрение сотрудника
                    if (currentUser.role === "APPRAISER" && valuation.status === "APPRAISER_ASSIGNED") {
                        successMessage = "Заявка возвращена сотруднику для переназначения";
                    } else {
                        successMessage = "Заявка успешно одобрена!";
                    }
                } else if (data.status === "RETURNED_TO_CLIENT") {
                    successMessage = "Заявка возвращена на доработку!";
                } else if (data.status === "RETURNED_TO_APPRAISER") {
                    successMessage = "Отчет возвращен оценщику на доработку!";
                } else if (data.status === "REPORT_SUBMITTED") {
                    successMessage = "Отчет успешно сдан!";
                } else if (data.status === "REPORT_APPROVED_BY_EMPLOYEE") {
                    successMessage = "Отчет успешно утвержден!";
                } else if (data.status === "COMPLETED") {
                    successMessage = "Работа успешно принята!";
                }
            }

            if (data.appraiser_id !== undefined && data.appraiser_id !== null) {
                updateData.appraiser_id = data.appraiser_id;
                successMessage = "Оценщик успешно назначен!";
            }

            if (data.assessment_date && data.assessment_date.trim() !== "") {
                // Преобразуем локальную дату в ISO формат
                const date = new Date(data.assessment_date);
                updateData.assessment_date = date.toISOString();
            }

            if (data.report_url) {
                updateData.report_url = data.report_url;
            }

            if (data.final_price !== undefined) {
                updateData.final_price = data.final_price;
            }

            if (data.condition_score !== undefined) {
                updateData.condition_score = data.condition_score;
            }

            if (data.location_score !== undefined) {
                updateData.location_score = data.location_score;
            }

            if (data.liquidity_score !== undefined) {
                updateData.liquidity_score = data.liquidity_score;
            }

            if (data.material_quality_score !== undefined) {
                updateData.material_quality_score = data.material_quality_score;
            }

            if (data.legal_purity_score !== undefined) {
                updateData.legal_purity_score = data.legal_purity_score;
            }

            // Проверяем, что есть данные для отправки (после всех добавлений)
            if (Object.keys(updateData).length === 0) {
                toast.error("Нет данных для обновления");
                setIsSubmitting(false);
                return;
            }

            await valuationService.updateValuation(parseInt(id), updateData);
            toast.success(successMessage);
            statusForm.reset({
                status: "",
                appraiser_id: undefined,
                assessment_date: "",
                comment_text: "",
                report_url: "",
                final_price: undefined,
                condition_score: undefined,
                location_score: undefined,
                liquidity_score: undefined,
                material_quality_score: undefined,
                legal_purity_score: undefined,
            });
            rejectForm.reset();
            await refreshValuation();
        } catch (err) {
            console.error("Error updating status:", err);
            toast.error("Не удалось выполнить действие");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteValuation = async () => {
        if (!id || !valuation || (valuation.status !== "CREATED" && valuation.status !== "DRAFT")) {
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

    const formatPrice = (price: number) =>
        new Intl.NumberFormat("ru-RU").format(price);

    const getStatusLabel = (status: string) => {
        const statusMap: Record<string, string> = {
            DRAFT: "Черновик",
            CREATED: "Создана",
            IN_PROGRESS: "В работе",
            COMPLETED: "Завершена",
            CANCELLED: "Отменена",
            APPRAISER_ASSIGNED: "Оценщик назначен",
            APPROVED_BY_EMPLOYEE: "Одобрена сотрудником",
            REPORT_SUBMITTED: "Отчет сдан",
            REPORT_APPROVED_BY_EMPLOYEE: "Отчет утвержден",
            RETURNED_TO_CLIENT: "Возвращена на доработку",
            RETURNED_TO_APPRAISER: "Отчет возвращен оценщику",
        };
        return statusMap[status] || status;
    };
    // БАСТА/ГУФ 2010
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

    // Определяем доступные действия в зависимости от роли и статуса
    const isEmployee = currentUser.role === "EMPLOYEE";
    const isAppraiser = currentUser.role === "APPRAISER";
    const isClient = currentUser.role === "CLIENT";

    const hasScores = Boolean(
        (valuation.condition_score !== null && valuation.condition_score !== undefined) ||
        (valuation.location_score !== null && valuation.location_score !== undefined) ||
        (valuation.liquidity_score !== null && valuation.liquidity_score !== undefined) ||
        (valuation.material_quality_score !== null && valuation.material_quality_score !== undefined) ||
        (valuation.legal_purity_score !== null && valuation.legal_purity_score !== undefined),
    );

    const hasReportMetrics = Boolean(
        valuation.report_url ||
        (valuation.final_price !== null && valuation.final_price !== undefined) ||
        hasScores,
    );

    // Клиент может редактировать заявку в статусе DRAFT или RETURNED_TO_CLIENT
    const canEdit = isClient && (valuation.status === "DRAFT" || valuation.status === "RETURNED_TO_CLIENT");
    
    // Клиент может отправить заявку из DRAFT или RETURNED_TO_CLIENT в CREATED
    const canSubmitDraft = isClient && (valuation.status === "DRAFT" || valuation.status === "RETURNED_TO_CLIENT");
    
    // Сотрудник может вернуть заявку на доработку или одобрить
    const canReturnToClient = isEmployee && valuation.status === "CREATED";
    const canApprove = isEmployee && valuation.status === "CREATED";
    const canAssignAppraiser = isEmployee && valuation.status === "APPROVED_BY_EMPLOYEE";
    const canSubmitReport = isAppraiser && (valuation.status === "APPRAISER_ASSIGNED" || valuation.status === "RETURNED_TO_APPRAISER");
    const canRejectByAppraiser = isAppraiser && valuation.status === "APPRAISER_ASSIGNED";
    const canReturnToAppraiser = isEmployee && valuation.status === "REPORT_SUBMITTED";
    const canApproveReport = isEmployee && valuation.status === "REPORT_SUBMITTED";
    // Клиент не может принимать отчет - он просто просматривает его
    // const canComplete = isClient && valuation.status === "REPORT_APPROVED_BY_EMPLOYEE";

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold">Детали заявки</h1>
                {(canEdit || (isClient && valuation.status === "DRAFT")) && (
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
                            <FieldGroup className="grid grid-cols-2 gap-4">
                                <Controller
                                    name="city"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="city">
                                                Город
                                            </FieldLabel>
                                            <Input
                                                {...field}
                                                id="city"
                                                placeholder="Москва"
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
                                    name="street"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="street">
                                                Улица
                                            </FieldLabel>
                                            <Input
                                                {...field}
                                                id="street"
                                                placeholder="Улица Пушкина"
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
                                    name="house_number"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="house_number">
                                                Номер дома
                                            </FieldLabel>
                                            <Input
                                                {...field}
                                                id="house_number"
                                                placeholder="10"
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
                                            <select
                                                {...field}
                                                id="property_type"
                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            >
                                                <option value="APARTMENT">Квартира</option>
                                                <option value="OFFICE">Офис</option>
                                                <option value="HOUSE">Дом</option>
                                                <option value="WAREHOUSE">Склад</option>
                                                <option value="COMMERCIAL">Торговое помещение</option>
                                            </select>
                                            {fieldState.invalid && (
                                                <FieldError
                                                    errors={[fieldState.error]}
                                                />
                                            )}
                                        </Field>
                                    )}
                                />

                                {propertyType === "APARTMENT" && (
                                    <Controller
                                        name="apartment_number"
                                        control={form.control}
                                        render={({ field, fieldState }) => (
                                            <Field data-invalid={fieldState.invalid}>
                                                <FieldLabel htmlFor="apartment_number">
                                                    Номер квартиры
                                                </FieldLabel>
                                                <Input
                                                    {...field}
                                                    id="apartment_number"
                                                    placeholder="45"
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
                                )}

                                {propertyType === "OFFICE" && (
                                    <Controller
                                        name="office_number"
                                        control={form.control}
                                        render={({ field, fieldState }) => (
                                            <Field data-invalid={fieldState.invalid}>
                                                <FieldLabel htmlFor="office_number">
                                                    Номер офиса
                                                </FieldLabel>
                                                <Input
                                                    {...field}
                                                    id="office_number"
                                                    placeholder="301"
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
                                )}

                                {propertyType === "APARTMENT" && (
                                    <Controller
                                        name="floor"
                                        control={form.control}
                                        render={({ field, fieldState }) => (
                                            <Field data-invalid={fieldState.invalid}>
                                                <FieldLabel htmlFor="floor">
                                                    Этаж
                                                </FieldLabel>
                                                <Input
                                                    {...field}
                                                    id="floor"
                                                    type="number"
                                                    value={field.value ?? ""}
                                                    onChange={(e) =>
                                                        field.onChange(
                                                            e.target.value === ""
                                                                ? undefined
                                                                : parseInt(e.target.value, 10),
                                                        )
                                                    }
                                                    placeholder="5"
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
                                )}

                                {propertyType === "OFFICE" && (
                                    <Controller
                                        name="floor"
                                        control={form.control}
                                        render={({ field, fieldState }) => (
                                            <Field data-invalid={fieldState.invalid}>
                                                <FieldLabel htmlFor="floor">
                                                    Этаж (необязательно)
                                                </FieldLabel>
                                                <Input
                                                    {...field}
                                                    id="floor"
                                                    type="number"
                                                    value={field.value ?? ""}
                                                    onChange={(e) =>
                                                        field.onChange(
                                                            e.target.value === ""
                                                                ? undefined
                                                                : parseInt(e.target.value, 10),
                                                        )
                                                    }
                                                    placeholder="5"
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
                                )}

                                <Controller
                                    name="description"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid} className="col-span-2">
                                            <FieldLabel htmlFor="description">
                                                Описание (необязательно)
                                            </FieldLabel>
                                            <Input
                                                {...field}
                                                id="description"
                                                placeholder="Дополнительное описание объекта"
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

                                {/* Поле комментария скрыто для черновиков (DRAFT) */}
                                {valuation.status !== "DRAFT" && (
                                    <Controller
                                        name="comment_text"
                                        control={form.control}
                                        render={({ field, fieldState }) => (
                                            <Field data-invalid={fieldState.invalid} className="col-span-2">
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
                                )}
                            </FieldGroup>
                            <div className="flex gap-2">
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1"
                                >
                                    {isSubmitting ? "Сохранение..." : "Сохранить"}
                                </Button>
                                {canSubmitDraft && (
                                    <Button
                                        type="button"
                                        variant="default"
                                        disabled={isSubmitting}
                                        onClick={async () => {
                                            try {
                                                setIsSubmitting(true);
                                                await valuationService.updateValuation(
                                                    parseInt(id!),
                                                    {
                                                        status: "CREATED",
                                                        comment_text: "Отправляю на согласование.",
                                                    },
                                                );
                                                toast.success("Заявка отправлена на согласование!");
                                                await refreshValuation();
                                            } catch (err) {
                                                console.error("Error submitting draft:", err);
                                                toast.error("Не удалось отправить заявку");
                                            } finally {
                                                setIsSubmitting(false);
                                            }
                                        }}
                                        className="flex-1"
                                    >
                                        Отправить на согласование
                                    </Button>
                                )}
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground">
                                    Адрес
                                </label>
                                <p className="mt-1 text-sm">
                                    {valuation.city}, {valuation.street}, д. {valuation.house_number}
                                    {valuation.apartment_number && `, кв. ${valuation.apartment_number}`}
                                    {valuation.office_number && `, оф. ${valuation.office_number}`}
                                    {valuation.floor && `, ${valuation.floor} этаж`}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground">
                                    Тип недвижимости
                                </label>
                                <p className="mt-1 text-sm">
                                    {valuation.property_type === "APARTMENT" && "Квартира"}
                                    {valuation.property_type === "OFFICE" && "Офис"}
                                    {valuation.property_type === "HOUSE" && "Дом"}
                                    {valuation.property_type === "WAREHOUSE" && "Склад"}
                                    {valuation.property_type === "COMMERCIAL" && "Торговое помещение"}
                                    {!["APARTMENT", "OFFICE", "HOUSE", "WAREHOUSE", "COMMERCIAL"].includes(valuation.property_type) && valuation.property_type}
                                </p>
                            </div>
                            {valuation.description && (
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">
                                        Описание
                                    </label>
                                    <p className="mt-1 text-sm">
                                        {valuation.description}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <Separator />

                    {/* Действия для CLIENT - отправка заявки */}
                    {canSubmitDraft && !canEdit && (
                        <form
                            onSubmit={statusForm.handleSubmit((data) =>
                                handleStatusAction({
                                    ...data,
                                    status: "CREATED",
                                }),
                            )}
                            className="space-y-3 border rounded-lg p-4"
                        >
                            <h3 className="text-sm font-semibold mb-3">
                                Отправить заявку на согласование
                            </h3>
                            <FieldGroup>
                                <Controller
                                    name="comment_text"
                                    control={statusForm.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="submit_comment">
                                                Комментарий
                                            </FieldLabel>
                                            <textarea
                                                {...field}
                                                id="submit_comment"
                                                placeholder="Отправляю на согласование."
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
                                    ? "Отправка..."
                                    : "Отправить на согласование"}
                            </Button>
                        </form>
                    )}


                    {/* Действия для EMPLOYEE */}
                    {canReturnToClient && (
                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();
                                if (!returnComment.trim()) {
                                    toast.error("Комментарий обязателен");
                                    return;
                                }
                                await handleStatusAction({
                                    comment_text: returnComment,
                                    status: "RETURNED_TO_CLIENT",
                                });
                                setReturnComment("");
                            }}
                            className="space-y-3 border rounded-lg p-4 border-orange-500/50"
                        >
                            <h3 className="text-sm font-semibold mb-3 text-orange-600">
                                Вернуть на доработку
                            </h3>
                            <FieldGroup>
                                <Field>
                                    <FieldLabel htmlFor="return_comment">
                                        Комментарий
                                    </FieldLabel>
                                    <textarea
                                        id="return_comment"
                                        value={returnComment}
                                        onChange={(e) => setReturnComment(e.target.value)}
                                        placeholder="Уточните номер квартиры в адресе."
                                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        rows={3}
                                    />
                                </Field>
                            </FieldGroup>
                            <Button
                                type="submit"
                                variant="outline"
                                disabled={isSubmitting}
                                className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
                            >
                                {isSubmitting
                                    ? "Возврат..."
                                    : "Вернуть на доработку"}
                            </Button>
                        </form>
                    )}

                    {canApprove && (
                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();
                                if (!approveComment.trim()) {
                                    toast.error("Комментарий обязателен");
                                    return;
                                }
                                await handleStatusAction({
                                    comment_text: approveComment,
                                    status: "APPROVED_BY_EMPLOYEE",
                                });
                                setApproveComment("");
                            }}
                            className="space-y-3 border rounded-lg p-4"
                        >
                            <h3 className="text-sm font-semibold mb-3">
                                Одобрить заявку
                            </h3>
                            <FieldGroup>
                                <Field>
                                    <FieldLabel htmlFor="approve_comment">
                                        Комментарий
                                    </FieldLabel>
                                    <textarea
                                        id="approve_comment"
                                        value={approveComment}
                                        onChange={(e) => setApproveComment(e.target.value)}
                                        placeholder="Например: Заявка принята. Ищем оценщика."
                                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        rows={3}
                                    />
                                </Field>
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
                            onSubmit={statusForm.handleSubmit(async (data) => {
                                // Дополнительная проверка для назначения оценщика
                                if (!data.appraiser_id) {
                                    statusForm.setError("appraiser_id", {
                                        type: "manual",
                                        message: "Выберите оценщика",
                                    });
                                    return;
                                }
                                if (!data.assessment_date || data.assessment_date.trim() === "") {
                                    statusForm.setError("assessment_date", {
                                        type: "manual",
                                        message: "Укажите дату оценки",
                                    });
                                    return;
                                }
                                await handleStatusAction({
                                    ...data,
                                    appraiser_id: data.appraiser_id,
                                });
                            }, (errors) => {
                                // Обработка ошибок валидации
                                console.error("Validation errors:", errors);
                            })}
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
                                    name="assessment_date"
                                    control={statusForm.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="assessment_date">
                                                Дата оценки
                                            </FieldLabel>
                                            <Input
                                                {...field}
                                                id="assessment_date"
                                                type="datetime-local"
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
                                    control={statusForm.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="assign_comment">
                                                Комментарий (необязательно)
                                            </FieldLabel>
                                            <textarea
                                                {...field}
                                                id="assign_comment"
                                                placeholder="Например: Назначен оценщик user3 на 25 декабря."
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
                        <>
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
                                    {valuation.status === "RETURNED_TO_APPRAISER" 
                                        ? "Доработать и сдать отчет" 
                                        : "Сдать отчет"}
                                </h3>
                                <FieldGroup>
                                    <Controller
                                        name="report_url"
                                        control={statusForm.control}
                                        render={({ field, fieldState }) => (
                                            <Field data-invalid={fieldState.invalid}>
                                                <FieldLabel htmlFor="report_url">
                                                    Ссылка на отчет
                                                </FieldLabel>
                                                <Input
                                                    {...field}
                                                    id="report_url"
                                                    value={field.value || ""}
                                                    placeholder="https://disk.yandex.ru/i/example_report.pdf"
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
                                        name="final_price"
                                        control={statusForm.control}
                                        render={({ field, fieldState }) => (
                                            <Field data-invalid={fieldState.invalid}>
                                                <FieldLabel htmlFor="final_price">
                                                    Итоговая стоимость (руб.)
                                                </FieldLabel>
                                                <Input
                                                    {...field}
                                                    id="final_price"
                                                    type="number"
                                                    min={0}
                                                    step="0.01"
                                                    value={field.value ?? ""}
                                                    onChange={(e) =>
                                                        field.onChange(
                                                            e.target.value === ""
                                                                ? undefined
                                                                : parseFloat(e.target.value),
                                                        )
                                                    }
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
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <Controller
                                            name="condition_score"
                                            control={statusForm.control}
                                            render={({ field, fieldState }) => (
                                                <Field data-invalid={fieldState.invalid}>
                                                    <FieldLabel htmlFor="condition_score">
                                                        Состояние (1-10)
                                                    </FieldLabel>
                                                    <Input
                                                        {...field}
                                                        id="condition_score"
                                                        type="number"
                                                        min={1}
                                                        max={10}
                                                        step={1}
                                                        value={field.value ?? ""}
                                                        onChange={(e) =>
                                                            field.onChange(
                                                                e.target.value === ""
                                                                    ? undefined
                                                                    : parseInt(e.target.value, 10),
                                                            )
                                                        }
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
                                            name="location_score"
                                            control={statusForm.control}
                                            render={({ field, fieldState }) => (
                                                <Field data-invalid={fieldState.invalid}>
                                                    <FieldLabel htmlFor="location_score">
                                                        Локация (1-10)
                                                    </FieldLabel>
                                                    <Input
                                                        {...field}
                                                        id="location_score"
                                                        type="number"
                                                        min={1}
                                                        max={10}
                                                        step={1}
                                                        value={field.value ?? ""}
                                                        onChange={(e) =>
                                                            field.onChange(
                                                                e.target.value === ""
                                                                    ? undefined
                                                                    : parseInt(e.target.value, 10),
                                                            )
                                                        }
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
                                            name="liquidity_score"
                                            control={statusForm.control}
                                            render={({ field, fieldState }) => (
                                                <Field data-invalid={fieldState.invalid}>
                                                    <FieldLabel htmlFor="liquidity_score">
                                                        Ликвидность (1-10)
                                                    </FieldLabel>
                                                    <Input
                                                        {...field}
                                                        id="liquidity_score"
                                                        type="number"
                                                        min={1}
                                                        max={10}
                                                        step={1}
                                                        value={field.value ?? ""}
                                                        onChange={(e) =>
                                                            field.onChange(
                                                                e.target.value === ""
                                                                    ? undefined
                                                                    : parseInt(e.target.value, 10),
                                                            )
                                                        }
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
                                            name="material_quality_score"
                                            control={statusForm.control}
                                            render={({ field, fieldState }) => (
                                                <Field data-invalid={fieldState.invalid}>
                                                    <FieldLabel htmlFor="material_quality_score">
                                                        Качество материалов (1-10)
                                                    </FieldLabel>
                                                    <Input
                                                        {...field}
                                                        id="material_quality_score"
                                                        type="number"
                                                        min={1}
                                                        max={10}
                                                        step={1}
                                                        value={field.value ?? ""}
                                                        onChange={(e) =>
                                                            field.onChange(
                                                                e.target.value === ""
                                                                    ? undefined
                                                                    : parseInt(e.target.value, 10),
                                                            )
                                                        }
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
                                            name="legal_purity_score"
                                            control={statusForm.control}
                                            render={({ field, fieldState }) => (
                                                <Field data-invalid={fieldState.invalid}>
                                                    <FieldLabel htmlFor="legal_purity_score">
                                                        Юридическая чистота (1-10)
                                                    </FieldLabel>
                                                    <Input
                                                        {...field}
                                                        id="legal_purity_score"
                                                        type="number"
                                                        min={1}
                                                        max={10}
                                                        step={1}
                                                        value={field.value ?? ""}
                                                        onChange={(e) =>
                                                            field.onChange(
                                                                e.target.value === ""
                                                                    ? undefined
                                                                    : parseInt(e.target.value, 10),
                                                            )
                                                        }
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
                                    </div>
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

                            {canRejectByAppraiser && (
                                <form
                                    onSubmit={rejectForm.handleSubmit((data) =>
                                        handleStatusAction({
                                            ...data,
                                            status: "APPROVED_BY_EMPLOYEE",
                                        }),
                                    )}
                                    className="space-y-3 border rounded-lg p-4 border-destructive/50"
                                >
                                    <h3 className="text-sm font-semibold mb-3 text-destructive">
                                        Отказаться от заявки
                                    </h3>
                                    <FieldGroup>
                                        <Controller
                                            name="comment_text"
                                            control={rejectForm.control}
                                            render={({ field, fieldState }) => (
                                                <Field data-invalid={fieldState.invalid}>
                                                    <FieldLabel htmlFor="reject_comment">
                                                        Причина отказа
                                                    </FieldLabel>
                                                    <textarea
                                                        {...field}
                                                        id="reject_comment"
                                                        placeholder="Не могу выехать на объект в назначенное время."
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
                                        variant="outline"
                                        disabled={isSubmitting}
                                        className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                    >
                                        {isSubmitting
                                            ? "Отказ..."
                                            : "Вернуть заявку сотруднику"}
                                    </Button>
                                </form>
                            )}
                        </>
                    )}

                    {/* Действия для EMPLOYEE - проверка отчета */}
                    {canReturnToAppraiser && (
                        <form
                            onSubmit={statusForm.handleSubmit((data) =>
                                handleStatusAction({
                                    ...data,
                                    status: "RETURNED_TO_APPRAISER",
                                }),
                            )}
                            className="space-y-3 border rounded-lg p-4 border-orange-500/50"
                        >
                            <h3 className="text-sm font-semibold mb-3 text-orange-600">
                                Вернуть отчет оценщику
                            </h3>
                            <FieldGroup>
                                <Controller
                                    name="comment_text"
                                    control={statusForm.control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="return_to_appraiser_comment">
                                                Комментарий
                                            </FieldLabel>
                                            <textarea
                                                {...field}
                                                id="return_to_appraiser_comment"
                                                placeholder="Отчет неполный, добавьте фото кухни."
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
                                variant="outline"
                                disabled={isSubmitting}
                                className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
                            >
                                {isSubmitting
                                    ? "Возврат..."
                                    : "Вернуть на доработку"}
                            </Button>
                        </form>
                    )}

                    {canApproveReport && (
                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();
                                if (!approveReportComment.trim()) {
                                    toast.error("Комментарий обязателен");
                                    return;
                                }
                                await handleStatusAction({
                                    comment_text: approveReportComment,
                                    status: "REPORT_APPROVED_BY_EMPLOYEE",
                                });
                                setApproveReportComment("");
                            }}
                            className="space-y-3 border rounded-lg p-4"
                        >
                            <h3 className="text-sm font-semibold mb-3">
                                Утвердить отчет
                            </h3>
                            <FieldGroup>
                                <Field>
                                    <FieldLabel htmlFor="approve_report_comment">
                                        Комментарий
                                    </FieldLabel>
                                    <textarea
                                        id="approve_report_comment"
                                        value={approveReportComment}
                                        onChange={(e) => setApproveReportComment(e.target.value)}
                                        placeholder="Отчет проверен, отправлен клиенту."
                                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        rows={3}
                                    />
                                </Field>
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

                    {hasReportMetrics && (
                        <>
                            <Separator />
                            <div>
                                <h3 className="text-sm font-semibold mb-3">
                                    Результаты оценки
                                </h3>
                                <div className="space-y-2">
                                    {valuation.report_url && (
                                        <a
                                            className="text-sm text-blue-600 hover:underline"
                                            href={valuation.report_url}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            Ссылка на отчет
                                        </a>
                                    )}
                                    {valuation.final_price !== null &&
                                        valuation.final_price !== undefined && (
                                            <p className="text-sm">
                                                Итоговая стоимость:{" "}
                                                {formatPrice(valuation.final_price)} руб.
                                            </p>
                                        )}
                                    {hasScores && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {valuation.condition_score !== null &&
                                                valuation.condition_score !== undefined && (
                                                    <p className="text-sm">
                                                        Состояние: {valuation.condition_score}/10
                                                    </p>
                                                )}
                                            {valuation.location_score !== null &&
                                                valuation.location_score !== undefined && (
                                                    <p className="text-sm">
                                                        Локация: {valuation.location_score}/10
                                                    </p>
                                                )}
                                            {valuation.liquidity_score !== null &&
                                                valuation.liquidity_score !== undefined && (
                                                    <p className="text-sm">
                                                        Ликвидность: {valuation.liquidity_score}/10
                                                    </p>
                                                )}
                                            {valuation.material_quality_score !== null &&
                                                valuation.material_quality_score !== undefined && (
                                                    <p className="text-sm">
                                                        Качество материалов:{" "}
                                                        {valuation.material_quality_score}/10
                                                    </p>
                                                )}
                                            {valuation.legal_purity_score !== null &&
                                                valuation.legal_purity_score !== undefined && (
                                                    <p className="text-sm">
                                                        Юридическая чистота: {valuation.legal_purity_score}/10
                                                    </p>
                                                )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
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
                                    {valuation.assessment_date && (
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground">
                                                Дата оценки
                                            </label>
                                            <p className="mt-1 text-sm">
                                                {formatDate(valuation.assessment_date)}
                                            </p>
                                        </div>
                                    )}
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
