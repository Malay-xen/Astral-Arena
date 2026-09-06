# Astral Arena - Esports Tournament Platform

Astral Arena is a production-grade Mobile Legends: Bang Bang (MLBB) tournament platform built with React, Node.js, PostgreSQL, and Razorpay.

## Architecture & Security Highlights

- **Strict Frontend/Backend Separation**: The frontend contains zero database queries, zero payment secret keys, and zero trusted state.
- **Role-Based Access Control**:
  - `PLAYER`: Browse tournaments, join with entry fees, view match schedules, add wallet funds.
  - `HOST`: Authorized by platform admin only; creates tournaments and records match outcomes.
  - `ADMIN`: Highest authority; upgrades players to hosts, supervises tournaments and transactions.
- **Real Wallets & Payments**: Razorpay INR integration with server-side HMAC-SHA256 signature verification and atomic database transactions.
- **Accurate Player Identification**: Player identity uses `username` (Astral Arena handle) alongside `mlbb_id` and `server_id`.
