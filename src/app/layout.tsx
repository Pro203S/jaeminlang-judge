import type { Metadata } from "next";
import "./globals.css";

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
        <html lang="ko">
            <body>{children}</body>
        </html>
    );
}
