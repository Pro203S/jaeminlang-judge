"use client";

import Header from "@/components/header";
import css from './page.module.css';
import { useEffect, useState } from "react";
import REST from "@/modules/rest";
import { useRouter } from "next/navigation";
import InOutAnimation from "@/components/InOutAnimation";

export default function Page() {
    const router = useRouter();
    const [user, setUser] = useState<APIUser>();

    useEffect(() => {
        (async () => {
            const r = await REST("/api/me");
            if (!r.success) return router.back();

            setUser(r.data);
        })();
    }, []);

    return <>
        <Header sessionOverride={user} doNotRequest />
        <InOutAnimation className={css.container} animate>
            <div className={css.problem}>
                
            </div>
        </InOutAnimation>
    </>;
}
