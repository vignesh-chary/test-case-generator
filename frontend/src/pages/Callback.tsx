// src/pages/Callback.tsx
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function Callback() {
  const { handleOAuthCallback } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const calledRef = useRef(false); // ✅ to prevent double call

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const code = query.get('code');

    if (code && !calledRef.current) {
      calledRef.current = true; // ✅ flag
      handleOAuthCallback(code).then(() => {
        navigate('/');
      });
    }
  }, [location.search, handleOAuthCallback, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-xl font-semibold">Logging in with GitHub...</p>
    </div>
  );
}