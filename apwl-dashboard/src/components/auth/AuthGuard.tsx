import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('API Key is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await login(apiKey);
    } catch (err) {
      setError('Invalid API Key. Please check and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card title="APWL Admin Access" subtitle="Enter your API key to continue">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="password"
                label="Admin API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                error={error}
                placeholder="Enter your admin API key"
                autoFocus
              />
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isSubmitting}
              >
                {isSubmitting ? 'Validating...' : 'Access Dashboard'}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};