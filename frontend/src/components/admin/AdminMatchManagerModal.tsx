import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Shield, 
  Users, 
  Clock, 
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import api from '../../services/api';
import { AdminMatchParticipant } from '../../types';

interface AdminMatchManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminMatchManagerModal: React.FC<AdminMatchManagerModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'LIST' | 'CREATE' | 'MANAGE'>('LIST');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | '1v1' | '3v3' | '5v5'>('ALL');
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form: Fully customizable match creation (No leading space, exact names)
  const [newCategory, setNewCategory] = useState<'1v1' | '3v3' | '5v5'>('1v1');
  const [newSubMode, setNewSubMode] = useState('Large Map (Classic)');
  const [newEntryFee, setNewEntryFee] = useState('10');
  const [newWinningAmount, setNewWinningAmount] = useState('15');
  const [newScheduledTime, setNewScheduledTime] = useState('');
  const [newRoomCode, setNewRoomCode] = useState('');

  // Selected match for management
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [participants, setParticipants] = useState<AdminMatchParticipant[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [editRoomCode, setEditRoomCode] = useState('');
  const [editScheduledTime, setEditScheduledTime] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const url = categoryFilter === 'ALL' ? '/vs-matches/admin/all' : `/vs-matches/admin/all?category=${categoryFilter}`;
      const res = await api.get(url);
      setMatches(res.data);
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMatches();
      setStatusMessage(null);
    }
  }, [isOpen, categoryFilter]);

  const handleOpenManage = async (match: any) => {
    setSelectedMatch(match);
    setEditRoomCode(match.room_code || '');
    if (match.scheduled_time) {
      const dt = new Date(match.scheduled_time);
      const localIso = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setEditScheduledTime(localIso);
    } else {
      setEditScheduledTime('');
    }
    setStatusMessage(null);
    setActiveTab('MANAGE');

    setParticipantsLoading(true);
    try {
      const res = await api.get(`/vs-matches/admin/${match.id}/participants`);
      setParticipants(res.data.participants);
    } catch {
      // Non-blocking
    } finally {
      setParticipantsLoading(false);
    }
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setStatusMessage(null);

    try {
      await api.post('/vs-matches/admin/create', {
        category: newCategory,
        subMode: newSubMode.trim(),
        entryFee: parseFloat(newEntryFee),
        winningAmount: parseFloat(newWinningAmount),
        scheduledTime: newScheduledTime ? new Date(newScheduledTime).toISOString() : null,
        roomCode: newRoomCode.trim() || null,
      });

      setStatusMessage('Match created successfully with custom settings!');
      fetchMatches();
      setActiveTab('LIST');
    } catch (err: any) {
      setStatusMessage(err.response?.data?.error || 'Failed to create match.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateMatchDetails = async () => {
    if (!selectedMatch) return;
    setActionLoading(true);
    try {
      await api.put(`/vs-matches/admin/${selectedMatch.id}`, {
        roomCode: editRoomCode.trim() || null,
        scheduledTime: editScheduledTime ? new Date(editScheduledTime).toISOString() : null,
      });
      setStatusMessage('Lobby Code and Match Held Time updated! Players can now see it.');
      fetchMatches();
    } catch (err: any) {
      setStatusMessage(err.response?.data?.error || 'Failed to update match details.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSettleWinner = async (winnerUserId: string, winnerName: string) => {
    if (!selectedMatch) return;
    if (!confirm(`Are you sure you want to declare ${winnerName} as the winner and credit ₹${selectedMatch.winning_amount} to their wallet?`)) {
      return;
    }

    setActionLoading(true);
    try {
      await api.post(`/vs-matches/admin/${selectedMatch.id}/settle`, { winnerUserId });
      setStatusMessage(`Victory declared for ${winnerName}! Payout credited.`);
      handleOpenManage(selectedMatch);
      fetchMatches();
    } catch (err: any) {
      setStatusMessage(err.response?.data?.error || 'Failed to settle match.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelMatch = async () => {
    if (!selectedMatch) return;
    if (!confirm(`Are you sure you want to CANCEL match #${selectedMatch.match_code}? All participants will be refunded their entry fee automatically.`)) {
      return;
    }

    setActionLoading(true);
    try {
      await api.post(`/vs-matches/admin/${selectedMatch.id}/cancel`);
      setStatusMessage('Match cancelled and all entry fees refunded.');
      fetchMatches();
      setActiveTab('LIST');
    } catch (err: any) {
      setStatusMessage(err.response?.data?.error || 'Failed to cancel match.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-4xl bg-[#0e121d] border border-cyan-500/30 rounded-2xl p-6 shadow-2xl text-white max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X className="w-5 h-5 text-cyan-400" />
        </button>

        {/* Top Header */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#1b2234] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Admin Match Command Center</h2>
              <p className="text-xs text-gray-400">Host, schedule, and manage 1v1, 3v3, and 5v5 matches.</p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('LIST')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'LIST' ? 'bg-cyan-500 text-gray-950' : 'bg-[#141b2d] text-gray-400 hover:text-white'
              }`}
            >
              All Matches
            </button>
            <button
              onClick={() => setActiveTab('CREATE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                activeTab === 'CREATE' ? 'bg-cyan-500 text-gray-950' : 'bg-[#141b2d] text-gray-400 hover:text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" /> Create Match
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="mb-4 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* TAB 1: ALL MATCHES */}
        {activeTab === 'LIST' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex gap-2 mb-4">
              {(['ALL', '1v1', '3v3', '5v5'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    categoryFilter === cat ? 'bg-cyan-500 text-gray-950' : 'bg-[#141b2d] text-gray-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {loading ? (
                <div className="py-16 text-center text-xs text-gray-400">Loading matches...</div>
              ) : matches.length === 0 ? (
                <div className="py-16 text-center text-xs text-gray-500">No matches found. Click "Create Match" to post one!</div>
              ) : (
                matches.map((m) => (
                  <div
                    key={m.id}
                    className="p-3.5 bg-[#121624] border border-[#1e263a] rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-cyan-400">#{m.match_code}</span>
                        <span className="font-bold text-white">{m.category} • {m.sub_mode}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          m.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' :
                          m.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                          {m.status}
                        </span>
                      </div>

                      <div className="text-gray-400 flex items-center gap-4 text-[11px]">
                        <span>Entry: ₹{m.entry_fee} ➔ Win: ₹{m.winning_amount}</span>
                        <span>Slots: <strong className="text-white">{m.current_players} / {m.required_players}</strong></span>
                        <span>Lobby: <strong className="text-cyan-300 font-mono">{m.room_code || 'Empty'}</strong></span>
                        <span className="text-amber-300">
                          {m.scheduled_time ? new Date(m.scheduled_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'No Time Set'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenManage(m)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#1a2338] hover:bg-cyan-500/20 hover:text-cyan-300 border border-[#263452] text-xs font-bold transition-all"
                    >
                      Manage & Lobby ➔
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: FULLY CUSTOMIZABLE CREATE MATCH */}
        {activeTab === 'CREATE' && (
          <form onSubmit={handleCreateMatch} className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => {
                    const cat = e.target.value as any;
                    setNewCategory(cat);
                    if (cat === '1v1') setNewSubMode('Large Map (Classic)');
                    else if (cat === '3v3') setNewSubMode('Classic Arena');
                    else setNewSubMode('Classic Conquest');
                  }}
                  className="w-full bg-[#181e2e] border border-[#242e47] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="1v1">1v1 Solo (2 Slots)</option>
                  <option value="3v3">3v3 Trio (6 Slots)</option>
                  <option value="5v5">5v5 Full Squad (10 Slots)</option>
                </select>
              </div>

              {/* Sub-Mode / Map (FREE EDITABLE INPUT FOR ALL MODES) */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-gray-400 uppercase">
                    Sub-Mode / Map (Type Any Custom Name)
                  </label>
                </div>
                <input
                  type="text"
                  required
                  value={newSubMode}
                  onChange={(e) => setNewSubMode(e.target.value)}
                  placeholder="e.g. Large Map (Classic) or Custom Rule"
                  className="w-full bg-[#181e2e] border border-[#242e47] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />

                {/* Quick Presets based on selected mode */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] text-gray-500 py-0.5 flex items-center gap-0.5">
                    <Sparkles className="w-3 h-3 text-cyan-400" /> Presets:
                  </span>
                  {newCategory === '1v1' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setNewSubMode('Large Map (Classic)')}
                        className="px-2 py-0.5 rounded bg-[#131a29] border border-[#1f2a40] hover:border-cyan-500/50 text-[10px] text-cyan-300 transition-all"
                      >
                        Large Map (Classic)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewSubMode('Small Map (Brawl)')}
                        className="px-2 py-0.5 rounded bg-[#131a29] border border-[#1f2a40] hover:border-cyan-500/50 text-[10px] text-amber-300 transition-all"
                      >
                        Small Map (Brawl)
                      </button>
                    </>
                  )}
                  {newCategory === '3v3' && (
                    <button
                      type="button"
                      onClick={() => setNewSubMode('Classic Arena')}
                      className="px-2 py-0.5 rounded bg-[#131a29] border border-[#1f2a40] hover:border-cyan-500/50 text-[10px] text-cyan-300 transition-all"
                    >
                      Classic Arena
                    </button>
                  )}
                  {newCategory === '5v5' && (
                    <button
                      type="button"
                      onClick={() => setNewSubMode('Classic Conquest')}
                      className="px-2 py-0.5 rounded bg-[#131a29] border border-[#1f2a40] hover:border-cyan-500/50 text-[10px] text-cyan-300 transition-all"
                    >
                      Classic Conquest
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* FULLY CUSTOMIZABLE ENTRY FEE & WINNING AMOUNT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">
                  Entry Fee (₹) — Custom Input
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={newEntryFee}
                  onChange={(e) => setNewEntryFee(e.target.value)}
                  placeholder="e.g. 10, 20, 50, 100"
                  className="w-full bg-[#181e2e] border border-[#242e47] rounded-lg p-2.5 text-xs text-white font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">
                  Winning Payout (₹) — Custom Input
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={newWinningAmount}
                  onChange={(e) => setNewWinningAmount(e.target.value)}
                  placeholder="e.g. 15, 30, 80, 160"
                  className="w-full bg-[#181e2e] border border-[#242e47] rounded-lg p-2.5 text-xs text-emerald-400 font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Quick Pricing Presets */}
            <div className="flex flex-wrap items-center gap-2 p-2.5 bg-[#121624] border border-[#1e263a] rounded-xl">
              <span className="text-[11px] text-gray-400 font-bold">Quick Tiers:</span>
              {[
                { fee: '10', win: '15' },
                { fee: '20', win: '30' },
                { fee: '50', win: '80' },
                { fee: '100', win: '160' },
                { fee: '200', win: '340' },
                { fee: '500', win: '850' },
              ].map((tier) => (
                <button
                  key={tier.fee}
                  type="button"
                  onClick={() => {
                    setNewEntryFee(tier.fee);
                    setNewWinningAmount(tier.win);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                    newEntryFee === tier.fee && newWinningAmount === tier.win
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-[#181e2e] text-gray-400 border-[#242e47] hover:text-white'
                  }`}
                >
                  ₹{tier.fee} ➔ ₹{tier.win}
                </button>
              ))}
            </div>

            {/* Match Time & Initial Room Code */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">
                  Match Held Time (Date & Time)
                </label>
                <input
                  type="datetime-local"
                  value={newScheduledTime}
                  onChange={(e) => setNewScheduledTime(e.target.value)}
                  className="w-full bg-[#181e2e] border border-[#242e47] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">
                  Initial Lobby Code (Optional)
                </label>
                <input
                  type="text"
                  value={newRoomCode}
                  onChange={(e) => setNewRoomCode(e.target.value)}
                  placeholder="Leave empty or enter code"
                  className="w-full bg-[#181e2e] border border-[#242e47] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-black text-xs transition-all shadow-md shadow-cyan-500/20"
            >
              {actionLoading ? 'Creating Custom Match...' : 'Publish Match to Players'}
            </button>
          </form>
        )}

        {/* TAB 3: MANAGE SPECIFIC MATCH & PARTICIPANTS */}
        {activeTab === 'MANAGE' && selectedMatch && (
          <div className="flex-1 flex flex-col overflow-hidden space-y-4">
            <div className="p-3.5 bg-[#121624] border border-[#1e263a] rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="font-mono font-bold text-cyan-300">Match #{selectedMatch.match_code}</span>
                <span className="text-gray-400 ml-2">({selectedMatch.category} • {selectedMatch.sub_mode})</span>
              </div>
              <div className="flex items-center gap-3">
                <span>Slots: <strong className="text-white">{selectedMatch.current_players} / {selectedMatch.required_players}</strong></span>
                <span className="text-emerald-400 font-bold">Prize: ₹{selectedMatch.winning_amount}</span>
              </div>
            </div>

            <div className="p-4 bg-[#141b2c] border border-cyan-500/30 rounded-xl space-y-3">
              <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-400" />
                Publish Lobby Code & Match Held Time
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1 uppercase">
                    MLBB Custom Room ID (Lobby ID)
                  </label>
                  <input
                    type="text"
                    value={editRoomCode}
                    onChange={(e) => setEditRoomCode(e.target.value)}
                    placeholder="e.g. 324354"
                    className="w-full bg-[#101422] border border-[#232f4c] rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1 uppercase">
                    Match Held Time (Date & Time)
                  </label>
                  <input
                    type="datetime-local"
                    value={editScheduledTime}
                    onChange={(e) => setEditScheduledTime(e.target.value)}
                    className="w-full bg-[#101422] border border-[#232f4c] rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleUpdateMatchDetails}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-black text-xs transition-all shadow-md shadow-cyan-500/20"
                >
                  Save Lobby Code & Match Time
                </button>
              </div>

              <p className="text-[10px] text-gray-400">
                Once saved, all registered players will see the exact Match Time and Lobby ID on their Match History screen.
              </p>
            </div>

            {/* Registered Participants */}
            <div className="flex-1 overflow-y-auto">
              <div className="text-xs font-black uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-cyan-400" />
                Registered Players ({participants.length} / {selectedMatch.required_players})
              </div>

              {participantsLoading ? (
                <div className="py-8 text-center text-xs text-gray-400">Loading participants...</div>
              ) : participants.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500">No players have joined this match yet.</div>
              ) : (
                <div className="space-y-2">
                  {participants.map((p, idx) => (
                    <div
                      key={p.participant_id}
                      className="p-3 bg-[#121624] border border-[#1e263a] rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>#{idx + 1} {p.username}</span>
                          <span className="font-mono text-cyan-300 text-[11px]">
                            MLBB: {p.mlbb_id} ({p.server_id})
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-500">Joined: {new Date(p.registered_at).toLocaleTimeString()}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        {selectedMatch.status !== 'COMPLETED' && selectedMatch.status !== 'CANCELLED' && (
                          <button
                            type="button"
                            onClick={() => handleSettleWinner(p.user_id, p.username)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px]"
                          >
                            Declare Winner (Pay ₹{selectedMatch.winning_amount})
                          </button>
                        )}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.result === 'VICTORY' ? 'bg-emerald-500/20 text-emerald-400' :
                          p.result === 'DEFEAT' ? 'bg-red-500/20 text-red-400' :
                          'bg-gray-800 text-gray-400'
                        }`}>
                          {p.result}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cancel Match */}
            {selectedMatch.status !== 'COMPLETED' && selectedMatch.status !== 'CANCELLED' && (
              <div className="pt-2 border-t border-[#1b2234] flex justify-end">
                <button
                  type="button"
                  onClick={handleCancelMatch}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-bold text-xs"
                >
                  Cancel Match & Refund All Players
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};