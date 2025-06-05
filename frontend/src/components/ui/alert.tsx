import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-xl border px-6 py-4 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*5)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-4 gap-y-1 items-start [&>svg]:size-5 [&>svg]:translate-y-0.5 [&>svg]:text-current shadow-sm backdrop-blur-sm",
  {
    variants: {
      variant: {
        default:
          "bg-white/90 text-gray-800 border-gray-200/60 [&>svg]:text-gray-600",
        destructive:
          "bg-gradient-to-r from-error-50/90 to-red-50/90 text-error-800 border-error-200/60 [&>svg]:text-error-600 *:data-[slot=alert-description]:text-error-700",
        success:
          "bg-gradient-to-r from-success-50/90 to-emerald-50/90 text-success-800 border-success-200/60 [&>svg]:text-success-600 *:data-[slot=alert-description]:text-success-700",
        warning:
          "bg-gradient-to-r from-warning-50/90 to-orange-50/90 text-warning-800 border-warning-200/60 [&>svg]:text-warning-600 *:data-[slot=alert-description]:text-warning-700",
        info: "bg-gradient-to-r from-primary-50/90 to-blue-50/90 text-primary-800 border-primary-200/60 [&>svg]:text-primary-600 *:data-[slot=alert-description]:text-primary-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-5 font-semibold tracking-tight text-base",
        className
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-2 grid justify-items-start gap-1.5 text-sm leading-relaxed mt-1",
        className
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
