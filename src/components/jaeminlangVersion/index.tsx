"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { JaeminlangReleaseInfo } from "@/modules/jaeminlangRelease";

type Props = {
    fallback: JaeminlangReleaseInfo;
};

export default function JaeminlangVersion(props: Props) {
    const [release, setRelease] = useState(props.fallback);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const response = await fetch("/api/runtime-version", {
                    "cache": "no-store"
                });

                if (!response.ok) return;

                const next = await response.json() as Partial<JaeminlangReleaseInfo>;
                if (!cancelled && next.version && next.releaseUrl) {
                    setRelease({
                        "version": next.version,
                        "releaseUrl": next.releaseUrl,
                        ...(next.assetName ? { "assetName": next.assetName } : {}),
                        ...(next.updatedAt ? { "updatedAt": next.updatedAt } : {})
                    });
                }
            } catch {
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    return <Link target="_blank" rel="noreferrer" href={release.releaseUrl}>
        jaeminlang {release.version}
    </Link>;
}
