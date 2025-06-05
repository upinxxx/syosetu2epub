import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 ease-smooth disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500/50 hover:scale-105 active:scale-95 transform-gpu",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md hover:from-primary-600 hover:to-primary-700 hover:shadow-lg focus-visible:ring-primary-500/50 dark:from-primary-600 dark:to-primary-700",
        destructive:
          "bg-gradient-to-r from-error-500 to-error-600 text-white shadow-md hover:from-error-600 hover:to-error-700 hover:shadow-lg focus-visible:ring-error-500/50 dark:from-error-600 dark:to-error-700",
        outline:
          "border-2 border-neutral-300 bg-white text-neutral-700 shadow-sm hover:bg-neutral-50 hover:border-neutral-400 hover:shadow-md focus-visible:ring-neutral-500/50 dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-700",
        secondary:
          "bg-gradient-to-r from-secondary-500 to-secondary-600 text-white shadow-md hover:from-secondary-600 hover:to-secondary-700 hover:shadow-lg focus-visible:ring-secondary-500/50 dark:from-secondary-600 dark:to-secondary-700",
        ghost:
          "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-neutral-500/50 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
        link: "text-primary-600 underline-offset-4 hover:underline hover:text-primary-700 hover:scale-100 focus-visible:ring-primary-500/50 dark:text-primary-400 dark:hover:text-primary-300",
        download:
          "border-2 border-primary-500 text-primary-600 bg-white shadow-sm hover:bg-primary-50 hover:border-primary-600 hover:text-primary-700 hover:shadow-md focus-visible:ring-primary-500/50 dark:bg-neutral-800 dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-950/20",
        kindle:
          "border-2 border-success-500 text-success-600 bg-white shadow-sm hover:bg-success-50 hover:border-success-600 hover:text-success-700 hover:shadow-md focus-visible:ring-success-500/50 dark:bg-neutral-800 dark:border-success-400 dark:text-success-400 dark:hover:bg-success-950/20",
        success:
          "bg-gradient-to-r from-success-500 to-success-600 text-white shadow-md hover:from-success-600 hover:to-success-700 hover:shadow-lg focus-visible:ring-success-500/50 dark:from-success-600 dark:to-success-700",
        warning:
          "bg-gradient-to-r from-warning-500 to-warning-600 text-white shadow-md hover:from-warning-600 hover:to-warning-700 hover:shadow-lg focus-visible:ring-warning-500/50 dark:from-warning-600 dark:to-warning-700",
        info: "bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md hover:from-primary-600 hover:to-primary-700 hover:shadow-lg focus-visible:ring-primary-500/50 dark:from-primary-600 dark:to-primary-700",
      },
      size: {
        default: "h-10 px-6 py-2 text-sm has-[>svg]:px-4",
        sm: "h-8 px-4 py-1.5 text-sm rounded-md gap-1.5 has-[>svg]:px-3",
        lg: "h-12 px-8 py-3 text-base rounded-lg has-[>svg]:px-6",
        icon: "size-10 p-0",
        xs: "h-7 px-3 py-1 text-xs rounded gap-1 has-[>svg]:px-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
