export type UserRole = 'PLAYER' | 'HOST' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  username: string;
  mlbbId: string;
  serverId: string;
  role: UserRole;
  walletBalance?: number;
}

export interface Tournament {
  id: string;
  title: string;
  game: string;
  entryFee: number;
  prizePool: number;
  maxTeams: number;
  currentTeams: number;
  teamSize: number;
  status: 'UPCOMING' | 'REGISTRATION_OPEN' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  rules?: string;
  startDate: string;
  hostUsername: string;
}

export interface WalletTransaction {
  id: string;
  type: 'DEPOSIT' | 'ENTRY_FEE' | 'PRIZE_PAYOUT' | 'REFUND' | 'WITHDRAWAL';
  amount: number;
  balance_after: number;
  reference_id: string;
  description: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  created_at: string;
}

export interface WithdrawalRecord {
  id: string;
  amount: number;
  upiId: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REJECTED';
  referenceId?: string;
  createdAt: string;
  processedAt?: string;
}

export interface PlayerStats {
  matchesPlayed: number;
  matchesWon: number;
  winRate: number;
}

export interface PlayerMatchHistoryItem {
  id: string;
  matchCode: string;
  category: '1v1' | '3v3' | '5v5';
  subMode: string;
  entryFee: number;
  winningAmount: number;
  currentPlayers: number;
  requiredPlayers: number;
  roomCode?: string | null;
  matchStatus: string;
  scheduledTime?: string;
  result: 'PENDING' | 'VICTORY' | 'DEFEAT' | 'DRAW' | 'CANCELLED';
  payoutAmount: number;
  registeredAt: string;
  mlbbId?: string;
  serverId?: string;
}

export interface VsMatchListing {
  id: string;
  matchCode: string;
  category: '1v1' | '3v3' | '5v5';
  subMode: string;
  entryFee: number;
  winningAmount: number;
  requiredPlayers: number;
  currentPlayers: number;
  remainingSlots: number;
  status: 'WAITING_FOR_PLAYERS' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduledTime?: string | null;
  isJoined?: boolean;
  roomCode?: string | null;
  createdAt: string;
}

export interface AdminMatchParticipant {
  participant_id: string;
  user_id: string;
  username: string;
  email: string;
  mlbb_id: string;
  server_id: string;
  team_slot: number;
  result: string;
  payout_amount: string;
  registered_at: string;
}