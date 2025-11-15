import { useState } from "react";
import api from "../lib/api";
import { User, UserRole, NewsCreate } from "../lib/types";
import { GetServerSideProps } from "next";
import { parseCookies } from "nookies";
import { isAuthenticated } from "../lib/auth";

interface CreateNewsProps {
    currentUser: User;
}

export default function CreateNews({ currentUser }: CreateNewsProps) {
    const [news, setNews] = useState<NewsCreate>({
        title: "",
        content: "",
        newsc: "",  // Добавлено поле для описания
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!news.title.trim() || !news.content.trim()) {
            setError("Заполните все обязательные поля (заголовок и содержание)");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const token = parseCookies()._token;
            const response = await api.post("/news/", news, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setSuccess("Новость успешно создана");
            setNews({
                title: "",
                content: "",
                newsc: "",  // Сброс поля newsc
            });
        } catch (err: any) {
            console.error("Failed to create news:", err.response?.data || err.message);
            setError(err.response?.data?.detail || "Не удалось создать новость");
        } finally {
            setLoading(false);
        }
    };

    if (currentUser.role !== UserRole.ADMIN) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-red-500">Доступ запрещён: Только администраторы могут создавать новости</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen ">
            <div className="mt-24 container2 mx-auto">
                <h1 className="text-4xl font-bold  mb-8">Создание новости</h1>
                <form onSubmit={loading ? undefined : handleSubmit} className=" mx-auto p-6 bg-white rounded-2xl shadow-md">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Заголовок *</label>
                        <input
                            type="text"
                            value={news.title}
                            onChange={(e) => setNews({ ...news, title: e.target.value })}
                            className="p-2 border rounded-lg w-full focus:border-purple-500"
                            placeholder="Введите заголовок новости"
                            disabled={loading}
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Описание *</label>
                        <textarea
                            value={news.content}
                            onChange={(e) => setNews({ ...news, content: e.target.value })}
                            className="p-2 border rounded-lg w-full h-32 focus:border-purple-500"
                            placeholder="Введите описание новости"
                            disabled={loading}
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Содержание</label>
                        <textarea
                            value={news.newsc || ""}
                            onChange={(e) => setNews({ ...news, newsc: e.target.value })}
                            className="p-2 border rounded-lg w-full h-40 focus:border-purple-500"
                            placeholder="Введите содержание новости"
                            disabled={loading}
                        />
                    </div>
                    <button
                        type="submit"
                        className="bg-[#3314F1] text-white px-4 py-2 rounded-2xl hover:bg-purple-600 disabled:bg-gray-400"
                        disabled={loading}
                    >
                        {loading ? "Создание..." : "Создать"}
                    </button>
                    {error && <p className="text-red-500 mt-4">{error}</p>}
                    {success && <p className="text-green-500 mt-4">{success}</p>}
                </form>
            </div>
        </div>
    );
}

export const getServerSideProps: GetServerSideProps<CreateNewsProps> = async (context) => {
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
        if (response.data.role !== UserRole.ADMIN) {
            return {
                redirect: { destination: "/dashboard", permanent: false },
            };
        }
        return { props: { currentUser: response.data } };
    } catch (error) {
        console.error("Error fetching user for create-news:", error);
        return {
            redirect: { destination: "/", permanent: false },
        };
    }
};