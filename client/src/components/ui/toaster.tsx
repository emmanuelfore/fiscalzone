import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle2, XCircle, Info, AlertTriangle } from "lucide-react"

function ToastIcon({ variant }: { variant?: string }) {
  if (variant === "destructive") {
    return (
      <div className="shrink-0 mt-0.5 w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
        <XCircle className="w-4.5 h-4.5 text-white" />
      </div>
    )
  }
  return (
    <div className="shrink-0 mt-0.5 w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-300" />
    </div>
  )
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const v = variant ?? undefined;
        return (
          <Toast key={id} variant={v} {...props}>
            <ToastIcon variant={v} />
            <div className="flex-1 min-w-0">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
