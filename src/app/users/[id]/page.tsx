"use client";

import Header from "@/components/header";
import css from './page.module.css';
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import REST from "@/modules/rest";

export default function Page() {
    const router = useRouter();
    const { id } = useParams<{ "id": string }>();
    const [user, setUser] = useState<APIUser>();

    useEffect(() => {
        (async () => {
            const r = await REST(decodeURIComponent(id) === "@me" ? `/api/me` : `/api/users/${id}`);
            if (!r.success) {
                alert("유저 정보를 가져오지 못했어요.");
                return router.back();
            }


        })();
    }, []);

    return <>
        <Header />
        <div className={css.container}>

        </div>
    </>;
}