import { useState, useEffect } from "react";
import { login } from "../lib/auth";
import { useRouter } from "next/router";
import { isAuthenticated } from "../lib/auth";
import "../styles/globals.css";

const LoginForm: React.FC = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [attempts, setAttempts] = useState(0);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null); // Сбрасываем предыдущую ошибку перед новым запросом

        if (attempts >= 5) {
            setError("Аккаунт заблокирован из-за превышения попыток входа");
            return;
        }

        try {
            console.log("Sending login request for email:", email);
            const loginResponse = await login(email, password);
            console.log("Login successful, token:", loginResponse.access_token);
            await router.push("/dashboard");
        } catch (err: any) {
            console.error("Login error:", err);
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);

            if (err.response) {
                if (err.response.status === 401) {
                    setError("Неверный email или пароль");
                } else if (err.response.status === 403) {
                    setError(err.response.data.detail || "Ваш аккаунт заблокирован из-за 5 неудачных попыток входа");
                } else {
                    setError(err.response.data.detail || "Ошибка входа. Попробуйте позже.");
                }
            } else if (err.request) {
                setError("Сервер не отвечает. Проверьте подключение.");
            } else {
                setError("Неизвестная ошибка при входе.");
            }
        }
    };

    useEffect(() => {
        console.log("Checking authentication on mount");
        if (isAuthenticated()) {
            console.log("User is authenticated, redirecting to dashboard");
            router.push("/news");
        }
    }, [router]);

    return (
        <div className="h-screen flex items-center justify-center relative bg-white">
            <form onSubmit={handleSubmit} className="h-screen bg-white rounded mr-auto w-[49%] flex">
                <div className="h-[30%] my-auto w-[40%] mx-auto">
                    <h1 className="text-5xl font-bold">Авторизация</h1>
                    <div className="w-full mx-auto mt-10">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full h-12 border rounded-[20] p-4 bg-[#EBEBEB] text-xl"
                            placeholder="Email"
                            required
                        />
                    </div>
                    <div className="w-full mx-auto mt-5">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full h-12 border rounded-[20] p-4 bg-[#EBEBEB] text-xl"
                            placeholder="Пароль"
                            required
                        />
                    </div>
                    {error && <p className="text-red-500 mb-4 text-xl">{error}</p>}
                    <p className="text-[#3314F1] mt-5">Забыли пароль?</p>
                    <button
                        type="submit"
                        disabled={attempts >= 5}
                        className="h-20 mt-5 bg-[#3314F1] text-white p-2 rounded-[20] hover:bg-blue-600 disabled:bg-gray-400 w-full text-xl"
                    >
                        Войти
                    </button>
                </div>
            </form>
            <div className="w-[49%] mr-auto h-[96%] rounded-3xl diagonal-gradient">
                <div className="inset-0 overflow-hidden">
                    <div className="absolute w-[393.96px] h-[309.67px] ml-[7%] mt-[3%] fi4 rounded-full animate-breathe-up-down delay-4"></div>
                    <div className="absolute w-[318px] h-[235.38px] mt-[30%] ml-[2%] fi2 rounded-full animate-breathe-diagonal-ul-dr delay-6"></div>
                    <div className="absolute w-[448.6px] h-[350px] ml-[25%] mt-[20%] fi rounded-full animate-breathe-diagonal-ur-dl delay-1"></div>
                    <div className="absolute w-[1000.53px] h-[900.69px] ml-[-100] fi3 rounded-full animate-breathe-up-down delay-2"></div>
                </div>
            </div>
        </div>
    );
};

export default LoginForm;