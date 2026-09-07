import React, { useState, useEffect } from 'react';
import { X, Wallet, ArrowDownToLine, AlertCircle, CheckCircle2, History, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { WithdrawalRecord } from '../../types';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({ isOpen, onClose }) => {
  const { user, refreshUserData } = useAuth();

  const [activeTab, setActiveTab] = useState<'REQUEST' | 'HISTORY'>('REQUEST');
  const [upiId, setUpiId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [records, setRecords] = useState<WithdrawalRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const currentBalance = user?.walletBalance || 0;

  const fetchHistory = async () => {
    setRecordsLoading(true);
    try {
      const res = await api.get('/wallet/withdrawals');
      setRecords(res.data);
    } catch {
      // Non-blocking
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMessage(null);
      setAmount('');
      if (activeTab === 'HISTORY') fetchHistory();
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed < 10) {
      setError('Minimum withdrawal amount is ₹10.');
      return;
    }

    if (parsed > currentBalance) {
      setError(`Cannot withdraw more than your available balance of ₹${currentBalance.toFixed(2)}.`);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/wallet/withdraw', {
        amount: parsed,
        upiId: upiId.trim(),
      });

      await refreshUserData();
      setSuccessMessage(res.data.message);
      setAmount('');
      setUpiId('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit withdrawal request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#0e121d] border border-[#1b2234] rounded-2xl p-6 shadow-2xl text-white">
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X className="w-5 h-5 text-cyan-400" />
        </button>

        {/* Tab switch */}
        <div className="flex items-center gap-2 mb-6 border-b border-[#1b2234] pb-3">
          <button
            onClick={() => setActiveTab('REQUEST')}
            className={`flex items-center gap-1.5 text-xs font-bold pb-1 transition-all ${
              activeTab === 'REQUEST'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ArrowDownToLine className="w-4 h-4" /> Withdraw Funds
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`flex items-center gap-1.5 text-xs font-bold pb-1 transition-all ml-4 ${
              activeTab === 'HISTORY'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" /> Withdrawal History
          </button>
        </div>

        {activeTab === 'REQUEST' ? (
          <div>
            <h2 className="text-xl font-black mb-1">UPI Withdrawal</h2>
            <p className="text-xs text-gray-400 mb-5">
              Withdraw your tournament earnings directly to your verified UPI VPA.
            </p>

            {/* Withdrawable Balance Card */}
            <div className="p-4 rounded-xl bg-[#121624] border border-[#1e263a] mb-5">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                <Wallet className="w-3 h-3 text-emerald-400" /> Withdrawable Balance
              </span>
              <span className="text-2xl font-black text-white">
                ₹{currentBalance.toFixed(2)}
              </span>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4" /> Withdrawal request submitted!
                </div>
                <div className="text-[11px] text-emerald-300/90 leading-relaxed">
                  Your money will be processed and added to your UPI account within 24–48 hours.
                </div>
              </div>
            )}

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                  UPI ID (VPA)
                </label>
                <input
                  type="text"
                  required
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. yourname@okhdfcbank or 9876543210@paytm"
                  className="w-full bg-[#161c2c] border border-[#232c44] rounded-lg py-2.5 px-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                  Withdrawal Amount (₹)
                </label>
                <input
                  type="number"
                  min="10"
                  max={currentBalance}
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Minimum ₹10"
                  className="w-full bg-[#161c2c] border border-[#232c44] rounded-lg py-2.5 px-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Quick Select Buttons */}
              <div className="flex gap-2">
                {['10', '50', '100'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val)}
                    className="flex-1 py-1.5 text-xs font-bold rounded-lg border border-[#232c44] bg-[#121624] text-gray-300 hover:text-white hover:border-cyan-500/40 transition-all"
                  >
                    ₹{val}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAmount(Math.floor(currentBalance).toString())}
                  className="flex-1 py-1.5 text-xs font-bold rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-all"
                >
                  Max
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || currentBalance < 10}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-gray-950 font-black text-sm transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {loading ? 'Submitting Request...' : 'Withdraw Funds to UPI'}
              </button>
            </form>
          </div>
        ) : (
          /* WITHDRAWAL HISTORY TAB */
          <div>
            <h2 className="text-xl font-black mb-1">Withdrawal Records</h2>
            <p className="text-xs text-gray-400 mb-4">
              Real-time audit status of your payout requests.
            </p>

            {recordsLoading ? (
              <div className="py-8 text-center text-xs text-gray-400">Loading payout records...</div>
            ) : records.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500">No withdrawal requests found.</div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {records.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 bg-[#121624] border border-[#1e263a] rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">₹{r.amount.toFixed(2)}</div>
                      <div className="text-[11px] text-gray-500">{r.upiId}</div>
                      <div className="text-[10px] text-gray-600 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(r.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        r.status === 'SUCCESS'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : r.status === 'REJECTED' || r.status === 'FAILED'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};