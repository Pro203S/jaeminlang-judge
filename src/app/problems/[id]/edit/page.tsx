"use client";

import ProblemEditor from "@/app/problems/make/ProblemEditor";
import { useParams } from "next/navigation";

export default function Page() {
    const { id } = useParams<{ "id": string }>();

    return <ProblemEditor mode="edit" problemId={id} />;
}
