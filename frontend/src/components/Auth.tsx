// src/components/Auth.tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Github } from 'lucide-react';
import { Button } from './ui/Button';

export function Auth() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();

  // This useEffect hook handles the redirection after a successful login
  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard/repositories');
    }
  }, [user, loading, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-10 rounded-lg shadow-xl text-center max-w-sm">
        <Github className="w-16 h-16 text-gray-800 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          AI Test Generator
        </h1>
        <p className="text-gray-600 mb-8">
          Generate unit tests for your code with AI.
        </p>

        {!user && !loading ? (
          <Button onClick={login} className="w-full flex items-center justify-center">
            <Github className="w-5 h-5 mr-2" />
            <span>Login with GitHub</span>
          </Button>
        ) : (
          <p className="text-green-600 font-semibold">
            You are logged in as {user?.login}.
          </p>
        )}
      </div>
    </div>
  );
}