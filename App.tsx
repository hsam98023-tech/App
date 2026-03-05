import { useState, useEffect, useRef, useCallback } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import {
  ref,
  push,
  set,
  update,
  remove,
  onValue,
  query,
  orderByChild,
  limitToLast,
  serverTimestamp,
  onDisconnect
} from 'firebase/database';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { auth, db } from './firebase';
import app from './firebase';
import {
  Send,
  Trash2,
  Pencil,
  Check,
  X,
  LogOut,
  MessageCircle,
  Users,
  Settings,
  Shield,
  Crown,
  Eye,
  EyeOff,
  Reply,
  Loader2,
  Bell,
  Palette,
  User as UserIcon,
  ArrowRight,
  Mail,
  ChevronLeft
} from 'lucide-react';

// ═══════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════
interface UserProfile {
  name: string;
  role: string;
  bio: string;
  photoURL: string;
  fcmToken?: string;
  theme?: string;
  online?: boolean;
  lastSeen?: number;
}

interface ChatMessage {
  id: string;
  uid: string;
  name: string;
  role: string;
  photoURL: string;
  text: string;
  timestamp: number;
  replyTo: null | { msgId: string; text: string; name: string };
  edited: boolean;
}

interface Toast {
  id: string;
  title: string;
  body: string;
}

// ═══════════════════════════════════════════
//  THEMES — ACCENT COLORS
// ═══════════════════════════════════════════
const ACCENT_THEMES = [
  { id: 'indigo', name: 'نيون بنفسجي', emoji: '💜', rgb: '99 102 241', hex: '#6366f1', gradient: 'linear-gradient(135deg, #6366f1, #818cf8)' },
  { id: 'violet', name: 'أرجواني', emoji: '🔮', rgb: '139 92 246', hex: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' },
  { id: 'rose', name: 'وردي', emoji: '🌸', rgb: '244 63 94', hex: '#f43f5e', gradient: 'linear-gradient(135deg, #f43f5e, #fb7185)' },
  { id: 'red', name: 'أحمر ناري', emoji: '🔥', rgb: '239 68 68', hex: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #f87171)' },
  { id: 'amber', name: 'ذهبي', emoji: '⚡', rgb: '245 158 11', hex: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)' },
  { id: 'emerald', name: 'زمردي', emoji: '💚', rgb: '16 185 129', hex: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #34d399)' },
  { id: 'cyan', name: 'سماوي', emoji: '🧊', rgb: '6 182 212', hex: '#06b6d4', gradient: 'linear-gradient(135deg, #06b6d4, #22d3ee)' },
  { id: 'blue', name: 'أزرق', emoji: '💎', rgb: '59 130 246', hex: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #60a5fa)' },
  { id: 'fuchsia', name: 'فوشيا', emoji: '🩷', rgb: '217 70 239', hex: '#d946ef', gradient: 'linear-gradient(135deg, #d946ef, #e879f9)' },
  { id: 'orange', name: 'برتقالي', emoji: '🍊', rgb: '249 115 22', hex: '#f97316', gradient: 'linear-gradient(135deg, #f97316, #fb923c)' },
  { id: 'lime', name: 'ليموني', emoji: '🍀', rgb: '132 204 22', hex: '#84cc16', gradient: 'linear-gradient(135deg, #84cc16, #a3e635)' },
  { id: 'sky', name: 'سماء', emoji: '🌤️', rgb: '14 165 233', hex: '#0ea5e9', gradient: 'linear-gradient(135deg, #0ea5e9, #38bdf8)' },
];

// ═══════════════════════════════════════════
//  THEMES — BACKGROUND MODES
// ═══════════════════════════════════════════
const BG_THEMES = [
  { id: 'oled', name: 'OLED أسود', emoji: '🖤', primary: '#050505', secondary: '#0a0a0a', card: 'rgba(255,255,255,0.03)', cardStrong: 'rgba(255,255,255,0.06)' },
  { id: 'dark', name: 'رمادي غامق', emoji: '🌑', primary: '#111111', secondary: '#1a1a1a', card: 'rgba(255,255,255,0.04)', cardStrong: 'rgba(255,255,255,0.07)' },
  { id: 'midnight', name: 'أزرق داكن', emoji: '🌌', primary: '#0a0e1a', secondary: '#111827', card: 'rgba(255,255,255,0.04)', cardStrong: 'rgba(255,255,255,0.07)' },
  { id: 'void', name: 'فضاء بنفسجي', emoji: '🌃', primary: '#0c0a14', secondary: '#13101f', card: 'rgba(255,255,255,0.04)', cardStrong: 'rgba(255,255,255,0.07)' },
  { id: 'forest', name: 'غابة مظلمة', emoji: '🌲', primary: '#060d08', secondary: '#0c1a10', card: 'rgba(255,255,255,0.04)', cardStrong: 'rgba(255,255,255,0.07)' },
];

interface ThemeSettings {
  accent: string;
  bg: string;
}

function applyTheme(settings: ThemeSettings) {
  const accent = ACCENT_THEMES.find(x => x.id === settings.accent) || ACCENT_THEMES[0];
  const bg = BG_THEMES.find(x => x.id === settings.bg) || BG_THEMES[0];
  document.documentElement.style.setProperty('--accent', accent.rgb);
  document.documentElement.style.setProperty('--accent-hex', accent.hex);
  document.documentElement.style.setProperty('--bg-primary', bg.primary);
  document.documentElement.style.setProperty('--bg-secondary', bg.secondary);
  document.documentElement.style.setProperty('--bg-card', bg.card);
  document.documentElement.style.setProperty('--bg-card-strong', bg.cardStrong);
}

// ═══════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════
function getAvatarURL(name: string, photo?: string) {
  if (photo && photo.length > 5) return photo;
  const accent = ACCENT_THEMES.find(t => t.id === (localStorage.getItem('dn-accent') || 'indigo'));
  const bgColor = (accent?.hex || '#6366f1').replace('#', '');
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=${bgColor}&color=fff&bold=true&size=128`;
}

function formatTime(ts: number) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

function roleBadge(role: string) {
  if (role === 'Admin') return { icon: Crown, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/30' };
  if (role === 'Co-Leader') return { icon: Shield, color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/30' };
  return { icon: UserIcon, color: 'text-gray-400', bg: 'bg-gray-400/10 border-gray-400/30' };
}

function getCombinedID(uid1: string, uid2: string): string {
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}

function getLastSeenText(lastSeen?: number, online?: boolean): string {
  if (online) return 'متصل الآن';
  if (!lastSeen) return 'غير متصل';
  const diff = Date.now() - lastSeen;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'شوهد منذ لحظات';
  if (mins < 60) return `شوهد منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `شوهد منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `شوهد منذ ${days} يوم`;
}

// ═══════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════
export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [authError, setAuthError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);

  // User profile
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Navigation
  const [tab, setTab] = useState<'chat' | 'clan' | 'settings'>('chat');

  // Global Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [msgText, setMsgText] = useState('');
  const [replyTo, setReplyTo] = useState<{ msgId: string; text: string; name: string } | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Private Chat state
  const [privateChatUser, setPrivateChatUser] = useState<{ uid: string; profile: UserProfile } | null>(null);
  const [privateMessages, setPrivateMessages] = useState<ChatMessage[]>([]);
  const [privateMsgText, setPrivateMsgText] = useState('');
  const [privateReplyTo, setPrivateReplyTo] = useState<{ msgId: string; text: string; name: string } | null>(null);
  const [privateEditId, setPrivateEditId] = useState<string | null>(null);
  const privateChatEndRef = useRef<HTMLDivElement>(null);
  const privateInputRef = useRef<HTMLInputElement>(null);

  // Clan
  const [members, setMembers] = useState<Record<string, UserProfile>>({});

  // Settings / Theme
  const [settingsName, setSettingsName] = useState('');
  const [settingsBio, setSettingsBio] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentAccent, setCurrentAccent] = useState('indigo');
  const [currentBg, setCurrentBg] = useState('oled');
  const [themeSection, setThemeSection] = useState<'accent' | 'bg'>('accent');

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback((title: string, body: string) => {
    const id = Date.now().toString();
    setToasts(p => [...p, { id, title, body }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  // ─── AUTH LISTENER ───
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // ─── LOAD PROFILE + THEME + UPDATE USER INFO ON EVERY LOGIN ───
  useEffect(() => {
    if (!user) { setProfile(null); return; }
    const uRef = ref(db, `users/${user.uid}`);
    const unsub = onValue(uRef, (snap) => {
      if (snap.exists()) {
        const p = snap.val() as UserProfile;
        setProfile(p);
        setSettingsName(p.name || '');
        setSettingsBio(p.bio || '');
        if (p.theme) {
          try {
            const parsed = typeof p.theme === 'string' ? JSON.parse(p.theme) : p.theme;
            if (parsed.accent) setCurrentAccent(parsed.accent);
            if (parsed.bg) setCurrentBg(parsed.bg);
            applyTheme(parsed);
          } catch {
            setCurrentAccent(p.theme as string);
            applyTheme({ accent: p.theme as string, bg: 'oled' });
          }
        }
      } else {
        // First time — create profile node
        const newProfile: UserProfile = {
          name: user.displayName || 'مستخدم',
          role: 'Member',
          bio: 'عضو جديد في DN CLAN',
          photoURL: user.photoURL || '',
        };
        set(uRef, newProfile);
        setProfile(newProfile);
        setSettingsName(newProfile.name);
        setSettingsBio(newProfile.bio);
      }
    });

    // Always update user info on login
    update(ref(db, `users/${user.uid}`), {
      name: user.displayName || undefined,
      photoURL: user.photoURL || '',
      online: true,
    });

    // Set online presence
    const connRef = ref(db, `users/${user.uid}/online`);
    set(connRef, true);
    onDisconnect(connRef).set(false);
    const lsRef = ref(db, `users/${user.uid}/lastSeen`);
    onDisconnect(lsRef).set(serverTimestamp());

    return () => unsub();
  }, [user]);

  // ─── FCM SETUP ───
  useEffect(() => {
    if (!user) return;
    const setupFCM = async () => {
      try {
        if (!('Notification' in window)) return;
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') return;

        const messaging = getMessaging(app);
        const token = await getToken(messaging, {
          vapidKey: 'BGCsOET89SJwkpzwu8TsGu17qaMhdajlisa7mXnNtTPwrnYEoylJX8FXRffdgP-RxKefdg5n3Fp2t252eQrSG4w'
        });
        if (token) {
          await update(ref(db, `users/${user.uid}`), { fcmToken: token });
        }
        onMessage(messaging, (payload) => {
          showToast(
            payload.notification?.title || 'DN CLAN 🛡️',
            payload.notification?.body || 'رسالة جديدة'
          );
        });
      } catch (err) {
        console.log('FCM setup skipped:', err);
      }
    };
    setupFCM();
  }, [user, showToast]);

  // ─── LOAD GLOBAL MESSAGES ───
  useEffect(() => {
    if (!user) return;
    const msgRef = query(ref(db, 'messages'), orderByChild('timestamp'), limitToLast(100));
    const unsub = onValue(msgRef, (snap) => {
      const arr: ChatMessage[] = [];
      snap.forEach((child) => {
        arr.push({ id: child.key!, ...child.val() });
      });
      arr.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      setMessages(arr);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsub();
  }, [user]);

  // ─── LOAD PRIVATE MESSAGES (when a private chat is open) ───
  useEffect(() => {
    if (!user || !privateChatUser) { setPrivateMessages([]); return; }
    const combinedID = getCombinedID(user.uid, privateChatUser.uid);
    const pmRef = query(ref(db, `private_messages/${combinedID}`), orderByChild('timestamp'), limitToLast(100));
    const unsub = onValue(pmRef, (snap) => {
      const arr: ChatMessage[] = [];
      snap.forEach((child) => {
        arr.push({ id: child.key!, ...child.val() });
      });
      arr.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      setPrivateMessages(arr);
      setTimeout(() => privateChatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsub();
  }, [user, privateChatUser]);

  // ─── LOAD MEMBERS ───
  useEffect(() => {
    if (!user) return;
    const unsub = onValue(ref(db, 'users'), (snap) => {
      if (snap.exists()) setMembers(snap.val());
    });
    return () => unsub();
  }, [user]);

  // ─── AUTH HANDLERS ───
  const handleAuth = async () => {
    setAuthError('');
    setAuthBusy(true);
    try {
      if (authMode === 'login') {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        // Update user info on every login
        await update(ref(db, `users/${cred.user.uid}`), {
          name: cred.user.displayName || undefined,
          photoURL: cred.user.photoURL || '',
          online: true,
        });
      } else {
        if (!signupName.trim()) { setAuthError('يرجى إدخال الاسم'); setAuthBusy(false); return; }
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: signupName.trim() });
        await set(ref(db, `users/${cred.user.uid}`), {
          name: signupName.trim(),
          role: 'Member',
          bio: 'عضو جديد في DN CLAN',
          photoURL: '',
          theme: JSON.stringify({ accent: 'indigo', bg: 'oled' })
        });
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || '';
      const map: Record<string, string> = {
        'auth/invalid-email': 'البريد الإلكتروني غير صحيح',
        'auth/user-not-found': 'لا يوجد حساب بهذا البريد',
        'auth/wrong-password': 'كلمة المرور غير صحيحة',
        'auth/email-already-in-use': 'البريد مستخدم بالفعل',
        'auth/weak-password': 'كلمة المرور ضعيفة (6 أحرف على الأقل)',
        'auth/invalid-credential': 'البريد أو كلمة المرور غير صحيحة',
        'auth/too-many-requests': 'محاولات كثيرة، حاول لاحقاً',
      };
      setAuthError(map[code] || 'حدث خطأ: ' + code);
    }
    setAuthBusy(false);
  };

  // ─── SEND GLOBAL TEXT MESSAGE ───
  const sendTextMessage = async () => {
    if (!user || !profile || !msgText.trim()) return;
    if (editId) {
      await update(ref(db, `messages/${editId}`), { text: msgText.trim(), edited: true });
      setEditId(null);
      setMsgText('');
      return;
    }
    const msgData = {
      uid: user.uid,
      name: profile.name || user.displayName || 'مجهول',
      role: profile.role || 'Member',
      photoURL: profile.photoURL || '',
      text: msgText.trim(),
      timestamp: Date.now(),
      replyTo: replyTo || null,
      edited: false
    };
    await push(ref(db, 'messages'), msgData);
    setMsgText('');
    setReplyTo(null);
  };

  // ─── SEND PRIVATE TEXT MESSAGE ───
  const sendPrivateMessage = async () => {
    if (!user || !profile || !privateChatUser || !privateMsgText.trim()) return;
    const combinedID = getCombinedID(user.uid, privateChatUser.uid);
    if (privateEditId) {
      await update(ref(db, `private_messages/${combinedID}/${privateEditId}`), { text: privateMsgText.trim(), edited: true });
      setPrivateEditId(null);
      setPrivateMsgText('');
      return;
    }
    const msgData = {
      uid: user.uid,
      name: profile.name || user.displayName || 'مجهول',
      role: profile.role || 'Member',
      photoURL: profile.photoURL || '',
      text: privateMsgText.trim(),
      timestamp: Date.now(),
      replyTo: privateReplyTo || null,
      edited: false
    };
    await push(ref(db, `private_messages/${combinedID}`), msgData);
    setPrivateMsgText('');
    setPrivateReplyTo(null);
  };

  // ─── MESSAGE ACTIONS ───
  const deleteMessage = (msgId: string) => remove(ref(db, `messages/${msgId}`));
  const deletePrivateMessage = (msgId: string) => {
    if (!user || !privateChatUser) return;
    const combinedID = getCombinedID(user.uid, privateChatUser.uid);
    remove(ref(db, `private_messages/${combinedID}/${msgId}`));
  };

  const startEdit = (msg: ChatMessage) => {
    setEditId(msg.id);
    setMsgText(msg.text);
    setReplyTo(null);
    inputRef.current?.focus();
  };

  const startReply = (msg: ChatMessage) => {
    setReplyTo({ msgId: msg.id, text: msg.text, name: msg.name });
    setEditId(null);
    inputRef.current?.focus();
  };

  const startPrivateEdit = (msg: ChatMessage) => {
    setPrivateEditId(msg.id);
    setPrivateMsgText(msg.text);
    setPrivateReplyTo(null);
    privateInputRef.current?.focus();
  };

  const startPrivateReply = (msg: ChatMessage) => {
    setPrivateReplyTo({ msgId: msg.id, text: msg.text, name: msg.name });
    setPrivateEditId(null);
    privateInputRef.current?.focus();
  };

  // ─── OPEN PRIVATE CHAT ───
  const openPrivateChat = (uid: string, userProfile: UserProfile) => {
    if (uid === user?.uid) return; // Can't chat with yourself
    setPrivateChatUser({ uid, profile: userProfile });
    setPrivateMsgText('');
    setPrivateReplyTo(null);
    setPrivateEditId(null);
    setTab('chat');
  };

  const closePrivateChat = () => {
    setPrivateChatUser(null);
    setPrivateMessages([]);
    setPrivateMsgText('');
    setPrivateReplyTo(null);
    setPrivateEditId(null);
  };

  // ─── SAVE PROFILE ───
  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      await updateProfile(user, { displayName: settingsName.trim() });
      await update(ref(db, `users/${user.uid}`), {
        name: settingsName.trim(),
        bio: settingsBio.trim()
      });
      showToast('✅', 'تم حفظ الملف الشخصي');
    } catch (err) {
      console.error(err);
      showToast('خطأ', 'فشل في الحفظ');
    }
    setSavingProfile(false);
  };

  // ─── CHANGE ACCENT ───
  const changeAccent = (accentId: string) => {
    setCurrentAccent(accentId);
    const settings: ThemeSettings = { accent: accentId, bg: currentBg };
    applyTheme(settings);
    localStorage.setItem('dn-theme', JSON.stringify(settings));
    localStorage.setItem('dn-accent', accentId);
    if (user) update(ref(db, `users/${user.uid}`), { theme: JSON.stringify(settings) });
    const t = ACCENT_THEMES.find(x => x.id === accentId);
    showToast('🎨', `لون الثيم: ${t?.emoji} ${t?.name || accentId}`);
  };

  // ─── CHANGE BACKGROUND ───
  const changeBg = (bgId: string) => {
    setCurrentBg(bgId);
    const settings: ThemeSettings = { accent: currentAccent, bg: bgId };
    applyTheme(settings);
    localStorage.setItem('dn-theme', JSON.stringify(settings));
    if (user) update(ref(db, `users/${user.uid}`), { theme: JSON.stringify(settings) });
    const b = BG_THEMES.find(x => x.id === bgId);
    showToast('🌗', `خلفية: ${b?.emoji} ${b?.name || bgId}`);
  };

  // Load theme from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('dn-theme');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ThemeSettings;
        if (parsed.accent) setCurrentAccent(parsed.accent);
        if (parsed.bg) setCurrentBg(parsed.bg);
        applyTheme(parsed);
      } catch {
        setCurrentAccent(saved);
        applyTheme({ accent: saved, bg: 'oled' });
      }
    }
  }, []);

  // ═══════════════════════════════════════════
  //  REUSABLE: MESSAGE BUBBLE
  // ═══════════════════════════════════════════
  const renderMessageBubble = (
    msg: ChatMessage,
    isMe: boolean,
    isAdmin: boolean,
    onReply: (m: ChatMessage) => void,
    onEdit: (m: ChatMessage) => void,
    onDelete: (msgId: string) => void
  ) => {
    const badge = roleBadge(msg.role);
    const BadgeIcon = badge.icon;
    return (
      <div key={msg.id} className={`flex gap-2 animate-fadeIn ${isMe ? 'flex-row-reverse' : ''}`}>
        <img src={getAvatarURL(msg.name, msg.photoURL)}
          className="w-8 h-8 rounded-full shrink-0 mt-1 border border-white/10"
          alt="" loading="lazy" />
        <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
          <div className={`flex items-center gap-1.5 mb-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
            <span className="text-[11px] font-bold text-gray-300">{msg.name}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border flex items-center gap-0.5 ${badge.bg} ${badge.color}`}>
              <BadgeIcon size={8} /> {msg.role}
            </span>
          </div>
          <div className={`rounded-2xl px-3 py-2 text-sm relative group ${isMe ? 'rounded-tr-md' : 'rounded-tl-md'}`}
            style={{
              background: isMe ? `rgba(var(--accent), 0.15)` : 'rgba(255,255,255,0.05)',
              border: `1px solid ${isMe ? 'rgba(var(--accent), 0.2)' : 'rgba(255,255,255,0.06)'}`
            }}>
            {msg.replyTo && (
              <div className="mb-1.5 px-2 py-1 rounded-lg bg-white/5 border-r-2 text-[11px]"
                style={{ borderColor: 'var(--accent-hex)' }}>
                <span className="font-bold" style={{ color: 'var(--accent-hex)' }}>{msg.replyTo.name}</span>
                <p className="text-gray-500 truncate">{msg.replyTo.text}</p>
              </div>
            )}
            <p className="text-gray-200 break-words whitespace-pre-wrap leading-relaxed">
              {msg.text}
              {msg.edited && <span className="text-[9px] text-gray-600 mr-1">(معدّل)</span>}
            </p>
            <p className={`text-[9px] text-gray-600 mt-1 ${isMe ? 'text-left' : 'text-right'}`}>
              {formatTime(msg.timestamp)}
            </p>
            <div className={`absolute top-1 ${isMe ? 'left-1' : 'right-1'} hidden group-hover:flex items-center gap-0.5`}>
              <button onClick={() => onReply(msg)} className="p-1 rounded-full hover:bg-white/10">
                <Reply size={12} className="text-gray-500" />
              </button>
              {isMe && (
                <button onClick={() => onEdit(msg)} className="p-1 rounded-full hover:bg-white/10">
                  <Pencil size={12} className="text-gray-500" />
                </button>
              )}
              {(isMe || isAdmin) && (
                <button onClick={() => onDelete(msg.id)} className="p-1 rounded-full hover:bg-white/10">
                  <Trash2 size={12} className="text-red-500" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════
  //  RENDER — AUTH LOADING
  // ═══════════════════════════════════════════
  if (authLoading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-4 animate-fadeIn">
          <div className="text-5xl">🛡️</div>
          <div className="text-xl font-bold neon-text">DN CLAN</div>
          <Loader2 className="animate-spin text-gray-500" size={24} />
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  //  RENDER — AUTH VIEW
  // ═══════════════════════════════════════════
  if (!user) {
    return (
      <div className="h-full flex items-center justify-center p-4" dir="rtl" style={{ background: 'var(--bg-primary)' }}>
        <div className="w-full max-w-sm animate-slideUp">
          <div className="text-center mb-8">
            <div className="text-6xl mb-3">🛡️</div>
            <h1 className="text-3xl font-black neon-text">DN CLAN</h1>
            <p className="text-gray-500 text-sm mt-1">E-SPORTS COMMUNITY</p>
          </div>
          <div className="glass rounded-2xl p-6 space-y-4">
            <div className="flex gap-2 mb-2">
              <button onClick={() => { setAuthMode('login'); setAuthError(''); }}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${authMode === 'login' ? 'text-white' : 'text-gray-500'}`}
                style={authMode === 'login' ? { background: `rgba(var(--accent), 0.2)`, color: 'var(--accent-hex)' } : {}}>
                تسجيل الدخول
              </button>
              <button onClick={() => { setAuthMode('signup'); setAuthError(''); }}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${authMode === 'signup' ? 'text-white' : 'text-gray-500'}`}
                style={authMode === 'signup' ? { background: `rgba(var(--accent), 0.2)`, color: 'var(--accent-hex)' } : {}}>
                حساب جديد
              </button>
            </div>

            {authMode === 'signup' && (
              <input value={signupName} onChange={e => setSignupName(e.target.value)}
                placeholder="الاسم" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm outline-none focus:border-[var(--accent-hex)] transition-colors" />
            )}
            <input value={email} onChange={e => setEmail(e.target.value)} type="email"
              placeholder="البريد الإلكتروني" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm outline-none focus:border-[var(--accent-hex)] transition-colors" />
            <div className="relative">
              <input value={password} onChange={e => setPassword(e.target.value)}
                type={showPw ? 'text' : 'password'} placeholder="كلمة المرور"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm outline-none focus:border-[var(--accent-hex)] transition-colors pl-10"
                onKeyDown={e => e.key === 'Enter' && handleAuth()} />
              <button onClick={() => setShowPw(!showPw)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {authError && <p className="text-red-400 text-xs text-center">{authError}</p>}

            <button onClick={handleAuth} disabled={authBusy}
              className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all flex items-center justify-center gap-2 animate-pulse-glow"
              style={{ background: 'var(--accent-hex)' }}>
              {authBusy ? <Loader2 className="animate-spin" size={18} /> :
                authMode === 'login' ? 'دخول' : 'إنشاء حساب'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  //  RENDER — MAIN APP
  // ═══════════════════════════════════════════
  const isAdmin = profile?.role === 'Admin';
  const isInPrivateChat = privateChatUser !== null;

  return (
    <div className="h-full flex flex-col max-w-md mx-auto relative" dir="rtl" style={{ background: 'var(--bg-primary)' }}>

      {/* ── TOASTS ── */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[90%] max-w-sm">
        {toasts.map(t => (
          <div key={t.id} className="glass-strong rounded-xl p-3 animate-toast flex items-center gap-3">
            <Bell size={18} style={{ color: 'var(--accent-hex)' }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white">{t.title}</p>
              <p className="text-xs text-gray-400 truncate">{t.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── HEADER ── */}
      <header className="glass-strong px-4 py-3 flex items-center justify-between shrink-0 z-20">
        {isInPrivateChat ? (
          <>
            <div className="flex items-center gap-3">
              <button onClick={closePrivateChat}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                <ArrowRight size={18} style={{ color: 'var(--accent-hex)' }} />
              </button>
              <div className="relative">
                <img src={getAvatarURL(privateChatUser.profile.name, privateChatUser.profile.photoURL)}
                  className="w-9 h-9 rounded-full border border-white/10" alt="" />
                {privateChatUser.profile.online && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2" style={{ borderColor: 'var(--bg-primary)' }} />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-white">{privateChatUser.profile.name}</p>
                <p className="text-[10px] text-gray-500">
                  {getLastSeenText(privateChatUser.profile.lastSeen, privateChatUser.profile.online)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Mail size={14} style={{ color: 'var(--accent-hex)' }} />
              <span className="text-[10px] text-gray-500">محادثة خاصة</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-xl">🛡️</span>
              <span className="font-black text-sm neon-text">DN CLAN</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {Object.values(members).filter(m => m.online).length} متصل
            </div>
          </>
        )}
      </header>

      {/* ── CONTENT ── */}
      <main className="flex-1 overflow-hidden">

        {/* ═══ PRIVATE CHAT VIEW ═══ */}
        {isInPrivateChat && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-3 space-y-2 pb-2">
              {privateMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-600">
                  <Mail size={40} className="mb-3 opacity-30" />
                  <p className="text-sm">لا توجد رسائل بعد</p>
                  <p className="text-xs text-gray-700 mt-1">ابدأ محادثة مع {privateChatUser.profile.name}</p>
                </div>
              )}
              {privateMessages.map((msg) =>
                renderMessageBubble(
                  msg,
                  msg.uid === user.uid,
                  !!isAdmin,
                  startPrivateReply,
                  startPrivateEdit,
                  deletePrivateMessage
                )
              )}
              <div ref={privateChatEndRef} />
            </div>

            {/* Reply Bar */}
            {privateReplyTo && (
              <div className="px-4 py-2 glass border-t border-white/5 flex items-center gap-2 animate-fadeIn">
                <Reply size={14} style={{ color: 'var(--accent-hex)' }} />
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-bold" style={{ color: 'var(--accent-hex)' }}>{privateReplyTo.name}</span>
                  <p className="text-[11px] text-gray-500 truncate">{privateReplyTo.text}</p>
                </div>
                <button onClick={() => setPrivateReplyTo(null)}><X size={14} className="text-gray-500" /></button>
              </div>
            )}

            {/* Edit Bar */}
            {privateEditId && (
              <div className="px-4 py-2 glass border-t border-white/5 flex items-center gap-2 animate-fadeIn">
                <Pencil size={14} style={{ color: 'var(--accent-hex)' }} />
                <span className="text-[11px]" style={{ color: 'var(--accent-hex)' }}>تعديل الرسالة</span>
                <div className="flex-1" />
                <button onClick={() => { setPrivateEditId(null); setPrivateMsgText(''); }}><X size={14} className="text-gray-500" /></button>
              </div>
            )}

            {/* Input Bar */}
            <div className="px-3 py-2 glass-strong border-t border-white/5 shrink-0">
              <div className="flex items-center gap-2">
                <input ref={privateInputRef} value={privateMsgText} onChange={e => setPrivateMsgText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendPrivateMessage()}
                  placeholder={privateEditId ? 'عدّل الرسالة...' : 'اكتب رسالة خاصة...'}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-[var(--accent-hex)] transition-colors" />
                <button onClick={sendPrivateMessage} disabled={!privateMsgText.trim()}
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-30"
                  style={{ background: 'var(--accent-hex)' }}>
                  {privateEditId ? <Check size={18} className="text-white" /> : <Send size={18} className="text-white" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ GLOBAL CHAT TAB ═══ */}
        {tab === 'chat' && !isInPrivateChat && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-3 space-y-2 pb-2">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-600">
                  <MessageCircle size={40} className="mb-2 opacity-30" />
                  <p className="text-sm">لا توجد رسائل بعد...</p>
                </div>
              )}
              {messages.map((msg) =>
                renderMessageBubble(
                  msg,
                  msg.uid === user.uid,
                  !!isAdmin,
                  startReply,
                  startEdit,
                  deleteMessage
                )
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Reply Bar */}
            {replyTo && (
              <div className="px-4 py-2 glass border-t border-white/5 flex items-center gap-2 animate-fadeIn">
                <Reply size={14} style={{ color: 'var(--accent-hex)' }} />
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-bold" style={{ color: 'var(--accent-hex)' }}>{replyTo.name}</span>
                  <p className="text-[11px] text-gray-500 truncate">{replyTo.text}</p>
                </div>
                <button onClick={() => setReplyTo(null)}><X size={14} className="text-gray-500" /></button>
              </div>
            )}

            {/* Edit Bar */}
            {editId && (
              <div className="px-4 py-2 glass border-t border-white/5 flex items-center gap-2 animate-fadeIn">
                <Pencil size={14} style={{ color: 'var(--accent-hex)' }} />
                <span className="text-[11px]" style={{ color: 'var(--accent-hex)' }}>تعديل الرسالة</span>
                <div className="flex-1" />
                <button onClick={() => { setEditId(null); setMsgText(''); }}><X size={14} className="text-gray-500" /></button>
              </div>
            )}

            {/* Input Bar */}
            <div className="px-3 py-2 glass-strong border-t border-white/5 shrink-0">
              <div className="flex items-center gap-2">
                <input ref={inputRef} value={msgText} onChange={e => setMsgText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendTextMessage()}
                  placeholder={editId ? 'عدّل الرسالة...' : 'اكتب رسالة...'}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-[var(--accent-hex)] transition-colors" />
                <button onClick={sendTextMessage} disabled={!msgText.trim()}
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-30"
                  style={{ background: 'var(--accent-hex)' }}>
                  {editId ? <Check size={18} className="text-white" /> : <Send size={18} className="text-white" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ CLAN TAB ═══ */}
        {tab === 'clan' && !isInPrivateChat && (
          <div className="h-full overflow-y-auto p-4 space-y-4 pb-24">
            {/* Hero */}
            <div className="text-center py-6 animate-slideUp">
              <div className="text-6xl mb-4">🛡️</div>
              <h1 className="text-4xl font-black neon-text tracking-wider">DN E-SPORTS</h1>
              <p className="text-gray-500 text-sm mt-2">مجتمع الألعاب التنافسية</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 animate-fadeIn">
              <div className="glass rounded-2xl p-3 text-center">
                <div className="w-8 h-8 rounded-xl mx-auto mb-1.5 flex items-center justify-center"
                  style={{ background: `rgba(var(--accent), 0.15)` }}>
                  <Users size={16} style={{ color: 'var(--accent-hex)' }} />
                </div>
                <p className="text-lg font-black" style={{ color: 'var(--accent-hex)' }}>
                  {Object.keys(members).length}
                </p>
                <p className="text-[9px] text-gray-500">أعضاء</p>
              </div>
              <div className="glass rounded-2xl p-3 text-center">
                <div className="w-8 h-8 rounded-xl mx-auto mb-1.5 flex items-center justify-center bg-emerald-500/15">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-lg font-black text-emerald-400">
                  {Object.values(members).filter(m => m.online).length}
                </p>
                <p className="text-[9px] text-gray-500">متصل</p>
              </div>
              <div className="glass rounded-2xl p-3 text-center">
                <div className="w-8 h-8 rounded-xl mx-auto mb-1.5 flex items-center justify-center"
                  style={{ background: `rgba(var(--accent), 0.15)` }}>
                  <MessageCircle size={16} style={{ color: 'var(--accent-hex)' }} />
                </div>
                <p className="text-lg font-black" style={{ color: 'var(--accent-hex)' }}>
                  {messages.length}
                </p>
                <p className="text-[9px] text-gray-500">رسائل</p>
              </div>
            </div>

            {/* Members List — CLICKABLE for Private Chat */}
            <div className="glass rounded-2xl p-4 animate-fadeIn">
              <div className="flex items-center gap-2 mb-3">
                <Users size={16} style={{ color: 'var(--accent-hex)' }} />
                <h3 className="text-sm font-bold">الأعضاء</h3>
                <span className="text-[10px] text-gray-600 mr-auto">اضغط لمحادثة خاصة</span>
              </div>
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {Object.entries(members)
                  .sort(([, a], [, b]) => {
                    const order: Record<string, number> = { Admin: 0, 'Co-Leader': 1, Member: 2 };
                    const roleCompare = (order[a.role] ?? 3) - (order[b.role] ?? 3);
                    if (roleCompare !== 0) return roleCompare;
                    if (a.online && !b.online) return -1;
                    if (!a.online && b.online) return 1;
                    return 0;
                  })
                  .map(([uid, m]) => {
                    const b = roleBadge(m.role);
                    const BIcon = b.icon;
                    const isMe = uid === user.uid;
                    return (
                      <button key={uid}
                        onClick={() => !isMe && openPrivateChat(uid, m)}
                        disabled={isMe}
                        className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all duration-200 text-right ${
                          isMe
                            ? 'opacity-60 cursor-default bg-white/3'
                            : 'hover:bg-white/5 active:scale-[0.98] cursor-pointer'
                        }`}>
                        <div className="relative shrink-0">
                          <img src={getAvatarURL(m.name, m.photoURL)}
                            className="w-10 h-10 rounded-full border border-white/10" alt="" />
                          {m.online && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2"
                              style={{ borderColor: 'var(--bg-primary)' }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold text-gray-200 truncate">{m.name}</p>
                            {isMe && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-gray-500">أنت</span>}
                          </div>
                          <p className="text-[10px] text-gray-600 truncate">
                            {m.online ? '🟢 متصل الآن' : getLastSeenText(m.lastSeen, m.online)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full border flex items-center gap-0.5 ${b.bg} ${b.color}`}>
                            <BIcon size={8} /> {m.role}
                          </span>
                          {!isMe && (
                            <ChevronLeft size={14} className="text-gray-600" />
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* ═══ SETTINGS TAB ═══ */}
        {tab === 'settings' && !isInPrivateChat && (
          <div className="h-full overflow-y-auto p-4 space-y-4 pb-24">
            {/* Profile Card */}
            <div className="glass rounded-2xl p-5 text-center animate-slideUp">
              <img src={getAvatarURL(profile?.name || '', profile?.photoURL)}
                className="w-20 h-20 rounded-full mx-auto mb-3 border-2"
                style={{ borderColor: 'var(--accent-hex)' }} alt="" />
              <h2 className="text-lg font-bold">{profile?.name}</h2>
              <p className="text-xs text-gray-500">{user.email}</p>
              {profile && (() => {
                const b = roleBadge(profile.role);
                const BIcon = b.icon;
                return (
                  <span className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full border mt-2 ${b.bg} ${b.color}`}>
                    <BIcon size={12} /> {profile.role}
                  </span>
                );
              })()}
            </div>

            {/* Edit Profile */}
            <div className="glass rounded-2xl p-4 space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2 mb-1">
                <Settings size={16} style={{ color: 'var(--accent-hex)' }} />
                <h3 className="text-sm font-bold">تعديل الملف الشخصي</h3>
              </div>
              <div>
                <label className="text-[11px] text-gray-500 mb-1 block">الاسم</label>
                <input value={settingsName} onChange={e => setSettingsName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[var(--accent-hex)] transition-colors" />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 mb-1 block">النبذة</label>
                <textarea value={settingsBio} onChange={e => setSettingsBio(e.target.value)} rows={3}
                  placeholder="اكتب نبذة عنك أو رابط واتساب..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-[var(--accent-hex)] transition-colors resize-none" />
              </div>
              <button onClick={saveProfile} disabled={savingProfile}
                className="w-full py-2.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all"
                style={{ background: 'var(--accent-hex)' }}>
                {savingProfile ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                حفظ التعديلات
              </button>
            </div>

            {/* ═══ THEME CUSTOMIZER ═══ */}
            <div className="glass rounded-2xl p-4 animate-fadeIn">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `rgba(var(--accent), 0.15)` }}>
                  <Palette size={16} style={{ color: 'var(--accent-hex)' }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold">تخصيص الثيم</h3>
                  <p className="text-[10px] text-gray-500">اختر لون وخلفية التطبيق</p>
                </div>
              </div>

              {/* Live Preview */}
              <div className="mb-4 rounded-xl p-3 border animate-border-glow"
                style={{ background: 'var(--bg-secondary)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full animate-float flex items-center justify-center text-lg"
                    style={{ background: `rgba(var(--accent), 0.2)` }}>
                    🛡️
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold" style={{ color: 'var(--accent-hex)' }}>DN CLAN</p>
                    <div className="h-1.5 w-24 rounded-full mt-1 overflow-hidden" style={{ background: 'rgba(var(--accent), 0.1)' }}>
                      <div className="h-full w-2/3 rounded-full animate-shimmer"
                        style={{ background: `linear-gradient(90deg, transparent, var(--accent-hex), transparent)`, backgroundSize: '200% 100%' }} />
                    </div>
                  </div>
                  <div className="px-2 py-1 rounded-lg text-[9px] font-bold"
                    style={{ background: `rgba(var(--accent), 0.15)`, color: 'var(--accent-hex)' }}>
                    معاينة
                  </div>
                </div>
              </div>

              {/* Section Tabs */}
              <div className="flex gap-2 mb-4">
                <button onClick={() => setThemeSection('accent')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    themeSection === 'accent' ? 'text-white' : 'text-gray-500'
                  }`}
                  style={themeSection === 'accent' ? { background: `rgba(var(--accent), 0.2)`, color: 'var(--accent-hex)' } : {}}>
                  <Palette size={12} />
                  الألوان
                </button>
                <button onClick={() => setThemeSection('bg')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    themeSection === 'bg' ? 'text-white' : 'text-gray-500'
                  }`}
                  style={themeSection === 'bg' ? { background: `rgba(var(--accent), 0.2)`, color: 'var(--accent-hex)' } : {}}>
                  <Eye size={12} />
                  الخلفية
                </button>
              </div>

              {/* Accent Colors */}
              {themeSection === 'accent' && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="grid grid-cols-4 gap-2.5">
                    {ACCENT_THEMES.map(t => {
                      const isActive = currentAccent === t.id;
                      return (
                        <button key={t.id} onClick={() => changeAccent(t.id)}
                          className={`relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all duration-300 ${
                            isActive ? 'border-white/20 scale-105' : 'border-white/5 hover:border-white/10'
                          }`}
                          style={isActive ? { background: `${t.hex}10` } : {}}>
                          <div className="relative">
                            <div className="w-9 h-9 rounded-full transition-all duration-300"
                              style={{
                                background: t.gradient,
                                boxShadow: isActive ? `0 0 18px ${t.hex}50, 0 0 6px ${t.hex}30` : `0 2px 8px ${t.hex}20`
                              }}>
                              {isActive && (
                                <div className="w-full h-full rounded-full flex items-center justify-center animate-pop">
                                  <Check size={16} className="text-white drop-shadow-lg" />
                                </div>
                              )}
                            </div>
                            {isActive && (
                              <div className="absolute -inset-1 rounded-full animate-ping opacity-20"
                                style={{ background: t.hex }} />
                            )}
                          </div>
                          <span className="text-[9px] text-gray-500 leading-tight text-center">{t.emoji} {t.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/3">
                    <div className="w-3 h-3 rounded-full" style={{ background: ACCENT_THEMES.find(x => x.id === currentAccent)?.hex }} />
                    <span className="text-[10px] text-gray-500">اللون الحالي:</span>
                    <span className="text-[10px] font-bold" style={{ color: 'var(--accent-hex)' }}>
                      {ACCENT_THEMES.find(x => x.id === currentAccent)?.emoji} {ACCENT_THEMES.find(x => x.id === currentAccent)?.name}
                    </span>
                  </div>
                </div>
              )}

              {/* Background Themes */}
              {themeSection === 'bg' && (
                <div className="space-y-2 animate-fadeIn">
                  {BG_THEMES.map(bg => {
                    const isActive = currentBg === bg.id;
                    return (
                      <button key={bg.id} onClick={() => changeBg(bg.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                          isActive ? 'border-white/20 scale-[1.02]' : 'border-white/5 hover:border-white/10'
                        }`}
                        style={isActive ? { background: `rgba(var(--accent), 0.05)` } : {}}>
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-lg border border-white/10 overflow-hidden"
                            style={{ background: bg.primary }}>
                            <div className="w-full h-1/2" style={{ background: bg.secondary }} />
                            <div className="absolute bottom-1 right-1 w-3 h-3 rounded-full"
                              style={{ background: isActive ? 'var(--accent-hex)' : '#333' }} />
                          </div>
                          {isActive && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                              style={{ background: 'var(--accent-hex)' }}>
                              <Check size={10} className="text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 text-right">
                          <p className={`text-xs font-bold ${isActive ? '' : 'text-gray-300'}`}
                            style={isActive ? { color: 'var(--accent-hex)' } : {}}>
                            {bg.emoji} {bg.name}
                          </p>
                          <p className="text-[10px] text-gray-600">{bg.primary}</p>
                        </div>
                        {isActive && (
                          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent-hex)' }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="glass rounded-2xl p-4 animate-fadeIn">
              <div className="flex items-center gap-2 mb-2">
                <Bell size={16} style={{ color: 'var(--accent-hex)' }} />
                <h3 className="text-sm font-bold">الإشعارات</h3>
              </div>
              <p className="text-xs text-gray-500">
                {typeof Notification !== 'undefined' && Notification.permission === 'granted'
                  ? '✅ الإشعارات مفعّلة'
                  : '⚠️ الإشعارات غير مفعّلة — اسمح بها من إعدادات المتصفح'}
              </p>
            </div>

            {/* Logout */}
            <button onClick={() => {
              if (user) {
                set(ref(db, `users/${user.uid}/online`), false);
                set(ref(db, `users/${user.uid}/lastSeen`), Date.now());
              }
              signOut(auth);
            }}
              className="w-full py-3 rounded-xl font-bold text-red-400 text-sm bg-red-500/10 border border-red-500/20 flex items-center justify-center gap-2 transition-all hover:bg-red-500/20">
              <LogOut size={16} /> تسجيل الخروج
            </button>
          </div>
        )}
      </main>

      {/* ── BOTTOM NAV ── (Hidden during private chat) */}
      {!isInPrivateChat && (
        <nav className="glass-strong border-t border-white/5 px-2 py-2 shrink-0 z-20">
          <div className="flex items-center justify-around">
            {([
              { id: 'chat' as const, icon: MessageCircle, label: 'المحادثة' },
              { id: 'clan' as const, icon: Shield, label: 'الكلان' },
              { id: 'settings' as const, icon: Settings, label: 'الإعدادات' },
            ]).map(item => {
              const active = tab === item.id;
              return (
                <button key={item.id} onClick={() => setTab(item.id)}
                  className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all ${
                    active ? 'scale-105' : 'opacity-50'
                  }`}>
                  <div className="p-2 rounded-xl transition-all"
                    style={active ? { background: `rgba(var(--accent), 0.15)` } : {}}>
                    <item.icon size={20} style={active ? { color: 'var(--accent-hex)' } : { color: '#666' }} />
                  </div>
                  <span className="text-[10px] font-bold" style={active ? { color: 'var(--accent-hex)' } : { color: '#666' }}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
