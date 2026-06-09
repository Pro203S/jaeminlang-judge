import Link from 'next/link';
import css from './styles.module.css';
import { useEffect, useState } from 'react';
import REST from '@/modules/rest';
import type { OAuthUserResponse } from '@/modules/pro203sAuthTypes';

type Props = {
    sessionOverride?: OAuthUserResponse;
};

export default function Header(props: Props) {
    const [user, setUser] = useState<Props["sessionOverride"]>(props.sessionOverride);

    useEffect(() => {
        (async () => {
            if (props.sessionOverride) return;

            const r = await REST("/api/me");
            if (!r.success) return;

            setUser(r.data);
        })();
    }, []);

    return <div className={css.container}>
        <Link className={css.logo} href="/">Jaeminlang Online Judge</Link>
        <div className={css.links}>

        </div>
        <img
            src={user?.profile ?? "https://user.pro203s.kr/defaultUser.png"}
        />
    </div>
}
