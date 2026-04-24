import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, Hash, AlertCircle } from 'lucide-react';
import { sendRegisterEmail, registerUser, loginUser, sendForgetPasswordEmail, setForgetPassword } from '../api';
import styles from './Auth.module.css';

type AuthMode = 'login' | 'signup' | 'forgot_password';

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
  const [countdown, setCountdown] = useState(0);

  // Initialize countdown from localStorage
  useEffect(() => {
    const key = mode === 'forgot_password' ? 'forgot_pwd_code_last_sent' : 'register_code_last_sent';
    const lastSentStr = localStorage.getItem(key);
    if (lastSentStr) {
      const lastSent = parseInt(lastSentStr, 10);
      const now = Date.now();
      const diff = Math.floor((now - lastSent) / 1000);
      if (diff < 60) {
        setCountdown(60 - diff);
      } else {
        localStorage.removeItem(key);
      }
    } else {
      setCountdown(0);
    }
  }, [mode]);

  // Handle countdown interval
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    const key = mode === 'forgot_password' ? 'forgot_pwd_code_last_sent' : 'register_code_last_sent';
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else {
      localStorage.removeItem(key);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [countdown, mode]);

  const resetMessages = () => {
    setError('');
    setSuccessMsg('');
  };

  const handleSendCode = async () => {
    if (!email) {
      setError('Please enter your email first.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    resetMessages();
    setLoading(true);
    try {
      if (mode === 'forgot_password') {
        const data = await sendForgetPasswordEmail(email);
        const code = data?.verification_code;
        setSuccessMsg(code ? `Verification code: ${code}` : 'Verification code sent to your email.');
        setCountdown(60);
        localStorage.setItem('forgot_pwd_code_last_sent', Date.now().toString());
      } else {
        const data = await sendRegisterEmail(email);
        const code = data?.verification_code;
        setSuccessMsg(code ? `Verification code: ${code}` : 'Verification code sent to your email.');
        setCountdown(60);
        localStorage.setItem('register_code_last_sent', Date.now().toString());
      }
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
      } else if (mode === 'forgot_password') {
        await setForgetPassword({
          email,
          password,
          verification_code: verificationCode,
        });
        setSuccessMsg('Password reset successful!');
        setTimeout(() => {
          setMode('login');
          setId('');
          setPassword('');
          setSuccessMsg('Please log in with your new password.');
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
          {mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
        </h2>
        <p className={styles.subtitle}>
          {mode === 'login'
            ? 'Sign in with your User ID and password'
            : mode === 'signup'
            ? 'Register a new account to get your User ID'
            : 'Enter your email to reset your password'}
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
        {(mode === 'signup' || mode === 'forgot_password') && (
          <>
            {mode === 'signup' && (
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
            )}

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
                  disabled={loading || countdown > 0}
                  className={styles.getCodeBtn}
                >
                  {countdown > 0 ? `${countdown}s` : 'Get Code'}
                </button>
              </div>
            </div>
          </>
        )}

        {mode === 'login' && (
          <div>
            <label className={styles.label}>User ID/Email</label>
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
                placeholder="e.g. 10001 or mail@example.com"
              />
            </div>
          </div>
        )}

        <div>
          <label className={styles.label}>{mode === 'forgot_password' ? 'New Password' : 'Password'}</label>
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
          {mode === 'login' && (
            <button
              type="button"
              className={styles.forgotPasswordLink}
              onClick={() => {
                setMode('forgot_password');
                resetMessages();
              }}
            >
              Forgot password?
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className={styles.submitBtn}
        >
          {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Sign Up' : 'Reset Password'}
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
            : 'Back to sign in'}
        </button>
      </div>
    </div>
  );
};
