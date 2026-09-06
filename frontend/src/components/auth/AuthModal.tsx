import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, User, Smartphone, Server, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  onForgotPasswordClick?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onForgotPasswordClick,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const { login, register } = useAuth();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [mlbbId, setMlbbId] = useState('');
  const [serverId, setServerId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Synchronize mode when opened and reset errors/visibility
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        onClose();
      } else {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setSubmitting(false);
          return;
        }
        await register({ email, username, mlbbId, serverId, password, confirmPassword });
        onClose();
      }
    } catch (err: any) {
      if (!err.response) {
        setError('Cannot connect to backend server. Make sure backend is running on port 5000.');
      } else {
        setError(err.response?.data?.error || 'Authentication failed. Please verify your credentials.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#12141a] border border-[#232733] rounded-2xl p-6 md:p-8 shadow-2xl text-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-cyan-400" />
        </button>

        <h2 className="text-2xl font-bold mb-2 tracking-wide">
          {mode === 'login' ? 'Welcome Back' : 'Create Player Account'}
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          {mode === 'login'
            ? 'Sign in to access tournaments, your wallet, and matches.'
            : 'Enter your MLBB details to compete in Astral Arena.'}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="player@gmail.com"
                className="w-full bg-[#1b1f2b] border border-[#2c3245] rounded-lg py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:border-cyan-500 text-white placeholder-gray-500"
              />
            </div>
          </div>

          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                  Username (Astral Identity)
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                   /*placeholder="chougod",,if we want to add highlight text*/
                    className="w-full bg-[#1b1f2b] border border-[#2c3245] rounded-lg py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:border-cyan-500 text-white placeholder-gray-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                    MLBB ID
                  </label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      required
                      value={mlbbId}
                      onChange={(e) => setMlbbId(e.target.value)}
                      
                      className="w-full bg-[#1b1f2b] border border-[#2c3245] rounded-lg py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:border-cyan-500 text-white placeholder-gray-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                    Server ID
                  </label>
                  <div className="relative">
                    <Server className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      required
                      value={serverId}
                      onChange={(e) => setServerId(e.target.value)}
                    
                      className="w-full bg-[#1b1f2b] border border-[#2c3245] rounded-lg py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:border-cyan-500 text-white placeholder-gray-500"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Password with Show/Hide Eye Toggle */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Password
              </label>
              {mode === 'login' && onForgotPasswordClick && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onForgotPasswordClick();
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1b1f2b] border border-[#2c3245] rounded-lg py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:border-cyan-500 text-white placeholder-gray-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-cyan-400 transition-colors p-0.5"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password with Show/Hide Eye Toggle */}
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#1b1f2b] border border-[#2c3245] rounded-lg py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:border-cyan-500 text-white placeholder-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-cyan-400 transition-colors p-0.5"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3 px-4 rounded-lg bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 text-gray-950 font-bold text-sm transition-all shadow-lg shadow-cyan-500/25 disabled:opacity-50"
          >
            {submitting
              ? 'Processing...'
              : mode === 'login'
              ? 'Sign In to Astral Arena'
              : 'Create Player Account'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          {mode === 'login' ? (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-cyan-400 hover:text-cyan-300 font-medium"
              >
                Sign Up
              </button>
            </p>
          ) : (
            <p>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-cyan-400 hover:text-cyan-300 font-medium"
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};