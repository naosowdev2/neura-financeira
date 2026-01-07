import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  animate?: boolean;
  showPercentage?: boolean;
  pulseOnMilestone?: boolean;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, animate = true, showPercentage = false, pulseOnMilestone = false, ...props }, ref) => {
  const [displayValue, setDisplayValue] = React.useState(animate ? 0 : (value || 0));
  const progressColor = (props.style as any)?.['--progress-color'] || 'hsl(var(--primary))';
  
  // Animate the value from 0 to target
  React.useEffect(() => {
    if (!animate) {
      setDisplayValue(value || 0);
      return;
    }
    
    const targetValue = value || 0;
    const duration = 800;
    const startTime = Date.now();
    const startValue = displayValue;
    
    const animateValue = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function: easeOutCubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const newValue = startValue + (targetValue - startValue) * easeProgress;
      
      setDisplayValue(newValue);
      
      if (progress < 1) {
        requestAnimationFrame(animateValue);
      }
    };
    
    requestAnimationFrame(animateValue);
  }, [value, animate]);

  // Check if at a milestone (25%, 50%, 75%, 100%)
  const isMilestone = pulseOnMilestone && [25, 50, 75, 100].some(m => 
    displayValue >= m && displayValue < m + 1
  );

  return (
    <div className="relative">
      <ProgressPrimitive.Root
        ref={ref}
        className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            "h-full w-full flex-1 transition-transform duration-300 ease-out",
            isMilestone && "animate-pulse"
          )}
          style={{ 
            transform: `translateX(-${100 - displayValue}%)`,
            backgroundColor: progressColor,
          }}
        />
      </ProgressPrimitive.Root>
      {showPercentage && (
        <span 
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold"
          style={{ color: displayValue > 50 ? 'white' : 'inherit' }}
        >
          {Math.round(displayValue)}%
        </span>
      )}
    </div>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
