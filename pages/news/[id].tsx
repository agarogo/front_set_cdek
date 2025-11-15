import { useState, useEffect } from "react";
import api from "../../lib/api";
import { News } from "../../lib/types";
import { GetServerSideProps } from "next";
import { parseCookies } from "nookies";
import { isAuthenticated } from "../../lib/auth";
import { User } from "../../lib/types";

interface NewsDetailProps {
    currentUser: User;
    news: News;
}

export default function NewsDetail({ currentUser, news }: NewsDetailProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    return (
        <div className="min-h-screen ">
            <div className="mt-24 container2 mx-auto">
                <h1 className="text-4xl font-bold mb-8">{news.title}</h1>
                <div className="p-6 bg-white rounded-2xl shadow-md">
                    <p className="text-2xl">{news.content}</p>
                </div>
                <div className="p-6 bg-white rounded-2xl shadow-md mt-20">
                    <p className="text-xl">{news.newsc}</p>
                    <p className="text-sm text-gray-500 mt-4">
                        Добавлено: {new Date(news.created_at).toLocaleDateString()}
                    </p>
                </div>
            </div>
        </div>
    );
}

export const getServerSideProps: GetServerSideProps<NewsDetailProps> = async (context) => {
    if (!isAuthenticated(context)) {
        return {
            redirect: { destination: "/", permanent: false },
        };
    }

    const { id } = context.params as { id: string };
    const { _token } = parseCookies(context);

    try {
        const userResponse = await api.get<User>("/users/me", {
            headers: { Authorization: `Bearer ${_token}` },
        });
        const newsResponse = await api.get<News>(`/news/${id}`, {
            headers: { Authorization: `Bearer ${_token}` },
        });
        return {
            props: {
                currentUser: userResponse.data,
                news: newsResponse.data,
            },
        };
    } catch (error) {
        console.error("Error fetching news or user:", error);
        return {
            redirect: { destination: "/news", permanent: false },
        };
    }
};