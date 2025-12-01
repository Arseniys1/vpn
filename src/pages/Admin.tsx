import React, { useState, useEffect } from 'react';
import SectionHeader from '../components/SectionHeader';
import * as adminApi from '../services/adminApi';
import {isTelegramWebApp} from "@/services/authService.ts";

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
        {activeTab === 'servers' && <ServerTab />}
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

interface Server {
  id: string;
  name: string;
  country: string;
  flag: string;
  protocol: string;
  status: string;
  admin_message?: string;
  max_connections: number;
  host: string;
  xray_panel_id: string;
  inbound_id?: number;
  is_user_specific: boolean;
}

// Servers Tab Component
const ServerTab: React.FC = () => {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingServer, setIsAddingServer] = useState(false);
  const [editingServer, setEditingServer] = useState<string | null>(null);
  const [xrayPanels, setXrayPanels] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showUserSelector, setShowUserSelector] = useState(false);
  
  const [newServer, setNewServer] = useState({
    name: '',
    country: '',
    flag: '',
    protocol: 'vless',
    status: 'online',
    admin_message: '',
    max_connections: 1000,
    host: '',
    xray_panel_id: '',
    inbound_id: 0,
    is_user_specific: false,
    user_ids: [] as string[],
  });

  useEffect(() => {
    loadServers();
    loadXrayPanels();
    loadAllUsers();
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

  const loadXrayPanels = async () => {
    try {
      const data = await adminApi.getAllXrayPanels();
      setXrayPanels(data);
    } catch (error) {
      console.error('Failed to load Xray panels:', error);
      alert('Ошибка загрузки Xray панелей');
    }
  };

  const loadAllUsers = async () => {
    try {
      const data = await adminApi.getAllUsers({ limit: 0 });
      setUsers(data.users);
    } catch (error) {
      console.error('Failed to load all users:', error);
      alert('Ошибка загрузки пользователей');
    }
  };

  const handleAddServer = async () => {
    if (!newServer.name || !newServer.country || !newServer.host || !newServer.xray_panel_id) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await adminApi.createServer(newServer);
      setServers([...servers, response]);
      setIsAddingServer(false);
      setNewServer({
        name: '',
        country: '',
        flag: '',
        protocol: 'vless',
        status: 'online',
        admin_message: '',
        max_connections: 1000,
        host: '',
        xray_panel_id: '',
        inbound_id: 0,
        is_user_specific: false,
        user_ids: [],
      });
    } catch (error) {
      console.error('Failed to add server:', error);
      alert('Failed to add server');
    }
  };

  const handleDeleteServer = async (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этот сервер?')) {
      try {
        await adminApi.deleteServer(id);
        setServers(servers.filter(server => server.id !== id));
      } catch (error) {
        console.error('Failed to delete server:', error);
        alert('Ошибка удаления сервера');
      }
    }
  };

  const handleSaveServer = async (id: string, data: any) => {
    try {
      const response = await adminApi.updateServer(id, data);
      setServers(servers.map(server => server.id === id ? response : server));
      setEditingServer(null);
    } catch (error) {
      console.error('Failed to update server:', error);
      alert('Failed to update server');
    }
  };

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
          
          {/* Basic Server Info */}
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
          <input
            className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text"
            placeholder="Хост/IP сервера"
            value={newServer.host}
            onChange={(e) => setNewServer({ ...newServer, host: e.target.value })}
          />
          
          {/* Protocol and Xray Settings */}
          <select
            className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text"
            value={newServer.protocol}
            onChange={(e) => setNewServer({ ...newServer, protocol: e.target.value })}
          >
            <option value="vless">VLESS</option>
            <option value="vmess">VMESS</option>
            <option value="trojan">Trojan</option>
          </select>
          
          <select
            className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text"
            value={newServer.xray_panel_id}
            onChange={(e) => setNewServer({ ...newServer, xray_panel_id: e.target.value })}
          >
            <option value="">Выберите Xray панель</option>
            {xrayPanels.map(panel => (
              <option key={panel.id} value={panel.id}>{panel.name}</option>
            ))}
          </select>
          
          <input
            type="number"
            className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text"
            placeholder="Inbound ID (опционально)"
            value={newServer.inbound_id || ''}
            onChange={(e) => setNewServer({ ...newServer, inbound_id: parseInt(e.target.value) || 0 })}
          />
          
          {/* User-Specific Settings */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="userSpecific"
              checked={newServer.is_user_specific}
              onChange={(e) => setNewServer({ ...newServer, is_user_specific: e.target.checked })}
            />
            <label htmlFor="userSpecific" className="text-sm text-tg-text">
              Сервер для конкретных пользователей
            </label>
          </div>
          
          {newServer.is_user_specific && (
            <button
              onClick={() => setShowUserSelector(true)}
              className="w-full bg-tg-blue/10 text-tg-blue py-2 rounded-lg text-sm font-medium"
            >
              Выбрать пользователей ({newServer.user_ids.length})
            </button>
          )}
          
          {/* Other Settings */}
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

      {showUserSelector && (
        <UserSelectorModal
          selectedUsers={newServer.user_ids}
          onConfirm={(userIds) => {
            setNewServer({ ...newServer, user_ids: userIds });
            setShowUserSelector(false);
          }}
          onCancel={() => setShowUserSelector(false)}
          allUsers={users}
        />
      )}

      {servers.map(server => (
        <div key={server.id} className="bg-tg-secondary rounded-xl overflow-hidden">
          {editingServer === server.id ? (
            <ServerEditForm
              server={server}
              onSave={(data) => handleSaveServer(server.id, data)}
              onCancel={() => setEditingServer(null)}
              xrayPanels={xrayPanels}
              allUsers={users}
              onShowUserSelector={setShowUserSelector}
            />
          ) : (
            <div className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl">{server.flag}</div>
                <div className="flex-1">
                  <div className="font-semibold text-tg-text">{server.country}</div>
                  <div className="text-xs text-tg-hint">{server.name} • {server.protocol.toUpperCase()}</div>
                  <div className="text-xs text-tg-hint">{server.host}</div>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-bold ${
                  server.status === 'online' ? 'bg-tg-green/10 text-tg-green' : 'bg-tg-red/10 text-tg-red'
                }`}>
                  {server.status}
                </div>
              </div>
              
              {server.is_user_specific && (
                <div className="text-xs text-tg-blue bg-tg-blue/10 rounded-lg p-2 mb-2">
                  <i className="fas fa-user-lock mr-1"></i>
                  Для конкретных пользователей
                </div>
              )}
              
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

const ServerEditForm: React.FC<{ 
  server: any; 
  onSave: (data: any) => void; 
  onCancel: () => void;
  xrayPanels: any[];
  allUsers: any[];
  onShowUserSelector: (show: boolean) => void;
}> = ({ server, onSave, onCancel, xrayPanels, allUsers, onShowUserSelector }) => {
  const [formData, setFormData] = useState({
    ...server,
    xray_panel_id: server.xray_panel_id || '',
    inbound_id: server.inbound_id || 0,
    is_user_specific: server.is_user_specific || false,
    user_ids: [] as string[],
  });
  
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Load assigned users when editing a user-specific server
  useEffect(() => {
    if (formData.is_user_specific) {
      const loadAssignedUsers = async () => {
        try {
          const response = await adminApi.getServerUsers(server.id);
          setFormData(prev => ({
            ...prev,
            user_ids: response.users.map((u: any) => u.id)
          }));
        } catch (error) {
          console.error('Failed to load server users:', error);
        } finally {
          setLoadingUsers(false);
        }
      };
      
      loadAssignedUsers();
    } else {
      setLoadingUsers(false);
    }
  }, [formData.is_user_specific, server.id]);

  const handleSubmit = () => {
    onSave(formData);
  };

  if (loadingUsers) {
    return (
      <div className="p-4">
        <div className="text-tg-hint">Загрузка пользователей...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <h3 className="font-semibold text-tg-text mb-2">Редактировать сервер</h3>
      
      {/* Basic Server Info */}
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
      <input
        className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text"
        placeholder="Хост/IP сервера"
        value={formData.host}
        onChange={(e) => setFormData({ ...formData, host: e.target.value })}
      />
      
      {/* Protocol and Xray Settings */}
      <select
        className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text"
        value={formData.protocol}
        onChange={(e) => setFormData({ ...formData, protocol: e.target.value })}
      >
        <option value="vless">VLESS</option>
        <option value="vmess">VMESS</option>
        <option value="trojan">Trojan</option>
      </select>
      
      <select
        className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text"
        value={formData.xray_panel_id}
        onChange={(e) => setFormData({ ...formData, xray_panel_id: e.target.value })}
      >
        <option value="">Выберите Xray панель</option>
        {xrayPanels.map(panel => (
          <option key={panel.id} value={panel.id}>{panel.name}</option>
        ))}
      </select>
      
      <input
        type="number"
        className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text"
        placeholder="Inbound ID (опционально)"
        value={formData.inbound_id || ''}
        onChange={(e) => setFormData({ ...formData, inbound_id: parseInt(e.target.value) || 0 })}
      />
      
      {/* User-Specific Settings */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="editUserSpecific"
          checked={formData.is_user_specific}
          onChange={(e) => setFormData({ ...formData, is_user_specific: e.target.checked })}
        />
        <label htmlFor="editUserSpecific" className="text-sm text-tg-text">
          Сервер для конкретных пользователей
        </label>
      </div>
      
      {formData.is_user_specific && (
        <button
          onClick={() => onShowUserSelector(true)}
          className="w-full bg-tg-blue/10 text-tg-blue py-2 rounded-lg text-sm font-medium"
        >
          Выбрать пользователей ({formData.user_ids.length})
        </button>
      )}
      
      {/* Other Settings */}
      <select
        className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text"
        value={formData.status}
        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
      >
        <option value="online">Online</option>
        <option value="maintenance">Maintenance</option>
        <option value="crowded">Crowded</option>
      </select>
      
      <input
        type="number"
        className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text"
        placeholder="Max connections"
        value={formData.max_connections}
        onChange={(e) => setFormData({ ...formData, max_connections: parseInt(e.target.value) || 1000 })}
      />
      
      <textarea
        className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text resize-none"
        placeholder="Сообщение администратора"
        rows={2}
        value={formData.admin_message || ''}
        onChange={(e) => setFormData({ ...formData, admin_message: e.target.value })}
      />
      
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
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

// User Selector Modal Component
const UserSelectorModal: React.FC<{
  selectedUsers: string[];
  onConfirm: (userIds: string[]) => void;
  onCancel: () => void;
  allUsers: any[];
}> = ({ selectedUsers, onConfirm, onCancel, allUsers }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<string[]>(selectedUsers);
  
  const filteredUsers = allUsers.filter(user => 
    user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.username && user.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
    user.telegram_id.toString().includes(searchQuery)
  );

  const toggleUser = (userId: string) => {
    if (selected.includes(userId)) {
      setSelected(selected.filter(id => id !== userId));
    } else {
      setSelected([...selected, userId]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-tg-bg rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-tg-separator">
          <h3 className="font-semibold text-tg-text">Выбрать пользователей</h3>
        </div>
        
        <div className="p-4">
          <input
            className="w-full bg-tg-secondary border border-tg-separator rounded-lg p-2 text-sm text-tg-text"
            placeholder="Поиск по имени, юзернейму или ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {filteredUsers.map(user => (
            <div 
              key={user.id} 
              className="flex items-center gap-3 p-4 border-b border-tg-separator cursor-pointer hover:bg-tg-secondary"
              onClick={() => toggleUser(user.id)}
            >
              <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                selected.includes(user.id) 
                  ? 'bg-tg-blue border-tg-blue' 
                  : 'border-tg-separator'
              }`}>
                {selected.includes(user.id) && (
                  <i className="fas fa-check text-white text-xs"></i>
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium text-tg-text">
                  {user.first_name} {user.last_name || ''}
                </div>
                <div className="text-xs text-tg-hint">
                  @{user.username || 'N/A'} • ID: {user.telegram_id}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t border-tg-separator flex gap-2">
          <button
            onClick={() => onConfirm(selected)}
            className="flex-1 bg-tg-blue text-white py-2 rounded-lg font-medium"
          >
            Готово ({selected.length})
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-tg-bg text-tg-hint py-2 rounded-lg font-medium"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};

// Users Tab Component
const UsersTab: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadUsers();
  }, [page, searchQuery]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getAllUsers({ page, limit: 20, search: searchQuery });
      setUsers(data.users);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to load users:', error);
      alert('Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId: string, updates: { balance?: number; is_active?: boolean }) => {
    try {
      await adminApi.updateUser(userId, updates);
      await loadUsers();
      setEditingUser(null);
      if (isTelegramWebApp()) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    } catch (error: any) {
      console.error('Failed to update user:', error);
      alert('Ошибка обновления пользователя: ' + (error.message || 'Неизвестная ошибка'));
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-tg-hint">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-tg-secondary rounded-lg p-3">
        <input
          type="text"
          placeholder="Поиск по имени или Telegram ID..."
          className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {users.length === 0 ? (
        <div className="text-center py-10 text-tg-hint">
          {searchQuery ? 'Пользователи не найдены' : 'Нет пользователей'}
        </div>
      ) : (
        users.map(user => (
          <UserCard
            key={user.id}
            user={user}
            isEditing={editingUser === user.id}
            onEdit={() => setEditingUser(user.id)}
            onCancel={() => setEditingUser(null)}
            onUpdate={handleUpdateUser}
          />
        ))
      )}

      {total > 20 && (
        <div className="flex justify-between items-center pt-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 bg-tg-secondary rounded-lg text-sm disabled:opacity-50"
          >
            Назад
          </button>
          <span className="text-sm text-tg-hint">Стр. {page}</span>
          <button
            disabled={page * 20 >= total}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 bg-tg-secondary rounded-lg text-sm disabled:opacity-50"
          >
            Вперед
          </button>
        </div>
      )}
    </div>
  );
};

const UserCard: React.FC<{
  user: any;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onUpdate: (userId: string, updates: any) => void;
}> = ({ user, isEditing, onEdit, onCancel, onUpdate }) => {
  const [balance, setBalance] = useState(user.balance);
  const [isActive, setIsActive] = useState(user.is_active);

  const handleSave = () => {
    onUpdate(user.id, {
      balance: parseInt(balance),
      is_active: isActive
    });
  };

  const hasSubscription = user.subscription && user.subscription.is_active;

  return (
    <div className="bg-tg-secondary rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-tg-blue rounded-full flex items-center justify-center text-white font-bold">
          {user.first_name?.charAt(0) || 'U'}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-tg-text">
            {user.first_name} {user.last_name || ''}
          </div>
          <div className="text-xs text-tg-hint">ID: {user.telegram_id}</div>
        </div>
        {user.is_admin && (
          <div className="px-2 py-1 bg-orange-500/10 text-orange-500 rounded text-xs font-bold">
            ADMIN
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-tg-hint block mb-1">Баланс</label>
            <input
              type="number"
              className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4"
            />
            <label className="text-sm text-tg-text">Активный аккаунт</label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
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
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div className="bg-tg-bg rounded-lg p-2">
              <div className="text-tg-hint">Баланс</div>
              <div className="text-tg-text font-semibold">{user.balance} ★</div>
            </div>
            <div className="bg-tg-bg rounded-lg p-2">
              <div className="text-tg-hint">Подписка</div>
              <div className={`font-semibold ${hasSubscription ? 'text-tg-green' : 'text-tg-red'}`}>
                {hasSubscription ? 'Активна' : 'Неактивна'}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="flex-1 bg-tg-blue/10 text-tg-blue py-2 rounded-lg text-sm font-medium"
            >
              <i className="fas fa-edit mr-1"></i>
              Редактировать
            </button>
            <button
              onClick={() => onUpdate(user.id, { is_active: !user.is_active })}
              className={`px-3 rounded-lg ${user.is_active ? 'bg-tg-red/10 text-tg-red' : 'bg-tg-green/10 text-tg-green'}`}
            >
              <i className={`fas fa-${user.is_active ? 'ban' : 'check'}`}></i>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// Plans Tab Component
const PlansTab: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [isAddingPlan, setIsAddingPlan] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: '', duration_months: 1, price_stars: 100, discount: '' });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getAllPlans();
      setPlans(data);
    } catch (error) {
      console.error('Failed to load plans:', error);
      alert('Ошибка загрузки тарифов');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async (id: string, updatedData: any) => {
    try {
      await adminApi.updatePlan(id, {
        name: updatedData.name,
        duration_months: parseInt(updatedData.duration_months),
        price_stars: parseInt(updatedData.price_stars),
        discount: updatedData.discount || undefined
      });
      await loadPlans();
      setEditingPlan(null);
      if (isTelegramWebApp()) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    } catch (error: any) {
      console.error('Failed to update plan:', error);
      alert('Ошибка обновления тарифа: ' + (error.message || 'Неизвестная ошибка'));
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этот тариф?')) {
      try {
        await adminApi.deletePlan(id);
        await loadPlans();
        if (isTelegramWebApp()) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
      } catch (error: any) {
        console.error('Failed to delete plan:', error);
        alert('Ошибка удаления тарифа: ' + (error.message || 'Неизвестная ошибка'));
      }
    }
  };

  const handleAddPlan = async () => {
    if (!newPlan.name || !newPlan.duration_months || !newPlan.price_stars) {
      alert('Заполните все обязательные поля');
      return;
    }
    try {
      await adminApi.createPlan({
        name: newPlan.name,
        duration_months: parseInt(newPlan.duration_months.toString()),
        price_stars: parseInt(newPlan.price_stars.toString()),
        discount: newPlan.discount || undefined
      });
      await loadPlans();
      setNewPlan({ name: '', duration_months: 1, price_stars: 100, discount: '' });
      setIsAddingPlan(false);
      if (isTelegramWebApp()) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    } catch (error: any) {
      console.error('Failed to create plan:', error);
      alert('Ошибка создания тарифа: ' + (error.message || 'Неизвестная ошибка'));
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
        onClick={() => setIsAddingPlan(true)}
        className="w-full bg-tg-blue text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
      >
        <i className="fas fa-plus"></i>
        Добавить тариф
      </button>

      {isAddingPlan && (
        <div className="bg-tg-secondary rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-tg-text mb-2">Новый тариф</h3>
          <input
            className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text"
            placeholder="Название"
            value={newPlan.name}
            onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
          />
          <input
            type="number"
            className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text"
            placeholder="Длительность (месяцы)"
            value={newPlan.duration_months}
            onChange={(e) => setNewPlan({ ...newPlan, duration_months: parseInt(e.target.value) || 1 })}
          />
          <input
            type="number"
            className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text"
            placeholder="Цена (звезды)"
            value={newPlan.price_stars}
            onChange={(e) => setNewPlan({ ...newPlan, price_stars: parseInt(e.target.value) || 100 })}
          />
          <input
            className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text"
            placeholder="Скидка (например -15%)"
            value={newPlan.discount}
            onChange={(e) => setNewPlan({ ...newPlan, discount: e.target.value })}
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddPlan}
              className="flex-1 bg-tg-blue text-white py-2 rounded-lg font-medium"
            >
              Создать
            </button>
            <button
              onClick={() => setIsAddingPlan(false)}
              className="flex-1 bg-tg-bg text-tg-hint py-2 rounded-lg font-medium"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

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
                  <div className="text-xs text-tg-hint">{plan.duration_months} мес.</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-tg-text">{plan.price_stars} ★</div>
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
                <button
                  onClick={() => handleDeletePlan(plan.id)}
                  className="px-3 bg-tg-red/10 text-tg-red rounded-lg"
                >
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
        value={formData.duration_months}
        onChange={(e) => setFormData({ ...formData, duration_months: parseInt(e.target.value) })}
      />
      <input
        type="number"
        className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text"
        placeholder="Цена (звезды)"
        value={formData.price_stars}
        onChange={(e) => setFormData({ ...formData, price_stars: parseInt(e.target.value) })}
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
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    loadTickets();
  }, [filterStatus]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getAllTickets(filterStatus || undefined);
      setTickets(data);
    } catch (error) {
      console.error('Failed to load tickets:', error);
      alert('Ошибка загрузки тикетов');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (ticketId: string) => {
    if (!replyText.trim()) {
      alert('Введите ответ');
      return;
    }
    try {
      await adminApi.replyToTicket(ticketId, {
        reply: replyText,
        status: 'answered'
      });
      await loadTickets();
      setReplyingTo(null);
      setReplyText('');
      if (isTelegramWebApp()) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    } catch (error: any) {
      console.error('Failed to reply to ticket:', error);
      alert('Ошибка ответа на тикет: ' + (error.message || 'Неизвестная ошибка'));
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-tg-hint">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => setFilterStatus('')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium ${
            filterStatus === '' ? 'bg-tg-blue text-white' : 'bg-tg-secondary text-tg-hint'
          }`}
        >
          Все
        </button>
        <button
          onClick={() => setFilterStatus('open')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium ${
            filterStatus === 'open' ? 'bg-tg-blue text-white' : 'bg-tg-secondary text-tg-hint'
          }`}
        >
          Открытые
        </button>
        <button
          onClick={() => setFilterStatus('answered')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium ${
            filterStatus === 'answered' ? 'bg-tg-blue text-white' : 'bg-tg-secondary text-tg-hint'
          }`}
        >
          Отвеченные
        </button>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-10 text-tg-hint">
          Нет тикетов
        </div>
      ) : (
        tickets.map(ticket => (
          <div key={ticket.id} className="bg-tg-secondary rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-tg-text">{ticket.subject}</div>
              <div className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(ticket.status)}`}>
                {getStatusText(ticket.status)}
              </div>
            </div>
            <div className="text-xs text-tg-hint mb-2">
              От: {ticket.user?.first_name || 'Unknown'} (ID: {ticket.user?.telegram_id || 'N/A'})
            </div>
            <div className="text-sm text-tg-text mb-3 bg-tg-bg rounded-lg p-2">
              {ticket.message}
            </div>
            {ticket.admin_reply && (
              <div className="text-sm text-tg-blue bg-tg-blue/10 rounded-lg p-2 mb-3">
                <div className="text-xs font-semibold mb-1">Ответ администратора:</div>
                {ticket.admin_reply}
              </div>
            )}
            {replyingTo === ticket.id ? (
              <div className="space-y-2">
                <textarea
                  className="w-full bg-tg-bg border border-tg-separator rounded-lg p-2 text-sm text-tg-text resize-none"
                  placeholder="Ваш ответ..."
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReply(ticket.id)}
                    className="flex-1 bg-tg-blue text-white py-2 rounded-lg text-sm font-medium"
                  >
                    Отправить
                  </button>
                  <button
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyText('');
                    }}
                    className="flex-1 bg-tg-bg text-tg-hint py-2 rounded-lg text-sm font-medium"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setReplyingTo(ticket.id)}
                className="w-full bg-tg-blue/10 text-tg-blue py-2 rounded-lg text-sm font-medium"
              >
                <i className="fas fa-reply mr-1"></i>
                Ответить
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default Admin;
