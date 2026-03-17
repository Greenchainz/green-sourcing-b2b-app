export { handlers as GET, handlers as POST } from "~/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/app/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
