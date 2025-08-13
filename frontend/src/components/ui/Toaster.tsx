// // src/components/ui/Toaster.tsx
// import React, { createContext, useContext, useState, ReactNode } from "react";
// import { Toast, ToastProps } from "./Toast"; // Assuming you have a Toast component

// // Define types for the toast and the context
// type ToastType = ToastProps & { id: string };
// type ToastContextType = {
//   toast: (props: Omit<ToastProps, 'id'>) => void;
// };

// // Create a context for the toast system
// const ToastContext = createContext<ToastContextType | undefined>(undefined);

// // A simple hook to consume the toast context
// export function useToast() {
//   const context = useContext(ToastContext);
//   if (!context) {
//     throw new Error("useToast must be used within a ToastProvider");
//   }
//   return context;
// }

// // The provider component that manages toast state
// export function ToastProvider({ children }: { children: ReactNode }) {
//   const [toasts, setToasts] = useState<ToastType[]>([]);

//   const showToast = (props: Omit<ToastProps, 'id'>) => {
//     const id = Math.random().toString(36).substring(2, 9); // Simple unique ID
//     setToasts((prevToasts) => [...prevToasts, { ...props, id }]);
//     setTimeout(() => {
//       removeToast(id);
//     }, props.duration || 5000); // Auto-dismiss after 5 seconds by default
//   };

//   const removeToast = (id: string) => {
//     setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id));
//   };

//   const value = {
//     toast: showToast,
//   };

//   return (
//     <ToastContext.Provider value={value}>
//       {children}
//       <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2 w-full max-w-sm">
//         {toasts.map((toast) => (
//           <Toast key={toast.id} {...toast} />
//         ))}
//       </div>
//     </ToastContext.Provider>
//   );
// }

// // A simple Toast component to display the message. You'll need to create this file.
// // src/components/ui/Toast.tsx
// export interface ToastProps {
//   id?: string;
//   title: string;
//   description?: string;
//   variant?: 'default' | 'destructive';
//   duration?: number;
// }

// export function Toast({ title, description, variant = 'default' }: ToastProps) {
//   const bgColor = variant === 'destructive' ? 'bg-red-500' : 'bg-gray-800';
//   return (
//     <div className={`p-4 rounded-md text-white shadow-lg ${bgColor}`}>
//       <h3 className="font-semibold">{title}</h3>
//       {description && <p className="text-sm">{description}</p>}
//     </div>
//   );
// }