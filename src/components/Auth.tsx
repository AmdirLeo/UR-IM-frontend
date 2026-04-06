import React, { useState } from 'react';
import { Mail, Lock, User, Hash, AlertCircle } from 'lucide-react';
import { sendRegisterEmail, registerUser, loginUser } from '../api';
import styles from './Auth.module.css';

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
    <div className={styles.authCard}>
      <div className={styles.headerContainer}>
        <h2 className={styles.title}>
          {mode === 'login' ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className={styles.subtitle}>
          {mode === 'login'
            ? 'Sign in with your User ID and password'
            : 'Register a new account to get your User ID'}
        </p>
      </div>

      {error && (
        <div className={styles.errorAlert}>
          <AlertCircle className={styles.alertIcon} />
          {error}
        </div>
      )}

      {successMsg && (
        <div className={styles.successAlert}>
          <AlertCircle className={styles.alertIcon} />
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.formContainer}>
        {mode === 'signup' && (
          <>
            <div>
              <label className={styles.label}>Username</label>
              <div className={styles.inputGroup}>
                <div className={styles.iconContainer}>
                  <User className={styles.icon} />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={styles.input}
                  placeholder="johndoe"
                  minLength={3}
                  maxLength={20}
                />
              </div>
            </div>

            <div>
              <label className={styles.label}>Email</label>
              <div className={styles.inputGroup}>
                <div className={styles.iconContainer}>
                  <Mail className={styles.icon} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.input}
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div>
              <label className={styles.label}>Verification Code</label>
              <div className={styles.verificationRow}>
                <div className={styles.verificationInputWrapper}>
                  <div className={styles.iconContainer}>
                    <Hash className={styles.icon} />
                  </div>
                  <input
                    type="text"
                    required
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className={styles.input}
                    placeholder="123456"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={loading || emailSent}
                  className={styles.getCodeBtn}
                >
                  {emailSent ? 'Sent' : 'Get Code'}
                </button>
              </div>
            </div>
          </>
        )}

        {mode === 'login' && (
          <div>
            <label className={styles.label}>User ID</label>
            <div className={styles.inputGroup}>
              <div className={styles.iconContainer}>
                <User className={styles.icon} />
              </div>
              <input
                type="text"
                required
                value={id}
                onChange={(e) => setId(e.target.value)}
                className={styles.input}
                placeholder="1"
              />
            </div>
          </div>
        )}

        <div>
          <label className={styles.label}>Password</label>
          <div className={styles.inputGroup}>
            <div className={styles.iconContainer}>
              <Lock className={styles.icon} />
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="••••••••"
              minLength={6}
              maxLength={50}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={styles.submitBtn}
        >
          {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
        </button>
      </form>

      <div className={styles.footerContainer}>
        <button
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            resetMessages();
          }}
          className={styles.toggleModeBtn}
        >
          {mode === 'login'
            ? "Don't have an account? Sign up"
            : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
};
