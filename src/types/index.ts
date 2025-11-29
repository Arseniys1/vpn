export enum ServerStatus {
  ONLINE = 'Online',
  MAINTENANCE = 'Maintenance',
  CROWDED = 'Crowded'
}

export interface ServerLocation {
  id: string;
  country: string;
  flag: string;
  ping: number;
  status: ServerStatus;
  protocol: 'vless' | 'vmess' | 'trojan';
}

export interface Plan {
  id: string;
  name: string;
  durationMonths: number;
  priceStars: number;
  discount?: string;
}

export interface UserSubscription {
  active: boolean;
  expiresAt: Date | null;
  planName?: string;
}

export enum OSType {
  IOS = 'iOS',
  ANDROID = 'Android',
  WINDOWS = 'Windows',
  MACOS = 'macOS',
  LINUX = 'Linux'
}

export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: 'open' | 'answered' | 'closed';
  date: string;
  category: 'connection' | 'payment' | 'other';
  reply?: string;
}

