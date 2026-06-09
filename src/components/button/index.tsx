import Link from "next/link";
import { CSSProperties } from "react";
import css from './styles.module.css';

type Props = {
    "label": string,
    "href"?: string,
    "onClick"?: () => any,
    "className"?: string,
    "containerStyle"?: CSSProperties
}

export default function Button(props: Props) {
    const { label, href, onClick, className, containerStyle } = props;

    if (href) return <Link
        href={href}
        style={containerStyle}
        className={`${css.button} ${className}`}
    >
        <span>{label}</span>
    </Link>;

    return <button
        onClick={onClick}
        style={containerStyle}
        className={`${css.button} ${className}`}
    >
        <span>{label}</span>
    </button>
}