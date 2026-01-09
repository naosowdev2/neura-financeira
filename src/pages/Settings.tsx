import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useColorTheme, ColorTheme } from "@/contexts/ColorThemeContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Palette, Trash2, Moon, Sun, Monitor, Settings as SettingsIcon, Smartphone, RefreshCw, HardDrive, Info, Copy, Download } from "lucide-react";
import { APP_VERSION, APP_NAME } from "@/constants/app";
import { useTheme } from "next-themes";
import { ClearDataDialog } from "@/components/settings/ClearDataDialog";
import { DeleteAccountDialog } from "@/components/settings/DeleteAccountDialog";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import { usePWA } from "@/hooks/usePWA";
import { toast } from "sonner";

const colorThemes: { id: ColorTheme; name: string; color: string; gradient: string }[] = [
  { id: 'emerald', name: 'Esmeralda', color: 'bg-emerald-500', gradient: 'from-emerald-500 to-teal-400' },
  { id: 'blue', name: 'Azul', color: 'bg-blue-500', gradient: 'from-blue-500 to-cyan-400' },
  { id: 'purple', name: 'Roxo', color: 'bg-purple-500', gradient: 'from-purple-500 to-pink-400' },
];

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { colorTheme, setColorTheme } = useColorTheme();
  const { isStandalone, isInstallable, isIOS, promptInstall, updateServiceWorker } = usePWA();
  const [isClearing, setIsClearing] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstall = async () => {
    if (isIOS || !isInstallable) {
      // For iOS or when prompt is not available, redirect to install page
      window.location.href = '/install';
      return;
    }

    setIsInstalling(true);
    try {
      const installed = await promptInstall();
      if (installed) {
        toast.success("App instalado com sucesso!");
      }
    } finally {
      setIsInstalling(false);
    }
  };

  const handleUpdateServiceWorker = async () => {
    try {
      toast.loading("Atualizando aplicativo...", { id: "update" });
      
      // Clear all caches
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      
      // Unregister service workers
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
      
      toast.success("Cache limpo! Recarregando...", { id: "update" });
      
      // Brief delay for user feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Hard reload and redirect to Dashboard
      window.location.href = "/";
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      toast.error("Erro ao atualizar. Tente novamente.", { id: "update" });
    }
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      
      updateServiceWorker();
      
      toast.success("Cache limpo com sucesso!", {
        description: "Reinstale o app para ver os novos ícones."
      });
    } catch (error) {
      toast.error("Erro ao limpar cache");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <PageHeader
        title="Configurações"
        description="Personalize sua experiência"
        icon={SettingsIcon}
      />

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {/* Perfil */}
        <Card className="animate-fade-in" style={{ animationDelay: '0ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Perfil
            </CardTitle>
            <CardDescription>
              Informações da sua conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                value={user?.email || ''} 
                disabled 
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-id">ID do Usuário</Label>
              <Input 
                id="user-id" 
                value={user?.id || ''} 
                disabled 
                className="bg-muted font-mono text-xs"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Conta criada em: {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : 'N/A'}
            </p>
          </CardContent>
        </Card>

        {/* Tema */}
        <Card className="animate-fade-in" style={{ animationDelay: '100ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Aparência
            </CardTitle>
            <CardDescription>
              Personalize a aparência do aplicativo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Modo claro/escuro */}
            <div className="space-y-3">
              <Label>Modo</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  className="flex flex-col gap-1 h-auto py-3"
                  onClick={() => setTheme('light')}
                >
                  <Sun className="h-5 w-5" />
                  <span className="text-xs">Claro</span>
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  className="flex flex-col gap-1 h-auto py-3"
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="h-5 w-5" />
                  <span className="text-xs">Escuro</span>
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  className="flex flex-col gap-1 h-auto py-3"
                  onClick={() => setTheme('system')}
                >
                  <Monitor className="h-5 w-5" />
                  <span className="text-xs">Sistema</span>
                </Button>
              </div>
            </div>

            {/* Cor do tema */}
            <div className="space-y-3">
              <Label>Cor do Tema</Label>
              <div className="grid grid-cols-3 gap-3">
                {colorThemes.map((ct) => (
                  <button
                    key={ct.id}
                    onClick={() => setColorTheme(ct.id)}
                    className={cn(
                      "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
                      colorTheme === ct.id
                        ? "border-primary bg-primary/10 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.5)]"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "h-10 w-10 rounded-full bg-gradient-to-br shadow-lg",
                      ct.gradient
                    )} />
                    <span className="text-sm font-medium">{ct.name}</span>
                    {colorTheme === ct.id && (
                      <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary animate-pulse" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notificações */}
        <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
          <NotificationSettings />
        </div>

        {/* Aplicativo PWA */}
        <Card className="animate-fade-in" style={{ animationDelay: '200ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Aplicativo (PWA)
            </CardTitle>
            <CardDescription>
              Gerenciamento do aplicativo instalado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Versão do App */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">Versão do App</p>
                </div>
                <p className="text-sm font-mono text-muted-foreground">
                  v{APP_VERSION}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(`${APP_NAME} v${APP_VERSION}`);
                  toast.success("Versão copiada!");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            {/* Status do PWA */}
            <div className="flex items-center gap-2 text-sm">
              <div className={cn("h-2 w-2 rounded-full", isStandalone ? "bg-green-500" : "bg-yellow-500")} />
              <span>{isStandalone ? "Executando como app instalado" : "Executando no navegador"}</span>
            </div>

            {/* Install App - Only show when not installed */}
            {!isStandalone && (
              <div className="flex items-center justify-between p-4 rounded-lg border border-primary/30 bg-primary/5">
                <div className="space-y-1">
                  <p className="font-medium">Instalar aplicativo</p>
                  <p className="text-sm text-muted-foreground">
                    Adicione à sua tela inicial para acesso rápido e modo offline
                  </p>
                </div>
                <Button onClick={handleInstall} disabled={isInstalling} size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  {isInstalling ? "Instalando..." : "Instalar"}
                </Button>
              </div>
            )}

            {/* Botão Atualizar Service Worker */}
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="space-y-1">
                <p className="font-medium">Atualizar aplicativo</p>
                <p className="text-sm text-muted-foreground">
                  Limpa cache e recarrega o app com a versão mais recente
                </p>
              </div>
              <Button onClick={handleUpdateServiceWorker} size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>

            {/* Botão Limpar Cache */}
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="space-y-1">
                <p className="font-medium">Limpar cache do app</p>
                <p className="text-sm text-muted-foreground">
                  Remove arquivos em cache (ícones, imagens, etc.)
                </p>
              </div>
              <Button variant="outline" onClick={handleClearCache} disabled={isClearing} size="sm">
                <HardDrive className="h-4 w-4 mr-2" />
                {isClearing ? "Limpando..." : "Limpar"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Dados */}
        <Card className="border-destructive/50 animate-fade-in" style={{ animationDelay: '250ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Zona de Perigo
            </CardTitle>
            <CardDescription>
              Ações irreversíveis que afetam seus dados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
              <div className="space-y-1">
                <p className="font-medium">Limpar todos os dados</p>
                <p className="text-sm text-muted-foreground">
                  Remove todas as transações, contas, cartões, categorias e orçamentos
                </p>
              </div>
              <ClearDataDialog />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/50 bg-destructive/10">
              <div className="space-y-1">
                <p className="font-medium text-destructive">Excluir conta permanentemente</p>
                <p className="text-sm text-muted-foreground">
                  Remove todos os dados e exclui sua conta. Esta ação é irreversível.
                </p>
              </div>
              <DeleteAccountDialog />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
