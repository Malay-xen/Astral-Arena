import React, { useState } from 'react';
import { X, Trophy, ShieldCheck, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Tournament } from '../../types';

interface JoinTournamentModalProps {
  isOpen: boolean;
  tournament: Tournament | null;
  onClose: () => void;
  onSuccess: () => void;
  onOpenAddMoney: () => void;
}

export const JoinTournamentModal: React.FC<JoinTournamentModalProps> = ({
  isOpen,
  tournament,
  onClose,
  onSuccess,
  onOpenAddMoney,
}) => {
  const { user, refreshUserData } = useAuth();
  const [teamName, setTeamName] = useState(user?.username || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !tournament) return null;

  const currentBalance = user?.walletBalance || 0;
  const isInsufficient = currentBalance < tournament.entryFee;

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post(`/tournaments/${tournament.id}/join`, {
        teamName: teamName.trim() || user?.username,
      });
      await refreshUserData();
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to complete tournament registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#12141a] border border-[#232733] rounded-2xl p-6 shadow-2xl text-white">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-indigo-400 mb-2">
          <Trophy className="w-5 h-5" />
          <span className="text-xs uppercase font-bold tracking-wider">Tournament Entry</span>
        </div>

        <h2 className="text-xl font-bold mb-1">{tournament.title}</h2>
        <p className="text-sm text-gray-400 mb-4">{tournament.game}</p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-[#181b24] p-4 rounded-xl mb-4 border border-[#262a38] space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Entry Fee</span>
            <span className="font-semibold text-emerald-400">
              {tournament.entryFee > 0 ? `₹${tournament.entryFee}` : 'FREE'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Your Wallet Balance</span>
            <span className="font-semibold">₹{currentBalance.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-[#262a38]">
            <span className="text-gray-400">Balance After Join</span>
            <span className={`font-semibold ${isInsufficient ? 'text-red-400' : 'text-gray-200'}`}>
              ₹{(currentBalance - tournament.entryFee).toFixed(2)}
            </span>
          </div>
        </div>

        {isInsufficient ? (
          <div className="space-y-3">
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
              Your wallet balance is insufficient to pay the entry fee of ₹{tournament.entryFee}.
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenAddMoney();
              }}
              className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-all"
            >
              Add Money to Wallet
            </button>
          </div>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                Team Name
              </label>
              <input
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter Team Name"
                className="w-full bg-[#1b1f2b] border border-[#2c3245] rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:border-indigo-500 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-[#181b24] rounded-lg border border-[#262a38] text-xs">
              <div>
                <span className="text-gray-500 block">MLBB ID</span>
                <span className="font-semibold text-gray-200">{user?.mlbbId}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Server ID</span>
                <span className="font-semibold text-gray-200">{user?.serverId}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              {loading ? 'Registering...' : `Confirm & Pay ₹${tournament.entryFee}`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};