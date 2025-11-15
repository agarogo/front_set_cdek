import "../styles/globals.css";
import { AppProps } from "next/app";
import Header from "../components/Header";
import { User } from "../lib/types";
import { isAuthenticated, parseCookies } from "../lib/auth";
import api from "../lib/api";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";

function MyApp({ Component, pageProps }: AppProps & { currentUser?: User }) {
    const isLoginPage = Component.name === "Home"; // Проверяем, является ли страница входом
    const router = useRouter();

    // Если это страница входа, показываем только её
    if (isLoginPage) {
        return <Component {...pageProps} />;
    }

    // Получаем начальное значение currentUser из pageProps
    const initialCurrentUser = (pageProps as { currentUser?: User }).currentUser;

    // Состояние для currentUser и проверки авторизации
    const [isAuthChecked, setIsAuthChecked] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(initialCurrentUser || null);

    useEffect(() => {
        // На клиенте проверяем авторизацию и обновляем currentUser
        if (typeof window !== "undefined") {
            const cookies = parseCookies();
            const token = cookies._token;
            if (token && !currentUser) {
                api.get<User>("/users/me", {
                    headers: { Authorization: `Bearer ${token}` },
                })
                    .then((response) => {
                        setCurrentUser(response.data);
                        router.push("/news"); // Перенаправляем на /welcome после входа
                    })
                    .catch((error) => {
                        console.error("Error fetching user on client:", error);
                        setCurrentUser(null);
                        router.push("/"); // Перенаправляем на вход, если ошибка
                    })
                    .finally(() => setIsAuthChecked(true));
            } else if (token) {
                setCurrentUser(initialCurrentUser || null);
                setIsAuthChecked(true);
                router.push("/news"); // Перенаправляем на /welcome, если токен уже есть
            } else {
                setIsAuthChecked(true);
                router.push("/"); // Перенаправляем на вход, если токена нет
            }
        } else {
            // На сервере устанавливаем начальное состояние
            setIsAuthChecked(true);
        }
    }, []);

    // Если авторизация ещё не проверена, показываем загрузку
    if (!isAuthChecked) {
        return <div>Loading...</div>;
    }

    // Если пользователь не авторизован, показываем страницу входа
    if (!currentUser) {
        return <Component {...pageProps} />;
    }

    return (
        <div>
            <Header currentUser={currentUser} />
            <main>
                <Component {...pageProps} currentUser={currentUser} />
            </main>
        </div>
    );
}

export default MyApp;