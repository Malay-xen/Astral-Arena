import React, { useState } from 'react';
import { X, IndianRupee, ShieldCheck, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface AddMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const AddMoneyModal: React.FC<AddMoneyModalProps> = ({ isOpen, onClose }) => {
  const { user, refreshUserData } = useAuth();
  const [amount, setAmount] = useState('100');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePayment = async () => {
    setError(null);
    setLoading(true);

    try {
      const orderRes = await api.post('/wallet/create-order', { amount: parseFloat(amount) });
      const { orderId, amount: amountPaise, currency, keyId } = orderRes.data;

      const options = {
        key: keyId,
        amount: amountPaise,
        currency,
        name: 'Astral Arena',
        description: 'Wallet Balance Top-Up',
        order_id: orderId,
        prefill: {
          name: user?.username,
          email: user?.email,
          contact: '9999999999', // Recommended for UPI flows
        },
        // ONLY SHOW UPI (QR Code & Apps) and CARD; HIDE NETBANKING & WALLETS
        config: {
          display: {
            blocks: {
              custom_methods: {
                name: 'Pay via UPI or Card',
                instruments: [
                  { method: 'upi' },
                  { method: 'card' },
                ],
              },
            },
            sequence: ['block.custom_methods'],
            preferences: {
              show_default_blocks: false,
            },
          },
        },
        theme: {
          color: '#06b6d4', // Astral Arena cyan theme
        },
        handler: async (response: any) => {
          try {
            await api.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            await refreshUserData();
            onClose();
          } catch (verifyErr: any) {
            setError(verifyErr.response?.data?.error || 'Payment signature verification failed on server');
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to initiate Razorpay payment checkout');
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

        <h2 className="text-xl font-bold mb-2">Add Money to Wallet</h2>
        <p className="text-sm text-gray-400 mb-6">Enter the amount to deposit in Indian Rupees (INR).</p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Amount (₹)
          </label>
          <div className="relative">
            <IndianRupee className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
            <input
              type="number"
              min="10"
              max="50000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-[#1b1f2b] border border-[#2c3245] rounded-lg py-2.5 pl-10 pr-3 text-lg font-medium text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {['50', '100', '250', '500'].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setAmount(val)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md border transition-all ${
                amount === val
                  ? 'bg-cyan-600/30 border-cyan-500 text-cyan-300'
                  : 'bg-[#1b1f2b] border-[#2c3245] text-gray-400 hover:text-white'
              }`}
            >
              ₹{val}
            </button>
          ))}
        </div>

        <button
          onClick={handlePayment}
          disabled={loading || !amount || parseFloat(amount) < 10}
          className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-gray-950 font-bold text-sm transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <ShieldCheck className="w-4 h-4" />
          {loading ? 'Opening Gateway...' : `Proceed to Pay ₹${amount}`}
        </button>
      </div>
    </div>
  );
};