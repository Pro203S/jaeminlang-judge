"use client";

import Header from '@/components/header';
import css from './page.module.css';
import Button from '@/components/button';
import InOutAnimation from '@/components/InOutAnimation';

export default function Page() {
    return <>
        <Header />
        <div className={css.container}>
            <InOutAnimation animate delay={100}>
                <span className={css.logo}>Jaeminlang Online Judge</span>
            </InOutAnimation>
            <InOutAnimation animate delay={400}>
                <span className={css.description}>재민랭을 즐기는 또 다른 방법</span>
            </InOutAnimation>
            <InOutAnimation animate delay={700}>
                <div className={css.buttons}>
                    <Button
                        label="문제 풀기"
                        href="/problems"
                    />
                    <Button
                        label="랭킹 보기"
                    />
                </div>
            </InOutAnimation>
        </div>
    </>;
}
