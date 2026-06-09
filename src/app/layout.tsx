import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Suspense } from "react";
import FontReady from "@/components/FontReady";

const pretendard = localFont({
    src: "../../public/PretendardVariable.ttf",
    variable: "--font-pretendard",
    display: "block",
    preload: true,
});

const continuous = localFont({
    src: "../../public/continuous.ttf",
    variable: "--font-continuous",
    display: "block",
    preload: true,
});

export const metadata: Metadata = {
    title: "jaeminlang judge",
    description: "재민랭을 온라인에서 풀어보세요!",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ko" className={`${pretendard.variable} ${continuous.variable}`}>
            <body className="fontLoading">
                <FontReady />
                <Suspense defer fallback={null}>
                    {children}
                </Suspense>
            </body>
        </html>
    );
}
