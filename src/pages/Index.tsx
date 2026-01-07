import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">
      {/* Grid de perspectiva como background */}
      <div className="absolute inset-0 perspective-grid opacity-30" />
      
      {/* Pontos decorativos sutis */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white/20 rounded-full" />
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-white/30 rounded-full" />
        <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-white/20 rounded-full" />
        <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-white/25 rounded-full" />
        <div className="absolute bottom-1/3 right-1/2 w-1 h-1 bg-white/15 rounded-full" />
      </div>
      
      {/* Conteúdo centralizado */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-8 border border-primary/30">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-medium">Controle financeiro inteligente com IA</span>
        </div>
        
        {/* Título principal */}
        <h1 className="text-5xl md:text-7xl font-bold mb-6">
          Suas finanças sob{" "}
          <span className="gradient-text">controle total</span>
        </h1>
        
        {/* Subtítulo */}
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Gerencie contas, cartões de crédito e orçamentos com inteligência artificial.
          Comandos em linguagem natural para uma experiência única.
        </p>
        
        {/* Botões */}
        {user ? (
          <Link to="/dashboard">
            <Button size="lg" className="text-lg px-8 py-6">
              <LayoutDashboard className="mr-2 h-5 w-5" />
              Ir para o Dashboard
            </Button>
          </Link>
        ) : (
          <Link to="/auth">
            <Button size="lg" className="text-lg px-8 py-6">
              Começar agora <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};

export default Index;
