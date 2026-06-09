import { useState, useEffect } from 'react';

type Size = { width: number, height: number }

function getWindowDimensions(): Size {
    if (typeof window === "undefined") return { "width": -1, "height": -1 };

    const { innerWidth: width, innerHeight: height } = window;
    return {
        width,
        height
    };
}

export default function useWindowDimensions(): Size {
    const [windowDimensions, setWindowDimensions] = useState<Size>({
        "width": -1,
        "height": -1
    });

    useEffect(() => {
        function handleResize() {
            setWindowDimensions(getWindowDimensions());
        }

        if (typeof window === "undefined") {
            return;
        }

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return windowDimensions;
}