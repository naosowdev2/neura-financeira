import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Copy, Check } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isClearing: boolean;
  copied: boolean;
}

class AppErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isClearing: false,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App Error Boundary caught error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Store error for debugging
    try {
      localStorage.setItem('lastAppError', JSON.stringify({
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      }));
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearCache = async () => {
    this.setState({ isClearing: true });
    
    try {
      // Unregister all service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      }

      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Clear localStorage error
      localStorage.removeItem('lastAppError');

      // Reload the page
      window.location.reload();
    } catch (err) {
      console.error('Error clearing cache:', err);
      window.location.reload();
    }
  };

  private handleCopyError = async () => {
    const { error, errorInfo } = this.state;
    
    const errorDetails = `
=== Neura Financeira - Error Report ===
Timestamp: ${new Date().toISOString()}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}

--- Error ---
Message: ${error?.message || 'Unknown error'}

--- Stack Trace ---
${error?.stack || 'No stack trace available'}

--- Component Stack ---
${errorInfo?.componentStack || 'No component stack available'}
`.trim();

    try {
      await navigator.clipboard.writeText(errorDetails);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  public render() {
    if (this.state.hasError) {
      const { error, errorInfo, copied } = this.state;
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
          <div className="max-w-lg w-full bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700 shadow-xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              </div>
              
              <h1 className="text-xl font-semibold text-white mb-2">
                Ops! Algo deu errado
              </h1>
              
              <p className="text-slate-400 mb-4 text-sm">
                O app encontrou um erro inesperado. Isso pode ser causado por cache desatualizado.
              </p>

              {/* Error message */}
              {error && (
                <div className="w-full bg-slate-900/50 rounded-lg p-3 mb-4 text-left">
                  <p className="text-xs text-amber-400 font-mono break-all">
                    {error.message}
                  </p>
                </div>
              )}

              {/* Component stack (for React error #310 debugging) */}
              {errorInfo?.componentStack && (
                <details className="w-full mb-4 text-left">
                  <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400">
                    Detalhes técnicos (clique para expandir)
                  </summary>
                  <div className="mt-2 bg-slate-900/50 rounded-lg p-3 max-h-40 overflow-y-auto">
                    <pre className="text-xs text-slate-500 font-mono whitespace-pre-wrap break-all">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                </details>
              )}

              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={this.handleReload}
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Recarregar
                </button>
                
                <button
                  onClick={this.handleClearCache}
                  disabled={this.state.isClearing}
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  {this.state.isClearing ? 'Limpando...' : 'Limpar cache do app'}
                </button>

                <button
                  onClick={this.handleCopyError}
                  className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-transparent hover:bg-slate-700/50 text-slate-400 hover:text-white rounded-lg text-sm transition-colors border border-slate-600"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copiar detalhes do erro
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-slate-500 mt-6">
                Se o problema persistir, tente limpar o cache ou copie os detalhes do erro para suporte.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
