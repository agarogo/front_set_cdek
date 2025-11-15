import api from "./api";
import { setCookie, parseCookies, destroyCookie, CookieParseOptions } from "nookies";

// Экспортируем parseCookies для использования в других модулях
export { parseCookies };

interface LoginResponse {
    access_token: string;
    token_type: string;
}

// Тип для контекста Next.js
interface NextApiRequestWithCookies extends Request {
    cookies?: Partial<Record<string, string>>;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
    try {
        console.log("Sending login request for email:", email); // Отладка (опционально)
        const response = await api.post<LoginResponse>(
            "/token",
            new URLSearchParams({ username: email, password }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );
        console.log("Token received:", response.data.access_token); // Отладка (опционально)
        setCookie(null, "_token", response.data.access_token, {
            maxAge: 30 * 24 * 60 * 60,
            path: "/",
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        });
        console.log("Token saved in cookies"); // Отладка (опционально)
        return response.data;
    } catch (error) {
        console.error("Login error:", error);
        throw error;
    }
}

export function logout() {
    destroyCookie(null, "_token", { path: "/" });
}

// Функция для проверки авторизации с поддержкой серверного контекста
export function isAuthenticated(context?: { req: NextApiRequestWithCookies }): boolean {
    let cookies: Record<string, string> = {};

    // На сервере (в getServerSideProps или API маршрутах)
    if (typeof window === "undefined" && context?.req) {
        cookies = parseCookies(context);
        console.log("Server-side cookies:", cookies); // Отладка (опционально)
    }
    // На клиенте
    else {
        cookies = parseCookies();
        console.log("Client-side cookies:", cookies); // Отладка (опционально)
    }

    const { _token } = cookies;
    console.log("Token found:", _token); // Отладка (опционально)
    return !!_token;
}