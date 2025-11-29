import React, { useState, useEffect } from 'react';
import SectionHeader from '../components/SectionHeader';
import * as adminApi from '../services/adminApi';

type AdminTab = 'servers' | 'users' | 'plans' | 'tickets' | 'stats';

const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('stats');

  const tabs = [
    { id: 'stats' as AdminTab, name: 'Стат.', icon: 'fa-chart-line' },
    { id: 'servers' as AdminTab, name: 'Сервера', icon: 'fa-server' },
    { id: 'users' as AdminTab, name: 'Юзеры', icon: 'fa-users' },
    { id: 'plans' as AdminTab, name: 'Тарифы', icon: 'fa-tags' },
    { id: 'tickets' as AdminTab, name: 'Тикеты', icon: 'fa-ticket' }
  ];

  return (
    <div className="pt-2 pb-20 w-full">
      <SectionHeader title="Панель Администратора" />
      
      {/* Tab Navigation */}
      <div className="grid grid-cols-5 gap-1 px-2 mb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1 px-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-tg-blue text-white'
                : 'bg-tg-secondary text-tg-hint hover:bg-tg-hover'
            }`}
          >
            <i className={`fas ${tab.icon} text-base`}></i>
            <span className="leading-tight">{tab.name}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="px-4">
        {activeTab === 'stats' && <StatsTab />}
        {activeTab === 'servers' && <ServersTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'plans' && <PlansTab />}
        {activeTab === 'tickets' && <TicketsTab />}
      </div>
    </div>
  );
};

// Stats Tab Component
const StatsTab: React.FC = () => {
  const [stats, setStats] = useState({
    total_users: 0,
    active_subscriptions: 0,
    monthly_revenue: 0,
    open_tickets: 0,
    total_connections: 0,
    total_servers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
      alert('Ошибка загрузки статистики');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-tg-hint">Загрузка...</div>
      </div>
    );
  }

  const statsData = [
    { label: 'Всего пользователей', value: stats.total_users.toLocaleString(), icon: 'fa-users', color: 'blue' },
    { label: 'Активных подписок', value: stats.active_subscriptions.toLocaleString(), icon: 'fa-check-circle', color: 'green' },
    { label: 'Доход (месяц)', value: `${stats.monthly_revenue.toLocaleString()} ★`, icon: 'fa-coins', color: 'yellow' },
    { label: 'Открытых тикетов', value: stats.open_tickets.toLocaleString(), icon: 'fa-ticket', color: 'red' }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {statsData.map((stat, index) => (
          <div key={index} className="bg-tg-secondary rounded-xl p-4">
            <div className={`text-2xl mb-2 text-tg-${stat.color}`}>
              <i className={`fas ${stat.icon}`}></i>
            </div>
            <div className="text-2xl font-bold text-tg-text mb-1">{stat.value}</div>
            <div className="text-xs text-tg-hint">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-tg-secondary rounded-xl p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-tg-text">Статистика системы</h3>
          <button onClick={loadStats} className="text-tg-blue text-sm">
            <i className="fas fa-refresh"></i>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-tg-bg rounded-lg p-2">
            <div className="text-tg-hint text-xs">Всего серверов</div>
            <div className="text-tg-text font-semibold">{stats.total_servers}</div>
          </div>
          <div className="bg-tg-bg rounded-lg p-2">
            <div className="text-tg-hint text-xs">Подключений</div>
            <div className="text-tg-text font-semibold">{stats.total_connections}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Servers Tab Component
const ServersTab: React.FC = () => {
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingServer, setEditingServer] = useState<string | null>(null);
  const [isAddingServer, setIsAddingServer] = useState(false);
  const [newServer, setNewServer] = useState({ name: '', country: '', flag: '', status: 'online', protocol: 'vless', admin_message: '', max_connections: 1000 });

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getAllServers();
      setServers(data);
    } catch (error) {
      console.error('Failed to load servers:', error);
      alert('Ошибка загрузки серверов');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveServer = async (id: string, updatedData: any) => {
    try {
      await adminApi.updateServer(id, {
        name: updatedData.name,
        country: updatedData.country,
        flag: updatedData.flag,
        protocol: updatedData.protocol,
        status: updatedData.status,
        admin_message: updatedData.admin_message || undefined,
        max_connections: updatedData.max_connections || 1000
      });
      await loadServers();
      setEditingServer(null);
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    } catch (error: any) {
      console.error('Failed to update server:', error);
      alert('Ошибка обновления сервера: ' + (error.message || 'Неизвестная ошибка'));
    }
  };

  const handleDeleteServer = async (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этот сервер?')) {
      try {
        await adminApi.deleteServer(id);
        await loadServers();
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
      } catch (error: any) {
        console.error('Failed to delete server:', error);
        alert('Ошибка удаления сервера: ' + (error.message || 'Неизвестная ошибка'));
      }
    }
  };

  const handleAddServer = async () => {
    if (!newServer.name || !newServer.country || !newServer.flag) {
      alert('Заполните все обязательные поля');
      return;
    }
    try {
      await adminApi.createServer({
        name: newServer.name,
        country: newServer.country,
        flag: newServer.flag,
        protocol: newServer.protocol,
        status: newServer.status,
        admin_message: newServer.admin_message || undefined,
        max_connections: newServer.max_connections
      });
      await loadServers();
      setNewServer({ name: '', country: '', flag: '', status: 'online', protocol: 'vless', admin_message: '', max_connections: 1000 });
      setIsAddingServer(false);
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    } catch (error: any) {
      console.error('Failed to create server:', error);
      alert('Ошибка создания сервера: ' + (error.message || 'Неизвестная ошибка'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-tg-hint">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setIsAddingServer(true)}
        className="w-full bg-tg-blue text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
      >
        <i className="fas fa-plus"></i>
        Добавить сервер
      </button>

      {isAddingServer && (
        <div className="bg-tg-secondary rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-tg-text mb-2">Новый сервер</h3>
          <input
            className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text"
            placeholder="Название (DE-1)"
            value={newServer.name}
            onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
          />
          <input
            className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text"
            placeholder="Страна"
            value={newServer.country}
            onChange={(e) => setNewServer({ ...newServer, country: e.target.value })}
          />
          <input
            className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text"
            placeholder="Флаг (эмодзи, например 🇩🇪)"
            value={newServer.flag}
            onChange={(e) => setNewServer({ ...newServer, flag: e.target.value })}
          />
          <select
            className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text"
            value={newServer.protocol}
            onChange={(e) => setNewServer({ ...newServer, protocol: e.target.value })}
          >
            <option value="vless">VLESS</option>
            <option value="vmess">VMESS</option>
            <option value="trojan">Trojan</option>
          </select>
          <input
            type="number"
            className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text"
            placeholder="Max connections"
            value={newServer.max_connections}
            onChange={(e) => setNewServer({ ...newServer, max_connections: parseInt(e.target.value) || 1000 })}
          />
          <textarea
            className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text resize-none"
            placeholder="Сообщение администратора (опционально)"
            rows={2}
            value={newServer.admin_message}
            onChange={(e) => setNewServer({ ...newServer, admin_message: e.target.value })}
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddServer}
              className="flex-1 bg-tg-blue text-white py-2 rounded-lg font-medium"
            >
              Сохранить
            </button>
            <button
              onClick={() => setIsAddingServer(false)}
              className="flex-1 bg-tg-bg text-tg-hint py-2 rounded-lg font-medium"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {servers.map(server => (
        <div key={server.id} className="bg-tg-secondary rounded-xl overflow-hidden">
          {editingServer === server.id ? (
            <ServerEditForm
              server={server}
              onSave={(data) => handleSaveServer(server.id, data)}
              onCancel={() => setEditingServer(null)}
            />
          ) : (
            <div className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl">{server.flag}</div>
                <div className="flex-1">
                  <div className="font-semibold text-tg-text">{server.country}</div>
                  <div className="text-xs text-tg-hint">{server.name} • {server.protocol.toUpperCase()}</div>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-bold ${
                  server.status === 'online' ? 'bg-tg-green/10 text-tg-green' : 'bg-tg-red/10 text-tg-red'
                }`}>
                  {server.status}
                </div>
              </div>
              {server.admin_message && (
                <div className="text-xs text-tg-blue bg-tg-blue/10 rounded-lg p-2 mb-2">
                  <i className="fas fa-info-circle mr-1"></i>
                  {server.admin_message}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingServer(server.id)}
                  className="flex-1 bg-tg-blue/10 text-tg-blue py-2 rounded-lg text-sm font-medium"
                >
                  <i className="fas fa-edit mr-1"></i>
                  Редактировать
                </button>
                <button
                  onClick={() => handleDeleteServer(server.id)}
                  className="flex-1 bg-tg-red/10 text-tg-red py-2 rounded-lg text-sm font-medium"
                >
                  <i className="fas fa-trash mr-1"></i>
                  Удалить
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const ServerEditForm: React.FC<{ server: any; onSave: (data: any) => void; onCancel: () => void }> = ({ server, onSave, onCancel }) => {
  const [formData, setFormData] = useState(server);

  return (
    <div className="p-4 space-y-3">
      <h3 className="font-semibold text-tg-text mb-2">Редактировать сервер</h3>
      <input
        className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text"
        placeholder="Название"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />
      <input
        className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text"
        placeholder="Страна"
        value={formData.country}
        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
      />
      <input
        className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text"
        placeholder="Флаг"
        value={formData.flag}
        onChange={(e) => setFormData({ ...formData, flag: e.target.value })}
      />
      <select
        className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text"
        value={formData.status}
        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
      >
        <option value="online">Online</option>
        <option value="maintenance">Maintenance</option>
        <option value="crowded">Crowded</option>
      </select>
      <textarea
        className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text resize-none"
        placeholder="Сообщение администратора"
        rows={2}
        value={formData.admin_message || ''}
        onChange={(e) => setFormData({ ...formData, admin_message: e.target.value })}
      />
      <div className="flex gap-2">
        <button
          onClick={() => onSave(formData)}
          className="flex-1 bg-tg-blue text-white py-2 rounded-lg font-medium"
        >
          Сохранить
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-tg-bg text-tg-hint py-2 rounded-lg font-medium"
        >
          Отмена
        </button>
      </div>
    </div>
  );
};

// Users Tab Component
const UsersTab: React.FC = () => {
  const [users] = useState([
    { id: '1', name: 'Иван Петров', telegramId: '123456789', balance: 500, subscription: 'Активна', expiresAt: '2024-12-31' },
    { id: '2', name: 'Мария Сидорова', telegramId: '987654321', balance: 1200, subscription: 'Активна', expiresAt: '2024-11-15' },
    { id: '3', name: 'Алексей Иванов', telegramId: '555666777', balance: 0, subscription: 'Неактивна', expiresAt: null }
  ]);

  return (
    <div className="space-y-3">
      <div className="bg-tg-secondary rounded-lg p-3">
        <input
          type="text"
          placeholder="Поиск по имени или Telegram ID..."
          className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text"
        />
      </div>

      {users.map(user => (
        <div key={user.id} className="bg-tg-secondary rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-tg-blue rounded-full flex items-center justify-center text-white font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-tg-text">{user.name}</div>
              <div className="text-xs text-tg-hint">ID: {user.telegramId}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div className="bg-tg-bg rounded-lg p-2">
              <div className="text-tg-hint">Баланс</div>
              <div className="text-tg-text font-semibold">{user.balance} ★</div>
            </div>
            <div className="bg-tg-bg rounded-lg p-2">
              <div className="text-tg-hint">Подписка</div>
              <div className={`font-semibold ${user.subscription === 'Активна' ? 'text-tg-green' : 'text-tg-red'}`}>
                {user.subscription}
              </div>
            </div>
          </div>
          {user.expiresAt && (
            <div className="text-xs text-tg-hint mb-3">
              Действует до: {user.expiresAt}
            </div>
          )}
          <div className="flex gap-2">
            <button className="flex-1 bg-tg-blue/10 text-tg-blue py-2 rounded-lg text-sm font-medium">
              <i className="fas fa-edit mr-1"></i>
              Редактировать
            </button>
            <button className="px-3 bg-tg-red/10 text-tg-red rounded-lg">
              <i className="fas fa-ban"></i>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Plans Tab Component
const PlansTab: React.FC = () => {
  const [plans, setPlans] = useState([
    { id: '1', name: '1 Месяц', duration: 1, price: 100, discount: null },
    { id: '2', name: '3 Месяца', duration: 3, price: 250, discount: '-15%' },
    { id: '3', name: '1 Год', duration: 12, price: 900, discount: '-25%' }
  ]);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);

  const handleSavePlan = (id: string, updatedData: any) => {
    setPlans(plans.map(p => p.id === id ? { ...p, ...updatedData } : p));
    setEditingPlan(null);
  };

  return (
    <div className="space-y-3">
      <button className="w-full bg-tg-blue text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
        <i className="fas fa-plus"></i>
        Добавить тариф
      </button>

      {plans.map(plan => (
        <div key={plan.id} className="bg-tg-secondary rounded-xl p-4">
          {editingPlan === plan.id ? (
            <PlanEditForm
              plan={plan}
              onSave={(data) => handleSavePlan(plan.id, data)}
              onCancel={() => setEditingPlan(null)}
            />
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-semibold text-tg-text">{plan.name}</div>
                  <div className="text-xs text-tg-hint">{plan.duration} мес.</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-tg-text">{plan.price} ★</div>
                  {plan.discount && (
                    <div className="text-xs text-tg-green font-semibold">{plan.discount}</div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingPlan(plan.id)}
                  className="flex-1 bg-tg-blue/10 text-tg-blue py-2 rounded-lg text-sm font-medium"
                >
                  <i className="fas fa-edit mr-1"></i>
                  Редактировать
                </button>
                <button className="px-3 bg-tg-red/10 text-tg-red rounded-lg">
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

const PlanEditForm: React.FC<{ plan: any; onSave: (data: any) => void; onCancel: () => void }> = ({ plan, onSave, onCancel }) => {
  const [formData, setFormData] = useState(plan);

  return (
    <div className="space-y-3">
      <input
        className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text"
        placeholder="Название"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />
      <input
        type="number"
        className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text"
        placeholder="Длительность (месяцы)"
        value={formData.duration}
        onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
      />
      <input
        type="number"
        className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text"
        placeholder="Цена (звезды)"
        value={formData.price}
        onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
      />
      <input
        className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text"
        placeholder="Скидка (например -15%)"
        value={formData.discount || ''}
        onChange={(e) => setFormData({ ...formData, discount: e.target.value || null })}
      />
      <div className="flex gap-2">
        <button
          onClick={() => onSave(formData)}
          className="flex-1 bg-tg-blue text-white py-2 rounded-lg font-medium"
        >
          Сохранить
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-tg-bg text-tg-hint py-2 rounded-lg font-medium"
        >
          Отмена
        </button>
      </div>
    </div>
  );
};

// Tickets Tab Component
const TicketsTab: React.FC = () => {
  const [tickets] = useState([
    { id: '1', user: 'Иван П.', subject: 'Не работает сервер', status: 'open', date: '2024-01-15' },
    { id: '2', user: 'Мария С.', subject: 'Вопрос по оплате', status: 'answered', date: '2024-01-14' },
    { id: '3', user: 'Алексей И.', subject: 'Низкая скорость', status: 'closed', date: '2024-01-13' }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-tg-red/10 text-tg-red';
      case 'answered': return 'bg-tg-blue/10 text-tg-blue';
      case 'closed': return 'bg-tg-hint/10 text-tg-hint';
      default: return 'bg-tg-hint/10 text-tg-hint';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'Открыт';
      case 'answered': return 'Отвечен';
      case 'closed': return 'Закрыт';
      default: return status;
    }
  };

  return (
    <div className="space-y-3">
      {tickets.map(ticket => (
        <div key={ticket.id} className="bg-tg-secondary rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-tg-text">{ticket.subject}</div>
            <div className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(ticket.status)}`}>
              {getStatusText(ticket.status)}
            </div>
          </div>
          <div className="text-xs text-tg-hint mb-3">
            От: {ticket.user} • {ticket.date}
          </div>
          <button className="w-full bg-tg-blue/10 text-tg-blue py-2 rounded-lg text-sm font-medium">
            <i className="fas fa-eye mr-1"></i>
            Просмотреть
          </button>
        </div>
      ))}
    </div>
  );
};

export default Admin;
