import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUsers, faComments, faUserFriends, 
  faChevronLeft, faChevronRight, faCircle, 
  faSearch, faPlus, faUserCircle, faSignOutAlt,
  faEllipsisV, faTimes, faBars
} from '@fortawesome/free-solid-svg-icons';

const Sidebar = ({ onUserSelect, selectedUser, currentUser }) => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [offlineUsers, setOfflineUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [activeTab, setActiveTab] = useState('online');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlineSection, setShowOnlineSection] = useState(true);
  const [showOfflineSection, setShowOfflineSection] = useState(true);
  const [showFriendsSection, setShowFriendsSection] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // 获取用户列表
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await axios.get('/api/users/all', {
          headers: { Authorization: `Bearer ${token}` }
        });

        // 过滤掉当前用户
        const filteredUsers = response.data.filter(
          user => user.id !== (currentUser ? currentUser.id : null)
        );

        // 分类用户
        const online = filteredUsers.filter(user => user.status === 'online');
        const offline = filteredUsers.filter(user => user.status === 'offline');
        
        setUsers(filteredUsers);
        setOnlineUsers(online);
        setOfflineUsers(offline);
      } catch (err) {
        console.error('获取用户列表失败:', err);
        if (err.response && err.response.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
        }
      }
    };

    // 获取好友列表
    const fetchFriends = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await axios.get('/api/friends', {
          headers: { Authorization: `Bearer ${token}` }
        });

        setFriends(response.data);
      } catch (err) {
        console.error('获取好友列表失败:', err);
      }
    };

    fetchUsers();
    fetchFriends();

    // 设置定时刷新
    const interval = setInterval(() => {
      fetchUsers();
    }, 30000); // 每30秒刷新一次

    return () => clearInterval(interval);
  }, [navigate, currentUser]);

  // 处理用户选择
  const handleUserSelect = (user) => {
    onUserSelect(user);
    if (window.innerWidth < 768) {
      setShowMobileMenu(false);
    }
  };

  // 添加好友
  const handleAddFriend = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/friends', { friendId: userId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // 刷新好友列表
      const response = await axios.get('/api/friends', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFriends(response.data);
    } catch (err) {
      console.error('添加好友失败:', err);
    }
  };

  // 过滤用户列表
  const filterUsers = (userList) => {
    return userList.filter(user => 
      user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // 过滤后的用户列表
  const filteredOnlineUsers = filterUsers(onlineUsers);
  const filteredOfflineUsers = filterUsers(offlineUsers);
  const filteredFriends = filterUsers(friends);

  // 处理登出
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // 切换侧边栏折叠状态
  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  // 渲染用户列表项
  const renderUserItem = (user, isFriend = false) => (
    <li 
      key={user.id}
      className={`flex items-center py-2 px-3 cursor-pointer rounded-lg ${
        selectedUser && selectedUser.id === user.id 
          ? 'bg-yellow-100 text-yellow-800' 
          : 'hover:bg-gray-100'
      }`}
      onClick={() => handleUserSelect(user)}
    >
      <div className="relative">
        {user.avatar_url ? (
          <img 
            src={user.avatar_url} 
            alt={user.username} 
            className="w-10 h-10 rounded-full"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
            <FontAwesomeIcon icon={faUserCircle} className="text-gray-600 text-lg" />
          </div>
        )}
        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
          user.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
        }`}></span>
      </div>
      
      {!collapsed && (
        <>
          <div className="ml-3 flex-grow">
            <div className="font-medium">{user.username}</div>
            <div className="text-xs text-gray-500">
              {user.status === 'online' ? '在线' : '离线'}
            </div>
          </div>
          
          {!isFriend && (
            <button 
              className="text-gray-400 hover:text-yellow-500"
              onClick={(e) => {
                e.stopPropagation();
                handleAddFriend(user.id);
              }}
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>
          )}
        </>
      )}
    </li>
  );

  // 移动端菜单
  const mobileMenu = (
    <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowMobileMenu(false)}>
      <div 
        className="bg-white w-64 h-full p-4 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {renderSidebarContent()}
      </div>
    </div>
  );

  // 侧边栏内容
  const renderSidebarContent = () => (
    <>
      {/* 用户信息 */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} mb-6`}>
        {!collapsed && (
          <div className="flex items-center">
            {currentUser?.avatar_url ? (
              <img 
                src={currentUser.avatar_url} 
                alt="头像" 
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-red-600 to-yellow-500 flex items-center justify-center">
                <span className="text-white font-bold">
                  {currentUser?.username ? currentUser.username.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
            )}
            {!collapsed && (
              <div className="ml-3">
                <div className="font-medium">{currentUser?.username || '用户'}</div>
                <div className="text-xs text-gray-500">在线</div>
              </div>
            )}
          </div>
        )}
        
        <button 
          className="p-2 rounded-lg hover:bg-gray-100 lg:block hidden"
          onClick={toggleCollapse}
        >
          <FontAwesomeIcon icon={collapsed ? faChevronRight : faChevronLeft} />
        </button>
      </div>

      {/* 搜索框 */}
      {!collapsed && (
        <div className="relative mb-4">
          <input 
            type="text"
            placeholder="搜索用户..."
            className="w-full py-2 pl-9 pr-4 bg-gray-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-yellow-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-3 text-gray-400" />
        </div>
      )}

      {/* 标签栏 */}
      <div className={`flex ${collapsed ? 'flex-col space-y-4' : 'mb-4 border-b'}`}>
        <button
          className={`${collapsed ? 'p-2' : 'pb-2 px-4'} ${
            activeTab === 'online' 
              ? 'text-yellow-600 border-b-2 border-yellow-500' 
              : 'text-gray-500 hover:text-gray-700'
          } flex items-center justify-center flex-1`}
          onClick={() => setActiveTab('online')}
        >
          <FontAwesomeIcon icon={faCircle} className="text-green-500" />
          {!collapsed && <span className="ml-2">在线</span>}
        </button>
        <button
          className={`${collapsed ? 'p-2' : 'pb-2 px-4'} ${
            activeTab === 'all' 
              ? 'text-yellow-600 border-b-2 border-yellow-500' 
              : 'text-gray-500 hover:text-gray-700'
          } flex items-center justify-center flex-1`}
          onClick={() => setActiveTab('all')}
        >
          <FontAwesomeIcon icon={faUsers} />
          {!collapsed && <span className="ml-2">全部</span>}
        </button>
        <button
          className={`${collapsed ? 'p-2' : 'pb-2 px-4'} ${
            activeTab === 'friends' 
              ? 'text-yellow-600 border-b-2 border-yellow-500' 
              : 'text-gray-500 hover:text-gray-700'
          } flex items-center justify-center flex-1`}
          onClick={() => setActiveTab('friends')}
        >
          <FontAwesomeIcon icon={faUserFriends} />
          {!collapsed && <span className="ml-2">好友</span>}
        </button>
      </div>

      {/* 在线用户列表 */}
      {(activeTab === 'online' || activeTab === 'all') && (
        <div className="mb-4">
          <div 
            className="flex justify-between items-center mb-2 cursor-pointer"
            onClick={() => setShowOnlineSection(!showOnlineSection)}
          >
            {!collapsed && (
              <>
                <h3 className="font-medium text-gray-700">在线用户 ({filteredOnlineUsers.length})</h3>
                <FontAwesomeIcon 
                  icon={showOnlineSection ? faChevronDown : faChevronRight} 
                  className="text-gray-400"
                />
              </>
            )}
          </div>
          
          {showOnlineSection && (
            <ul className="space-y-1">
              {filteredOnlineUsers.length > 0 ? (
                filteredOnlineUsers.map(user => renderUserItem(user))
              ) : (
                !collapsed && (
                  <li className="text-gray-500 text-sm py-2 px-3">
                    没有在线用户
                  </li>
                )
              )}
            </ul>
          )}
        </div>
      )}

      {/* 离线用户列表 */}
      {activeTab === 'all' && (
        <div className="mb-4">
          <div 
            className="flex justify-between items-center mb-2 cursor-pointer"
            onClick={() => setShowOfflineSection(!showOfflineSection)}
          >
            {!collapsed && (
              <>
                <h3 className="font-medium text-gray-700">离线用户 ({filteredOfflineUsers.length})</h3>
                <FontAwesomeIcon 
                  icon={showOfflineSection ? faChevronDown : faChevronRight} 
                  className="text-gray-400"
                />
              </>
            )}
          </div>
          
          {showOfflineSection && (
            <ul className="space-y-1">
              {filteredOfflineUsers.length > 0 ? (
                filteredOfflineUsers.map(user => renderUserItem(user))
              ) : (
                !collapsed && (
                  <li className="text-gray-500 text-sm py-2 px-3">
                    没有离线用户
                  </li>
                )
              )}
            </ul>
          )}
        </div>
      )}

      {/* 好友列表 */}
      {activeTab === 'friends' && (
        <div className="mb-4">
          <div 
            className="flex justify-between items-center mb-2 cursor-pointer"
            onClick={() => setShowFriendsSection(!showFriendsSection)}
          >
            {!collapsed && (
              <>
                <h3 className="font-medium text-gray-700">好友 ({filteredFriends.length})</h3>
                <FontAwesomeIcon 
                  icon={showFriendsSection ? faChevronDown : faChevronRight} 
                  className="text-gray-400"
                />
              </>
            )}
          </div>
          
          {showFriendsSection && (
            <ul className="space-y-1">
              {filteredFriends.length > 0 ? (
                filteredFriends.map(user => renderUserItem(user, true))
              ) : (
                !collapsed && (
                  <li className="text-gray-500 text-sm py-2 px-3">
                    没有好友
                  </li>
                )
              )}
            </ul>
          )}
        </div>
      )}

      {/* 底部操作区 - 移除个人中心导航按钮，只保留登出按钮 */}
      <div className={`mt-auto pt-4 ${collapsed ? 'flex flex-col items-center' : 'border-t'}`}>
        <button
          className={`${
            collapsed 
              ? 'p-2 mt-2 rounded-full hover:bg-gray-100' 
              : 'flex items-center py-2 px-3 w-full hover:bg-gray-100 rounded-lg mt-2 text-red-500'
          }`}
          onClick={handleLogout}
        >
          <FontAwesomeIcon icon={faSignOutAlt} className={collapsed ? 'text-gray-600' : 'text-red-500'} />
          {!collapsed && <span className="ml-3">退出登录</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* 移动端菜单切换按钮 */}
      <button
        className="fixed bottom-4 right-4 lg:hidden z-30 bg-gradient-to-r from-red-600 to-yellow-500 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
        onClick={() => setShowMobileMenu(!showMobileMenu)}
      >
        <FontAwesomeIcon icon={showMobileMenu ? faTimes : faBars} />
      </button>

      {/* 移动端侧边栏 */}
      {showMobileMenu && mobileMenu}

      {/* 桌面端侧边栏 */}
      <div 
        className={`hidden lg:block h-full ${
          collapsed ? 'w-16' : 'w-64'
        } bg-white border-r p-4 transition-all duration-300 overflow-y-auto`}
      >
        {renderSidebarContent()}
      </div>
    </>
  );
};

export default Sidebar;