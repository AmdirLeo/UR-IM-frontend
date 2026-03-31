import React, { useState } from 'react';
import { Mail, Lock, User, Hash, AlertCircle } from 'lucide-react';
import { sendRegisterEmail, registerUser, loginUser } from '../api';

type AuthMode = 'login' | 'signup';

interface AuthProps {
  onLoginSuccess: (userId: string, username?: string) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');

  // Form state
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const resetMessages = () => {
    setError('');
    setSuccessMsg('');
  };

  const handleSendCode = async () => {
    if (!email) {
      setError('Please enter your email first.');
      return;
    }
    resetMessages();
    setLoading(true);
    try {
      await sendRegisterEmail(email);
      setSuccessMsg('Verification code sent to your email.');
      setEmailSent(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: { msg: string }[]; msg?: string } } };
      setError(e.response?.data?.detail?.[0]?.msg || e.response?.data?.msg || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      if (mode === 'signup') {
        const res = await registerUser({
          username,
          password,
          email,
          verification_code: verificationCode,
        });
        setSuccessMsg(`Signup successful! Your login ID is: ${res.id}`);
        // Keep them on the form so they can copy the ID, or we could switch to login.
        // Let's clear the form and switch to login after a brief delay
        setTimeout(() => {
          setMode('login');
          setId(res.id.toString());
          setPassword('');
          setSuccessMsg(`Please log in with your new ID: ${res.id}`);
        }, 3000);
      } else {
        const res = await loginUser({
          id,
          password,
        });
        localStorage.setItem('token', res.token);
        // We only have the ID here, we pass it up
        onLoginSuccess(id, username);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: { msg: string }[]; msg?: string } } };
      setError(e.response?.data?.detail?.[0]?.msg || e.response?.data?.msg || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800">
          {mode === 'login' ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-sm text-gray-500 mt-2">
          {mode === 'login'
            ? 'Sign in with your User ID and password'
            : 'Register a new account to get your User ID'}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md flex items-center">
          <AlertCircle className="w-4 h-4 mr-2" />
          {error}
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-md flex items-center">
          <AlertCircle className="w-4 h-4 mr-2" />
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="johndoe"
                  minLength={3}
                  maxLength={20}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Hash className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="123456"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={loading || emailSent}
                  className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50 text-sm whitespace-nowrap"
                >
                  {emailSent ? 'Sent' : 'Get Code'}
                </button>
              </div>
            </div>
          </>
        )}

        {mode === 'login' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                required
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="1"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="••••••••"
              minLength={6}
              maxLength={50}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            resetMessages();
          }}
          className="text-sm text-blue-600 hover:text-blue-500"
        >
          {mode === 'login'
            ? "Don't have an account? Sign up"
            : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
};
