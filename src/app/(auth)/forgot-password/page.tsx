import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// NOTE: Self-service password reset (email/OTP flow) is not yet built.
// Rather than ship a fake "send reset link" button with no backing
// endpoint, this page is honest about the current process. Implement
// the real flow (token + email) in a later phase before removing this.
export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Lupa Password</CardTitle>
          <CardDescription>
            Reset password mandiri belum tersedia di versi ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Untuk sementara, silakan hubungi pengurus/admin perumahan untuk
            mengatur ulang password akun Anda secara manual.
          </p>
          <Button asChild className="w-full">
            <Link href="/login">Kembali ke Login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
