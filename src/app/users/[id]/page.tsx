"use client";

import Header from "@/components/header";
import css from './page.module.css';
import { useParams, useRouter } from "next/navigation";
import { CSSProperties, useEffect, useState } from "react";
import REST from "@/modules/rest";
import Loading from "@/components/loading";
import dayjs from "dayjs";
import { GetMaxProblemScore } from "@/modules/problemScore";

function coloringScore(score: number, max: number) {
    // God I 문제는 배제 후 step
    const step = score / (max - 180);

    if (step < 0.10) return "#ffffff";
    if (step < 0.20) return "#00a2ca";
    if (step < 0.30) return "#91ff65";
    if (step < 0.40) return "#fff672";
    if (step < 0.50) return "#ff7e7e";
    if (step < 0.60) return "#ff68ff";
    if (step < 0.70) return "linear-gradient(242deg, #ffcd9f, #ffa632)";
    if (step < 0.80) return "linear-gradient(242deg, #757575, #ffffff)";
    if (step < 0.90) return "linear-gradient(242deg, #fff2a8, #ffeb38)";
    if (step < 1.01) return "linear-gradient(242deg, #ffd166, #6ee7f9, #c084fc)";

    return "linear-gradient(90deg, #ff3737, #ff934b, #ffdd1f, #7bff00, #3df2ff, #2f4eff, #a83eff)";
}

export default function Page() {
    const router = useRouter();
    const { id } = useParams<{ "id": string }>();
    const [user, setUser] = useState<APIUser>();
    const [maxScore, setMaxScore] = useState(0);

    useEffect(() => {
        (async () => {
            const r = await REST(decodeURIComponent(id) === "@me" ? `/api/me` : `/api/users/${id}`);
            if (!r.success) {
                alert("유저 정보를 가져오지 못했어요.");
                return router.back();
            }

            setUser(r.data);
            setMaxScore(await GetMaxProblemScore());
        })();
    }, []);

    if (!user || maxScore <= 0) return <div style={{ "width": "100vw", "height": "100dvh" }}>
        <Loading />
    </div>;

    return <>
        <Header />
        <div className={css.container}>
            <div className={css.userInfo}>
                <div className={css.section}>
                    <img
                        draggable={false}
                        src={user?.profile ?? "https://user.pro203s.kr/defaultUser.png"}
                        className={css.profile}
                    />
                    <div className={css.texts}>
                        <span className={css.title}>{user.displayName}</span>
                        <span className={css.desc}>가입일: {dayjs(user.registerAt).format("YYYY/MM/DD HH:mm:ss")}</span>
                    </div>
                </div>
                <div className={css.section}>
                    <div className={css.texts}>
                        <span className={css.title} style={{ "fontSize": "1.01rem" }}>점수</span>
                        <span className={css.score} style={{ "--score-color": coloringScore(user.score, maxScore) } as CSSProperties}>{user.score}점</span>
                    </div>
                </div>
            </div>
        </div>
    </>;
}