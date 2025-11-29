import { ServerLocation, ServerStatus, OSType, Plan } from '../types';

export const PLANS: Plan[] = [
  {
    id: 'month-1',
    name: '1 Месяц',
    durationMonths: 1,
    priceStars: 100
  },
  {
    id: 'month-3',
    name: '3 Месяца',
    durationMonths: 3,
    priceStars: 250,
    discount: '-15%'
  },
  {
    id: 'year-1',
    name: '1 Год',
    durationMonths: 12,
    priceStars: 900,
    discount: '-25%'
  }
];

export const AVAILABLE_SERVERS: ServerLocation[] = [
  {
    id: 'de-1',
    country: 'Германия',
    flag: '🇩🇪',
    ping: 45,
    status: ServerStatus.ONLINE,
    protocol: 'vless'
  },
  {
    id: 'us-east',
    country: 'США (Восток)',
    flag: '🇺🇸',
    ping: 120,
    status: ServerStatus.ONLINE,
    protocol: 'vmess'
  },
  {
    id: 'nl-vip',
    country: 'Нидерланды (VIP)',
    flag: '🇳🇱',
    ping: 38,
    status: ServerStatus.CROWDED,
    protocol: 'vless'
  },
  {
    id: 'sg-asia',
    country: 'Сингапур',
    flag: '🇸🇬',
    ping: 180,
    status: ServerStatus.MAINTENANCE,
    protocol: 'trojan'
  },
  {
    id: 'fi-hel',
    country: 'Финляндия',
    flag: '🇫🇮',
    ping: 25,
    status: ServerStatus.ONLINE,
    protocol: 'vless'
  }
];

export const OS_INSTRUCTIONS: Record<OSType, { appName: string; downloadUrl: string; steps: string[] }> = {
  [OSType.IOS]: {
    appName: 'V2Box - V2ray Client',
    downloadUrl: 'https://apps.apple.com/us/app/v2box-v2ray-client/id6446814690',
    steps: [
      'Скачайте V2Box из AppStore.',
      'Скопируйте ссылку подписки в этом приложении.',
      'Откройте V2Box, он автоматически предложит добавить конфигурацию из буфера обмена.',
      'Нажмите "Import" и включите переключатель для соединения.'
    ]
  },
  [OSType.ANDROID]: {
    appName: 'v2rayNG',
    downloadUrl: 'https://play.google.com/store/apps/details?id=com.v2ray.ang',
    steps: [
      'Установите v2rayNG из Google Play.',
      'Скопируйте ключ подключения (начинается с vless://).',
      'Откройте v2rayNG, нажмите "+" в верхнем углу.',
      'Выберите "Импорт из буфера обмена".',
      'Нажмите кнопку "V" внизу для подключения.'
    ]
  },
  [OSType.WINDOWS]: {
    appName: 'NekoRay',
    downloadUrl: 'https://github.com/MatsuriDayo/nekoray/releases',
    steps: [
      'Скачайте NekoRay с GitHub.',
      'Запустите программу в режиме "Sing-box".',
      'Нажмите "Program" -> "Add profile from clipboard".',
      'Кликните правой кнопкой мыши по серверу и выберите "Start".',
      'Не забудьте включить "System Proxy" в настройках.'
    ]
  },
  [OSType.MACOS]: {
    appName: 'FoXray',
    downloadUrl: 'https://apps.apple.com/app/foxray/id6448898396',
    steps: [
      'Скачайте FoXray из Mac App Store.',
      'Скопируйте ссылку подписки.',
      'В приложении нажмите кнопку добавления подписки.',
      'Нажмите кнопку Play для запуска VPN.'
    ]
  },
  [OSType.LINUX]: {
    appName: 'NekoRay (AppImage)',
    downloadUrl: 'https://github.com/MatsuriDayo/nekoray/releases',
    steps: [
      'Скачайте файл .AppImage последнего релиза NekoRay с GitHub.',
      'Сделайте файл исполняемым (chmod +x nekoray.AppImage).',
      'Запустите приложение и выберите ядро "Sing-box".',
      'Скопируйте ключ и нажмите Ctrl+V в окне программы.',
      'Поставьте галочку "System Proxy" для работы через VPN.'
    ]
  }
};

