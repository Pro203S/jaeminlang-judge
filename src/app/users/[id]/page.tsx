"use client";

import Header from "@/components/header";
import css from './page.module.css';
import { useParams, useRouter } from "next/navigation";
import { CSSProperties, useEffect, useState } from "react";
import REST from "@/modules/rest";
import Loading from "@/components/loading";
import dayjs from "dayjs";
import { GetMaxProblemScore } from "@/modules/problemScore";
import TierBadge from "@/components/tierbadge";
import { TAG_TO_STRING } from "@/modules/constants";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import InOutAnimation from "@/components/InOutAnimation";

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

function nan(n: number, d: number) {
    if (isNaN(n)) {
        return d;
    } else {
        return n;
    }
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
        <InOutAnimation animate className={css.container}>
            <div className={css.linearV}>
                <div className={css.section}>
                    <img
                        draggable={false}
                        src={user?.profile ?? "https://cdn.discordapp.com/embed/avatars/0.png"}
                        className={css.profile}
                    />
                    <div className={css.texts}>
                        <span className={css.title}>{user.displayName}</span>
                        <span className={css.desc}>가입일: {dayjs(user.registerAt).format("YYYY/MM/DD")}</span>
                    </div>
                </div>
                <div className={css.section}>
                    <div className={css.texts}>
                        <span className={css.title} style={{ "fontSize": "1.01rem" }}>점수</span>
                        <span className={css.score} style={{ "--score-color": coloringScore(user.score, maxScore) } as CSSProperties}>{user.score}점</span>
                    </div>
                </div>
            </div>
            <div className={css.linearV}>
                <div className={css.section}>
                    <div className={css.texts}>
                        <span className={css.title}>제출 수</span>
                        <span className={css.desc}>{user.stat.submits}번</span>
                    </div>
                </div>
                <div className={css.section}>
                    <div className={css.texts}>
                        <span className={css.title}>정답 횟수</span>
                        <span className={css.desc}>{user.stat.corrects}번</span>
                    </div>
                </div>
                <div className={css.section}>
                    <div className={css.texts}>
                        <span className={css.title}>정답률</span>
                        <span className={css.desc}>{nan(Math.round((user.stat.corrects / user.stat.submits) * 100), 0)}%</span>
                    </div>
                </div>
            </div>
            {user.problems.length > 0 && <div className={css.section}>
                <div className={css.texts}>
                    <span className={css.title}>푼 문제</span>
                </div>
                {user.problems.map(v => <Link
                    className={css.problem}
                    key={v.id}
                    href={`/problems/${v.id}`}
                >
                    <TierBadge tier={v.tier} className={css.tier} />
                    <div className={css.texts}>
                        <span className={css.title}>{v.name}</span>
                        <span className={css.tags}>태그: {v.tags.map(TAG_TO_STRING).join(", ")}</span>
                    </div>
                    <FontAwesomeIcon className={css.icon} icon={faChevronRight} />
                </Link>)}
            </div>}
        </InOutAnimation>
    </>;
}
