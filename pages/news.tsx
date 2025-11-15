// pages/news.tsx
import { useEffect, useState } from "react";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { parseCookies } from "nookies";
import api from "../lib/api";
import { isAuthenticated } from "../lib/auth";
import { User } from "../lib/types";

interface DashboardProps {
    currentUser: User;
}

// формат ответа бекенда для дневника
interface MoodEntry {
    id: number;
    date: string;   // "2025-11-15"
    mood: number;   // 1–5
    note?: string | null;
}

// формат последнего теста
interface BurnoutTestResult {
    id: number;
    created_at: string;
    physical_score: number;
    emotional_score: number;
    cognitive_score: number;
    total_score: number;
    comment_work?: string | null;
    comment_factors?: string | null;
}

const getBurnoutLevel = (total: number): string => {
    if (total <= 16) return "Низкий уровень выгорания";
    if (total <= 32) return "Средний уровень выгорания";
    if (total <= 48) return "Высокий уровень выгорания";
    return "Очень высокий уровень выгорания";
};

const getDomainLevel = (
    domain: "physical" | "emotional" | "cognitive",
    score: number
): string => {
    if (domain === "physical") {
        if (score <= 4) return "Низкий";
        if (score <= 8) return "Средний";
        if (score <= 12) return "Высокий";
        return "Очень высокий";
    }
    // emotional / cognitive
    if (score <= 6) return "Низкий";
    if (score <= 12) return "Средний";
    if (score <= 18) return "Высокий";
    return "Очень высокий";
};

const Dashboard: React.FC<DashboardProps> = ({ currentUser }) => {
    const router = useRouter();

    // ---------- УРОВЕНЬ ВЫГОРАНИЯ (кратко) ----------
    const [lastTest, setLastTest] = useState<BurnoutTestResult | null>(null);
    const [testLoading, setTestLoading] = useState(false);
    const [testError, setTestError] = useState<string | null>(null);

    const burnoutScoreFromUser = currentUser.burn_out_score ?? null;

    const effectiveBurnoutScore =
        burnoutScoreFromUser ?? (lastTest ? lastTest.total_score : null);

    let burnoutLabel = "Нет данных";
    let burnoutColor = "text-gray-700";
    if (effectiveBurnoutScore !== null) {
        if (effectiveBurnoutScore <= 16) {
            burnoutLabel = "Низкий уровень выгорания";
            burnoutColor = "text-green-600";
        } else if (effectiveBurnoutScore <= 32) {
            burnoutLabel = "Средний уровень выгорания";
            burnoutColor = "text-yellow-600";
        } else if (effectiveBurnoutScore <= 48) {
            burnoutLabel = "Высокий уровень выгорания";
            burnoutColor = "text-orange-600";
        } else {
            burnoutLabel = "Очень высокий уровень выгорания";
            burnoutColor = "text-red-600";
        }
    }

    const fetchLastTest = async () => {
        setTestLoading(true);
        setTestError(null);
        const cookies = parseCookies();
        const token = cookies._token;

        try {
            const res = await api.get<BurnoutTestResult>("/burnout-tests/last", {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            setLastTest(res.data);
        } catch (err: any) {
            if (err?.response?.status === 404) {
                // тестов просто нет
                setLastTest(null);
            } else {
                console.error("Не удалось загрузить последний тест", err);
                setTestError("Не удалось загрузить данные о тесте.");
            }
        } finally {
            setTestLoading(false);
        }
    };

    // ---------- ДНЕВНИК САМОЧУВСТВИЯ ----------

    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [monthIndex, setMonthIndex] = useState(today.getMonth()); // 0–11

    const [moodByDate, setMoodByDate] = useState<Record<string, number>>({});
    const [moodLoading, setMoodLoading] = useState(false);
    const [moodError, setMoodError] = useState<string | null>(null);

    const monthNames = [
        "Январь",
        "Февраль",
        "Март",
        "Апрель",
        "Май",
        "Июнь",
        "Июль",
        "Август",
        "Сентябрь",
        "Октябрь",
        "Ноябрь",
        "Декабрь",
    ];

    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const firstDayWeekIndex = (() => {
        // JS: 0 вс, 1 пн...
        const jsDay = new Date(year, monthIndex, 1).getDay();
        // нам нужно: 0 пн, 6 вс
        return (jsDay + 6) % 7;
    })();

    const fetchMood = async () => {
        setMoodLoading(true);
        setMoodError(null);

        try {
            const cookies = parseCookies();
            const token = cookies._token;

            const res = await api.get<MoodEntry[]>("/diary", {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                params: {
                    year,
                    month: monthIndex + 1,
                },
            });

            const map: Record<string, number> = {};
            res.data.forEach((entry) => {
                const key = entry.date.slice(0, 10);
                map[key] = entry.mood;
            });
            setMoodByDate(map);
        } catch (err: any) {
            if (err?.response?.status === 404) {
                setMoodByDate({});
                setMoodError(null);
            } else {
                console.error("Не удалось загрузить дневник", err);
                setMoodError("Не удалось загрузить дневник самочувствия");
            }
        } finally {
            setMoodLoading(false);
        }
    };

    useEffect(() => {
        fetchMood();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [year, monthIndex]);

    useEffect(() => {
        fetchLastTest();
    }, []);

    const getMoodColorClass = (mood?: number) => {
        if (!mood) return "bg-gray-100 text-gray-400";
        if (mood <= 2) return "bg-red-200 text-red-700";
        if (mood === 3) return "bg-yellow-200 text-yellow-700";
        return "bg-green-200 text-green-700";
    };

    // считаем проценты
    const totalDays = daysInMonth || 1;
    let redDays = 0;
    let yellowDays = 0;
    let greenDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
        const key = `${year}-${String(monthIndex + 1).padStart(
            2,
            "0"
        )}-${String(day).padStart(2, "0")}`;
        const mood = moodByDate[key];
        if (!mood) continue;

        if (mood <= 2) redDays++;
        else if (mood === 3) yellowDays++;
        else greenDays++;
    }

    const redPct = Math.round((redDays / totalDays) * 100);
    const yellowPct = Math.round((yellowDays / totalDays) * 100);
    const greenPct = Math.round((greenDays / totalDays) * 100);
    const nonePct = Math.max(0, 100 - redPct - yellowPct - greenPct);

    const goPrevMonth = () => {
        let newMonth = monthIndex - 1;
        let newYear = year;
        if (newMonth < 0) {
            newMonth = 11;
            newYear = year - 1;
        }
        setMonthIndex(newMonth);
        setYear(newYear);
    };

    const goNextMonth = () => {
        let newMonth = monthIndex + 1;
        let newYear = year;
        if (newMonth > 11) {
            newMonth = 0;
            newYear = year + 1;
        }
        setMonthIndex(newMonth);
        setYear(newYear);
    };

    // ---------- РЕНДЕР ----------

    return (
        <div className="min-h-[800px] bg-[#F5F7FB]">
            <div className="max-w-[90%] mx-auto mt-10 mb-12 px-4 space-y-6">
                {/* Верхняя строка: 3 карточки */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Уровень выгорания */}
                    <div className="bg-white rounded-[24px] shadow-sm p-6 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">
                                Уровень выгорания
                            </h2>
                            {effectiveBurnoutScore !== null && (
                                <span className={`text-sm font-medium ${burnoutColor}`}>
                                    {effectiveBurnoutScore} баллов
                                </span>
                            )}
                        </div>

                        <div className="flex-1 flex flex-col justify-between">
                            <div className="h-40 bg-gradient-to-tr from-green-200 via-yellow-200 to-red-200 rounded-2xl relative overflow-hidden">
                                <div className="absolute inset-x-4 bottom-4 h-24 bg-white/70 rounded-2xl blur-xl" />
                            </div>

                            <p className={`mt-4 text-sm ${burnoutColor}`}>
                                {burnoutLabel}
                            </p>
                        </div>
                    </div>

                    {/* Последний тест */}
                    <div className="bg-white rounded-[24px] shadow-sm p-6 flex flex-col">
                        <h2 className="text-lg font-semibold mb-4">Последний тест</h2>

                        {testLoading ? (
                            <div className="flex-1 flex items-center text-sm text-gray-500">
                                Загрузка данных о тесте…
                            </div>
                        ) : testError ? (
                            <div className="flex-1 flex items-center text-sm text-red-500">
                                {testError}
                            </div>
                        ) : !lastTest ? (
                            <div className="flex-1 flex flex-col justify-between text-sm text-gray-600 gap-2">
                                <p>
                                    Вы ещё не проходили тест на выгорание.
                                </p>
                                <p className="text-xs text-gray-400">
                                    Пройдите опрос, чтобы получить персональные рекомендации.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => router.push("/test")}
                                    className="mt-3 inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-[#00B33C] text-white text-sm font-semibold hover:bg-[#00A334] transition"
                                >
                                    Пройти опрос
                                </button>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col justify-between text-sm text-gray-700 gap-2">
                                <p>
                                    Дата прохождения:{" "}
                                    <span className="font-medium">
                                        {new Date(lastTest.created_at).toLocaleDateString(
                                            "ru-RU"
                                        )}
                                    </span>
                                </p>
                                <p>
                                    Общий результат:{" "}
                                    <span className="font-medium">
                                        {lastTest.total_score} баллов
                                    </span>
                                </p>
                                <p className="text-xs text-gray-500">
                                    {getBurnoutLevel(lastTest.total_score)}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => router.push("/test")}
                                    className="mt-3 inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-gray-100 text-gray-800 text-sm font-semibold hover:bg-gray-200 transition"
                                >
                                    Пройти тест ещё раз
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Дневник самочувствия */}
                    <div className="bg-white rounded-[24px] shadow-sm p-6 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">
                                Дневник самочувствия
                            </h2>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <button
                                    type="button"
                                    onClick={goPrevMonth}
                                    className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100"
                                >
                                    ‹
                                </button>
                                <span className="font-medium">
                                    {monthNames[monthIndex]} {year}
                                </span>
                                <button
                                    type="button"
                                    onClick={goNextMonth}
                                    className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100"
                                >
                                    ›
                                </button>
                            </div>
                        </div>

                        <div className="flex-1">
                            {moodLoading ? (
                                <div className="text-sm text-gray-400">
                                    Загрузка данных...
                                </div>
                            ) : moodError ? (
                                <div className="text-sm text-red-500">{moodError}</div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-7 gap-1 text-[11px] text-gray-400 mb-2">
                                        {["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"].map((d) => (
                                            <div key={d} className="text-center">
                                                {d}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-7 gap-1 text-[11px]">
                                        {Array.from({ length: 42 }).map((_, index) => {
                                            const dayNumber =
                                                index - firstDayWeekIndex + 1;

                                            if (dayNumber < 1 || dayNumber > daysInMonth) {
                                                return (
                                                    <div
                                                        key={index}
                                                        className="h-7 rounded-md"
                                                    />
                                                );
                                            }

                                            const key = `${year}-${String(
                                                monthIndex + 1
                                            ).padStart(2, "0")}-${String(
                                                dayNumber
                                            ).padStart(2, "0")}`;

                                            const mood = moodByDate[key];
                                            const colorClass = getMoodColorClass(mood);

                                            return (
                                                <div
                                                    key={index}
                                                    className={`h-7 rounded-md flex items-center justify-center ${colorClass}`}
                                                >
                                                    {dayNumber}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* проценты по цветам */}
                                    <div className="mt-4 flex gap-2 text-[11px]">
                                        <span className="px-3 py-1 rounded-md bg-green-200 text-green-800 font-semibold">
                                            {greenPct}%
                                        </span>
                                        <span className="px-3 py-1 rounded-md bg-yellow-200 text-yellow-800 font-semibold">
                                            {yellowPct}%
                                        </span>
                                        <span className="px-3 py-1 rounded-md bg-red-200 text-red-800 font-semibold">
                                            {redPct}%
                                        </span>
                                        <span className="px-3 py-1 rounded-md bg-gray-200 text-gray-800 font-semibold">
                                            {nonePct}%
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Нижняя строка: Показатели + Рекомендации */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Показатели теста */}
                    <div className="bg-white rounded-[24px] shadow-sm p-6">
                        <h2 className="text-lg font-semibold mb-4">
                            Показатели теста
                        </h2>

                        {testLoading ? (
                            <p className="text-sm text-gray-500">
                                Загрузка показателей…
                            </p>
                        ) : !lastTest ? (
                            <div className="text-sm text-gray-700 space-y-3">
                                <p>
                                    Пока нет результатов теста. Пройдите опрос, чтобы увидеть
                                    свои физические, эмоциональные и когнитивные показатели.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => router.push("/test")}
                                    className="mt-1 inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-[#00B33C] text-white text-sm font-semibold hover:bg-[#00A334] transition"
                                >
                                    Пройти опрос
                                </button>
                            </div>
                        ) : (
                            <ul className="space-y-4 text-sm text-gray-700">
                                <li>
                                    <div className="flex justify-between mb-1">
                                        <span className="font-medium">
                                            Физическое состояние
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {lastTest.physical_score} баллов (
                                            {getDomainLevel("physical", lastTest.physical_score)})
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-green-400"
                                            style={{
                                                width: `${Math.min(
                                                    100,
                                                    Math.round(
                                                        (lastTest.physical_score / 16) * 100
                                                    )
                                                )}%`,
                                            }}
                                        />
                                    </div>
                                </li>
                                <li>
                                    <div className="flex justify-between mb-1">
                                        <span className="font-medium">
                                            Эмоциональное состояние
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {lastTest.emotional_score} баллов (
                                            {getDomainLevel(
                                                "emotional",
                                                lastTest.emotional_score
                                            )}
                                            )
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-yellow-400"
                                            style={{
                                                width: `${Math.min(
                                                    100,
                                                    Math.round(
                                                        (lastTest.emotional_score / 24) * 100
                                                    )
                                                )}%`,
                                            }}
                                        />
                                    </div>
                                </li>
                                <li>
                                    <div className="flex justify-between mb-1">
                                        <span className="font-medium">
                                            Когнитивное состояние
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {lastTest.cognitive_score} баллов (
                                            {getDomainLevel(
                                                "cognitive",
                                                lastTest.cognitive_score
                                            )}
                                            )
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-green-300"
                                            style={{
                                                width: `${Math.min(
                                                    100,
                                                    Math.round(
                                                        (lastTest.cognitive_score / 24) * 100
                                                    )
                                                )}%`,
                                            }}
                                        />
                                    </div>
                                </li>
                            </ul>
                        )}
                    </div>

                    {/* Рекомендации */}
                    <div className="bg-white rounded-[24px] shadow-sm p-6 md:col-span-2 flex flex-col">
                        <h2 className="text-lg font-semibold mb-4">Рекомендации</h2>
                        {!lastTest ? (
                            <p className="text-sm text-gray-700">
                                Пройдите опрос, чтобы мы могли подготовить персональные
                                рекомендации по управлению стрессом и восстановлению
                                ресурса.
                            </p>
                        ) : (
                            <div className="text-sm text-gray-700 space-y-3">
                                <p>
                                    Ваш общий результат —{" "}
                                    <span className="font-semibold">
                                        {lastTest.total_score} баллов
                                    </span>{" "}
                                    ({getBurnoutLevel(lastTest.total_score)}).
                                </p>
                                <p>
                                    Обратите внимание на те области, где уровень
                                    <span className="font-semibold"> высокий</span> или
                                    <span className="font-semibold"> очень высокий</span>. В
                                    ближайшее время попробуйте:
                                </p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>планировать короткие перерывы в течение дня;</li>
                                    <li>ограничивать переработки и работать в своём темпе;</li>
                                    <li>обсудить нагрузку и возможности поддержки с руководителем;</li>
                                    <li>выделять время на отдых, сон и занятия, которые приносят удовольствие.</li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

export const getServerSideProps: GetServerSideProps<DashboardProps> = async (
    context
) => {
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

        return {
            props: {
                currentUser: response.data,
            },
        };
    } catch (error) {
        console.error("Error fetching user for dashboard:", error);
        return {
            redirect: { destination: "/", permanent: false },
        };
    }
};
