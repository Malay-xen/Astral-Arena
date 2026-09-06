import { Request, Response } from 'express';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../config/db';
import { razorpay } from '../config/razorpay';

export const createOrder = async (req: AuthRequest, res: Response) => {
  const { amount } = req.body;
  const parsedAmount = parseFloat(amount);

  if (isNaN(parsedAmount) || parsedAmount < 10) {
    return res.status(400).json({ error: 'Minimum deposit amount is ₹10' });
  }

  if (parsedAmount > 50000) {
    return res.status(400).json({ error: 'Maximum deposit amount is ₹50,000 per transaction' });
  }

  try {
    const options = {
      amount: Math.round(parsedAmount * 100), // Razorpay operates in paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}_${req.user!.id.slice(0, 8)}`,
      notes: {
        userId: req.user!.id,
        username: req.user!.username,
      },
    };

    const order = await razorpay.orders.create(options);

    await pool.query(
      `INSERT INTO payments (user_id, razorpay_order_id, amount_inr, status)
       VALUES ($1, $2, $3, 'CREATED')`,
      [req.user!.id, order.id, parsedAmount]
    );

    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('Razorpay order creation error:', err);
    return res.status(500).json({ error: 'Could not create payment order' });
  }
};

export const verifyPayment = async (req: AuthRequest, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment signature verification parameters' });
  }

  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (generatedSignature !== razorpay_signature) {
    return res.status(400).json({ error: 'Invalid payment signature. Verification rejected.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const payRes = await client.query(
      'SELECT id, user_id, amount_inr, status FROM payments WHERE razorpay_order_id = $1 FOR UPDATE',
      [razorpay_order_id]
    );

    if (payRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Payment order record not found' });
    }

    const payment = payRes.rows[0];

    // Idempotency check: Already credited
    if (payment.status === 'PAID') {
      await client.query('COMMIT');
      return res.json({ success: true, message: 'Payment already verified and credited' });
    }

    if (payment.user_id !== req.user!.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Payment record user mismatch' });
    }

    await client.query(
      `UPDATE payments 
       SET razorpay_payment_id = $1, razorpay_signature = $2, status = 'PAID', updated_at = NOW()
       WHERE id = $3`,
      [razorpay_payment_id, razorpay_signature, payment.id]
    );

    const walletRes = await client.query(
      `UPDATE wallets
       SET balance = balance + $1, updated_at = NOW()
       WHERE user_id = $2
       RETURNING id, balance`,
      [payment.amount_inr, payment.user_id]
    );

    const updatedWallet = walletRes.rows[0];

    await client.query(
      `INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, balance_after, reference_id, description, status)
       VALUES ($1, $2, 'DEPOSIT', $3, $4, $5, 'Deposit via Razorpay', 'SUCCESS')`,
      [updatedWallet.id, payment.user_id, payment.amount_inr, updatedWallet.balance, razorpay_payment_id]
    );

    await client.query('COMMIT');
    return res.json({
      success: true,
      message: 'Payment verified and wallet credited successfully',
      newBalance: parseFloat(updatedWallet.balance),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Payment verification error:', err);
    return res.status(500).json({ error: 'Server error during payment verification' });
  } finally {
    client.release();
  }
};

export const handleWebhook = async (req: Request, res: Response) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return res.status(500).json({ error: 'Webhook secret is not configured' });
  }

  const signature = req.headers['x-razorpay-signature'] as string;
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  const event = req.body.event;

  if (event === 'payment.captured' || event === 'order.paid') {
    const paymentEntity = req.body.payload.payment.entity;
    const orderId = paymentEntity.order_id;
    const paymentId = paymentEntity.id;
    const amountInr = paymentEntity.amount / 100;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const payRes = await client.query(
        'SELECT id, user_id, status FROM payments WHERE razorpay_order_id = $1 FOR UPDATE',
        [orderId]
      );

      if (payRes.rows.length > 0 && payRes.rows[0].status !== 'PAID') {
        const payment = payRes.rows[0];

        await client.query(
          `UPDATE payments SET razorpay_payment_id = $1, status = 'PAID', updated_at = NOW() WHERE id = $2`,
          [paymentId, payment.id]
        );

        const walletRes = await client.query(
          `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2 RETURNING id, balance`,
          [amountInr, payment.user_id]
        );

        const updatedWallet = walletRes.rows[0];

        await client.query(
          `INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, balance_after, reference_id, description, status)
           VALUES ($1, $2, 'DEPOSIT', $3, $4, $5, 'Webhook Deposit via Razorpay', 'SUCCESS')`,
          [updatedWallet.id, payment.user_id, amountInr, updatedWallet.balance, paymentId]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Webhook execution failure:', err);
    } finally {
      client.release();
    }
  }

  return res.json({ status: 'ok' });
};