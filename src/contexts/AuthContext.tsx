import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/external-client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

type AppRole = 'assistente' | 'coordenador' | 'diretor' | 'admin';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: AppRole | null;
  funcionarioId: string | null;
  isFuncionario: boolean;
  isMotorista: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [funcionarioId, setFuncionarioId] = useState<string | null>(null);
  const [isMotorista, setIsMotorista] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Defer fetching user role with setTimeout to avoid deadlock
          setTimeout(() => {
            fetchUserRole(session.user.id);
            fetchFuncionarioData(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
          setFuncionarioId(null);
          setIsMotorista(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
        fetchFuncionarioData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user role:', error);
      setUserRole(null);
    } else {
      setUserRole(data?.role as AppRole || null);
    }
  };

  const fetchFuncionarioData = async (userId: string) => {
    const { data, error } = await supabase
      .from('funcionarios')
      .select('id, is_condutor')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching funcionario data:', error);
      setFuncionarioId(null);
      setIsMotorista(false);
    } else {
      setFuncionarioId(data?.id || null);
      setIsMotorista(data?.is_condutor || false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        return { error };
      }

      toast.success('Login realizado com sucesso!');
      navigate('/');
      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast.error('Erro ao fazer login');
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      // Check if email already exists in user_roles table
      const { data: existingUser, error: checkError } = await supabase
        .from('user_roles')
        .select('email')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking email:', checkError);
        toast.error('Erro ao verificar email');
        return { error: checkError };
      }

      if (existingUser) {
        const error = new Error('Este email já está cadastrado no sistema');
        toast.error('Este email já está cadastrado no sistema');
        return { error };
      }

      const redirectUrl = `${window.location.origin}/`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            role: 'assistente',
            email: email.toLowerCase(),
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          toast.error('Este email já está cadastrado');
        } else {
          toast.error(error.message);
        }
        return { error };
      }

      // Role will be assigned automatically by database trigger (always 'assistente')
      // New users can only be assigned 'assistente' role via RLS policy
      toast.success('Cadastro realizado! Aguarde a aprovação de um administrador para acessar o sistema.');
      await supabase.auth.signOut(); // Sign out immediately so they can't access
      navigate('/auth');
      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast.error('Erro ao criar conta');
      return { error: err };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserRole(null);
    setFuncionarioId(null);
    setIsMotorista(false);
    toast.success('Logout realizado com sucesso');
    navigate('/auth');
  };

  const hasRole = (role: AppRole): boolean => {
    if (!userRole) return false;

    const roleHierarchy: AppRole[] = ['assistente', 'coordenador', 'diretor', 'admin'];
    const userRoleIndex = roleHierarchy.indexOf(userRole);
    const requiredRoleIndex = roleHierarchy.indexOf(role);

    return userRoleIndex >= requiredRoleIndex;
  };

  const isFuncionario = funcionarioId !== null;

  const value = {
    user,
    session,
    loading,
    userRole,
    funcionarioId,
    isFuncionario,
    isMotorista,
    signIn,
    signUp,
    signOut,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
