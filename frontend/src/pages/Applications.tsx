import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import toast from "react-hot-toast";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { valuationService } from "@/lib/api/valuationService";
import { userService } from "@/lib/api/userService";
import type { Valuation, User } from "@/lib/api/types";

const createValuationSchema = z.object({
    city: z.string().min(1, "Город обязателен для заполнения"),
    street: z.string().min(1, "Улица обязательна для заполнения"),
    house_number: z.string().min(1, "Номер дома обязателен для заполнения"),
    property_type: z.enum(["APARTMENT", "OFFICE", "HOUSE"]),
    apartment_number: z.string().optional(),
    office_number: z.string().optional(),
    floor: z
        .number()
        .int("Этаж должен быть целым числом")
        .optional(),
    description: z.string().optional(),
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

type CreateValuationForm = z.infer<typeof createValuationSchema>;

export function Applications() {
    const navigate = useNavigate();
    const [valuations, setValuations] = useState<Valuation[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<CreateValuationForm>({
        resolver: zodResolver(createValuationSchema),
        defaultValues: {
            city: "",
            street: "",
            house_number: "",
            property_type: "APARTMENT",
            apartment_number: "",
            office_number: "",
            floor: undefined,
            description: "",
        },
    });

    const propertyType = form.watch("property_type");

    const fetchValuations = async () => {
        try {
            setLoading(true);
            const data = await valuationService.getValuations();
            setValuations(data);
            setError(null);
        } catch (err) {
            setError("Не удалось загрузить заявки");
            console.error("Error fetching valuations:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const user = await userService.getCurrentUser();
                setCurrentUser(user);
            } catch (err) {
                console.error("Error fetching current user:", err);
            }
        };
        fetchData();
        fetchValuations();
    }, []);

    const handleCreateValuation = async (data: CreateValuationForm) => {
        try {
            setIsSubmitting(true);
            await valuationService.createValuation(data);
            toast.success("Заявка успешно создана!");
            setIsDialogOpen(false);
            form.reset();
            await fetchValuations();
        } catch (err) {
            console.error("Error creating valuation:", err);
            toast.error("Не удалось создать заявку");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRowClick = (valuation: Valuation) => {
        navigate(`/dashboard/applications/${valuation.id}`);
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

    const isClient = currentUser?.role === "CLIENT";

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold">Мои заявки</h1>
                {isClient && (
                    <Button onClick={() => setIsDialogOpen(true)}>
                        Создать заявку
                    </Button>
                )}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Создать новую заявку</DialogTitle>
                        <DialogDescription>
                            Заполните форму для создания заявки на оценку
                            недвижимости
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={form.handleSubmit(handleCreateValuation)}
                        className="space-y-4"
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
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        >
                                            <option value="APARTMENT">Квартира</option>
                                            <option value="OFFICE">Офис</option>
                                            <option value="HOUSE">Дом</option>
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
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsDialogOpen(false);
                                    form.reset();
                                }}
                                disabled={isSubmitting}
                            >
                                Отмена
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Создание..." : "Создать"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {loading ? (
                <p className="text-muted-foreground">Загрузка...</p>
            ) : error ? (
                <p className="text-red-500">{error}</p>
            ) : valuations.length === 0 ? (
            <p className="text-muted-foreground">
                    У вас пока нет заявок на оценку недвижимости.
                </p>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Адрес</TableHead>
                            <TableHead>Тип недвижимости</TableHead>
                            <TableHead>Описание</TableHead>
                            <TableHead>Статус</TableHead>
                            <TableHead>Дата создания</TableHead>
                            <TableHead>Дата обновления</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {valuations.map((valuation) => (
                            <TableRow
                                key={valuation.id}
                                onClick={() => handleRowClick(valuation)}
                                className="cursor-pointer"
                            >
                                <TableCell>{valuation.id}</TableCell>
                                <TableCell>
                                    {valuation.city}, {valuation.street}, д. {valuation.house_number}
                                    {valuation.apartment_number && `, кв. ${valuation.apartment_number}`}
                                    {valuation.office_number && `, оф. ${valuation.office_number}`}
                                </TableCell>
                                <TableCell>{valuation.property_type}</TableCell>
                                <TableCell>{valuation.description || "-"}</TableCell>
                                <TableCell>
                                    {getStatusLabel(valuation.status)}
                                </TableCell>
                                <TableCell>
                                    {formatDate(valuation.created_at)}
                                </TableCell>
                                <TableCell>
                                    {formatDate(valuation.updated_at)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    );
}
