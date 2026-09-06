import bcrypt from 'bcrypt';
import { pool } from '../config/db';

async function seedAdmin() {
  const email = process.argv[2];
  const password = process.argv[3];
  const username = process.argv[4] || 'AstralAdmin';
  const mlbbId = process.argv[5] || '1000000001';
  const serverId = process.argv[6] || '1001';

  if (!email || !password) {
    console.error('Usage: npm run seed:admin <email> <password> [username] [mlbbId] [serverId]');
    process.exit(1);
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      await pool.query("UPDATE users SET role = 'ADMIN' WHERE id = $1", [existing.rows[0].id]);
      console.log(`User ${email} has been promoted to ADMIN successfully.`);
    } else {
      const hash = await bcrypt.hash(password, 12);
      await pool.query(
        `INSERT INTO users (email, username, mlbb_id, server_id, password_hash, role)
         VALUES ($1, $2, $3, $4, $5, 'ADMIN')`,
        [email.toLowerCase().trim(), username.trim(), mlbbId.trim(), serverId.trim(), hash]
      );
      console.log(`Initial ADMIN user created successfully for ${email}.`);
    }
  } catch (err) {
    console.error('Seed Admin error:', err);
  } finally {
    await pool.end();
  }
}

seedAdmin();