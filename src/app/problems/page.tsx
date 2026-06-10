"use client";

import Header from "@/components/header";
import css from './page.module.css';
import { useEffect, useState } from "react";
import REST from "@/modules/rest";

export default function Page() {
    const [user, setUser] = useState<APIUser>();

    useEffect(() => {
        (async () => {
            const r = await REST("/api/me");
            if (!r.success) return;

            setUser(r.data);
        })();
    }, []);


    return <>
        <Header sessionOverride={user} doNotRequest />
        <div className={css.container}>
            <div className={css.search}>
                <input
                />
            </div>
            <div className={css.problems}>

            </div>
        </div>
    </>;
}
