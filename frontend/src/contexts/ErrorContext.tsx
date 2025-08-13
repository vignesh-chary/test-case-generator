// src/contexts/ErrorContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the shape of the context value
interface ErrorContextType {
    error: string | null;
    setError: (message: string | null) => void;
}

// Create the context with a default undefined value
const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

// Define the provider component
export function ErrorProvider({ children }: { children: ReactNode }) {
    const [error, setErrorState] = useState<string | null>(null);

    // This function will automatically clear the error after 5 seconds
    const setError = (message: string | null) => {
        setErrorState(message);
        if (message) {
            setTimeout(() => {
                setErrorState(null);
            }, 5000); // Clear the error after 5 seconds
        }
    };

    return (
        <ErrorContext.Provider value={{ error, setError }}>
            {children}
        </ErrorContext.Provider>
    );
}

// Define the custom hook to use the error context
export function useError() {
    const context = useContext(ErrorContext);
    if (!context) {
        throw new Error('useError must be used within an ErrorProvider');
    }
    return context;
}
