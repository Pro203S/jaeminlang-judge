import Link from "next/link";
import { CSSProperties, ReactNode, RefObject } from "react";
import css from './styles.module.css';

type Props = {
    "label"?: string,
    "href"?: string,
    "onClick"?: () => any,
    "className"?: string,
    "containerStyle"?: CSSProperties
    "children"?: ReactNode
    "ref"?: RefObject<HTMLButtonElement | null> | RefObject<HTMLAnchorElement | null>;
}

export default function Button(props: Props) {
    const { label, href, onClick, className, containerStyle, children, ref } = props;

    if (href) return <Link
        ref={ref as RefObject<HTMLAnchorElement | null>}
        href={href}
        style={containerStyle}
        className={`${css.button} ${className}`}
    >
        {children ?? <span>{label}</span>}
    </Link>;

    return <button
        ref={ref as RefObject<HTMLButtonElement | null>}
        onClick={onClick}
        style={containerStyle}
        className={`${css.button} ${className}`}
    >
        {children ?? <span>{label}</span>}
    </button>
}