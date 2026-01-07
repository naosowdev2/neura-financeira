import { usePWA } from "@/hooks/usePWA";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Download, 
  Share, 
  PlusSquare, 
  Check, 
  Smartphone, 
  Monitor,
  ArrowRight,
  Home
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import neuraLogo from "@/assets/neura-logo.png";

export default function Install() {
  const { isInstallable, isInstalled, isIOS, isAndroid, isStandalone, promptInstall } = usePWA();

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      // Redirect to dashboard after successful install
      window.location.href = "/dashboard";
    }
  };

  // Already installed
  if (isInstalled || isStandalone) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="mb-6 p-4 bg-green-500/10 rounded-full inline-flex">
            <Check className="h-12 w-12 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            App já instalado!
          </h1>
          <p className="text-muted-foreground mb-6">
            A Neura Financeira já está instalada no seu dispositivo.
          </p>
          <Button asChild>
            <Link to="/dashboard">
              <Home className="h-4 w-4 mr-2" />
              Ir para o Dashboard
            </Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <img 
            src={neuraLogo} 
            alt="Neura Logo" 
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Instalar Neura
          </h1>
          <p className="text-muted-foreground">
            Tenha acesso rápido ao seu controle financeiro
          </p>
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid gap-4 mb-8"
        >
          {[
            { icon: Smartphone, title: "Acesso rápido", desc: "Abra direto da tela inicial" },
            { icon: Download, title: "Funciona offline", desc: "Consulte seus dados sem internet" },
            { icon: Monitor, title: "Tela cheia", desc: "Experiência como app nativo" },
          ].map((benefit, i) => (
            <Card key={i} className="bg-card/50">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <benefit.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Installation Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Android / Desktop - Direct Install */}
          {isInstallable && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-primary" />
                  Instalação Rápida
                </CardTitle>
                <CardDescription>
                  Clique no botão abaixo para instalar o app
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleInstall} size="lg" className="w-full">
                  <Download className="h-5 w-5 mr-2" />
                  Instalar Neura
                </Button>
              </CardContent>
            </Card>
          )}

          {/* iOS Instructions */}
          {isIOS && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share className="h-5 w-5 text-primary" />
                  Instalar no iPhone/iPad
                </CardTitle>
                <CardDescription>
                  Siga os passos abaixo para adicionar à tela inicial
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Toque no botão Compartilhar</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Share className="h-4 w-4" /> na barra inferior do Safari
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Role e toque em "Adicionar à Tela de Início"</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <PlusSquare className="h-4 w-4" /> Add to Home Screen
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Toque em "Adicionar"</p>
                    <p className="text-sm text-muted-foreground">
                      O ícone aparecerá na sua tela inicial
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Android Manual Instructions */}
          {isAndroid && !isInstallable && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-primary" />
                  Instalar no Android
                </CardTitle>
                <CardDescription>
                  Use o menu do navegador para instalar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Toque no menu do navegador</p>
                    <p className="text-sm text-muted-foreground">
                      ⋮ (três pontos) no canto superior direito
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Selecione "Instalar app" ou "Adicionar à tela inicial"</p>
                    <p className="text-sm text-muted-foreground">
                      A opção pode variar conforme o navegador
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Confirme a instalação</p>
                    <p className="text-sm text-muted-foreground">
                      O app será adicionado à sua tela inicial
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Desktop Instructions */}
          {!isIOS && !isAndroid && !isInstallable && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-primary" />
                  Instalar no Desktop
                </CardTitle>
                <CardDescription>
                  Use o Chrome, Edge ou outro navegador compatível
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Procure o ícone de instalação</p>
                    <p className="text-sm text-muted-foreground">
                      Na barra de endereço, à direita
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Clique em "Instalar"</p>
                    <p className="text-sm text-muted-foreground">
                      Ou use o menu ⋮ → "Instalar Neura Financeira"
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Back to app */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <Button variant="ghost" asChild>
            <Link to="/dashboard">
              Continuar no navegador
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
