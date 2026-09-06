import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../config/db';

const MIN_WITHDRAWAL_INR = 10;

export const getWallet = async (req: AuthRequest, res: Response) => {
  try {
    const walletRes = await pool.query(
      'SELECT id, balance, updated_at FROM wallets WHERE user_id = $1',
      [req.user!.id]
    );

    if (walletRes.rows.length === 0) {
      return res.status(404).json({ error: 'Wallet record not found' });
    }

    const txRes = await pool.query(
      `SELECT id, type, amount, balance_after, reference_id, description, status, created_at
       FROM wallet_transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user!.id]
    );

    return res.json({
      balance: parseFloat(walletRes.rows[0].balance),
      transactions: txRes.rows.map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: parseFloat(tx.amount),
        balance_after: parseFloat(tx.balance_after),
        reference_id: tx.reference_id,
        description: tx.description,
        status: tx.status,
        created_at: tx.created_at,
      })),
    });
  } catch (err) {
    console.error('Wallet error:', err);
    return res.status(500).json({ error: 'Failed to retrieve wallet information' });
  }
};

export const requestWithdrawal = async (req: AuthRequest, res: Response) => {
  const { amount, upiId } = req.body;
  const userId = req.user!.id;

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount < MIN_WITHDRAWAL_INR) {
    return res.status(400).json({
      error: `Minimum withdrawal amount is ₹${MIN_WITHDRAWAL_INR}.`,
    });
  }

  const upiRegex = /^[a-zA-Z0-9.\-_]{2,49}@[a-zA-Z0-9]{2,49}$/;
  if (!upiId || !upiRegex.test(upiId.trim())) {
    return res.status(400).json({
      error: 'Please enter a valid UPI ID (e.g. yourname@upi or mobile@paytm).',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const walletRes = await client.query(
      'SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE',
      [userId]
    );

    if (walletRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Wallet not found.' });
    }

    const currentBalance = parseFloat(walletRes.rows[0].balance);
    if (parsedAmount > currentBalance) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Insufficient withdrawable balance. Available: ₹${currentBalance.toFixed(2)}, Requested: ₹${parsedAmount}.`,
      });
    }

    const updatedBalance = currentBalance - parsedAmount;
    await client.query(
      'UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2',
      [updatedBalance, walletRes.rows[0].id]
    );

    const withdrawalRes = await client.query(
      `INSERT INTO withdrawals (user_id, amount, upi_id, status)
       VALUES ($1, $2, $3, 'PENDING')
       RETURNING id, amount, upi_id, status, created_at`,
      [userId, parsedAmount, upiId.trim()]
    );

    const withdrawal = withdrawalRes.rows[0];

    await client.query(
      `INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, balance_after, reference_id, description, status)
       VALUES ($1, $2, 'WITHDRAWAL', $3, $4, $5, 'Withdrawal request to UPI', 'PENDING')`,
      [walletRes.rows[0].id, userId, parsedAmount, updatedBalance, withdrawal.id]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Withdrawal request submitted successfully. Your money will be processed and added to your UPI account within 24–48 hours.',
      withdrawal: {
        id: withdrawal.id,
        amount: parseFloat(withdrawal.amount),
        upiId: withdrawal.upi_id,
        status: withdrawal.status,
        createdAt: withdrawal.created_at,
      },
      newBalance: updatedBalance,
    });
  } catch (err: unknown) {
    await client.query('ROLLBACK');
    console.error('Withdrawal error:', err);
    return res.status(500).json({ error: 'Failed to process withdrawal request. Please try again later.' });
  } finally {
    client.release();
  }
};

export const getWithdrawalHistory = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  try {
    const result = await pool.query(
      `SELECT id, amount, upi_id, status, reference_id, created_at, processed_at
       FROM withdrawals
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 30`,
      [userId]
    );

    return res.json(
      result.rows.map((row) => ({
        id: row.id,
        amount: parseFloat(row.amount),
        upiId: row.upi_id,
        status: row.status,
        referenceId: row.reference_id,
        createdAt: row.created_at,
        processedAt: row.processed_at,
      }))
    );
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve withdrawal records.' });
  }
};