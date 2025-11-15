import { GetServerSideProps } from "next";
import { parseCookies } from "nookies";
import api from "../lib/api";
import { User } from "../lib/types";
import { isAuthenticated } from "../lib/auth";
import { useState, useEffect } from "react";
interface DockProps {
    currentUser: User;
}

export default function Dock({ currentUser }: DockProps) {
    const [error, setError] = useState<string | null>(null); // State for error handling

    

    return (
        <div className="container2 bg-[#] mx-auto mt-24">
            <div className="space-y-4 mt-20">
                <div>
                    
                </div>
            </div>
        </div>
    );
}

export const getServerSideProps: GetServerSideProps<DockProps> = async (context) => {
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
        return { props: { currentUser: response.data } };
    } catch (error) {
        console.error("Error fetching user for dock:", error);
        return {
            redirect: { destination: "/", permanent: false },
        };
    }
};