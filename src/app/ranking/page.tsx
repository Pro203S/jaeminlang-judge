"use client";

import Header from "@/components/header";
import css from './page.module.css';
import { useEffect, useState } from "react";
import REST from "@/modules/rest";
import { useRouter } from "next/navigation";
import Loading from "@/components/loading";

export default function Page() {
    const router = useRouter();
    const [ranking, setRanking] = useState<RESTResponseMap["/api/ranking"]>([]);

    useEffect(() => {
        (async () => {
            const r = await REST("/api/ranking");
            if (!r.success) {
                alert("랭킹 불러오기에 실패했어요...");
                return router.back();
            }

            setRanking(r.data);
        })();
    }, []);

    if (ranking.length === 0) return <div style={{ "width": "100vw", "height": "calc(100dvh - 65px)" }}><Loading /></div>;

    return <>
        <Header />
        <div className={css.container}>

        </div>
    </>;
}