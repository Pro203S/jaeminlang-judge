"use client";

import Link from 'next/link';
import css from './styles.module.css';
import { useEffect, useRef, useState } from 'react';
import REST from '@/modules/rest';
import InOutAnimation from '../InOutAnimation';
import useWindowDimensions from '@/modules/useWindowDimensions';

type Props = {
    sessionOverride?: APIUser;
    doNotRequest?: boolean;
};

export default function Header(props: Props) {
    const [user, setUser] = useState<Props["sessionOverride"]>(props.sessionOverride);
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
    const accountMenuRef = useRef<HTMLDivElement>(null);
    const { width } = useWindowDimensions();

    useEffect(() => setUser(props.sessionOverride), [props.sessionOverride]);

    useEffect(() => {
        (async () => {
            if (props.sessionOverride || props.doNotRequest) return;

            const r = await REST("/api/me");
            if (!r.success) return;

            setUser(r.data);
        })();
    }, []);

    useEffect(() => {
        if (!isAccountMenuOpen) return;

        const closeAccountMenu = (event: MouseEvent) => {
            if (
                event.target instanceof Node &&
                accountMenuRef.current?.contains(event.target)
            ) {
                return;
            }

            setIsAccountMenuOpen(false);
        };

        document.addEventListener("mousedown", closeAccountMenu);

        return () => document.removeEventListener("mousedown", closeAccountMenu);
    }, [isAccountMenuOpen]);

    const accountName = user?.displayName || "로그인 필요";

    return <div className={css.container}>
        <Link className={css.logo} href="/">{width > 800 ? "Jaeminlang Online Judge" : "JOJ"}</Link>
        <div className={css.links}>
            <Link href="/problems">문제 풀기</Link>
            <Link href="/ranking">랭킹</Link>
            <Link href="/docs">문서</Link>
            <Link href="https://github.com/Pro203S/jaeminlang#jaeminlang" target='_blank'>재민랭 문법</Link>
        </div>
        <div className={css.accountMenu} ref={accountMenuRef}>
            <button
                className={css.avatarButton}
                type="button"
                aria-haspopup="menu"
                aria-expanded={isAccountMenuOpen}
                onClick={() => setIsAccountMenuOpen((value) => !value)}
            >
                <img
                    className={css.avatar}
                    src={user?.profile ?? "https://user.pro203s.kr/defaultUser.png"}
                    alt={accountName}
                    draggable={false}
                />
            </button>
            <InOutAnimation animate={isAccountMenuOpen} className={css.dropdown}>
                <div className={css.currentAccount}>
                    <span>현재 계정</span>
                    <strong>{accountName}</strong>
                </div>
                <div className={css.line} />
                <Link
                    className={css.dropdownAction}
                    href="/users/@me"
                    role="menuitem"
                    onClick={() => setIsAccountMenuOpen(false)}
                >
                    프로필 이동
                </Link>
                {user ? <button
                    className={css.dropdownAction}
                    style={{ "width": 230 }}
                    type="button"
                    role="menuitem"
                    onClick={async () => {
                        const result = await REST("/api/auth/logout", {
                            method: "POST",
                        });

                        if (!result.success) return;

                        setUser(undefined);
                        setIsAccountMenuOpen(false);
                    }}
                >
                    로그아웃
                </button> : <Link
                    className={css.dropdownAction}
                    role="menuitem"
                    href="/api/auth/login"
                >
                    로그인
                </Link>}
            </InOutAnimation>
        </div>
    </div>
}
