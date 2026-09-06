import React from 'react';
import { X, Mail, Smartphone, Server, Shield, Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAddMoney?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onOpenAddMoney }) => {
  const { user } = useAuth();

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#0e121d] border border-[#1b2234] rounded-2xl p-6 shadow-2xl text-white">
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Close Profile"
        >
          <X className="w-5 h-5 text-cyan-400" />
        </button>

        {/* Profile Header */}
        <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-[#1b2234]">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-400 to-indigo-600 flex items-center justify-center font-black text-2xl text-white shadow-lg shadow-cyan-500/20">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              {user.username}
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[10px] font-extrabold uppercase">
                {user.role}
              </span>
            </h2>
            <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3.5 h-3.5 text-gray-500" />
              {user.email}
            </p>
          </div>
        </div>

        {/* Profile Details Grid */}
        <div className="space-y-3 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-[#131927] rounded-xl border border-[#1e273b]">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-cyan-400" /> MLBB ID
              </span>
              <span className="text-sm font-bold text-gray-100">{user.mlbbId}</span>
            </div>

            <div className="p-3 bg-[#131927] rounded-xl border border-[#1e273b]">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Server className="w-3 h-3 text-cyan-400" /> Server ID
              </span>
              <span className="text-sm font-bold text-gray-100">{user.serverId}</span>
            </div>
          </div>

          {/* Wallet Balance Info */}
          <div className="p-3.5 bg-[#131927] rounded-xl border border-[#1e273b] flex items-center justify-between">
            <div>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-0.5 flex items-center gap-1">
                <Wallet className="w-3 h-3 text-emerald-400" /> Wallet Balance
              </span>
              <span className="text-lg font-black text-emerald-400">
                ₹{(user.walletBalance || 0).toFixed(2)}
              </span>
            </div>
            {onOpenAddMoney && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAddMoney();
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/30 transition-all"
              >
                + Add Money
              </button>
            )}
          </div>
        </div>

        {/* Platform Status */}
        <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 flex items-center gap-2">
          <Shield className="w-4 h-4 shrink-0 text-cyan-400" />
          <span>Account verified for official Astral Arena MLBB tournaments.</span>
        </div>
      </div>
    </div>
  );
};