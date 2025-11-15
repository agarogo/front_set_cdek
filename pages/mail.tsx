import { useState } from "react";
import api from "../lib/api";
import { UserCreate, UserRole } from "../lib/types";
import { GetServerSideProps } from "next";
import { parseCookies } from "nookies";
import { isAuthenticated } from "../lib/auth";

interface CreateEmployeeProps {
    currentUser: User;
}

export default function CreateEmployee({ currentUser }: CreateEmployeeProps) {
    const [user, setUser] = useState<UserCreate>({
        full_name: "",
        birthday: new Date().toISOString().split("T")[0], // Сегодняшняя дата по умолчанию
        sex: "",
        email_user: "",
        phone_number: "",
        tg_name: "",
        position_employee: "",
        subdivision: "",
        role: UserRole.USER,
        password: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user.full_name.trim() || !user.password.trim() || !user.position_employee.trim() || !user.subdivision.trim()) {
            setError("Заполните обязательные поля");
            return;
        }

        // Дополнительная проверка email перед отправкой
        if (user.email_user && !isValidEmail(user.email_user)) {
            setError("Неверный формат email. Используйте только допустимые символы (например, example@email.com)");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const token = parseCookies()._token;
            const response = await api.post("/users", user, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setSuccess("Пользователь успешно создан");
            setUser({
                full_name: "",
                birthday: new Date().toISOString().split("T")[0],
                sex: "",
                email_user: "",
                phone_number: "",
                tg_name: "",
                position_employee: "",
                subdivision: "",
                role: UserRole.USER,
                password: "",
            });
        } catch (err: any) {
            console.error("Failed to create user:", err.message);
            setError(err.message || "Не удалось создать пользователя");
        } finally {
            setLoading(false);
        }
    };

    // Функция для валидации email
    const isValidEmail = (email: string): boolean => {
        // Ограничиваем длину до 60 символов
        if (email.length > 60) {
            return false;
        }

        // Регулярное выражение для проверки email
        // Разрешаем только буквы, цифры, точки, дефисы, подчеркивания и символ @ в правильном формате
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email);
    };

    // Обработчик изменения email с фильтрацией
    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;
    
        // Ограничиваем длину до 60 символов
        if (value.length > 60) {
            value = value.substring(0, 60);
        }
    
        // Удаляем специальные символы, которые могут быть использованы для SQL-инъекций или вредоносных действий
        // Разрешаем только буквы, цифры, точки, дефисы, подчеркивания и символ @
        value = value.replace(/[^a-zA-Z0-9._@-]/g, '');
    
        // Убедимся, что в строке только один @ и он находится в правильном месте
        if (value.includes('@')) {
            const parts = value.split('@');
            if (parts.length > 2) {  // Если больше одного @, оставляем только первый
                value = parts[0] + '@' + parts.slice(1).join('').replace('@', ''); // Удаляем все дополнительные @
            } else if (parts.length === 2) {
                // Проверяем, что до и после @ есть текст, и корректируем, если нужно
                if (parts[0] === '' || parts[1] === '') {
                    if (parts[0] === '') {
                        value = 'user' + '@' + parts[1]; // Добавляем "user" перед @, если локальная часть пуста
                    } else if (parts[1] === '') {
                        value = parts[0]; // Удаляем @, если доменная часть пуста
                    }
                }
            }
        }
    
        // Если строка начинается с @, добавляем "user" перед ним
        if (value.startsWith('@') && value.length > 1) {
            value = 'user' + value; // Добавляем "user" перед @ для корректного формата
        }
    
        // Убедимся, что @ не находится в конце строки
        if (value.endsWith('@')) {
            value = value.slice(0, -1); // Удаляем @ в конце, если он там
        }
    
        // Проверяем, что после @ есть хотя бы домен (например, ".com")
        if (value.includes('@') && !value.split('@')[1].includes('.')) {
            value = value; // Оставляем как есть, но пользователь должен добавить домен вручную
        }
    
        setUser({ ...user, email_user: value });
    };
    if (currentUser.role !== "admin") {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-red-500">Доступ запрещён: Только администраторы могут создавать пользователей</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen ">
            <div className="mt-24 container2 mx-auto">
                <h1 className="text-4xl font-bold  mb-8">Создание сотрудника</h1>
                <form onSubmit={loading ? undefined : handleSubmit} className=" mx-auto p-10 bg-white rounded-2xl shadow-md">
                    <div className="flex justify-between">
                        <div className="mb-4 w-[30%]">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Полное имя</label>
                            <input
                                type="text"
                                value={user.full_name}
                                onChange={(e) => setUser({ ...user, full_name: e.target.value })}
                                className="p-2 border rounded-lg w-full"
                                placeholder="Иванов Иван Иванович"
                                disabled={loading}
                            />
                        </div>
                        <div className="mb-4 w-[30%]">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Дата рождения</label>
                            <input
                                type="date"
                                value={user.birthday}
                                onChange={(e) => setUser({ ...user, birthday: e.target.value })}
                                className="p-2 border rounded-lg w-full"
                                disabled={loading}
                            />
                        </div>
                        <div className="mb-4 w-[30%]">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Пол</label>
                            <select
                                value={user.sex}
                                onChange={(e) => setUser({ ...user, sex: e.target.value })}
                                className="p-2 border rounded-lg w-full"
                                disabled={loading}
                            >
                                <option value="">Выберите пол</option>
                                <option value="М">Мужской</option>
                                <option value="Ж">Женский</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-between">
                        <div className="mb-4 w-[30%]">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email (личный)</label>
                            <input
                                type="email"
                                value={user.email_user}
                                onChange={handleEmailChange}  // Используем новый обработчик
                                className="p-2 border rounded-lg w-full"
                                placeholder="ivan@example.com"
                                disabled={loading}
                            />
                        </div>
                        <div className="mb-4 w-[30%]">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Телефон</label>
                            <input
                                type="text"
                                value={user.phone_number}
                                onChange={(e) => {
                                    let value = e.target.value;
                                    
                                    // Удаляем все нецифровые символы, кроме '+'
                                    value = value.replace(/[^+\d]/g, '');
                                    
                                    // Если строка не начинается с '+7', добавляем '+7'
                                    if (!value.startsWith('+7')) {
                                        value = '+7';
                                    }
                                    
                                    // Оставляем только '+7' и следующие 10 цифр
                                    if (value.length > 12) {
                                        value = value.substring(0, 12); // Ограничиваем до 12 символов (+7 + 10 цифр)
                                    }
                                    
                                    // Проверяем, что после '+7' ровно 10 цифр
                                    if (value.startsWith('+7') && value.length > 2) {
                                        const digits = value.slice(2); // Берем цифры после '+7'
                                        if (digits.length > 10) {
                                            value = '+7' + digits.substring(0, 10); // Ограничиваем до 10 цифр
                                        }
                                    }
                                    
                                    setUser({ ...user, phone_number: value });
                                }}
                                className="p-2 border rounded-lg w-full"
                                placeholder="+7(999)-888-88-88"
                                disabled={loading}
                            />
                        </div>
                        <div className="mb-4 w-[30%]">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Telegram</label>
                            <input
                                type="text"
                                value={user.tg_name}
                                onChange={(e) => {
                                    let value = e.target.value;
                                    
                                    // Удаляем все пробелы и специальные символы, оставляем только буквы, цифры, подчеркивания и дефисы
                                    value = value.replace(/[^a-zA-Z0-9_@-]/g, '');
                                    
                                    // Если строка не начинается с '@', добавляем '@'
                                    if (!value.startsWith('@')) {
                                        value = '@';
                                    }
                                    
                                    // Ограничиваем длину до 100 символов (включая '@')
                                    if (value.length > 100) {
                                        value = value.substring(0, 100);
                                    }
                                    
                                    // Удаляем '@' из остальной части, если оно введено повторно
                                    if (value.length > 1) {
                                        const afterAt = value.slice(1); // Берем все после '@'
                                        if (afterAt.includes('@')) {
                                            value = '@' + afterAt.replace('@', ''); // Удаляем лишние '@'
                                        }
                                    }
                                    
                                    setUser({ ...user, tg_name: value });
                                }}
                                className="p-2 border rounded-lg w-full"
                                placeholder="@ivan_tg"
                                disabled={loading}
                            />
                        </div>
                    </div>
                    <div className="flex justify-between">
                        <div className="mb-4 w-[30%]">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Должность</label>
                            <input
                                type="text"
                                value={user.position_employee}
                                onChange={(e) => {
                                    let value = e.target.value;
                                    
                                    // Удаляем все специальные символы, оставляем только буквы, цифры, пробелы, дефисы и подчеркивания
                                    value = value.replace(/[^a-zA-Z0-9\s_-]/g, '');
                                    
                                    // Ограничиваем длину до 100 символов
                                    if (value.length > 100) {
                                        value = value.substring(0, 100);
                                    }
                                    
                                    setUser({ ...user, position_employee: value });
                                }}
                                className="p-2 border rounded-lg w-full"
                                placeholder="Разработчик"
                                disabled={loading}
                            />
                        </div>
                        <div className="mb-4 w-[30%]">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Подразделение</label>
                            <input
                                type="text"
                                value={user.subdivision}
                                onChange={(e) => setUser({ ...user, subdivision: e.target.value })}
                                className="p-2 border rounded-lg w-full"
                                placeholder="IT"
                                disabled={loading}
                            />
                        </div>
                        <div className="mb-4 w-[30%]">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Роль</label>
                            <select
                                value={user.role}
                                onChange={(e) => setUser({ ...user, role: e.target.value as UserRole })}
                                className="p-2 border rounded-lg w-full"
                                disabled={loading}
                            >
                                <option value={UserRole.USER}>Пользователь</option>
                                <option value={UserRole.MANAGER}>Менеджер</option>
                                <option value={UserRole.ADMIN}>Админ</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-between">
                        <div className="mb-4 w-[30%]">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Пароль</label>
                            <input
                                type="password"
                                value={user.password}
                                onChange={(e) => setUser({ ...user, password: e.target.value })}
                                className="p-2 border rounded-lg w-full"
                                placeholder="Введите пароль"
                                disabled={loading}
                            />
                        </div>
                        <button
                            type="submit"
                            className="bg-[#3314F1] h-10 text-white mt-5 px-4 rounded-2xl hover:bg-purple-600 disabled:bg-gray-400"
                            disabled={loading}
                        >
                            {loading ? "Создание..." : "Создать"}
                        </button>
                        
                    </div>
                    {error && <p className="text-red-500 mt-4">{error}</p>}
                    {success && <p className="text-green-500 mt-4">{success}</p>}
                </form>
            </div>
        </div>
    );
}

export const getServerSideProps: GetServerSideProps<CreateEmployeeProps> = async (context) => {
    if (!isAuthenticated(context)) {
        return {
            redirect: { destination: "/", permanent: false },
        };
    }

    const { _token } = parseCookies(context);
    try {
        const response = await api.get<User>("/users/me", {
            headers: { Authorization: `Bearer ${_token}` },
        });
        if (response.data.role !== "admin") {
            return {
                redirect: { destination: "/dashboard", permanent: false },
            };
        }
        return { props: { currentUser: response.data } };
    } catch (error) {
        console.error("Error fetching user for create-employee:", error);
        return {
            redirect: { destination: "/", permanent: false },
        };
    }
};