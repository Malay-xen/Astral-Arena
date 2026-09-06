-- Enums for VS Match System & Withdrawals
DO $$ BEGIN
    CREATE TYPE vs_category AS ENUM ('1v1', '3v3', '5v5');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE match_lobby_status AS ENUM ('WAITING_FOR_PLAYERS', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE player_match_result AS ENUM ('PENDING', 'VICTORY', 'DEFEAT', 'DRAW', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE withdrawal_status AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update tx_type enum with WITHDRAWAL if not present
DO $$ BEGIN
    ALTER TYPE tx_type ADD VALUE IF NOT EXISTS 'WITHDRAWAL';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. VS MATCHES TABLE
CREATE TABLE IF NOT EXISTS vs_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_code VARCHAR(30) UNIQUE NOT NULL,
    category vs_category NOT NULL,
    sub_mode VARCHAR(100) NOT NULL,
    entry_fee NUMERIC(10, 2) NOT NULL CHECK (entry_fee >= 0),
    winning_amount NUMERIC(10, 2) NOT NULL CHECK (winning_amount >= 0),
    required_players INTEGER NOT NULL,
    current_players INTEGER DEFAULT 0 NOT NULL,
    status match_lobby_status DEFAULT 'WAITING_FOR_PLAYERS' NOT NULL,
    scheduled_time TIMESTAMP WITH TIME ZONE,
    room_code VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vs_matches_category ON vs_matches(category, status);

-- 2. VS MATCH PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS vs_match_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES vs_matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mlbb_id VARCHAR(30) NOT NULL,
    server_id VARCHAR(10) NOT NULL,
    team_slot INTEGER DEFAULT 1 NOT NULL,
    result player_match_result DEFAULT 'PENDING' NOT NULL,
    payout_amount NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    transaction_id UUID REFERENCES wallet_transactions(id),
    UNIQUE (match_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_vs_participants_user ON vs_match_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_vs_participants_match ON vs_match_participants(match_id);

-- 3. WITHDRAWALS TABLE
CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 20),
    upi_id VARCHAR(100) NOT NULL,
    status withdrawal_status DEFAULT 'PENDING' NOT NULL,
    reference_id VARCHAR(255),
    admin_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);