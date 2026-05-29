import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Languages, LogIn, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { DEMO_USERS, DEMO_PASSWORD } from "@/lib/permissions";
import logoMark from "@/assets/logo-mark.png";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user, login } = useAuth();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [err, setErr] = useState("");

  if (user) return <Navigate to="/" />;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = login(username, password);
    if (!r.ok) {
      setErr(t("Invalid username or password", "اسم المستخدم أو كلمة المرور غير صحيحة"));
      return;
    }
    navigate({ to: "/" });
  };

  const quickPick = (u: string) => {
    setUsername(u);
    setPassword(DEMO_PASSWORD);
    setErr("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10 p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 p-1">
                  <img src={logoMark} alt="Durrat Aram" className="h-full w-full object-contain" />
                </div>
                <div className="leading-tight">
                  <div className="font-semibold">{t("Durrat Aram", "درة أرام")}</div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">
                    {t("Dental Clinics", "عيادات الأسنان")}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setLang(lang === "en" ? "ar" : "en")} className="gap-1.5">
                <Languages className="h-4 w-4" /> {lang === "en" ? "AR" : "EN"}
              </Button>
            </div>
            <CardTitle className="text-xl">{t("Sign in", "تسجيل الدخول")}</CardTitle>
            <CardDescription>
              {t("Enter your credentials to access the system.", "أدخل بياناتك للوصول إلى النظام.")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username">{t("Username", "اسم المستخدم")}</Label>
                <Input
                  id="username"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">{t("Password", "كلمة المرور")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {err && <p className="text-sm text-destructive">{err}</p>}
              <Button type="submit" className="w-full gap-1.5">
                <LogIn className="h-4 w-4" />
                {t("Sign in", "دخول")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-lg bg-card/60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">
                {t("Demo accounts", "حسابات تجريبية")}
              </CardTitle>
            </div>
            <CardDescription>
              {t(
                `Shared password for every account: ${DEMO_PASSWORD}`,
                `كلمة مرور موحّدة لجميع الحسابات: ${DEMO_PASSWORD}`,
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.username}
                  onClick={() => quickPick(u.username)}
                  className="flex items-center justify-between rounded-md border bg-background px-3 py-2.5 text-start hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {lang === "ar" ? u.name_ar : u.name_en}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">{u.username}</div>
                  </div>
                  <Badge variant="secondary" className="uppercase text-[10px]">
                    {u.role}
                  </Badge>
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              {t(
                "Click a user to auto-fill the form, then press Sign in.",
                "اضغط على أي مستخدم لتعبئة النموذج تلقائيًا ثم اضغط دخول.",
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
