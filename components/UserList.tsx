import { useState, useEffect } from "react";
import api from "../lib/api";
import { User, UserRole, UserUpdate } from "../lib/types";
import { parseCookies } from "nookies";

interface UserListProps {
    currentUser: User;
}

interface UserProfileData extends User {}

const UserList: React.FC<UserListProps> = ({ currentUser }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [filters, setFilters] = useState({
        fullName: "",
        role: "" as UserRole | "",
        sex: "" as "М" | "Ж" | "",
        positionEmployee: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<UserProfileData | null>(null);
    const [editUserData, setEditUserData] = useState<UserUpdate>({}); // Состояние для редактируемых данных
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);

    const fetchUsers = async (filterParams: Record<string, string> = {}) => {
        setLoading(true);
        setError(null);
        try {
            const token = parseCookies()._token;
            console.log("Fetching users with filters:", filterParams, "Token:", token);

            const params = new URLSearchParams();
            if (filterParams.fullName) params.append("full_name", filterParams.fullName);
            if (filterParams.role) params.append("role", filterParams.role);
            if (filterParams.sex) params.append("sex", filterParams.sex);
            if (filterParams.positionEmployee) params.append("position_employee", filterParams.positionEmployee);

            const response = await api.get<User[]>(`/users/?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            console.log("Search results:", response.data);
            setUsers(response.data);
        } catch (err: any) {
            console.error("Failed to fetch users:", err.response?.data || err.message);
            setError(err.response?.data?.detail || "Не удалось загрузить пользователей");
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters((prev) => {
            const newFilters = { ...prev, [key]: value };
            fetchUsers(newFilters);
            return newFilters;
        });
    };

    const fetchUserProfile = async (userId: number) => {
        try {
            const token = parseCookies()._token;
            console.log("Fetching profile for userId:", userId, "Token:", token);
            const response = await api.get<UserProfileData>(`/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            console.log("Profile fetched:", response.data);
            setSelectedUser(response.data);
            // Инициализируем данные для редактирования
            setEditUserData({
                full_name: response.data.full_name,
                phone_number: response.data.phone_number || undefined,
                tg_name: response.data.tg_name || undefined,
                email_user: response.data.email_user || undefined,
                subdivision: response.data.subdivision || undefined,
                position_employee: response.data.position_employee || undefined,
                role: response.data.role,
            });
        } catch (err: any) {
            console.error("Failed to fetch user profile:", err.response?.data || err.message);
            setError(err.response?.data?.detail || "Не удалось загрузить профиль пользователя");
            setSelectedUser(null);
        }
    };

    const handleViewProfile = (user: User) => {
        fetchUserProfile(user.id);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedUser(null);
        setEditMode(false);
        setEditUserData({});
    };

    const validateUserData = (data: UserUpdate): string | null => {
        if (!data.full_name || data.full_name.trim() === "") {
            return "Имя не может быть пустым";
        }
        if (data.role && !Object.values(UserRole).includes(data.role as UserRole)) {
            return "Некорректная роль";
        }
        return null;
    };
    const handleSaveChanges = async () => {
        if (!selectedUser) return;
    
        const validationError = validateUserData(editUserData);
        if (validationError) {
            setError(validationError);
            return;
        }
    
        try {
            const token = parseCookies()._token;
            console.log("Saving changes for user:", selectedUser.id, "Data:", editUserData, "Token:", token);
            const response = await api.put(`/users/${selectedUser.id}`, editUserData, {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true, // Добавлено для передачи cookies
            });
            setSelectedUser(response.data);
            setEditMode(false);
            setError(null);
            console.log("User profile updated successfully:", response.data);
            fetchUsers(filters); // Обновляем список пользователей после сохранения
        } catch (err: any) {
            console.error("Failed to update user profile:", err.message, "Response:", err.response?.data);
            setError(err.response?.data?.detail || err.message || "Не удалось обновить профиль");
        }
    };

    useEffect(() => {
        fetchUsers(filters);
    }, []);

    return (
        <div className="min-h-screen">
            <div className="mt-24 container2 mx-auto">
                <h1 className="text-4xl font-bold mb-8">Список сотрудников</h1>
                <div className="flex mt-10">
                    <div className="shadow-md p-4 sticky top-16 rounded-3xl">
                        <h2 className="text-lg font-bold mb-4">Фильтры</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Полное имя</label>
                                <input
                                    type="text"
                                    value={filters.fullName}
                                    onChange={(e) => handleFilterChange("fullName", e.target.value)}
                                    className="p-2 border rounded-lg w-full"
                                    placeholder="Введите имя, фамилию или отчество"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Роль</label>
                                <select
                                    value={filters.role}
                                    onChange={(e) => handleFilterChange("role", e.target.value as UserRole | "")}
                                    className="p-2 border rounded-lg w-full"
                                >
                                    <option value="">Все роли</option>
                                    <option value={UserRole.ADMIN}>Admin</option>
                                    <option value={UserRole.MANAGER}>Manager</option>
                                    <option value={UserRole.USER}>User</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Пол</label>
                                <select
                                    value={filters.sex}
                                    onChange={(e) => handleFilterChange("sex", e.target.value as "М" | "Ж" | "")}
                                    className="p-2 border rounded-lg w-full"
                                >
                                    <option value="">Все</option>
                                    <option value="М">Мужской</option>
                                    <option value="Ж">Женский</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Должность</label>
                                <input
                                    type="text"
                                    value={filters.positionEmployee}
                                    onChange={(e) => handleFilterChange("positionEmployee", e.target.value)}
                                    className="p-2 border rounded-lg w-full"
                                    placeholder="Введите должность"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <div className="container mx-auto p-4">
                            <div className="grid grid-cols-2 gap-6">
                                {loading ? (
                                    <p className="text-center col-span-2">Загрузка...</p>
                                ) : error ? (
                                    <p className="text-red-500 text-center col-span-2">{error}</p>
                                ) : users.length === 0 ? (
                                    <p className="text-center col-span-2">Пользователи не найдены</p>
                                ) : (
                                    users.map((user) => (
                                        <div
                                            key={user.id}
                                            className="bg-white rounded-2xl shadow-md p-4 flex items-center space-x-4"
                                        >
                                            <div className="w-20 h-20 rounded-full fi8 flex items-center justify-center overflow-hidden"></div>
                                            <div className="flex-1">
                                                <p className=" text-lg font-semibold">{user.full_name}</p>
                                                <p className="text-gray-600">{user.position_employee}</p>
                                            </div>
                                            <button
                                                onClick={() => handleViewProfile(user)}
                                                className="bg-[#3314F1] text-white px-4 py-2 rounded-full hover:bg-purple-600"
                                            >
                                                Подробнее
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isModalOpen && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-20 rounded-[40] shadow-lg w-[60%] relative h-[80vh]" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-3xl font-bold mb-4">Профиль</h2>
                        <div className="h-[40%] w-[80%] mx-auto p-10 flex">
                            <div className="h-[100%] w-2/3">
                                <div className="h-40 w-40 my-auto rounded-full fi8"></div>
                            </div>
                            <div className="h-full w-1/3 flex">
                                {editMode ? (
                                    <>
                                        <button
                                            onClick={handleSaveChanges}
                                            className="bg-green-500 mt-auto h-10 text-white px-4 py-2 rounded-full hover:bg-green-600"
                                        >
                                            Сохранить
                                        </button>
                                        <button
                                            onClick={() => setEditMode(false)}
                                            className="bg-gray-500 mt-auto ml-20 h-10 text-white px-4 py-2 rounded-full hover:bg-gray-600"
                                        >
                                            Отмена
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        {currentUser.role === UserRole.ADMIN && (
                                            <button
                                                onClick={() => setEditMode(true)}
                                                className="bg-purple-500 mt-auto h-10 text-white px-4 py-2 rounded-3xl hover:bg-purple-600"
                                            >
                                                Редактировать
                                            </button>
                                        )}
                                        <button
                                            onClick={handleCloseModal}
                                            className="bg-gray-500 mt-auto ml-20 h-10 text-white px-4 py-2 rounded-3xl hover:bg-gray-600"
                                        >
                                            Закрыть
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="h-[55%] w-full border-2 border-black rounded-[20] p-16 flex">
                            <p className="text-3xl font-bold absolute mt-[-50px]">Персональная информация</p>
                            {editMode ? (
                                <>
                                    <div className="h-full w-1/3">
                                        <p className="text-gray-400 text-xl">Имя:</p>
                                        <input
                                            type="text"
                                            value={editUserData.full_name || ""}
                                            onChange={(e) =>
                                                setEditUserData({ ...editUserData, full_name: e.target.value })
                                            }
                                            className="p-2 border rounded-lg w-full"
                                        />
                                        <p className="text-gray-400 text-xl mt-5">Номер телефона:</p>
                                        <input
                                            type="text"
                                            value={editUserData.phone_number || ""}
                                            onChange={(e) =>
                                                setEditUserData({ ...editUserData, phone_number: e.target.value || undefined })
                                            }
                                            className="p-2 border rounded-lg w-full"
                                        />
                                        <p className="text-gray-400 text-xl mt-5">Телеграм:</p>
                                        <input
                                            type="text"
                                            value={editUserData.tg_name || ""}
                                            onChange={(e) =>
                                                setEditUserData({ ...editUserData, tg_name: e.target.value || undefined })
                                            }
                                            className="p-2 border rounded-lg w-full"
                                        />
                                    </div>
                                    <div className="h-full w-1/3">
                                        <p className="text-gray-400 text-xl">Email (личный):</p>
                                        <input
                                            type="text"
                                            value={editUserData.email_user || ""}
                                            onChange={(e) =>
                                                setEditUserData({ ...editUserData, email_user: e.target.value || undefined })
                                            }
                                            className="p-2 border rounded-lg w-full"
                                        />
                                        <p className="text-gray-400 text-xl mt-5">Подразделение:</p>
                                        <input
                                            type="text"
                                            value={editUserData.subdivision || ""}
                                            onChange={(e) =>
                                                setEditUserData({ ...editUserData, subdivision: e.target.value || undefined })
                                            }
                                            className="p-2 border rounded-lg w-full"
                                        />
                                    </div>
                                    <div className="h-full w-1/3">
                                        <p className="text-gray-400 text-xl">Должность:</p>
                                        <input
                                            type="text"
                                            value={editUserData.position_employee || ""}
                                            onChange={(e) =>
                                                setEditUserData({ ...editUserData, position_employee: e.target.value || undefined })
                                            }
                                            className="p-2 border rounded-lg w-full"
                                        />
                                        <p className="text-gray-400 text-xl mt-5">Роль:</p>
                                        <select
                                            value={editUserData.role || ""}
                                            onChange={(e) =>
                                                setEditUserData({ ...editUserData, role: e.target.value as UserRole })
                                            }
                                            className="p-2 border rounded-lg w-full"
                                        >
                                            <option value={UserRole.ADMIN}>Admin</option>
                                            <option value={UserRole.MANAGER}>Manager</option>
                                            <option value={UserRole.USER}>User</option>
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="h-full w-1/3">
                                        <p className="text-gray-400 text-xl">Имя:</p>
                                        <p className="text-xl">{selectedUser.full_name}</p>
                                        <p className="text-gray-400 text-xl mt-5">Номер телефона:</p>
                                        <p className="text-xl">{selectedUser.phone_number || "N/A"}</p>
                                        <p className="text-gray-400 text-xl mt-10">Телеграм:</p>
                                        <p className="text-xl">{selectedUser.tg_name || "N/A"}</p>
                                    </div>
                                    <div className="h-full w-1/3">
                                        <p className="text-gray-400 text-xl">Email (личный):</p>
                                        <p className="text-xl">{selectedUser.email_user || "N/A"}</p>
                                        <p className="text-gray-400 text-xl mt-5">Подразделение:</p>
                                        <p className="text-xl">{selectedUser.subdivision || "N/A"}</p>
                                        <p className="text-gray-400 text-xl mt-10">Пол:</p>
                                        <p className="text-xl">{selectedUser.sex || "N/A"}</p>
                                    </div>
                                    <div className="h-full w-1/3">
                                        <p className="text-gray-400 text-xl">Корп. Email:</p>
                                        <p className="text-xl">{selectedUser.email_corporate || "N/A"}</p>
                                        <p className="text-gray-400 text-xl mt-5">Должность:</p>
                                        <p className="text-xl">{selectedUser.position_employee || "N/A"}</p>
                                        <p className="text-gray-400 text-xl mt-10">Роль:</p>
                                        <p className="text-xl">{selectedUser.role}</p>
                                    </div>
                                </>
                            )}
                        </div>
                        {error && <p className="text-red-500 mt-4">{error}</p>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserList;