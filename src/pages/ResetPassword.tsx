import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/external-client";
import { Mail, Lock, CheckCircle2, XCircle, ArrowLeft, Loader2 } from "lucide-react";

interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
}

const validatePassword = (password: string): PasswordValidation => ({
  minLength: password.length >= 8,
  hasUppercase: /[A-Z]/.test(password),
  hasLowercase: /[a-z]/.test(password),
  hasNumber: /[0-9]/.test(password),
});

const isPasswordValid = (validation: PasswordValidation): boolean =>
  Object.values(validation).every(Boolean);

const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
  <div className="flex items-center gap-2 text-sm">
    {met ? (
      <CheckCircle2 className="h-4 w-4 text-success" />
    ) : (
      <XCircle className="h-4 w-4 text-muted-foreground" />
    )}
    <span className={met ? "text-success" : "text-muted-foreground"}>{text}</span>
  </div>
);

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const token = searchParams.get("token");
  
  // Request form state
  const [email, setEmail] = useState("");
  const [isRequestLoading, setIsRequestLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  
  // Confirm form state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  
  const passwordValidation = validatePassword(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Email obrigatório",
        description: "Por favor, insira seu email.",
        variant: "destructive",
      });
      return;
    }

    setIsRequestLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("password-reset-request", {
        body: { email: email.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setRequestSent(true);
      toast({
        title: "Email enviado",
        description: "Verifique sua caixa de entrada para o link de recuperação.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar",
        description: error.message || "Não foi possível enviar o email de recuperação.",
        variant: "destructive",
      });
    } finally {
      setIsRequestLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid(passwordValidation)) {
      toast({
        title: "Senha inválida",
        description: "A senha não atende aos requisitos mínimos.",
        variant: "destructive",
      });
      return;
    }

    if (!passwordsMatch) {
      toast({
        title: "Senhas não conferem",
        description: "A confirmação de senha deve ser igual à senha.",
        variant: "destructive",
      });
      return;
    }

    setIsConfirmLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("password-reset-confirm", {
        body: { token, password },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResetSuccess(true);
      toast({
        title: "Senha atualizada",
        description: "Sua senha foi atualizada com sucesso!",
      });

      // Redirect to login after 3 seconds
      setTimeout(() => navigate("/auth"), 3000);
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Não foi possível atualizar a senha.",
        variant: "destructive",
      });
    } finally {
      setIsConfirmLoading(false);
    }
  };

  // If we have a token, show the password reset form
  if (token) {
    if (resetSuccess) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
        <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <CardTitle className="text-2xl">Senha Atualizada!</CardTitle>
              <CardDescription>
                Sua senha foi atualizada com sucesso. Você será redirecionado para a página de login.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link to="/auth">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Ir para Login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Redefinir Senha</CardTitle>
            <CardDescription>
              Digite sua nova senha abaixo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleConfirmReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isConfirmLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isConfirmLoading}
                  />
                </div>
              </div>

              <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-2">Requisitos da senha:</p>
                <PasswordRequirement met={passwordValidation.minLength} text="Mínimo de 8 caracteres" />
                <PasswordRequirement met={passwordValidation.hasUppercase} text="Uma letra maiúscula" />
                <PasswordRequirement met={passwordValidation.hasLowercase} text="Uma letra minúscula" />
                <PasswordRequirement met={passwordValidation.hasNumber} text="Um número" />
                {confirmPassword && (
                  <PasswordRequirement met={passwordsMatch} text="Senhas conferem" />
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isConfirmLoading || !isPasswordValid(passwordValidation) || !passwordsMatch}
              >
                {isConfirmLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  "Atualizar Senha"
                )}
              </Button>

              <div className="text-center">
                <Link to="/auth" className="text-sm text-muted-foreground hover:text-primary">
                  <ArrowLeft className="inline h-4 w-4 mr-1" />
                  Voltar para Login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No token - show the request form
  if (requestSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Verifique seu Email</CardTitle>
            <CardDescription>
              Enviamos um link de recuperação para <strong>{email}</strong>. 
              Verifique sua caixa de entrada e spam.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              O link expira em 1 hora. Se não receber o email, você pode solicitar novamente.
            </p>
            <div className="flex flex-col gap-2">
              <Button 
                variant="outline" 
                onClick={() => setRequestSent(false)}
                className="w-full"
              >
                Enviar novamente
              </Button>
              <Link to="/auth" className="w-full">
                <Button variant="ghost" className="w-full gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar para Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Esqueceu sua senha?</CardTitle>
          <CardDescription>
            Digite seu email para receber um link de recuperação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isRequestLoading}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isRequestLoading}>
              {isRequestLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar Link de Recuperação"
              )}
            </Button>

            <div className="text-center">
              <Link to="/auth" className="text-sm text-muted-foreground hover:text-primary">
                <ArrowLeft className="inline h-4 w-4 mr-1" />
                Voltar para Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
