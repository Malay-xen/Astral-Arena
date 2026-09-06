import React, { useState, useEffect } from 'react';
import { X, Trophy, Calendar, Clock } from 'lucide-react';
import api from '../../services/api';
import { PlayerStats, PlayerMatchHistoryItem } from '../../types';

interface MatchHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MatchHistoryModal: React.FC<MatchHistoryModalProps> = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState<PlayerStats>({ matchesPlayed: 0, matchesWon: 0, winRate: 0 });
  const [matches, setMatches] = useState<PlayerMatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api
        .get('/vs-matches/history')
        .then((res) => {
          setStats(res.data.statistics);
          setMatches(res.data.matches);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Separate active/queued matches from finished matches
  const activeMatches = matches.filter((m) => m.result === 'PENDING');
  const finishedMatches = matches.filter((m) => m.result !== 'PENDING');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-[#0e121d] border border-[#1b2234] rounded-2xl p-6 shadow-2xl text-white">
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X className="w-5 h-5 text-cyan-400" />
        </button>

        <div className="flex items-center gap-2 mb-1 text-cyan-400">
          <Trophy className="w-5 h-5" />
          <h2 className="text-xl font-black text-white">Player Match History</h2>
        </div>
        <p className="text-xs text-gray-400 mb-5">
          View your active queued matches, match times, lobby IDs, and battle outcomes.
        </p>

        {/* Live Automatic Statistics */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-3 bg-[#121624] border border-[#1e263a] rounded-xl text-center">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block mb-1">
              Matches Played
            </span>
            <span className="text-2xl font-black text-white">{stats.matchesPlayed}</span>
          </div>

          <div className="p-3 bg-[#121624] border border-[#1e263a] rounded-xl text-center">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block mb-1">
              Matches Won
            </span>
            <span className="text-2xl font-black text-emerald-400">{stats.matchesWon}</span>
          </div>

          <div className="p-3 bg-[#121624] border border-[#1e263a] rounded-xl text-center">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block mb-1">
              Win Rate
            </span>
            <span className="text-2xl font-black text-cyan-400">{stats.winRate}%</span>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-gray-400">Loading your battle records...</div>
        ) : (
          <div className="space-y-5 max-h-80 overflow-y-auto pr-1">
            {/* 1. ACTIVE / JOINED MATCHES SECTION */}
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-cyan-400 mb-2.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 animate-pulse" />
                Active & Queued Matches ({activeMatches.length})
              </div>

              {activeMatches.length === 0 ? (
                <div className="p-3.5 bg-[#121624]/60 border border-[#1b2234] rounded-xl text-xs text-gray-500 text-center">
                  No active matches right now. Join a 1v1, 3v3, or 5v5 queue to battle!
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeMatches.map((m) => (
                    <div
                      key={m.id}
                      className="p-4 bg-[#121726] border border-cyan-500/30 rounded-xl space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-cyan-300 bg-cyan-500/20 border border-cyan-500/40 px-2 py-0.5 rounded">
                            {m.category}
                          </span>
                          <span className="text-xs font-bold text-white">{m.subMode}</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          {m.currentPlayers} / {m.requiredPlayers} Slots Filled
                        </span>
                      </div>

                      {/* 3-COLUMN BAR: LOBBY ID + MATCH HELD TIME + ENTRY/WIN */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1.5 border-t border-[#1a2338]">
                        {/* Column 1: Lobby ID */}
                        <div>
                          <span className="text-gray-500 block text-[10px] uppercase">Lobby ID</span>
                          <span className="font-bold text-cyan-300 font-mono text-sm">
                            {m.roomCode ? m.roomCode : 'Pending'}
                          </span>
                        </div>

                        {/* Column 2: Match Held Time (NOW PROMINENTLY DISPLAYED) */}
                        <div>
                          <span className="text-gray-500 block text-[10px] uppercase flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-amber-400" /> Match Held Time
                          </span>
                          <span className="font-bold text-amber-300 text-xs">
                            {m.scheduledTime
                              ? new Date(m.scheduledTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                              : 'Time: Coming Soon'}
                          </span>
                        </div>

                        {/* Column 3: Entry & Win */}
                        <div className="sm:text-right">
                          <span className="text-gray-500 block text-[10px] uppercase">Entry / Win</span>
                          <span className="font-bold text-emerald-400 text-xs">
                            ₹{m.entryFee} ➔ Win ₹{m.winningAmount}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
                        <span>Account: {m.mlbbId} ({m.serverId})</span>
                        <span className="text-cyan-400 font-semibold">
                          {m.currentPlayers >= m.requiredPlayers ? 'Slots Full • Ready' : 'Waiting for other players to join'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. COMPLETED MATCHES SECTION */}
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-gray-400 mb-2.5">
                Past Completed Matches ({finishedMatches.length})
              </div>

              {finishedMatches.length === 0 ? (
                <div className="p-3.5 bg-[#121624]/60 border border-[#1b2234] rounded-xl text-xs text-gray-500 text-center">
                  No finished matches yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {finishedMatches.map((m) => (
                    <div
                      key={m.id}
                      className="p-3.5 bg-[#121624] border border-[#1e263a] rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-white">{m.category} • {m.subMode}</span>
                        </div>
                        <div className="text-[11px] text-gray-400">
                          Entry: ₹{m.entryFee} • Win: ₹{m.winningAmount}
                        </div>
                        <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(m.registeredAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider ${
                          m.result === 'VICTORY'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {m.result}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};