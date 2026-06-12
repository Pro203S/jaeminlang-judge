"use client";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import css from './styles.module.css';
import { faCircleNotch } from '@fortawesome/free-solid-svg-icons';

type Props = {
    fullscr?: boolean;
}

export default function Loading(props: Props) {
    return <div className={css.screen} style={props.fullscr ? {
        "width": "100%",
        "height": "100%"
    } : undefined}>
        <FontAwesomeIcon
            className={css.loading}
            color="#888"
            icon={faCircleNotch}
            spin
            fontSize={"3rem"} />
    </div>;
}