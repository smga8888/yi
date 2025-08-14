import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

// 导入组件
import Login from './components/Login';
import ChatArea from './components/ChatArea';
import Sidebar from './components/Sidebar';
import AdminPanel from './components/AdminPanel';

// 导入样式
import 'animate.css';

// 主App组件
const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化验证用户
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // 验证token有效性
      axios.get('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(response => {
          setCurrentUser(response.data);
          setIsLoading(false);
        })
        .catch(() => {
          localStorage.removeItem('token');
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  // 处理用户选择
  const handleUserSelect = (user) => {
    setSelectedUser(user);
  };

  // 加载tailwind CSS
  useEffect(() => {
    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.href = 'https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css';
    document.head.appendChild(linkElement);

    return () => {
      document.head.removeChild(linkElement);
    };
  }, []);

  // 身份验证保护路由
  const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    if (!token) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  // 管理员保护路由
  const AdminRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token || user.role !== 'admin') {
      return <Navigate to="/chat" replace />;
    }
    return children;
  };

  // 主聊天布局组件
  const ChatLayout = () => (
    <div className="flex h-screen">
      <Sidebar 
        onUserSelect={handleUserSelect} 
        selectedUser={selectedUser} 
        currentUser={currentUser} 
      />
      <div className="flex-1">
        <ChatArea 
          selectedUser={selectedUser} 
          currentUser={currentUser} 
        />
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/chat" 
          element={
            <ProtectedRoute>
              <ChatLayout />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/admin" 
          element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          }
        />
        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>
    </Router>
  );
};

export default App;