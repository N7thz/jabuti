import { cn } from "cn"

// Shimmer (DESIGN.md): só transform é animado, sem pulse de opacidade.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-lg bg-muted before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-linear-to-r before:from-transparent before:via-foreground/6 before:to-transparent",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
