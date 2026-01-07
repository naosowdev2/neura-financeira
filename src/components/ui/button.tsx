import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary/20 text-primary-foreground border border-primary/30 backdrop-blur-sm hover:bg-primary/30 hover:border-primary/50 hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.5)] relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-700 before:ease-out",
        destructive: "bg-destructive/20 text-destructive-foreground border border-destructive/30 backdrop-blur-sm hover:bg-destructive/30 hover:border-destructive/50 hover:shadow-[0_0_30px_-5px_hsl(var(--destructive)/0.5)] relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-700 before:ease-out",
        outline: "border border-white/10 bg-white/[0.03] backdrop-blur-sm hover:bg-white/[0.08] hover:border-white/20 text-foreground",
        secondary: "bg-white/[0.05] text-foreground hover:bg-white/[0.1] border border-white/[0.08]",
        ghost: "hover:bg-white/[0.08] hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        ai: "bg-gradient-to-r from-purple-600/20 via-purple-500/20 to-blue-600/20 text-white font-semibold border border-purple-500/30 backdrop-blur-sm shadow-[0_0_40px_-8px_rgba(139,92,246,0.4)] hover:from-purple-600/30 hover:via-purple-500/30 hover:to-blue-600/30 hover:border-purple-500/50 hover:shadow-[0_0_50px_-8px_rgba(139,92,246,0.6)] hover:scale-[1.02] relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-700 before:ease-out",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-11 rounded-xl px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };