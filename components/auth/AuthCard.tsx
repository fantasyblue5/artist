"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getMe, login, register } from "@/lib/storage/auth";
import { Eye, EyeOff, Loader2 } from "lucide-react";

type AuthMode = "login" | "register";
type FieldName = "email" | "password" | "confirmPassword" | "terms";
type FieldErrors = Partial<Record<FieldName, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AuthCardProps = {
  nextPath: string;
};

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function AuthCard({ nextPath }: AuthCardProps) {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [bannerError, setBannerError] = useState("");

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const title = useMemo(() => (mode === "login" ? "欢迎回来" : "创建账号"), [mode]);

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      const result = await getMe();
      if (!active) {
        return;
      }
      if (result.ok) {
        router.replace(nextPath);
      }
    };

    void checkSession();

    return () => {
      active = false;
    };
  }, [nextPath, router]);

  const validateEmail = (value: string) => {
    if (!EMAIL_RE.test(value)) {
      return "请输入合法邮箱地址";
    }
    return "";
  };

  const clearFeedback = () => {
    setErrors({});
    setBannerError("");
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    clearFeedback();
    setLoading(false);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const submitLoginOrRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();

    const normalizedEmail = email.trim().toLowerCase();
    const emailError = validateEmail(normalizedEmail);
    if (emailError) {
      setErrors({ email: emailError });
      setBannerError(emailError);
      return;
    }

    if (password.trim().length < 8) {
      setErrors({ password: "密码至少 8 位" });
      setBannerError("请检查密码格式");
      return;
    }

    if (mode === "register") {
      if (confirmPassword.trim() !== password.trim()) {
        setErrors({ confirmPassword: "两次输入的密码不一致" });
        setBannerError("请检查确认密码");
        return;
      }
      if (!acceptTerms) {
        setErrors({ terms: "请先勾选同意条款" });
        setBannerError("请阅读并同意条款后继续");
        return;
      }
    }

    setLoading(true);

    if (mode === "register") {
      const result = await register({
        email: normalizedEmail,
        password,
        displayName: normalizedEmail.split("@")[0] || "新用户",
      });

      if (!result.ok) {
        setLoading(false);
        setBannerError(result.error.message || "注册失败，请稍后再试");
        return;
      }

      window.dispatchEvent(new Event("auth:user-updated"));
      router.replace(nextPath);
      router.refresh();
      return;
    }

    const result = await login({ email: normalizedEmail, password });
    if (!result.ok) {
      setLoading(false);
      setBannerError(result.error.message || "登录失败，请稍后再试");
      return;
    }

    if (!rememberMe) {
      // Demo 版本仅保留服务端 7 天会话，前端保留该开关但不额外处理。
    }

    window.dispatchEvent(new Event("auth:user-updated"));
    router.replace(nextPath);
    router.refresh();
  };

  const submitForgotPassword = async () => {
    setForgotError("");
    setForgotSuccess("");

    const normalizedEmail = forgotEmail.trim().toLowerCase();
    const emailError = validateEmail(normalizedEmail);
    if (emailError) {
      setForgotError(emailError);
      return;
    }

    setForgotLoading(true);
    await delay(520);
    setForgotLoading(false);
    setForgotSuccess(`已向 ${normalizedEmail} 发送重置邮件（Demo）`);
  };

  return (
    <>
      <Card className="w-full max-w-[470px] rounded-3xl border-[hsl(var(--border)/0.9)] bg-[hsl(var(--card)/0.72)] shadow-[0_22px_44px_rgba(38,62,90,0.16)] backdrop-blur-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl">{title}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 pb-5">
          <div className="grid grid-cols-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.75)] p-1">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`rounded-xl px-3 py-2 text-sm transition ${
                mode === "login"
                  ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-[0_8px_16px_rgba(73,111,156,0.26)]"
                  : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent)/0.75)]"
              }`}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={`rounded-xl px-3 py-2 text-sm transition ${
                mode === "register"
                  ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-[0_8px_16px_rgba(73,111,156,0.26)]"
                  : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent)/0.75)]"
              }`}
            >
              注册
            </button>
          </div>

          {bannerError ? (
            <div className="rounded-2xl border border-[hsl(2_68%_72%)] bg-[hsl(2_78%_96%)] px-3 py-2 text-sm text-[hsl(2_62%_42%)]">
              {bannerError}
            </div>
          ) : null}

          <form className="space-y-3.5" onSubmit={submitLoginOrRegister}>
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="auth-email">
                邮箱
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
                className="h-11 w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.9)] px-3 text-sm outline-none transition focus:border-[hsl(var(--primary)/0.45)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.12)]"
              />
              {errors.email ? <p className="mt-1.5 text-xs text-[hsl(2_64%_45%)]">{errors.email}</p> : null}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="auth-password">
                密码
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="至少 8 位"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="h-11 w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.9)] px-3 pr-11 text-sm outline-none transition focus:border-[hsl(var(--primary)/0.45)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.12)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent))]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password ? <p className="mt-1.5 text-xs text-[hsl(2_64%_45%)]">{errors.password}</p> : null}
            </div>

            {mode === "register" ? (
              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="auth-confirm-password">
                  确认密码
                </label>
                <div className="relative">
                  <input
                    id="auth-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="再次输入密码"
                    autoComplete="new-password"
                    className="h-11 w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.9)] px-3 pr-11 text-sm outline-none transition focus:border-[hsl(var(--primary)/0.45)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.12)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--accent))]"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword ? (
                  <p className="mt-1.5 text-xs text-[hsl(2_64%_45%)]">{errors.confirmPassword}</p>
                ) : null}
              </div>
            ) : null}

            {mode === "login" ? (
              <div className="flex items-center justify-between gap-3 text-sm">
                <label className="inline-flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 rounded border-[hsl(var(--border))] accent-[hsl(var(--primary))]"
                  />
                  记住我
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotError("");
                    setForgotSuccess("");
                    setForgotOpen(true);
                  }}
                  className="text-[hsl(var(--primary))] transition hover:text-[hsl(var(--primary)/0.82)]"
                >
                  忘记密码？
                </button>
              </div>
            ) : (
              <div>
                <label className="inline-flex items-start gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(event) => setAcceptTerms(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[hsl(var(--border))] accent-[hsl(var(--primary))]"
                  />
                  我已阅读并同意服务条款与隐私政策
                </label>
                {errors.terms ? <p className="mt-1.5 text-xs text-[hsl(2_64%_45%)]">{errors.terms}</p> : null}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {mode === "login" ? "登录" : "注册并进入"}
            </Button>
          </form>

          <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">
            继续即代表同意
            <Link href="/terms" className="mx-1 text-[hsl(var(--primary))] hover:underline">
              《服务条款》
            </Link>
            与
            <Link href="/privacy" className="mx-1 text-[hsl(var(--primary))] hover:underline">
              《隐私政策》
            </Link>
          </p>
        </CardContent>
      </Card>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>找回密码</DialogTitle>
            <DialogDescription>请输入邮箱，系统将发送重置邮件（Demo）。</DialogDescription>
          </DialogHeader>

          <div className="mt-3 space-y-1.5">
            <label htmlFor="forgot-email" className="block text-sm font-medium">
              邮箱
            </label>
            <input
              id="forgot-email"
              type="email"
              value={forgotEmail}
              onChange={(event) => setForgotEmail(event.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
              className="h-11 w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/0.92)] px-3 text-sm outline-none transition focus:border-[hsl(var(--primary)/0.45)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.12)]"
            />
            {forgotError ? <p className="text-xs text-[hsl(2_64%_45%)]">{forgotError}</p> : null}
            {forgotSuccess ? (
              <div className="rounded-xl border border-[hsl(163_34%_74%)] bg-[hsl(164_36%_95%)] px-3 py-2 text-xs text-[hsl(165_35%_33%)]">
                {forgotSuccess}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setForgotOpen(false)}>
              取消
            </Button>
            <Button type="button" onClick={submitForgotPassword} disabled={forgotLoading}>
              {forgotLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              发送重置邮件
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
