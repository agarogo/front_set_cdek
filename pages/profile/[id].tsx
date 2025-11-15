import { GetServerSideProps } from "next";
import { parseCookies } from "nookies";
import api from "../../lib/api";
import { User } from "../../lib/types";
import UserProfile from "../../components/UserProfile";
import { isAuthenticated } from "../../lib/auth";

interface ProfileProps {
    currentUser: User;
    userId: string;
    profileUser?: User; // Данные профиля пользователя, если это не текущий пользователь
}

export default function Profile({ currentUser, userId, profileUser }: ProfileProps) {
    return <UserProfile currentUser={currentUser} userId={userId} profileUser={profileUser} />;
}

export const getServerSideProps: GetServerSideProps<ProfileProps> = async (context) => {
    if (!isAuthenticated(context)) {
        console.log("User not authenticated, redirecting to /");
        return {
            redirect: { destination: "/", permanent: false },
        };
    }

    const { _token } = parseCookies(context);
    const { id } = context.params as { id: string };

    try {
        // Получаем текущего пользователя
        const currentUserResponse = await api.get<User>("/users/me", {
            headers: { Authorization: `Bearer ${_token}` },
        });
        const currentUser = currentUserResponse.data;

        console.log("Current user:", currentUser);
        console.log("Requested userId:", id);

        // Если это не админ, разрешаем только доступ к своему профилю
        if (currentUser.role !== "admin" && id !== "me") {
            console.log("Non-admin user, redirecting to /profile/me");
            return {
                redirect: { destination: "/profile/me", permanent: false },
            };
        }

        // Если запрашивается профиль другого пользователя (и пользователь — админ)
        let profileUser: User | undefined = undefined;
        if (id !== "me" && currentUser.role === "admin") {
            try {
                const profileResponse = await api.get<User>(`/users/${id}`, {
                    headers: { Authorization: `Bearer ${_token}` },
                });
                profileUser = profileResponse.data;
            } catch (err: any) {
                if (err.response?.status === 404) {
                    console.error("User not found for id:", id);
                    return {
                        notFound: true, // Next.js вернет 404 страницу
                    };
                }
                throw err; // Пробрасываем другие ошибки
            }
        }

        // Для /profile/me или если это админ, возвращаем данные
        return {
            props: {
                currentUser,
                userId: id,
                profileUser, // Передаем данные профиля, если загружены
            },
        };
    } catch (error) {
        console.error("Error fetching user for profile:", error);
        return {
            redirect: { destination: "/", permanent: false },
        };
    }
};