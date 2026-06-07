import { createClient } from "redis";

interface StoredSessionRecord<T> {
    session: T;
    participants: number[];
}

interface SessionEntry<T> {
    callId: string;
    session: T;
}

const DEFAULT_TTL_SECONDS = 60 * 60;

const memoryStoreByNamespace = new Map<string, Map<string, StoredSessionRecord<unknown>>>();
const memoryUserIndexByNamespace = new Map<string, Map<number, Set<string>>>();

let redisClient: ReturnType<typeof createClient> | null = null;
let redisInitAttempted = false;
let redisWarned = false;

function isRedisRequiredForCallSessions(): boolean {
    if (process.env.REQUIRE_REDIS_CALL_SESSIONS === "false") return false;
    return process.env.NODE_ENV === "production";
}

function missingRedisConfigError(): Error {
    return new Error(
        "[call-session-store] Redis is required for call sessions in production. " +
        "Set REDIS_URL or REDIS_HOST/REDIS_PORT (and REDIS_PASSWORD if needed)."
    );
}

function redisConnectError(err: unknown): Error {
    const detail = err instanceof Error ? err.message : String(err);
    return new Error(
        `[call-session-store] Redis connection failed in production: ${detail}. ` +
        "Call sessions cannot run safely across replicas without Redis."
    );
}

function redisUrlFromEnv(): string | null {
    if (process.env.REDIS_URL) return process.env.REDIS_URL;

    const host = process.env.REDIS_HOST;
    if (!host) return null;

    const port = Number(process.env.REDIS_PORT || 6379);
    if (!Number.isFinite(port) || port <= 0) return null;

    const password = process.env.REDIS_PASSWORD;
    const authSegment = password ? `:${encodeURIComponent(password)}@` : "";
    return `redis://${authSegment}${host}:${port}`;
}

async function getRedisClient(): Promise<ReturnType<typeof createClient> | null> {
    if (redisClient) return redisClient;
    if (redisInitAttempted) return null;

    const redisRequired = isRedisRequiredForCallSessions();

    const redisUrl = redisUrlFromEnv();
    if (!redisUrl) {
        if (redisRequired) {
            throw missingRedisConfigError();
        }
        // Don't set redisInitAttempted here: config may not be populated yet
        // (e.g. Key Vault secrets haven't loaded). Allow a retry on the next call.
        return null;
    }

    redisInitAttempted = true;

    try {
        const client = createClient({
            url: redisUrl,
            socket: {
                connectTimeout: 1000,
            },
        });

        client.on("error", (err) => {
            if (!redisWarned) {
                console.warn("[call-session-store] Redis unavailable, falling back to in-memory store:", err instanceof Error ? err.message : String(err));
                redisWarned = true;
            }
        });

        await client.connect();
        redisClient = client;
        console.log("[call-session-store] Using Redis-backed distributed session store");
        return redisClient;
    } catch (err) {
        if (redisRequired) {
            throw redisConnectError(err);
        }
        if (!redisWarned) {
            console.warn("[call-session-store] Failed to connect to Redis, using in-memory store:", err instanceof Error ? err.message : String(err));
            redisWarned = true;
        }
        return null;
    }
}

function sessionKey(namespace: string, callId: string): string {
    return `gc:call-session:${namespace}:${callId}`;
}

function userIndexKey(namespace: string, userId: number): string {
    return `gc:call-session:user:${namespace}:${userId}`;
}

function memoryNamespaceStore(namespace: string): Map<string, StoredSessionRecord<unknown>> {
    let store = memoryStoreByNamespace.get(namespace);
    if (!store) {
        store = new Map<string, StoredSessionRecord<unknown>>();
        memoryStoreByNamespace.set(namespace, store);
    }
    return store;
}

function memoryNamespaceUserIndex(namespace: string): Map<number, Set<string>> {
    let index = memoryUserIndexByNamespace.get(namespace);
    if (!index) {
        index = new Map<number, Set<string>>();
        memoryUserIndexByNamespace.set(namespace, index);
    }
    return index;
}

export function createDistributedCallSessionStore<T>(namespace: string) {
    return {
        async get(callId: string): Promise<T | null> {
            const client = await getRedisClient();
            if (client) {
                const raw = await client.get(sessionKey(namespace, callId));
                if (!raw) return null;
                const parsed = JSON.parse(raw) as StoredSessionRecord<T>;
                return parsed.session;
            }

            const record = memoryNamespaceStore(namespace).get(callId);
            return (record?.session as T) ?? null;
        },

        async set(
            callId: string,
            session: T,
            participants: number[],
            ttlSeconds: number = DEFAULT_TTL_SECONDS
        ): Promise<void> {
            const normalizedParticipants = Array.from(new Set(participants));
            const record: StoredSessionRecord<T> = { session, participants: normalizedParticipants };

            const client = await getRedisClient();
            if (client) {
                const key = sessionKey(namespace, callId);
                await client.set(key, JSON.stringify(record), { EX: ttlSeconds });
                for (const userId of normalizedParticipants) {
                    const idx = userIndexKey(namespace, userId);
                    await client.sAdd(idx, callId);
                    await client.expire(idx, ttlSeconds);
                }
                return;
            }

            const store = memoryNamespaceStore(namespace);
            const userIndex = memoryNamespaceUserIndex(namespace);
            store.set(callId, record);
            for (const userId of normalizedParticipants) {
                const existing = userIndex.get(userId) ?? new Set<string>();
                existing.add(callId);
                userIndex.set(userId, existing);
            }
        },

        async delete(callId: string): Promise<void> {
            const client = await getRedisClient();
            if (client) {
                const key = sessionKey(namespace, callId);
                const raw = await client.get(key);
                if (raw) {
                    const parsed = JSON.parse(raw) as StoredSessionRecord<T>;
                    for (const userId of parsed.participants) {
                        await client.sRem(userIndexKey(namespace, userId), callId);
                    }
                }
                await client.del(key);
                return;
            }

            const store = memoryNamespaceStore(namespace);
            const userIndex = memoryNamespaceUserIndex(namespace);
            const record = store.get(callId);
            if (record) {
                for (const userId of record.participants) {
                    const existing = userIndex.get(userId);
                    if (!existing) continue;
                    existing.delete(callId);
                    if (existing.size === 0) userIndex.delete(userId);
                }
            }
            store.delete(callId);
        },

        async listForUser(userId: number): Promise<Array<SessionEntry<T>>> {
            const client = await getRedisClient();
            if (client) {
                const ids = await client.sMembers(userIndexKey(namespace, userId));
                if (!ids.length) return [];

                const keys = ids.map((id) => sessionKey(namespace, id));
                const rows = await client.mGet(keys);

                const sessions: Array<SessionEntry<T>> = [];
                for (let i = 0; i < ids.length; i += 1) {
                    const raw = rows[i];
                    const callId = ids[i];
                    if (!raw) {
                        await client.sRem(userIndexKey(namespace, userId), callId);
                        continue;
                    }
                    const parsed = JSON.parse(raw) as StoredSessionRecord<T>;
                    sessions.push({ callId, session: parsed.session });
                }

                return sessions;
            }

            const store = memoryNamespaceStore(namespace);
            const ids = memoryNamespaceUserIndex(namespace).get(userId);
            if (!ids?.size) return [];

            const sessions: Array<SessionEntry<T>> = [];
            for (const callId of ids.values()) {
                const record = store.get(callId);
                if (!record) continue;
                sessions.push({ callId, session: record.session as T });
            }

            return sessions;
        },
    };
}
