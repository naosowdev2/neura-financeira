import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Info, Loader2 } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      expand={true}
      richColors={false}
      duration={4000}
      closeButton={true}
      gap={12}
      icons={{
        success: <CheckCircle2 className="h-5 w-5 text-emerald-400" />,
        error: <XCircle className="h-5 w-5 text-red-400" />,
        warning: <AlertTriangle className="h-5 w-5 text-amber-400" />,
        info: <Info className="h-5 w-5 text-purple-400" />,
        loading: <Loader2 className="h-5 w-5 text-purple-400 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl",
          success:
            "group-[.toaster]:!border-emerald-500/30 group-[.toaster]:!bg-emerald-500/10",
          error:
            "group-[.toaster]:!border-red-500/30 group-[.toaster]:!bg-red-500/10",
          warning:
            "group-[.toaster]:!border-amber-500/30 group-[.toaster]:!bg-amber-500/10",
          info:
            "group-[.toaster]:!border-purple-500/30 group-[.toaster]:!bg-purple-500/10",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg",
          closeButton:
            "group-[.toast]:bg-background group-[.toast]:border-border group-[.toast]:text-muted-foreground group-[.toast]:hover:bg-muted",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
