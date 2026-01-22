import { useState, useEffect } from "react";
import { useSmtpConfig, SmtpConfigInput } from "@/hooks/useSmtpConfig";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Mail, Send, Eye, EyeOff, Server, CheckCircle2, AlertCircle } from "lucide-react";

const SMTP_PRESETS = [
  { name: "Gmail (TLS)", host: "smtp.gmail.com", port: 465, secure: true },
  { name: "Gmail (STARTTLS)", host: "smtp.gmail.com", port: 587, secure: false },
  { name: "Outlook/Office 365", host: "smtp.office365.com", port: 587, secure: false },
  { name: "Amazon SES (TLS)", host: "email-smtp.us-east-1.amazonaws.com", port: 465, secure: true },
  { name: "SendGrid", host: "smtp.sendgrid.net", port: 587, secure: false },
  { name: "Personalizado", host: "", port: 587, secure: false },
];

// Helper to determine if port/secure combination is valid
const getPortSecureConfig = (port: number) => {
  if (port === 465) return { secure: true, message: "Porta 465 requer TLS ativado (conexão segura direta)", valid: true };
  if (port === 587) return { secure: false, message: "Para porta 587, mantenha TLS desativado neste ambiente", valid: true };
  if (port === 25) return { secure: false, message: "Porta 25 não suporta criptografia", valid: true };
  return { secure: false, message: "Porta não padrão - verifique as configurações do seu servidor", valid: false };
};

const isValidPortSecureCombination = (port: number, secure: boolean): boolean => {
  if (port === 465) return secure === true;
  if (port === 587 || port === 25) return secure === false;
  return true; // For non-standard ports, allow any configuration
};

export function SmtpConfigForm() {
  const { user } = useAuth();
  const { smtpConfig, isLoading, saveConfig, testConnection } = useSmtpConfig();
  
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<SmtpConfigInput>({
    host: "",
    port: 587,
    secure: false,
    username: "",
    password_encrypted: "",
    from_email: "",
    from_name: "Sistema de Gestão",
    is_active: true,
  });

  useEffect(() => {
    if (smtpConfig) {
      setFormData({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        username: smtpConfig.username,
        password_encrypted: "", // Don't show saved password
        from_email: smtpConfig.from_email,
        from_name: smtpConfig.from_name,
        is_active: smtpConfig.is_active,
      });
    }
  }, [smtpConfig]);

  const handlePresetChange = (presetName: string) => {
    const preset = SMTP_PRESETS.find(p => p.name === presetName);
    if (preset && preset.name !== "Personalizado") {
      setFormData(prev => ({
        ...prev,
        host: preset.host,
        port: preset.port,
        secure: preset.secure,
      }));
    }
  };

  const handleSave = () => {
    const dataToSave = { ...formData };
    
    // If password is empty and we have existing config, keep the old password
    if (!dataToSave.password_encrypted && smtpConfig?.password_encrypted) {
      dataToSave.password_encrypted = smtpConfig.password_encrypted;
    }
    
    saveConfig.mutate(dataToSave);
  };

  const handleTest = () => {
    if (!user?.email) {
      return;
    }

    const testData = { 
      ...formData,
      test_email: user.email,
    };
    
    // If password is empty and we have existing config, use the saved password
    if (!testData.password_encrypted && smtpConfig?.password_encrypted) {
      testData.password_encrypted = smtpConfig.password_encrypted;
    }
    
    testConnection.mutate(testData);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Configuração SMTP
        </CardTitle>
        <CardDescription>
          Configure o servidor SMTP para envio de emails do sistema (reset de senha, notificações, etc.)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preset Selector */}
        <div className="space-y-2">
          <Label>Provedor de Email</Label>
          <Select onValueChange={handlePresetChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um provedor ou configure manualmente" />
            </SelectTrigger>
            <SelectContent>
              {SMTP_PRESETS.map((preset) => (
                <SelectItem key={preset.name} value={preset.name}>
                  {preset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Server Settings */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="host">Servidor SMTP</Label>
            <div className="relative">
              <Server className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="host"
                placeholder="smtp.exemplo.com"
                className="pl-10"
                value={formData.host}
                onChange={(e) => {
                  // Remove port numbers that might be accidentally included
                  let host = e.target.value.trim();
                  // Remove :port if user accidentally types it
                  host = host.replace(/:\d+$/, '');
                  // Remove trailing numbers that look like ports (e.g., "smtp.server.com587" -> "smtp.server.com")
                  host = host.replace(/\d{2,5}$/, '');
                  setFormData(prev => ({ ...prev, host }));
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="port">Porta</Label>
            <div className="relative">
              <Input
                id="port"
                type="number"
                placeholder="587"
                value={formData.port}
                onChange={(e) => {
                  const port = parseInt(e.target.value) || 587;
                  const config = getPortSecureConfig(port);
                  setFormData(prev => ({ 
                    ...prev, 
                    port,
                    secure: config.secure 
                  }));
                }}
              />
              {isValidPortSecureCombination(formData.port, formData.secure) ? (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
              ) : (
                <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
              )}
            </div>
          </div>
        </div>

        {/* Port hint message */}
        <div className={`flex items-center gap-2 p-3 rounded-md text-sm ${
          isValidPortSecureCombination(formData.port, formData.secure) 
            ? 'bg-primary/10 text-primary' 
            : 'bg-destructive/10 text-destructive'
        }`}>
          {isValidPortSecureCombination(formData.port, formData.secure) ? (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
          )}
          <span>{getPortSecureConfig(formData.port).message}</span>
        </div>

        {/* TLS/SSL Switch */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Conexão Segura (TLS/SSL)</Label>
            <p className="text-sm text-muted-foreground">
              {formData.port === 465 
                ? "Obrigatório para porta 465" 
                : formData.port === 587 
                  ? "Desative para porta 587 (STARTTLS automático)" 
                  : "Ativar criptografia TLS/SSL na conexão"}
            </p>
          </div>
          <Switch
            checked={formData.secure}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, secure: checked }))}
            disabled={formData.port === 465}
          />
        </div>

        {/* Authentication */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="username">Usuário/Email</Label>
            <Input
              id="username"
              placeholder="usuario@exemplo.com"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha / Senha de Aplicativo</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={smtpConfig ? "••••••••" : "Digite a senha"}
                value={formData.password_encrypted}
                onChange={(e) => setFormData(prev => ({ ...prev, password_encrypted: e.target.value }))}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {smtpConfig && (
              <p className="text-xs text-muted-foreground">
                Deixe em branco para manter a senha atual
              </p>
            )}
          </div>
        </div>

        {/* Sender Info */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="from_email">Email Remetente</Label>
            <Input
              id="from_email"
              type="email"
              placeholder="noreply@suaempresa.com"
              value={formData.from_email}
              onChange={(e) => setFormData(prev => ({ ...prev, from_email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="from_name">Nome do Remetente</Label>
            <Input
              id="from_name"
              placeholder="Sistema de Gestão"
              value={formData.from_name}
              onChange={(e) => setFormData(prev => ({ ...prev, from_name: e.target.value }))}
            />
          </div>
        </div>

        {/* Active Switch */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Ativo</Label>
            <p className="text-sm text-muted-foreground">
              Habilitar envio de emails pelo sistema
            </p>
          </div>
          <Switch
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testConnection.isPending || !formData.host || !formData.username}
          >
            {testConnection.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Testar Conexão
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveConfig.isPending || !formData.host || !formData.username || !formData.from_email}
          >
            {saveConfig.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Salvar Configurações
          </Button>
        </div>

        {user?.email && (
          <p className="text-xs text-muted-foreground">
            O email de teste será enviado para: {user.email}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
