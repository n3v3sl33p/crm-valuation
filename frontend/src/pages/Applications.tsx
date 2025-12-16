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
    address: z.string().min(1, "Адрес обязателен для заполнения"),
    property_type: z.string().min(1, "Тип недвижимости обязателен"),
    room_count: z
        .number()
        .min(1, "Количество комнат должно быть больше 0")
        .int("Количество комнат должно быть целым числом"),
    room_details: z.string().min(1, "Детали комнат обязательны"),
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
            address: "",
            property_type: "",
            room_count: 1,
            room_details: "",
        },
    });

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
                <DialogContent>
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
                                                    parseInt(e.target.value) ||
                                                        0,
                                                )
                                            }
                                            value={field.value}
                                            placeholder="Введите количество комнат"
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
                            <TableHead>Количество комнат</TableHead>
                            <TableHead>Детали комнат</TableHead>
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
                                <TableCell>{valuation.address}</TableCell>
                                <TableCell>{valuation.property_type}</TableCell>
                                <TableCell>{valuation.room_count}</TableCell>
                                <TableCell>{valuation.room_details}</TableCell>
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
