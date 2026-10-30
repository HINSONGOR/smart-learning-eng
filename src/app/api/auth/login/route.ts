// 登入：學習者 + PIN → httpOnly session cookie
import { cookies } from "next/headers";
import { z } from "zod";
import { handle, isHttps, readBody } from "@/lib/api";
import { SESSION_COOKIE, isAuthEnabled, signIn } from "@/lib/auth";
import { ValidationError } from "@/lib/errors";
import { parseInput } from "@/lib/validation";

const loginSchema = z.object({
  learnerId: z.string().min(1, "請選擇學習者").max(50),
  pin: z.string().min(1, "請輸入 PIN").max(20),
});

export async function POST(request: Request) {
  return handle(
    async () => {
      if (!isAuthEnabled()) throw new ValidationError("本機版不需要登入");
      const { learnerId, pin } = parseInput(loginSchema, await readBody(request));
      const { cookie, maxAge } = await signIn(learnerId, pin);
      (await cookies()).set(SESSION_COOKIE, cookie, {
        httpOnly: true,
        secure: isHttps(request),
        sameSite: "lax",
        path: "/",
        maxAge,
      });
      return { learnerId };
    },
    200,
    { public: true },
  );
}
