import React, { useState, useEffect } from 'react';
import { 
  X, 
  Swords, 
   
  CheckCircle2, 
  ChevronRight, 
  AlertCircle, 
  ArrowLeft,
  Clock,
  History,
  Users,
  Trophy,
  Filter
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { VsMatchListing } from '../../types';

interface VsModeModalProps {
  isOpen: boolean;
  initialCategory: '1v1' | '3v3' | '5v5';
  onClose: () => void;
  onOpenAddMoney: () => void;
  onOpenHistory?: () => void;
}

export const VsModeModal: React.FC<VsModeModalProps> = ({
  isOpen,
  initialCategory,
  onClose,
  onOpenAddMoney,
  onOpenHistory,
}) => {
  const { user, refreshUserData } = useAuth();

  const [category, setCategory] = useState<'1v1' | '3v3' | '5v5'>(initialCategory);
  const [matches, setMatches] = useState<VsMatchListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [subModeFilter, setSubModeFilter] = useState<'ALL' | 'LARGE' | 'SMALL'>('ALL');

  // Selected match for confirmation
  const [selectedMatch, setSelectedMatch] = useState<VsMatchListing | null>(null);
  const [step, setStep] = useState<'LIST' | 'CONFIRM' | 'SUCCESS'>('LIST');

  // Confirmation form
  const [mlbbId, setMlbbId] = useState('');
  const [serverId, setServerId] = useState('');
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinedSuccess, setJoinedSuccess] = useState<any>(null);

  const fetchMatches = async (cat: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/vs-matches?category=${cat}`);
      setMatches(res.data);
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCategory(initialCategory);
      setStep('LIST');
      setSelectedMatch(null);
      setError(null);
      setConfirmCheckbox(false);
      setMlbbId(user?.mlbbId || '');
      setServerId(user?.serverId || '');
      fetchMatches(initialCategory);
    }
  }, [isOpen, initialCategory, user?.mlbbId, user?.serverId]);

  if (!isOpen) return null;

  const currentBalance = user?.walletBalance || 0;

  // Filter 1v1 sub-modes
  const filteredMatches = matches.filter((m) => {
    if (category !== '1v1' || subModeFilter === 'ALL') return true;
    if (subModeFilter === 'LARGE') return m.subMode.toLowerCase().includes('sanctum') || m.subMode.toLowerCase().includes('large');
    if (subModeFilter === 'SMALL') return m.subMode.toLowerCase().includes('brawl') || m.subMode.toLowerCase().includes('small');
    return true;
  });

  const handleSelectMatchToJoin = (match: VsMatchListing) => {
    if (!user) {
      setError('Please sign in to join matches.');
      return;
    }
    if (match.currentPlayers >= match.requiredPlayers || match.status !== 'WAITING_FOR_PLAYERS') {
      return;
    }
    setError(null);
    setSelectedMatch(match);
    setMlbbId(user.mlbbId || '');
    setServerId(user.serverId || '');
    setConfirmCheckbox(false);
    setStep('CONFIRM');
  };

  const handleConfirmJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch) return;

    if (!mlbbId || !serverId) {
      setError('MLBB ID and Server ID are required.');
      return;
    }

    if (!confirmCheckbox) {
      setError('Please confirm that your MLBB credentials are correct.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await api.post(`/vs-matches/${selectedMatch.id}/join`, {
        mlbbId: mlbbId.trim(),
        serverId: serverId.trim(),
      });

      setJoinedSuccess(res.data.match);
      setStep('SUCCESS');
      refreshUserData();
      fetchMatches(category);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to join match.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl bg-[#0e121d] border border-[#1b2234] rounded-2xl p-6 shadow-2xl text-white max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-cyan-400" />
        </button>

        {/* STEP 1: MATCH LISTING */}
        {step === 'LIST' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-[#1b2234]">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-black tracking-wider uppercase mb-1">
                  <Swords className="w-3.5 h-3.5 text-cyan-400" />
                  {category === '1v1' ? '1v1 Solo Arena' : category === '3v3' ? '3v3 Brawl Arena' : '5v5 Squad Conquest'}
                </div>
                <h2 className="text-xl font-black text-white">Available Hosted Matches</h2>
                <p className="text-xs text-gray-400">
                  Select an admin-hosted match below to register your slot.
                </p>
              </div>

              {/* Balance Badge */}
              <div className="flex items-center gap-3 bg-[#131724] border border-[#1e2538] px-3.5 py-2 rounded-xl self-start sm:self-auto">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Wallet Balance</span>
                  <span className="text-sm font-bold text-emerald-400">₹{currentBalance.toFixed(2)}</span>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onOpenAddMoney();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/30"
                >
                  + Add Funds
                </button>
              </div>
            </div>

            {/* Sub-mode Filter for 1v1 */}
            {category === '1v1' && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-gray-400 flex items-center gap-1 mr-1">
                  <Filter className="w-3 h-3 text-cyan-400" /> Map:
                </span>
                {[
                  { id: 'ALL', label: 'All Maps' },
                  { id: 'LARGE', label: 'Large Map (Sanctum)' },
                  { id: 'SMALL', label: 'Small Map (Brawl)' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSubModeFilter(f.id as any)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      subModeFilter === f.id
                        ? 'bg-cyan-500 text-gray-950 shadow-md shadow-cyan-500/20'
                        : 'bg-[#141b2d] text-gray-400 hover:text-white border border-[#1f273b]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Matches Scrollable List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {loading ? (
                <div className="py-16 text-center text-xs text-gray-400">Loading active matches...</div>
              ) : filteredMatches.length === 0 ? (
                <div className="py-16 text-center text-xs text-gray-500">
                  No active matches created by admin for this mode yet. Check back soon!
                </div>
              ) : (
                filteredMatches.map((m) => {
                  const isFull = m.currentPlayers >= m.requiredPlayers || m.status !== 'WAITING_FOR_PLAYERS';
                  const isUserJoined = m.isJoined;

                  return (
                    <div
                      key={m.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isUserJoined
                          ? 'bg-[#101b2b] border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                          : isFull
                          ? 'bg-[#11141d] border-[#1c2230] opacity-75'
                          : 'bg-[#121624] border-[#1e263a] hover:border-cyan-500/40'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Match Details */}
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                              #{m.matchCode}
                            </span>
                            <span className="text-xs font-bold text-white">{m.subMode}</span>
                            {isUserJoined && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                You Joined
                              </span>
                            )}
                          </div>

                          {/* Entry & Win details */}
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-gray-300">
                              Entry: <strong className="text-white">₹{m.entryFee}</strong>
                            </span>
                            <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                              <Trophy className="w-3 h-3 text-emerald-400" /> Win: ₹{m.winningAmount}
                            </span>
                          </div>

                          {/* Match Time & Slots */}
                          <div className="flex items-center gap-4 text-[11px] text-gray-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-cyan-400" />
                              {m.scheduledTime
                                ? new Date(m.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : 'Time: Coming Soon'}
                            </span>
                            <span className="flex items-center gap-1 font-semibold text-gray-300">
                              <Users className="w-3 h-3 text-gray-500" />
                              {m.currentPlayers} / {m.requiredPlayers} Players ({m.remainingSlots} slot{m.remainingSlots === 1 ? '' : 's'} remaining)
                            </span>
                          </div>

                          {/* If player already joined and roomCode is announced */}
                          {isUserJoined && m.roomCode && (
                            <div className="text-xs text-cyan-300 font-bold bg-cyan-500/10 border border-cyan-500/20 p-2 rounded-lg mt-1">
                              Lobby ID: <span className="font-mono text-white text-sm">{m.roomCode}</span>
                            </div>
                          )}
                        </div>

                        {/* Action CTA */}
                        <div className="shrink-0 flex items-center justify-end">
                          {isUserJoined ? (
                            <button
                              onClick={() => {
                                onClose();
                                if (onOpenHistory) onOpenHistory();
                              }}
                              className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all flex items-center gap-1"
                            >
                              View in History <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          ) : isFull ? (
                            <span className="px-4 py-2 rounded-xl bg-gray-800 text-gray-500 text-xs font-bold border border-gray-700">
                              REGISTRATION CLOSED
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSelectMatchToJoin(m)}
                              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 text-gray-950 text-xs font-black transition-all shadow-md shadow-cyan-500/20 flex items-center gap-1"
                            >
                              JOIN MATCH <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* STEP 2: PLAYER JOIN CONFIRMATION FOR THE CHOSEN MATCH */}
        {step === 'CONFIRM' && selectedMatch && (
          <form onSubmit={handleConfirmJoin} className="flex-1 flex flex-col justify-between overflow-y-auto pr-1">
            <div>
              <button
                type="button"
                onClick={() => setStep('LIST')}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1 mb-4"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Match Listings
              </button>

              <h2 className="text-xl font-black mb-1">Confirm Match Entry</h2>
              <p className="text-xs text-gray-400 mb-5">
                Review match details and confirm your MLBB account to join.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Exact Selected Match Card */}
              <div className="bg-[#121624] p-4 rounded-xl border border-[#1e263a] mb-5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Match Number</span>
                  <span className="font-mono font-bold text-cyan-300">#{selectedMatch.matchCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Format & Map</span>
                  <span className="font-bold text-white">{selectedMatch.category} • {selectedMatch.subMode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Entry Fee</span>
                  <span className="font-bold text-white">₹{selectedMatch.entryFee}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Winning Payout</span>
                  <span className="font-bold text-emerald-400">₹{selectedMatch.winningAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Match Time</span>
                  <span className="font-bold text-cyan-400">
                    {selectedMatch.scheduledTime
                      ? new Date(selectedMatch.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Time: Coming Soon'}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#1e263a]">
                  <span className="text-gray-400">Your Wallet Balance</span>
                  <span className="font-bold text-gray-200">₹{currentBalance.toFixed(2)}</span>
                </div>
              </div>

              {/* MLBB ID and Server ID Input */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                    MLBB Player ID
                  </label>
                  <input
                    type="text"
                    required
                    value={mlbbId}
                    onChange={(e) => setMlbbId(e.target.value)}
                    placeholder="Enter MLBB ID"
                    className="w-full bg-[#181e2e] border border-[#242e47] rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                    Server ID
                  </label>
                  <input
                    type="text"
                    required
                    value={serverId}
                    onChange={(e) => setServerId(e.target.value)}
                    placeholder="Enter Server ID"
                    className="w-full bg-[#181e2e] border border-[#242e47] rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Checkbox confirmation */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#121624] border border-[#1e263a] cursor-pointer mb-6 text-xs text-gray-300">
                <input
                  type="checkbox"
                  checked={confirmCheckbox}
                  onChange={(e) => setConfirmCheckbox(e.target.checked)}
                  className="mt-0.5 rounded border-gray-700 text-cyan-500 focus:ring-cyan-500"
                />
                <span>I confirm that my MLBB Player ID and Server ID are accurate.</span>
              </label>
            </div>

            {currentBalance < selectedMatch.entryFee ? (
              <div className="space-y-3">
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                  Insufficient balance. You need ₹{selectedMatch.entryFee} to join this match.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAddMoney();
                  }}
                  className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  Add Money to Wallet
                </button>
              </div>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 text-gray-950 font-black text-sm transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
              >
                {submitting ? 'Registering...' : `Confirm & Join Match (₹${selectedMatch.entryFee})`}
              </button>
            )}
          </form>
        )}

        {/* STEP 3: SUCCESS CONFIRMATION */}
        {step === 'SUCCESS' && joinedSuccess && (
          <div className="py-4 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-black text-white mb-1">Match Joined Successfully!</h3>
            <p className="text-xs text-gray-400 mb-6 max-w-sm mx-auto">
              You are registered for Match #{joinedSuccess.matchCode}.
            </p>

            {/* Summary Box */}
            <div className="bg-[#121624] p-4 rounded-xl border border-[#1e263a] max-w-md mx-auto mb-6 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Match Number</span>
                <span className="font-mono font-bold text-cyan-300">#{joinedSuccess.matchCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Mode</span>
                <span className="font-bold text-white">{joinedSuccess.category} • {joinedSuccess.subMode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Slots Filled</span>
                <span className="font-bold text-amber-400">
                  {joinedSuccess.currentPlayers} / {joinedSuccess.requiredPlayers} Players
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Match Time</span>
                <span className="font-bold text-cyan-400">
                  {joinedSuccess.scheduledTime
                    ? new Date(joinedSuccess.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Time: Coming Soon'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Lobby Code</span>
                <span className="font-bold text-gray-300">
                  {joinedSuccess.roomCode ? joinedSuccess.roomCode : 'Waiting for host'}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#1e263a]">
                <span className="text-gray-400">Potential Payout</span>
                <span className="font-bold text-emerald-400">₹{joinedSuccess.winningAmount}</span>
              </div>
            </div>

            <div className="space-y-2.5 max-w-md mx-auto">
              {onOpenHistory && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenHistory();
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 text-gray-950 font-black text-xs transition-all shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2"
                >
                  <History className="w-4 h-4" /> View Updates in Match History
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-[#161c2b] hover:bg-[#1a2235] text-gray-300 hover:text-white font-bold text-xs border border-[#232d45] transition-all"
              >
                Back to Arenas
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};