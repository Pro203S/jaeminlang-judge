"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import rest from "@/modules/rest";

import styles from "./page.module.css";

type SessionResponse = {
    authenticated: boolean;
    user?: Record<string, unknown>;
};

export default function Page() {
    const [session, setSession] = useState<SessionResponse | null>(null);
    const [loading, setLoading] = useState(true);

    const loadSession = useCallback(async () => {
        setLoading(true);

        try {
            const result = await rest<SessionResponse>("/api/auth/session", {
                method: "GET",
            });

            setSession(result.success ? result.data : { authenticated: false });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadSession();
    }, [loadSession]);

    const displayName = useMemo(() => {
        const user = session?.user;

        if (!user) {
            return "";
        }

        const candidates = [
            user.displayName,
            user.name,
            user.nickname,
            user.username,
            user.email,
            user.id,
        ];

        return (
            candidates.find((value) => typeof value === "string" && value) ??
            "인증된 사용자"
        );
    }, [session]);

    const login = () => {
        location.href = `/api/auth/login?next=${encodeURIComponent("/")}`;
    };

    const logout = async () => {
        setLoading(true);
        await rest("/api/auth/logout", {
            method: "POST",
        });
        await loadSession();
    };

    return (
        <main className={styles.page}>
            <section className={styles.panel}>
                <div className={styles.brand}>
                    <span className={styles.kicker}>jaeminlang judge</span>
                    <h1>Pro203S 계정</h1>
                </div>
                <div className={styles.status}>
                    <span
                        className={
                            session?.authenticated
                                ? styles.statusDotActive
                                : styles.statusDot
                        }
                    />
                    <span>
                        {loading
                            ? "확인 중"
                            : session?.authenticated
                              ? `${displayName} 로그인됨`
                              : "로그인 필요"}
                    </span>
                </div>
                <div className={styles.actions}>
                    {session?.authenticated ? (
                        <>
                            <button
                                className={styles.secondaryButton}
                                disabled={loading}
                                type="button"
                                onClick={loadSession}
                            >
                                새로고침
                            </button>
                            <button
                                className={styles.primaryButton}
                                disabled={loading}
                                type="button"
                                onClick={logout}
                            >
                                로그아웃
                            </button>
                        </>
                    ) : (
                        <button
                            className={styles.primaryButton}
                            disabled={loading}
                            type="button"
                            onClick={login}
                        >
                            Pro203S로 로그인
                        </button>
                    )}
                </div>
            </section>
        </main>
    );
}
