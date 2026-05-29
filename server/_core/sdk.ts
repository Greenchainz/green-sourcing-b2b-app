import { jwtVerify } from "jose";

type VerifiedTokenPayload = {
    openId: string;
    ext?: string;
    [key: string]: unknown;
};

function getJwtSecret(): Uint8Array | null {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    return new TextEncoder().encode(secret);
}

export const sdk = {
    async verifySession(token: string): Promise<VerifiedTokenPayload | null> {
        const secret = getJwtSecret();
        if (!secret) return null;

        try {
            const { payload } = await jwtVerify(token, secret);
            if (typeof payload.openId !== "string" || !payload.openId) {
                return null;
            }

            return payload as VerifiedTokenPayload;
        } catch {
            return null;
        }
    },
};