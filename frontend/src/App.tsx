import React, { useState, useEffect } from 'react';
import { 
  Swords, 
  Trophy, 
  Wallet, 
  User as UserIcon, 
  Menu, 
  X, 
  Sparkles, 
  ChevronRight, 
  LogOut,
  ArrowDownToLine,
  History,
  Shield
} from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { AuthModal } from './components/auth/AuthModal';
import { ForgotPasswordModal } from './components/auth/ForgotPasswordModal';
import { AddMoneyModal } from './components/wallet/AddMoneyModal';
import { WithdrawModal } from './components/wallet/WithdrawModal';
import { MatchHistoryModal } from './components/history/MatchHistoryModal';
import { VsModeModal } from './components/vs/VsModeModal';
import { ProfileModal } from './components/profile/ProfileModal';
import { AdminMatchManagerModal } from './components/admin/AdminMatchManagerModal';

export const App: React.FC = () => {
  const { user, logout } = useAuth();

  // Navigation & Menu State
  const [activeTab, setActiveTab] = useState<'home' | 'arenas'>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modals State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [vsModalOpen, setVsModalOpen] = useState(false);
  const [selectedVsCategory, setSelectedVsCategory] = useState<'1v1' | '3v3' | '5v5'>('1v1');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [adminMatchModalOpen, setAdminMatchModalOpen] = useState(false);

  // Lock background scroll when drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Open VS Mode Selection
  const handleOpenVsMode = (category: '1v1' | '3v3' | '5v5') => {
    setSelectedVsCategory(category);
    setVsModalOpen(true);
  };

  const scrollToArenas = () => {
    setActiveTab('arenas');
    setMobileMenuOpen(false);
    const section = document.getElementById('battle-arenas');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const matchModes = [
    {
      category: '1v1' as const,
      title: 'Midlane King: 1v1 Mage Duel',
      subheading: 'Sanctum (Full Map) & Brawl (Single Lane)',
      description: 'Pure mechanical showdown. Choose between standard Imperial Arena macro play or fast single-lane duel rules. First blood & turret takes the crown.',
      badge: '1v1 Solo Duel',
      image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1000&auto=format&fit=crop',
      accentColor: 'border-cyan-500/30 hover:border-cyan-400',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    },
    {
      category: '3v3' as const,
      title: 'Cyber Strife: 3v3 Brawl Blitz',
      subheading: 'Bridge Battle • High Intensity Skirmish',
      description: 'Fast-paced, teamfight-heavy 3v3 arena clash. Master team synergy, instant burst combos, and lightning rotations in this high-intensity bridge battle.',
      badge: '3v3 Trio Clash',
      image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1000&auto=format&fit=crop',
      accentColor: 'border-indigo-500/30 hover:border-indigo-400',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    },
    {
      category: '5v5' as const,
      title: 'Astral Champions: 5v5 Conquest',
      subheading: 'Classic Tournament Draft • Full Squad',
      description: 'The pinnacle of 5v5 competitive MLBB. Coordinated 5-man clash with tournament pick & ban phase. Secure Lord, turtle objectives, and dominate.',
      badge: '5v5 Squad Conquest',
      image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1000&auto=format&fit=crop',
      accentColor: 'border-sky-500/30 hover:border-sky-400',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    },
  ];

  return (
    <div className="min-h-screen bg-[#07090e] text-gray-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-[#0b0e17]/90 backdrop-blur-md border-b border-[#171c2b] px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo */}
          <div
            onClick={() => {
              setActiveTab('home');
              setMobileMenuOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-3 cursor-pointer group shrink-0"
          >
            <div className="h-10 w-10 rounded-xl bg-[#0e1726] border border-cyan-500/40 flex items-center justify-center shadow-lg shadow-cyan-500/10 group-hover:border-cyan-400 transition-colors">
              <Swords className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="font-extrabold text-lg tracking-wider leading-none text-white">
                ASTRAL<span className="text-cyan-400">ARENA</span>
              </div>
              <div className="text-[9px] tracking-widest text-cyan-500/80 font-bold uppercase mt-0.5">
                MLBB Esports Platform
              </div>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'home'
                  ? 'bg-[#141b2d] text-cyan-400 border border-cyan-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-[#101422]'
              }`}
            >
              <Swords className="w-4 h-4" />
              Home
            </button>

            <button
              onClick={scrollToArenas}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'arenas'
                  ? 'bg-[#141b2d] text-cyan-400 border border-cyan-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-[#101422]'
              }`}
            >
              <Trophy className="w-4 h-4" />
              Battle Arenas
            </button>

            {user && (
              <>
                <button
                  onClick={() => setWithdrawModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-[#101422] transition-all"
                >
                  <ArrowDownToLine className="w-4 h-4 text-emerald-400" />
                  Withdraw
                </button>

                <button
                  onClick={() => setHistoryModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-[#101422] transition-all"
                >
                  <History className="w-4 h-4 text-cyan-400" />
                  History
                </button>
              </>
            )}

            {/* Admin Command Portal Button */}
            {user && user.role === 'ADMIN' && (
              <button
                onClick={() => setAdminMatchModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black tracking-wide bg-gradient-to-r from-cyan-400 to-sky-500 text-gray-950 shadow-md shadow-cyan-500/20 hover:from-cyan-300 hover:to-sky-400 transition-all ml-1"
              >
                <Shield className="w-4 h-4" />
                Match Command
              </button>
            )}
          </nav>

          {/* Desktop Right: Wallet + Profile or Sign In / Register */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <button
                  onClick={() => setAddMoneyOpen(true)}
                  className="flex items-center gap-2 bg-[#0c1322] border border-emerald-500/30 hover:border-emerald-500/60 px-3.5 py-1.5 rounded-xl transition-all shadow-inner"
                >
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400">
                    ₹{(user.walletBalance || 0).toFixed(2)}
                  </span>
                  <span className="text-emerald-400 text-xs font-extrabold ml-1 bg-emerald-500/20 w-4 h-4 rounded flex items-center justify-center">
                    +
                  </span>
                </button>

                <div
                  onClick={() => setProfileModalOpen(true)}
                  className="flex items-center gap-2.5 bg-[#0f1422] border border-[#1e2538] hover:border-cyan-500/40 cursor-pointer px-3 py-1.5 rounded-xl transition-all"
                  title="View Profile"
                >
                  <div className="text-right">
                    <div className="text-xs font-bold text-gray-200 leading-tight">
                      {user.username}
                    </div>
                    <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                      {user.role}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-sm">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                </div>

                <button
                  onClick={logout}
                  title="Logout"
                  className="text-gray-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-[#121624]"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setAuthMode('login');
                    setAuthModalOpen(true);
                  }}
                  className="px-4 py-2 text-xs font-bold text-gray-300 hover:text-white transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setAuthMode('signup');
                    setAuthModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-gray-950 shadow-md shadow-cyan-500/20 transition-all"
                >
                  Register
                </button>
              </div>
            )}
          </div>

          {/* Mobile Right Controls */}
          <div className="flex md:hidden items-center gap-2">
            {user ? (
              <button
                onClick={() => setProfileModalOpen(true)}
                className="flex items-center gap-1.5 p-1.5 bg-[#121624] border border-cyan-500/30 rounded-xl"
              >
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-400 to-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="text-[11px] font-bold text-gray-200 mr-1 max-w-[60px] truncate">
                  {user.username}
                </span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setAuthMode('login');
                  setAuthModalOpen(true);
                }}
                className="p-2 text-cyan-400 bg-[#121624] border border-cyan-500/30 hover:bg-cyan-500/10 rounded-xl transition-all"
              >
                <UserIcon className="w-4 h-4" />
              </button>
            )}

            {/* Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-gray-300 hover:text-white bg-[#121624] border border-[#1e2538] rounded-xl transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE FULL-HEIGHT RIGHT-SIDE DRAWER */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-300 ${
          mobileMenuOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
        }`}
      >
        <div
          onClick={() => setMobileMenuOpen(false)}
          className={`fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${
            mobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
        />

        <div
          className={`fixed top-0 right-0 h-full w-[80vw] bg-[#0b0e17] border-l border-[#171c2b] shadow-2xl flex flex-col justify-between z-10 transition-transform duration-300 ease-in-out transform ${
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Drawer Top */}
          <div className="p-5 border-b border-[#171c2b] flex items-center justify-between bg-[#0e121d]/80">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-[#0e1726] border border-cyan-500/40 flex items-center justify-center shadow-lg shadow-cyan-500/10">
                <Swords className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <div className="font-extrabold text-base tracking-wider leading-none text-white">
                  ASTRAL<span className="text-cyan-400">ARENA</span>
                </div>
                <div className="text-[8px] tracking-widest text-cyan-500/80 font-bold uppercase mt-0.5">
                  MLBB Esports Platform
                </div>
              </div>
            </div>

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#121624] rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-cyan-400" />
            </button>
          </div>

          {/* Drawer Navigation List */}
          <div className="p-5 flex-1 flex flex-col gap-2 overflow-y-auto">
            <button
              onClick={() => {
                setActiveTab('home');
                setMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'home'
                  ? 'bg-[#141b2d] text-cyan-400 border border-cyan-500/30'
                  : 'text-gray-300 hover:text-white hover:bg-[#101422]'
              }`}
            >
              <Swords className="w-4 h-4 text-cyan-400" />
              Home
            </button>

            <button
              onClick={scrollToArenas}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'arenas'
                  ? 'bg-[#141b2d] text-cyan-400 border border-cyan-500/30'
                  : 'text-gray-300 hover:text-white hover:bg-[#101422]'
              }`}
            >
              <Trophy className="w-4 h-4 text-cyan-400" />
              Battle Arenas
            </button>

            {/* Quick Mode Select */}
            <div className="py-2">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest px-4 font-bold block mb-1">
                Browse Matches
              </span>
              <div className="grid grid-cols-3 gap-2 px-1">
                {(['1v1', '3v3', '5v5'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleOpenVsMode(mode);
                    }}
                    className="py-2 text-center rounded-lg bg-[#141b2d] border border-cyan-500/20 text-cyan-300 font-extrabold text-xs hover:border-cyan-400"
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {user ? (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setWithdrawModalOpen(true);
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:bg-[#101422] transition-all"
                >
                  <ArrowDownToLine className="w-4 h-4 text-emerald-400" />
                  Withdraw (UPI)
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setHistoryModalOpen(true);
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:bg-[#101422] transition-all"
                >
                  <History className="w-4 h-4 text-cyan-400" />
                  Match History
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setProfileModalOpen(true);
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:bg-[#101422] transition-all"
                >
                  <UserIcon className="w-4 h-4 text-cyan-400" />
                  Profile
                </button>

                {/* Admin Button in Mobile Drawer */}
                {user.role === 'ADMIN' && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setAdminMatchModalOpen(true);
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 my-1"
                  >
                    <Shield className="w-4 h-4 text-cyan-400" />
                    Match Command (Admin)
                  </button>
                )}

                <div className="mt-auto pt-4 border-t border-[#171c2b]">
                  <button
                    onClick={logout}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-all w-full text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-auto pt-4 border-t border-[#171c2b] flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    setAuthMode('login');
                    setAuthModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-3 rounded-xl text-sm font-bold text-gray-200 bg-[#121624] border border-[#1e2538] text-center"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setAuthMode('signup');
                    setAuthModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-3 rounded-xl text-sm font-bold bg-cyan-400 text-gray-950 text-center shadow-md shadow-cyan-500/20"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* HERO SECTION */}
      <section className="relative pt-14 pb-12 px-4 text-center overflow-hidden border-b border-[#141926]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-cyan-500/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0d1322] border border-cyan-500/30 text-cyan-400 text-xs font-semibold mb-6 shadow-md shadow-cyan-500/5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Gen MLBB Match Infrastructure</span>
            <span className="text-gray-500">•</span>
            <span className="text-cyan-300">Season 2026</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight uppercase mb-4 leading-none">
            <span className="text-white">BATTLE. COMPETE. </span>
            <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
              CONQUER.
            </span>
          </h1>

          <p className="text-gray-400 text-sm sm:text-base max-w-2xl font-normal leading-relaxed">
            The all-in-one competitive platform for Mobile Legends: Bang Bang players.
            Browse hosted matches, select your entry tier, and battle for verified instant payouts.
          </p>
        </div>
      </section>

      {/* 3 MAIN MATCH CARDS */}
      <main id="battle-arenas" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-wide text-white">
              Competitive Match Arenas
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Select 1v1, 3v3, or 5v5 to browse all active matches hosted by admin.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matchModes.map((mode) => (
            <div
              key={mode.category}
              onClick={() => handleOpenVsMode(mode.category)}
              className={`bg-[#0e121d] border ${mode.accentColor} rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 shadow-xl cursor-pointer group hover:scale-[1.02]`}
            >
              <div>
                <div className="relative h-48 w-full overflow-hidden bg-gray-900">
                  <img
                    src={mode.image}
                    alt={mode.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0e121d] via-transparent to-black/60" />

                  <div className={`absolute top-3 left-3 backdrop-blur-md border text-[11px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${mode.badgeColor}`}>
                    <Swords className="w-3.5 h-3.5" />
                    {mode.badge}
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <div className="bg-black/75 backdrop-blur-md border border-emerald-500/40 text-emerald-400 font-extrabold text-xs px-2.5 py-1 rounded-lg">
                      Entry from ₹10
                    </div>
                    <div className="bg-black/75 backdrop-blur-md border border-cyan-500/40 text-cyan-300 font-extrabold text-xs px-2.5 py-1 rounded-lg">
                      Win up to ₹80
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <div className="text-[11px] text-cyan-400 font-semibold mb-1.5 flex items-center gap-1.5">
                    <span>{mode.subheading}</span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2 leading-snug group-hover:text-cyan-300 transition-colors">
                    {mode.title}
                  </h3>

                  <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed mb-4">
                    {mode.description}
                  </p>

                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-[#121624] border border-[#1d2538] rounded-xl text-center text-xs">
                    <div className="p-1">
                      <span className="text-[10px] text-gray-500 block">TIER 1</span>
                      <span className="font-bold text-gray-200">₹10 → ₹15</span>
                    </div>
                    <div className="p-1 border-x border-[#1d2538]">
                      <span className="text-[10px] text-gray-500 block">TIER 2</span>
                      <span className="font-bold text-gray-200">₹20 → ₹30</span>
                    </div>
                    <div className="p-1">
                      <span className="text-[10px] text-gray-500 block">TIER 3</span>
                      <span className="font-bold text-emerald-400">₹50 → ₹80</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5 pt-2 border-t border-[#171d2b] flex items-center justify-between">
                <span className="text-xs text-gray-400 font-medium">
                  {mode.category === '1v1' ? '2 Player Slots' : mode.category === '3v3' ? '6 Player Slots' : '10 Player Slots'}
                </span>
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 group-hover:from-cyan-300 group-hover:to-sky-400 text-gray-950 text-xs font-black transition-all shadow-md shadow-cyan-500/20 flex items-center gap-1"
                >
                  Browse Matches <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#141824] bg-[#090c14] py-8 px-4 sm:px-8 mt-12 text-xs text-gray-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[#0e1726] border border-cyan-500/40 flex items-center justify-center">
              <Swords className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-white tracking-wider">ASTRAL ARENA</div>
              <div className="text-[10px] text-gray-500">
                Competitive Match Infrastructure for MLBB
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-gray-400">
            <a href="#" className="hover:text-cyan-400 transition-colors">Fair Play Policy</a>
            <a href="#" className="hover:text-cyan-400 transition-colors">Match Rules</a>
            <a href="#" className="hover:text-cyan-400 transition-colors">Support</a>
          </div>

          <div className="text-right text-[11px] text-gray-500">
            <div>© 2026 Astral Arena Esports. All rights reserved.</div>
            <div>Official competitive MLBB match manager.</div>
          </div>
        </div>
      </footer>

      {/* CONNECTED MODALS */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authMode}
        onClose={() => setAuthModalOpen(false)}
        onForgotPasswordClick={() => setForgotModalOpen(true)}
      />

      <ForgotPasswordModal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        onBackToLogin={() => {
          setAuthMode('login');
          setAuthModalOpen(true);
        }}
      />

      <AddMoneyModal
        isOpen={addMoneyOpen}
        onClose={() => setAddMoneyOpen(false)}
      />

      <WithdrawModal
        isOpen={withdrawModalOpen}
        onClose={() => setWithdrawModalOpen(false)}
      />

      <MatchHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
      />

      <VsModeModal
        isOpen={vsModalOpen}
        initialCategory={selectedVsCategory}
        onClose={() => setVsModalOpen(false)}
        onOpenAddMoney={() => setAddMoneyOpen(true)}
        onOpenHistory={() => setHistoryModalOpen(true)}
      />

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onOpenAddMoney={() => setAddMoneyOpen(true)}
      />

      {/* Admin Match Management Modal */}
      <AdminMatchManagerModal
        isOpen={adminMatchModalOpen}
        onClose={() => setAdminMatchModalOpen(false)}
      />
    </div>
  );
};