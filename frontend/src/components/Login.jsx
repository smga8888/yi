import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faLock, faEnvelope, faArrowRight, faUserPlus, faSignInAlt, faKey } from '@fortawesome/free-solid-svg-icons';

const Login = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('login');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    inviteCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [inviteCodeRequired, setInviteCodeRequired] = useState(false);
  
  // 检查用户是否已登录
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // 验证token有效性
      axios.get('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(() => {
        navigate('/chat'); // 如果token有效，直接跳转至聊天页面
      })
      .catch(() => {
        // token无效，清除本地存储
        localStorage.removeItem('token');
      });
    }
    
    // 检查是否需要邀请码
    axios.get('/api/settings/invite-code-status')
      .then(response => {
        setInviteCodeRequired(response.data.required);
      })
      .catch(err => {
        console.error('获取邀请码设置失败:', err);
        // 默认不需要邀请码
        setInviteCodeRequired(false);
      });
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError(null);
    setSuccess(null);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/login', {
        username: formData.username,
        password: formData.password
      });
      
      // 存储token
      localStorage.setItem('token', response.data.token);
      
      // 获取用户信息
      const userInfoResponse = await axios.get('/api/users/me', {
        headers: { Authorization: `Bearer ${response.data.token}` }
      });
      
      // 存储用户信息
      localStorage.setItem('user', JSON.stringify(userInfoResponse.data));
      
      // 根据角色跳转
      if (userInfoResponse.data.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/chat');
      }
    } catch (err) {
      setError(err.response?.data?.error || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    // 验证密码是否匹配
    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      setLoading(false);
      return;
    }
    
    try {
      const registerData = {
        username: formData.username,
        password: formData.password
      };
      
      // 如果需要邀请码，添加到请求数据中
      if (inviteCodeRequired) {
        if (!formData.inviteCode) {
          setError('请输入邀请码');
          setLoading(false);
          return;
        }
        registerData.inviteCode = formData.inviteCode;
      }
      
      await axios.post('/api/register', registerData);
      
      setSuccess('注册成功，请登录');
      setFormData({
        ...formData,
        password: '',
        confirmPassword: '',
        inviteCode: ''
      });
      
      // 3秒后切换到登录标签
      setTimeout(() => {
        setActiveTab('login');
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || '注册失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-red-600 to-yellow-500">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-2xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-yellow-500">
            聊天室
          </h1>
          <p className="mt-2 text-sm text-gray-600">随时随地，与朋友保持联系</p>
        </div>

        {/* 标签切换 */}
        <div className="flex border-b border-gray-200">
          <button
            className={`flex-1 py-4 font-medium text-sm ${
              activeTab === 'login'
                ? 'border-b-2 border-yellow-500 text-yellow-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => handleTabChange('login')}
          >
            <FontAwesomeIcon icon={faSignInAlt} className="mr-2" />
            登录
          </button>
          <button
            className={`flex-1 py-4 font-medium text-sm ${
              activeTab === 'register'
                ? 'border-b-2 border-yellow-500 text-yellow-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => handleTabChange('register')}
          >
            <FontAwesomeIcon icon={faUserPlus} className="mr-2" />
            注册
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="p-4 text-sm text-red-700 bg-red-100 rounded-lg">
            {error}
          </div>
        )}

        {/* 成功提示 */}
        {success && (
          <div className="p-4 text-sm text-green-700 bg-green-100 rounded-lg">
            {success}
          </div>
        )}

        {/* 登录表单 */}
        {activeTab === 'login' && (
          <form className="mt-6 space-y-6" onSubmit={handleLoginSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                用户名
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <FontAwesomeIcon icon={faUser} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="请输入用户名"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                密码
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <FontAwesomeIcon icon={faLock} className="text-gray-400" />
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="请输入密码"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-red-600 to-yellow-500 border border-transparent rounded-md shadow-sm hover:from-red-700 hover:to-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 ${
                  loading ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <svg className="w-5 h-5 mr-3 -ml-1 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <FontAwesomeIcon icon={faArrowRight} className="mr-2" />
                )}
                {loading ? '登录中...' : '登录'}
              </button>
            </div>
          </form>
        )}

        {/* 注册表单 */}
        {activeTab === 'register' && (
          <form className="mt-6 space-y-6" onSubmit={handleRegisterSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                用户名
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <FontAwesomeIcon icon={faUser} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="请输入用户名"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                密码
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <FontAwesomeIcon icon={faLock} className="text-gray-400" />
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="请输入密码"
                  minLength="6"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                确认密码
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <FontAwesomeIcon icon={faLock} className="text-gray-400" />
                </div>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="请再次输入密码"
                  minLength="6"
                />
              </div>
            </div>

            {/* 邀请码（当需要时显示） */}
            {inviteCodeRequired && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  邀请码
                </label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <FontAwesomeIcon icon={faKey} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="inviteCode"
                    value={formData.inviteCode}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                    placeholder="请输入邀请码"
                  />
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-red-600 to-yellow-500 border border-transparent rounded-md shadow-sm hover:from-red-700 hover:to-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 ${
                  loading ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <svg className="w-5 h-5 mr-3 -ml-1 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <FontAwesomeIcon icon={faUserPlus} className="mr-2" />
                )}
                {loading ? '注册中...' : '注册'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 text-gray-500 bg-white">
                {activeTab === 'login' ? '没有账号?' : '已有账号?'}
              </span>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => handleTabChange(activeTab === 'login' ? 'register' : 'login')}
              className="font-medium text-yellow-600 hover:text-yellow-500"
            >
              {activeTab === 'login' ? '创建新账号' : '使用已有账号登录'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;