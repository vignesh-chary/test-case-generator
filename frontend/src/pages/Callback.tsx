import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useError } from '../contexts/ErrorContext';

export function Callback() {
    const { handleOAuthCallback, user, loading } = useAuth();
    const { setError } = useError();
    const location = useLocation();
    const navigate = useNavigate();

    const calledRef = useRef(false); // To prevent double calls in React's strict mode

    useEffect(() => {
        const query = new URLSearchParams(location.search);
        const code = query.get('code');

        // Only proceed if a code is present and we haven't already processed it
        if (code && !calledRef.current) {
            calledRef.current = true;
            handleOAuthCallback(code)
                .then(() => {
                    // ✅ FIX: Navigate to the correct dashboard page after successful authentication
                    // Using { replace: true } prevents the user from going back to the /callback page
                    navigate('/dashboard/repositories', { replace: true });
                })
                .catch((error) => {
                    // If authentication fails, set an error and redirect back to the home page
                    console.error("Authentication failed:", error);
                    setError("GitHub authentication failed. Please try again.");
                    navigate('/', { replace: true });
                });
        } else if (!code) {
            // If there's no 'code' parameter, something went wrong, so redirect home
            setError("Authentication failed: Missing authorization code.");
            navigate('/', { replace: true });
        }
    }, [location.search, handleOAuthCallback, navigate, setError]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <div className="bg-white p-10 rounded-lg shadow-xl text-center max-w-sm">
                <div className="w-16 h-16 text-gray-800 mx-auto mb-6 flex items-center justify-center">
                    <svg className="animate-spin h-10 w-10 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-800">
                    Authenticating...
                </h1>
                <p className="text-gray-600 mt-2">Please wait while we securely log you in with GitHub.</p>
            </div>
        </div>
    );
}