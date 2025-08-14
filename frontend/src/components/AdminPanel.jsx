import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faComments, faUsersCog, faChartBar, faCog, faTimes, faEdit, faTrash, faUserPlus, faLock, faUnlock, faSearch, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

const AdminPanel = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [groups, setGroups] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [inviteCodeEnabled, setInviteCodeEnabled] = useState(false);
  const [inviteCodes, setInviteCodes] = useState([]);
  const [newInviteCode, setNewInviteCode] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userFormData, setUserFormData] = useState({
    username: '',
    password: '',
    role: 'user',
    status: 'active'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    invite_code: ''
  });
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // 检查用户是否有管理员权限
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        // 验证用户角色
        const response = await axios.get('/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.role !== 'admin') {
          showNotification('您没有管理员权限', 'error');
          navigate('/chat');
        } else {
          // 加载初始数据
          fetchUsers();
        }
      } catch (err) {
        console.error('权限验证失败:', err);
        showNotification('身份验证失败，请重新登录', 'error');
        navigate('/login');
      }
    };

    checkAdminAccess();
  }, [navigate]);

  // 获取用户列表
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
      setLoading(false);
    } catch (err) {
      console.error('获取用户列表失败:', err);
      setError('获取用户数据失败');
      setLoading(false);
      showNotification('获取用户数据失败', 'error');
    }
  };

  // 获取消息列表
  const fetchMessages = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/messages/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);
      setLoading(false);
    } catch (err) {
      console.error('获取消息列表失败:', err);
      setError('获取消息数据失败');
      setLoading(false);
      showNotification('获取消息数据失败', 'error');
    }
  };

  // 获取群聊列表
  const fetchGroups = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/groups', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroups(response.data);
      setLoading(false);
    } catch (err) {
      console.error('获取群聊列表失败:', err);
      setError('获取群聊数据失败');
      setLoading(false);
      showNotification('获取群聊数据失败', 'error');
    }
  };

  // 获取统计数据
  const fetchStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
      setLoading(false);
    } catch (err) {
      console.error('获取统计数据失败:', err);
      setError('获取统计数据失败');
      setLoading(false);
      showNotification('获取统计数据失败', 'error');
    }
  };

  // 获取邀请码列表
  const fetchInviteCodes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/invite-codes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInviteCodes(response.data.codes);
      setInviteCodeEnabled(response.data.enabled);
      setLoading(false);
    } catch (err) {
      console.error('获取邀请码列表失败:', err);
      setError('获取邀请码数据失败');
      setLoading(false);
      showNotification('获取邀请码数据失败', 'error');
    }
  };

  // 切换标签时加载相应数据
  useEffect(() => {
    switch (activeTab) {
      case 'users':
        fetchUsers();
        break;
      case 'messages':
        fetchMessages();
        break;
      case 'groups':
        fetchGroups();
        break;
      case 'stats':
        fetchStats();
        break;
      case 'settings':
        fetchInviteCodes();
        break;
      default:
        break;
    }
  }, [activeTab]);

  // 添加/编辑用户
  const handleUserSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let response;
      
      if (selectedUser) {
        // 更新用户
        response = await axios.put(`/api/users/${selectedUser.id}`, userFormData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showNotification('用户更新成功', 'success');
      } else {
        // 新增用户
        response = await axios.post('/api/users', userFormData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showNotification('用户添加成功', 'success');
      }
      
      // 重新获取用户列表
      fetchUsers();
      // 重置表单
      setUserFormData({
        username: '',
        password: '',
        role: 'user',
        status: 'active'
      });
      setSelectedUser(null);
    } catch (err) {
      console.error('保存用户失败:', err);
      showNotification(err.response?.data?.error || '操作失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 删除用户
  const handleDeleteUser = async (userId) => {
    if (window.confirm('确定要删除此用户吗？此操作不可撤销。')) {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`/api/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showNotification('用户已删除', 'success');
        fetchUsers();
      } catch (err) {
        console.error('删除用户失败:', err);
        showNotification('删除用户失败', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  // 封禁/解封用户
  const handleToggleUserStatus = async (user) => {
    setLoading(true);
    const newStatus = user.status === 'active' ? 'banned' : 'active';
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/users/${user.id}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showNotification(`用户已${newStatus === 'active' ? '解封' : '封禁'}`, 'success');
      fetchUsers();
    } catch (err) {
      console.error('更新用户状态失败:', err);
      showNotification('操作失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 编辑用户
  const handleEditUser = (user) => {
    setSelectedUser(user);
    setUserFormData({
      username: user.username,
      password: '', // 不显示原密码
      role: user.role,
      status: user.status
    });
  };

  // 添加群聊
  const handleGroupSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let response;
      
      if (selectedGroup) {
        // 更新群聊
        response = await axios.put(`/api/groups/${selectedGroup.id}`, groupFormData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showNotification('群聊更新成功', 'success');
      } else {
        // 新增群聊
        response = await axios.post('/api/groups', groupFormData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showNotification('群聊创建成功', 'success');
      }
      
      // 重新获取群聊列表
      fetchGroups();
      // 重置表单
      setGroupFormData({
        name: '',
        invite_code: ''
      });
      setSelectedGroup(null);
    } catch (err) {
      console.error('保存群聊失败:', err);
      showNotification(err.response?.data?.error || '操作失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 删除群聊
  const handleDeleteGroup = async (groupId) => {
    if (window.confirm('确定要删除此群聊吗？此操作不可撤销。')) {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`/api/groups/${groupId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showNotification('群聊已删除', 'success');
        fetchGroups();
      } catch (err) {
        console.error('删除群聊失败:', err);
        showNotification('删除群聊失败', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  // 编辑群聊
  const handleEditGroup = (group) => {
    setSelectedGroup(group);
    setGroupFormData({
      name: group.name,
      invite_code: group.invite_code || ''
    });
  };

  // 删除消息
  const handleDeleteMessage = async (messageId) => {
    if (window.confirm('确定要删除此消息吗？此操作不可撤销。')) {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`/api/messages/${messageId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showNotification('消息已删除', 'success');
        fetchMessages();
      } catch (err) {
        console.error('删除消息失败:', err);
        showNotification('删除消息失败', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  // 生成新邀请码
  const handleGenerateInviteCode = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/admin/invite-codes', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewInviteCode(response.data.code);
      showNotification('邀请码生成成功', 'success');
      fetchInviteCodes();
    } catch (err) {
      console.error('生成邀请码失败:', err);
      showNotification('生成邀请码失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 切换邀请码功能
  const handleToggleInviteCode = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/admin/settings', { inviteCodeEnabled: !inviteCodeEnabled }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInviteCodeEnabled(!inviteCodeEnabled);
      showNotification(`邀请码功能已${!inviteCodeEnabled ? '开启' : '关闭'}`, 'success');
    } catch (err) {
      console.error('切换邀请码功能失败:', err);
      showNotification('操作失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 显示通知
  const showNotification = (message, type) => {
    setNotification({
      show: true,
      message,
      type
    });
    
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  // 过滤用户
  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 过滤消息
  const filteredMessages = messages.filter(message =>
    (message.content && message.content.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (message.sender && message.sender.username && message.sender.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // 过滤群聊
  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* 顶部标题栏 */}
      <div className="bg-gradient-to-r from-red-600 to-yellow-500 text-white p-4 shadow-md">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">管理员控制面板</h1>
          <div className="relative">
            <input 
              type="text" 
              placeholder="搜索..." 
              className="rounded-full py-2 px-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <FontAwesomeIcon icon={faSearch} className="absolute right-3 top-3 text-gray-500" />
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧导航菜单 */}
        <div className="w-64 bg-gray-800 text-white p-4">
          <ul>
            <li 
              className={`mb-2 p-3 rounded-lg cursor-pointer flex items-center ${activeTab === 'users' ? 'bg-yellow-600' : 'hover:bg-gray-700'}`}
              onClick={() => setActiveTab('users')}
            >
              <FontAwesomeIcon icon={faUsers} className="mr-3" />
              <span>用户管理</span>
            </li>
            <li 
              className={`mb-2 p-3 rounded-lg cursor-pointer flex items-center ${activeTab === 'messages' ? 'bg-yellow-600' : 'hover:bg-gray-700'}`}
              onClick={() => setActiveTab('messages')}
            >
              <FontAwesomeIcon icon={faComments} className="mr-3" />
              <span>消息管理</span>
            </li>
            <li 
              className={`mb-2 p-3 rounded-lg cursor-pointer flex items-center ${activeTab === 'groups' ? 'bg-yellow-600' : 'hover:bg-gray-700'}`}
              onClick={() => setActiveTab('groups')}
            >
              <FontAwesomeIcon icon={faUsersCog} className="mr-3" />
              <span>群聊管理</span>
            </li>
            <li 
              className={`mb-2 p-3 rounded-lg cursor-pointer flex items-center ${activeTab === 'stats' ? 'bg-yellow-600' : 'hover:bg-gray-700'}`}
              onClick={() => setActiveTab('stats')}
            >
              <FontAwesomeIcon icon={faChartBar} className="mr-3" />
              <span>数据统计</span>
            </li>
            <li 
              className={`mb-2 p-3 rounded-lg cursor-pointer flex items-center ${activeTab === 'settings' ? 'bg-yellow-600' : 'hover:bg-gray-700'}`}
              onClick={() => setActiveTab('settings')}
            >
              <FontAwesomeIcon icon={faCog} className="mr-3" />
              <span>系统设置</span>
            </li>
          </ul>
          <div className="border-t border-gray-600 my-4"></div>
          <button 
            className="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg transition duration-200"
            onClick={() => navigate('/chat')}
          >
            返回聊天
          </button>
        </div>

        {/* 右侧内容区 */}
        <div className="flex-1 p-6 overflow-auto">
          {/* 通知消息 */}
          {notification.show && (
            <div className={`p-4 mb-4 rounded-lg ${notification.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {notification.message}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-100 text-red-700 p-4 rounded-lg">
              {error}
            </div>
          )}

          {/* 用户管理 */}
          {activeTab === 'users' && !loading && !error && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">用户管理</h2>
                <button 
                  className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg flex items-center"
                  onClick={() => {
                    setSelectedUser(null);
                    setUserFormData({
                      username: '',
                      password: '',
                      role: 'user',
                      status: 'active'
                    });
                  }}
                >
                  <FontAwesomeIcon icon={faUserPlus} className="mr-2" />
                  添加用户
                </button>
              </div>

              {/* 用户表单 */}
              <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h3 className="text-xl font-semibold mb-4">{selectedUser ? '编辑用户' : '添加新用户'}</h3>
                <form onSubmit={handleUserSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">用户名</label>
                      <input
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring focus:ring-yellow-200"
                        value={userFormData.username}
                        onChange={(e) => setUserFormData({...userFormData, username: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">密码</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring focus:ring-yellow-200"
                          value={userFormData.password}
                          onChange={(e) => setUserFormData({...userFormData, password: e.target.value})}
                          required={!selectedUser}
                          placeholder={selectedUser ? "留空则不修改密码" : ""}
                        />
                        <button 
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="text-gray-500" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">角色</label>
                      <select
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring focus:ring-yellow-200"
                        value={userFormData.role}
                        onChange={(e) => setUserFormData({...userFormData, role: e.target.value})}
                        required
                      >
                        <option value="user">普通用户</option>
                        <option value="admin">管理员</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">状态</label>
                      <select
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring focus:ring-yellow-200"
                        value={userFormData.status}
                        onChange={(e) => setUserFormData({...userFormData, status: e.target.value})}
                        required
                      >
                        <option value="active">正常</option>
                        <option value="banned">禁用</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end mt-6">
                    {selectedUser && (
                      <button
                        type="button"
                        className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg mr-2"
                        onClick={() => {
                          setSelectedUser(null);
                          setUserFormData({
                            username: '',
                            password: '',
                            role: 'user',
                            status: 'active'
                          });
                        }}
                      >
                        取消
                      </button>
                    )}
                    <button
                      type="submit"
                      className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg"
                    >
                      {selectedUser ? '保存修改' : '添加用户'}
                    </button>
                  </div>
                </form>
              </div>

              {/* 用户列表 */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户名</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">角色</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map(user => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                            {user.role === 'admin' ? '管理员' : '普通用户'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {user.status === 'active' ? '正常' : '已禁用'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button 
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            onClick={() => handleEditUser(user)}
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </button>
                          <button 
                            className={`${user.status === 'active' ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'} mr-3`}
                            onClick={() => handleToggleUserStatus(user)}
                          >
                            <FontAwesomeIcon icon={user.status === 'active' ? faLock : faUnlock} />
                          </button>
                          <button 
                            className="text-red-600 hover:text-red-900"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 消息管理 */}
          {activeTab === 'messages' && !loading && !error && (
            <div>
              <h2 className="text-2xl font-bold mb-6">消息管理</h2>
              
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">发送者</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">接收者</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">内容</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredMessages.map(message => (
                      <tr key={message.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{message.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{message.sender?.username || '系统'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {message.receiver_id ? `私聊(ID: ${message.receiver_id})` : 
                           message.group_id ? `群聊(ID: ${message.group_id})` : '公共聊天'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${message.content_type === 'text' ? 'bg-blue-100 text-blue-800' : 
                             message.content_type === 'image' ? 'bg-green-100 text-green-800' :
                             message.content_type === 'video' ? 'bg-purple-100 text-purple-800' :
                             message.content_type === 'file' ? 'bg-yellow-100 text-yellow-800' : 
                             'bg-gray-100 text-gray-800'}`}
                          >
                            {message.content_type === 'text' ? '文本' :
                             message.content_type === 'image' ? '图片' :
                             message.content_type === 'video' ? '视频' :
                             message.content_type === 'file' ? '文件' : 
                             message.content_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {message.content_type === 'text' ? message.content :
                           message.content_type === 'image' ? '[图片]' :
                           message.content_type === 'video' ? '[视频]' :
                           message.content_type === 'file' ? '[文件]' : 
                           '[其他内容]'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(message.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button 
                            className="text-red-600 hover:text-red-900"
                            onClick={() => handleDeleteMessage(message.id)}
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 群聊管理 */}
          {activeTab === 'groups' && !loading && !error && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">群聊管理</h2>
                <button 
                  className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg flex items-center"
                  onClick={() => {
                    setSelectedGroup(null);
                    setGroupFormData({
                      name: '',
                      invite_code: ''
                    });
                  }}
                >
                  <FontAwesomeIcon icon={faUserPlus} className="mr-2" />
                  创建群聊
                </button>
              </div>

              {/* 群聊表单 */}
              <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h3 className="text-xl font-semibold mb-4">{selectedGroup ? '编辑群聊' : '创建新群聊'}</h3>
                <form onSubmit={handleGroupSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">群聊名称</label>
                      <input
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring focus:ring-yellow-200"
                        value={groupFormData.name}
                        onChange={(e) => setGroupFormData({...groupFormData, name: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">邀请码 (可选)</label>
                      <input
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring focus:ring-yellow-200"
                        value={groupFormData.invite_code}
                        onChange={(e) => setGroupFormData({...groupFormData, invite_code: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end mt-6">
                    {selectedGroup && (
                      <button
                        type="button"
                        className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg mr-2"
                        onClick={() => {
                          setSelectedGroup(null);
                          setGroupFormData({
                            name: '',
                            invite_code: ''
                          });
                        }}
                      >
                        取消
                      </button>
                    )}
                    <button
                      type="submit"
                      className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg"
                    >
                      {selectedGroup ? '保存修改' : '创建群聊'}
                    </button>
                  </div>
                </form>
              </div>

              {/* 群聊列表 */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">群聊名称</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建者</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">邀请码</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredGroups.map(group => (
                      <tr key={group.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{group.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{group.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{group.admin_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{group.invite_code || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(group.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button 
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            onClick={() => handleEditGroup(group)}
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </button>
                          <button 
                            className="text-red-600 hover:text-red-900"
                            onClick={() => handleDeleteGroup(group.id)}
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 数据统计 */}
          {activeTab === 'stats' && !loading && !error && (
            <div>
              <h2 className="text-2xl font-bold mb-6">数据统计</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">总用户数</h3>
                  <p className="text-3xl font-bold text-blue-600">{stats.totalUsers || 0}</p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">总消息数</h3>
                  <p className="text-3xl font-bold text-green-600">{stats.totalMessages || 0}</p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">总群聊数</h3>
                  <p className="text-3xl font-bold text-purple-600">{stats.totalGroups || 0}</p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">活跃用户数</h3>
                  <p className="text-3xl font-bold text-yellow-600">{stats.activeUsers || 0}</p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">今日消息数</h3>
                  <p className="text-3xl font-bold text-red-600">{stats.todayMessages || 0}</p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">文件存储用量</h3>
                  <p className="text-3xl font-bold text-indigo-600">{stats.storageUsed || '0 MB'}</p>
                </div>
              </div>
              
              <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">系统状态</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">CPU使用率</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${stats.cpuUsage || 0}%` }}></div>
                    </div>
                    <p className="text-right text-xs text-gray-500">{stats.cpuUsage || 0}%</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">内存使用率</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${stats.memoryUsage || 0}%` }}></div>
                    </div>
                    <p className="text-right text-xs text-gray-500">{stats.memoryUsage || 0}%</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 系统设置 */}
          {activeTab === 'settings' && !loading && !error && (
            <div>
              <h2 className="text-2xl font-bold mb-6">系统设置</h2>
              
              <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h3 className="text-xl font-semibold mb-4">邀请码设置</h3>
                
                <div className="flex items-center mb-4">
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={inviteCodeEnabled}
                        onChange={handleToggleInviteCode}
                      />
                      <div className={`block w-14 h-8 rounded-full ${inviteCodeEnabled ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                      <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition transform ${inviteCodeEnabled ? 'translate-x-6' : ''}`}></div>
                    </div>
                    <div className="ml-3 text-gray-700 font-medium">
                      {inviteCodeEnabled ? '开启邀请码功能' : '关闭邀请码功能'}
                    </div>
                  </label>
                </div>
                
                <p className="text-sm text-gray-500 mb-4">
                  {inviteCodeEnabled ? 
                    '邀请码功能已开启，新用户注册时需要输入有效的邀请码。' : 
                    '邀请码功能已关闭，新用户可以直接注册。'}
                </p>
                
                {inviteCodeEnabled && (
                  <div>
                    <button
                      className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg mb-4"
                      onClick={handleGenerateInviteCode}
                    >
                      生成新邀请码
                    </button>
                    
                    {newInviteCode && (
                      <div className="bg-yellow-100 text-yellow-800 p-4 rounded-lg mb-4">
                        新邀请码: <span className="font-bold">{newInviteCode}</span>
                      </div>
                    )}
                    
                    <h4 className="font-semibold mb-2">现有邀请码</h4>
                    
                    {inviteCodes.length === 0 ? (
                      <p className="text-gray-500">暂无邀请码</p>
                    ) : (
                      <div className="bg-gray-100 p-4 rounded-lg max-h-40 overflow-y-auto">
                        <ul>
                          {inviteCodes.map((code, index) => (
                            <li key={index} className="mb-1">
                              <span className="font-mono">{code.code}</span>
                              {code.used && <span className="text-red-500 ml-2">已使用</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">其他设置</h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">系统维护模式</label>
                    <label className="flex items-center cursor-pointer">
                      <div className="relative">
                        <input type="checkbox" className="sr-only" />
                        <div className="block w-14 h-8 rounded-full bg-gray-400"></div>
                        <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition"></div>
                      </div>
                      <div className="ml-3 text-gray-700 font-medium">
                        关闭
                      </div>
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">文件上传大小限制</label>
                    <select className="block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring focus:ring-yellow-200">
                      <option>5MB</option>
                      <option>10MB</option>
                      <option>20MB</option>
                      <option>50MB</option>
                      <option>不限制</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">用户头像默认图</label>
                    <input type="file" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100" />
                  </div>
                </div>
                
                <div className="mt-6">
                  <button className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-lg">
                    保存设置
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;