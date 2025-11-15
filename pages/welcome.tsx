import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { parseCookies } from "nookies";
import api from "../lib/api";
import { User } from "../lib/types";
import { isAuthenticated } from "../lib/auth";
import { useState, useEffect } from "react"; // Import useState and useEffect

interface WelcomeProps {
    currentUser: User;
}

export default function Welcome({ currentUser }: WelcomeProps) {
    const router = useRouter();
    const [timeLeft, setTimeLeft] = useState<{
        days: number;
        hours: number;
        minutes: number;
        seconds: number;
    }>({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
    });


    const handleDockClick = () => {
        router.push("/dock");
    };

    // Target date: March 2, 2025
    const targetDate = new Date("2026-03-02T00:00:00");

    // Calculate time remaining for the countdown
    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            const difference = targetDate.getTime() - now.getTime();

            if (difference <= 0) {
                setTimeLeft({
                    days: 0,
                    hours: 0,
                    minutes: 0,
                    seconds: 0,
                });
                return;
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            setTimeLeft({
                days,
                hours,
                minutes,
                seconds,
            });
            console.log("Time left updated:", { days, hours, minutes, seconds });
        };

        calculateTimeLeft();

        const timer = setInterval(calculateTimeLeft, 1000);

        // Cleanup interval on component unmount
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="container2 bg-[] mx-auto mt-24">
            <div className=""></div>
        </div>
    );
}

export const getServerSideProps: GetServerSideProps<WelcomeProps> = async (context) => {
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
        console.error("Error fetching user for welcome:", error);
        return {
            redirect: { destination: "/", permanent: false },
        };
    }
};