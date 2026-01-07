import { toast as sonnerToast } from "sonner";

export const showToast = {
  success: (message: string, description?: string) =>
    sonnerToast.success(message, { description }),

  error: (message: string, description?: string) =>
    sonnerToast.error(message, { description }),

  warning: (message: string, description?: string) =>
    sonnerToast.warning(message, { description }),

  info: (message: string, description?: string) =>
    sonnerToast.info(message, { description }),

  loading: (message: string) =>
    sonnerToast.loading(message),

  promise: <T,>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ) => sonnerToast.promise(promise, messages),

  dismiss: (toastId?: string | number) =>
    sonnerToast.dismiss(toastId),
};

export { sonnerToast as toast };
