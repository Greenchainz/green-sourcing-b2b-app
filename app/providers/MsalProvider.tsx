"use client";

import { ReactNode } from "react";

export default function MsalProviderWrapper({
    children,
}: {
    children: ReactNode;
}) {
    return <>{children}</>;
}
