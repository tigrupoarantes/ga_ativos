import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, Eye, EyeOff, Rocket } from 'lucide-react';
import { toast } from 'sonner';

const REMEMBER_EMAIL_KEY = 'remember_user_email';

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

const isPasswordValid = (validation: PasswordValidation): boolean => {
  return validation.minLength && validation.hasUppercase && validation.hasLowercase && validation.hasNumber;
};

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (savedEmail) {
      setLoginEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const passwordValidation = useMemo(() => validatePassword(signupPassword), [signupPassword]);
  const passwordIsValid = useMemo(() => isPasswordValid(passwordValidation), [passwordValidation]);
  const passwordsMatch = signupPassword === confirmPassword && confirmPassword.length > 0;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (rememberMe) {
      localStorage.setItem(REMEMBER_EMAIL_KEY, loginEmail);
    } else {
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }
    await signIn(loginEmail, loginPassword);
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordIsValid) {
      toast.error('A senha não atende aos requisitos de segurança');
      return;
    }
    if (!passwordsMatch) {
      toast.error('As senhas não coincidem');
      return;
    }
    setIsLoading(true);
    await signUp(signupEmail, signupPassword);
    setIsLoading(false);
  };

  const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
    <div className="flex items-center gap-2 text-sm">
      {met ? <Check className="h-4 w-4 text-success" /> : <X className="h-4 w-4 text-muted-foreground" />}
      <span className={met ? 'text-success' : 'text-muted-foreground'}>{text}</span>
    </div>
  );

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, hsl(257 85% 98%) 0%, hsl(256 91% 95%) 25%, hsl(0 0% 100%) 50%, hsl(189 94% 95%) 75%, hsl(16 100% 97%) 100%)',
        backgroundSize: '400% 400%',
        animation: 'auth-gradient-shift 15s ease infinite',
      }}
    >
      {/* Floating Orbs */}
      <div 
        className="absolute w-[400px] h-[400px] rounded-full opacity-50 animate-float-orb"
        style={{
          background: 'hsl(257 85% 60%)',
          filter: 'blur(60px)',
          top: '10%',
          left: '10%',
        }}
      />
      <div 
        className="absolute w-[300px] h-[300px] rounded-full opacity-50 animate-float-orb"
        style={{
          background: 'hsl(189 94% 43%)',
          filter: 'blur(60px)',
          top: '50%',
          right: '10%',
          animationDelay: '-5s',
        }}
      />
      <div 
        className="absolute w-[200px] h-[200px] rounded-full opacity-50 animate-float-orb"
        style={{
          background: 'hsl(16 100% 66%)',
          filter: 'blur(60px)',
          bottom: '10%',
          left: '30%',
          animationDelay: '-10s',
        }}
      />

      {/* Auth Card */}
      <div className="w-full max-w-md relative z-10 animate-scale-in">
        <div className="glass-card">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-2xl mb-5 shadow-lg animate-float">
              <Rocket className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 tracking-tight">
              Sistema de Gestão
            </h1>
            <p className="text-muted-foreground text-sm">Grupo Arantes</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-xl h-12 p-1 bg-secondary/50 mb-6">
              <TabsTrigger 
                value="login" 
                className="rounded-lg text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                Login
              </TabsTrigger>
              <TabsTrigger 
                value="signup" 
                className="rounded-lg text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                Cadastro
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-0">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
                  <Input 
                    id="login-email" 
                    type="email" 
                    placeholder="seu@email.com" 
                    value={loginEmail} 
                    onChange={(e) => setLoginEmail(e.target.value)} 
                    required 
                    className="h-12 bg-secondary/30 border-0 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-sm font-medium">Senha</Label>
                  <div className="relative">
                    <Input 
                      id="login-password" 
                      type={showLoginPassword ? 'text' : 'password'} 
                      placeholder="••••••••" 
                      value={loginPassword} 
                      onChange={(e) => setLoginPassword(e.target.value)} 
                      required 
                      className="h-12 bg-secondary/30 border-0 rounded-xl pr-12 focus-visible:ring-2 focus-visible:ring-primary/20" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowLoginPassword(!showLoginPassword)} 
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showLoginPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="remember-me" 
                      checked={rememberMe} 
                      onCheckedChange={(checked) => setRememberMe(checked === true)} 
                      className="rounded"
                    />
                    <Label htmlFor="remember-me" className="text-sm font-normal cursor-pointer text-muted-foreground">
                      Lembrar meu usuário
                    </Label>
                  </div>
                  <Link 
                    to="/reset-password" 
                    className="text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-xl text-base font-medium shadow-lg hover:shadow-xl transition-all" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-0">
              <form onSubmit={handleSignup} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                  <Input 
                    id="signup-email" 
                    type="email" 
                    placeholder="seu@email.com" 
                    value={signupEmail} 
                    onChange={(e) => setSignupEmail(e.target.value)} 
                    required 
                    className="h-12 bg-secondary/30 border-0 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-medium">Senha</Label>
                  <div className="relative">
                    <Input 
                      id="signup-password" 
                      type={showSignupPassword ? 'text' : 'password'} 
                      placeholder="••••••••" 
                      value={signupPassword} 
                      onChange={(e) => setSignupPassword(e.target.value)} 
                      required 
                      className="h-12 bg-secondary/30 border-0 rounded-xl pr-12 focus-visible:ring-2 focus-visible:ring-primary/20" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowSignupPassword(!showSignupPassword)} 
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showSignupPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {signupPassword && (
                    <div className="mt-3 p-4 bg-secondary/30 rounded-xl space-y-2">
                      <PasswordRequirement met={passwordValidation.minLength} text="Mínimo 8 caracteres" />
                      <PasswordRequirement met={passwordValidation.hasUppercase} text="Letra maiúscula" />
                      <PasswordRequirement met={passwordValidation.hasLowercase} text="Letra minúscula" />
                      <PasswordRequirement met={passwordValidation.hasNumber} text="Número" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm font-medium">Confirmar Senha</Label>
                  <div className="relative">
                    <Input 
                      id="confirm-password" 
                      type={showConfirmPassword ? 'text' : 'password'} 
                      placeholder="••••••••" 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      required 
                      className="h-12 bg-secondary/30 border-0 rounded-xl pr-12 focus-visible:ring-2 focus-visible:ring-primary/20" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <p className="text-sm text-destructive flex items-center gap-1 mt-2">
                      <X className="h-4 w-4" /> As senhas não coincidem
                    </p>
                  )}
                  {passwordsMatch && (
                    <p className="text-sm text-success flex items-center gap-1 mt-2">
                      <Check className="h-4 w-4" /> Senhas coincidem
                    </p>
                  )}
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-xl text-base font-medium shadow-lg hover:shadow-xl transition-all" 
                  disabled={isLoading || !passwordIsValid || !passwordsMatch}
                >
                  {isLoading ? 'Criando conta...' : 'Criar Conta'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
