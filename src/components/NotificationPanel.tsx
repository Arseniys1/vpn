import React, { useState, useEffect } from 'react';
import webSocketService from '../services/websocketService';

interface Notification {
  id: string;
  type: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

const NotificationPanel: React.FC<{ userId: string }> = ({ userId }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Connect to WebSocket
    webSocketService.connect(userId);

    // Subscribe to welcome notifications
    const welcomeHandler = (data: any) => {
      const newNotification: Notification = {
        id: Date.now().toString(),
        type: 'welcome',
        message: data.message || 'Welcome to our service!',
        timestamp: new Date(),
        read: false
      };
      setNotifications(prev => [newNotification, ...prev]);
    };

    // Subscribe to balance update notifications
    const balanceHandler = (data: any) => {
      const newNotification: Notification = {
        id: Date.now().toString(),
        type: 'balance',
        message: data.message || 'Your balance has been updated',
        timestamp: new Date(),
        read: false
      };
      setNotifications(prev => [newNotification, ...prev]);
    };

    // Subscribe to general notifications
    const generalHandler = (data: any) => {
      const newNotification: Notification = {
        id: Date.now().toString(),
        type: 'general',
        message: data.message || 'New notification',
        timestamp: new Date(),
        read: false
      };
      setNotifications(prev => [newNotification, ...prev]);
    };

    webSocketService.subscribe('welcome', welcomeHandler);
    webSocketService.subscribe('balance_update', balanceHandler);
    webSocketService.subscribe('notification', generalHandler);

    // Cleanup
    return () => {
      webSocketService.unsubscribe('welcome', welcomeHandler);
      webSocketService.unsubscribe('balance_update', balanceHandler);
      webSocketService.unsubscribe('notification', generalHandler);
    };
  }, [userId]);

  const togglePanel = () => {
    setIsOpen(!isOpen);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={togglePanel}
        className="p-2 rounded-full bg-blue-500 text-white relative"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-10 border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications
              </div>
            ) : (
              <ul>
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`p-4 border-b border-gray-100 ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">{notification.message}</p>
                        <p className="text-xs text-gray-500">
                          {notification.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="p-4 border-t border-gray-200 text-center">
            <button
              onClick={() => webSocketService.disconnect()}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Disconnect WebSocket
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;