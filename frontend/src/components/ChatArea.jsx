import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPaperPlane, faImage, faVideo, faFile, 
  faSmile, faSearch, faEllipsisV, faUsers,
  faDownload, faExpand, faTrash, faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';

const ChatArea = ({ selectedUser, currentUser }) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [fileToUpload, setFileToUpload] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const messagesEndRef = useRef(null);
  const messageContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const PER_PAGE = 30; // 每次加载的消息数量
  
  // 表情符号列表
  const emojis = ['😀', '😂', '😊', '😍', '🤔', '😎', '😢', '😡', '👍', '👎', '❤️', '🎉'];

  // 初始化WebSocket连接
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // 创建Socket连接
    const newSocket = io('/', {
      auth: { token },
      transports: ['websocket'],
      upgrade: false
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('WebSocket连接成功');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('WebSocket连接断开');
    });

    newSocket.on('connect_error', (err) => {
      console.error('WebSocket连接错误:', err);
      setError('连接服务器失败，请检查网络或重新登录');
      // 如果是认证错误，重定向到登录页面
      if (err.message === '认证失败') {
        localStorage.removeItem('token');
        navigate('/login');
      }
    });

    // 监听接收消息事件
    newSocket.on('receive_message', (message) => {
      setMessages(prevMessages => {
        // 检查消息是否已存在（防止重复）
        const exists = prevMessages.some(msg => msg.id === message.id);
        if (exists) return prevMessages;
        
        // 添加新消息
        return [...prevMessages, message].sort((a, b) => 
          new Date(a.timestamp) - new Date(b.timestamp)
        );
      });
    });

    // 监听在线用户更新
    newSocket.on('online_users', (users) => {
      setOnlineUsers(users);
    });

    setSocket(newSocket);

    // 组件卸载时关闭连接
    return () => {
      newSocket.disconnect();
    };
  }, [navigate]);

  // 加载历史消息
  useEffect(() => {
    if (!isConnected) return;
    
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        let url = `/api/messages?page=${page}&limit=${PER_PAGE}`;
        if (selectedUser) {
          url += `&userId=${selectedUser.id}`;
        }
        
        const response = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const newMessages = response.data;
        
        // 更新消息列表，避免重复
        setMessages(prevMessages => {
          const combinedMessages = [...prevMessages, ...newMessages];
          const uniqueMessages = combinedMessages.filter((message, index, self) =>
            index === self.findIndex(m => m.id === message.id)
          );
          
          return uniqueMessages.sort((a, b) => 
            new Date(a.timestamp) - new Date(b.timestamp)
          );
        });
        
        // 检查是否还有更多消息
        setHasMore(newMessages.length === PER_PAGE);
        setLoading(false);
      } catch (err) {
        console.error('获取消息失败:', err);
        setError('获取历史消息失败');
        setLoading(false);
      }
    };
    
    fetchMessages();
  }, [page, selectedUser, isConnected]);

  // 滚动到最新消息
  useEffect(() => {
    if (messages.length && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // 处理发送消息
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    
    if ((!inputMessage.trim() && !fileToUpload) || !socket || !isConnected) return;
    
    try {
      if (fileToUpload) {
        await handleFileUpload();
      } else {
        // 发送文本消息
        socket.emit('send_message', {
          content_type: 'text',
          content: inputMessage,
          receiver_id: selectedUser ? selectedUser.id : null,
          group_id: null // 默认为公共聊天
        });
      }
      
      // 清空输入框
      setInputMessage('');
    } catch (err) {
      console.error('发送消息失败:', err);
      setError('发送消息失败，请重试');
    }
  };

  // 处理文件上传
  const handleFileUpload = async () => {
    if (!fileToUpload) return;
    
    try {
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('receiver_id', selectedUser ? selectedUser.id : null);
      
      const token = localStorage.getItem('token');
      
      // 上传文件到服务器
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        }
      });
      
      // 发送带有文件URL的消息
      const { fileUrl, fileType } = response.data;
      
      socket.emit('send_message', {
        content_type: fileType, // 'image', 'video', or 'file'
        content: fileUrl,
        receiver_id: selectedUser ? selectedUser.id : null,
        group_id: null
      });
      
      // 清空文件
      setFileToUpload(null);
      setUploadProgress(0);
    } catch (err) {
      console.error('文件上传失败:', err);
      setError('文件上传失败，请重试');
    } finally {
      setIsUploading(false);
    }
  };

  // 加载更多历史消息
  const loadMoreMessages = () => {
    if (loading || !hasMore) return;
    setPage(prevPage => prevPage + 1);
  };

  // 监听消息容器滚动，实现无限滚动加载
  const handleScroll = () => {
    if (!messageContainerRef.current) return;
    
    const { scrollTop } = messageContainerRef.current;
    
    if (scrollTop === 0 && hasMore && !loading) {
      loadMoreMessages();
    }
  };

  // 选择文件处理
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // 文件大小限制检查（表情包限制2MB，其他不限）
    if (file.type.startsWith('image/') && file.size > 2 * 1024 * 1024) {
      setError('表情包大小不能超过2MB');
      return;
    }
    
    setFileToUpload(file);
    
    // 创建预览
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileType = file.type.split('/')[0]; // 'image', 'video', etc.
      setMediaPreview({
        type: fileType,
        url: e.target.result,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  // 取消文件上传
  const cancelFileUpload = () => {
    setFileToUpload(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 添加表情符号到消息
  const addEmoji = (emoji) => {
    setInputMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // 搜索消息
  const searchMessages = async () => {
    if (!searchTerm.trim()) return;
    
    try {
      setIsSearching(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`/api/messages/search?term=${searchTerm}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSearchResults(response.data);
    } catch (err) {
      console.error('搜索消息失败:', err);
      setError('搜索失败，请重试');
    } finally {
      setIsSearching(false);
    }
  };

  // 清除搜索
  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setIsSearching(false);
  };

  // 预览媒体文件
  const previewMedia = (message) => {
    if (message.content_type === 'image' || message.content_type === 'video') {
      setMediaPreview({
        type: message.content_type,
        url: message.content,
        name: '查看媒体文件'
      });
    }
  };

  // 关闭媒体预览
  const closeMediaPreview = () => {
    setMediaPreview(null);
  };

  // 下载文件
  const downloadFile = (url, fileName) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 格式化时间
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // 格式化日期
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  // 获取当前聊天标题
  const getChatTitle = () => {
    if (selectedUser) {
      return selectedUser.username;
    }
    return '公共聊天室';
  };

  // 获取在线用户数量
  const getOnlineUserCount = () => {
    return onlineUsers.length;
  };

  // 渲染消息气泡
  const renderMessage = (message, index) => {
    const isCurrentUser = message.sender_id === (currentUser ? currentUser.id : null);
    const showDate = index === 0 || 
      formatDate(message.timestamp) !== formatDate(messages[index - 1].timestamp);
    
    return (
      <React.Fragment key={message.id || index}>
        {/* 日期分隔线 */}
        {showDate && (
          <div className="flex justify-center my-4">
            <div className="bg-gray-200 rounded-full px-4 py-1 text-xs text-gray-600">
              {formatDate(message.timestamp)}
            </div>
          </div>
        )}
        
        {/* 消息气泡 */}
        <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}>
          <div className={`max-w-[70%] ${isCurrentUser ? 'bg-gradient-to-r from-red-600 to-yellow-500 text-white' : 'bg-gray-200 text-gray-800'} rounded-xl p-3 ${isCurrentUser ? 'rounded-tr-none' : 'rounded-tl-none'}`}>
            {/* 发送者名称 */}
            {!isCurrentUser && (
              <div className="text-xs font-semibold mb-1">
                {message.sender ? message.sender.username : '未知用户'}
              </div>
            )}
            
            {/* 消息内容 */}
            {message.content_type === 'text' && (
              <div className="whitespace-pre-wrap break-words">{message.content}</div>
            )}
            
            {message.content_type === 'image' && (
              <div className="cursor-pointer" onClick={() => previewMedia(message)}>
                <img 
                  src={message.content} 
                  alt="图片" 
                  className="max-w-full rounded-lg"
                  loading="lazy"
                />
              </div>
            )}
            
            {message.content_type === 'video' && (
              <div>
                <video 
                  controls 
                  className="max-w-full rounded-lg"
                  preload="metadata"
                >
                  <source src={message.content} />
                  您的浏览器不支持视频标签
                </video>
              </div>
            )}
            
            {message.content_type === 'file' && (
              <div className="flex items-center">
                <FontAwesomeIcon icon={faFile} className="mr-2" />
                <span className="truncate">{message.file_name || '文件'}</span>
                <button 
                  className="ml-2 text-sm hover:text-blue-500"
                  onClick={() => downloadFile(message.content, message.file_name)}
                >
                  <FontAwesomeIcon icon={faDownload} />
                </button>
              </div>
            )}
            
            {/* 时间戳 */}
            <div className={`text-xs mt-1 ${isCurrentUser ? 'text-white opacity-70' : 'text-gray-500'}`}>
              {formatTime(message.timestamp)}
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  };

  // 主渲染
  return (
    <div className="flex flex-col h-full bg-white">
      {/* 顶部标题栏 */}
      <div className="bg-gradient-to-r from-red-600 to-yellow-500 text-white p-4 shadow-md flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">{getChatTitle()}</h2>
          <div className="text-sm opacity-80">
            {selectedUser ? '私聊' : `公共聊天室 (${getOnlineUserCount()}人在线)`}
          </div>
        </div>
        
        <div className="flex items-center">
          <button 
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full mr-2"
            onClick={() => setIsSearching(!isSearching)}
          >
            <FontAwesomeIcon icon={faSearch} />
          </button>
          
          <button 
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full"
            onClick={() => {/* 打开设置菜单 */}}
          >
            <FontAwesomeIcon icon={faEllipsisV} />
          </button>
        </div>
      </div>
      
      {/* 搜索栏 (条件渲染) */}
      {isSearching && (
        <div className="bg-gray-100 p-2 flex items-center">
          <input 
            type="text"
            placeholder="搜索消息..."
            className="flex-1 px-3 py-2 rounded-l-md focus:outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchMessages()}
          />
          <button 
            className="bg-yellow-500 text-white px-4 py-2 rounded-r-md"
            onClick={searchMessages}
          >
            <FontAwesomeIcon icon={faSearch} />
          </button>
          <button 
            className="ml-2 p-2 text-gray-500 hover:text-gray-700"
            onClick={clearSearch}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
      )}
      
      {/* 消息列表容器 */}
      <div 
        className="flex-1 overflow-y-auto p-4" 
        ref={messageContainerRef}
        onScroll={handleScroll}
      >
        {/* 加载更多按钮 */}
        {hasMore && (
          <div className="text-center my-2">
            <button 
              className="text-blue-500 text-sm hover:underline" 
              onClick={loadMoreMessages}
              disabled={loading}
            >
              {loading ? '加载中...' : '加载更多消息'}
            </button>
          </div>
        )}
        
        {/* 搜索结果 */}
        {isSearching && searchResults.length > 0 && (
          <div className="bg-yellow-100 p-2 rounded-md mb-4">
            <div className="text-sm font-medium mb-1">搜索结果：</div>
            {searchResults.map((message, index) => renderMessage(message, index))}
          </div>
        )}
        
        {/* 无搜索结果提示 */}
        {isSearching && searchTerm && searchResults.length === 0 && !loading && (
          <div className="text-center my-4 text-gray-500">
            没有找到匹配的消息
          </div>
        )}
        
        {/* 正常消息列表 */}
        {!isSearching && messages.map((message, index) => renderMessage(message, index))}
        
        {/* 错误提示 */}
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-md my-2 flex items-center">
            <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
            {error}
          </div>
        )}
        
        {/* 空消息提示 */}
        {!loading && messages.length === 0 && !error && !isSearching && (
          <div className="text-center my-10 text-gray-500">
            <FontAwesomeIcon icon={faComments} className="text-5xl mb-2 opacity-30" />
            <p>没有消息，开始聊天吧！</p>
          </div>
        )}
        
        {/* 用于滚动到底部的引用 */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* 媒体文件预览弹窗 */}
      {mediaPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={closeMediaPreview}>
          <div className="relative max-w-3xl max-h-[90vh] p-2" onClick={e => e.stopPropagation()}>
            {mediaPreview.type === 'image' && (
              <img 
                src={mediaPreview.url} 
                alt="预览图片" 
                className="max-w-full max-h-[85vh] object-contain"
              />
            )}
            
            {mediaPreview.type === 'video' && (
              <video 
                controls 
                autoPlay 
                className="max-w-full max-h-[85vh]"
              >
                <source src={mediaPreview.url} />
                您的浏览器不支持视频标签
              </video>
            )}
            
            <button 
              className="absolute top-2 right-2 bg-white rounded-full p-2 text-gray-700 hover:text-red-500"
              onClick={closeMediaPreview}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
            
            {/* 文件名 */}
            <div className="text-white text-center mt-2">{mediaPreview.name}</div>
          </div>
        </div>
      )}
      
      {/* 上传进度条 */}
      {isUploading && (
        <div className="w-full h-1 bg-gray-200">
          <div 
            className="h-full bg-gradient-to-r from-red-500 to-yellow-400"
            style={{ width: `${uploadProgress}%` }}
          ></div>
        </div>
      )}
      
      {/* 文件预览区域 */}
      {fileToUpload && !isUploading && (
        <div className="bg-gray-100 p-3 flex items-center justify-between">
          <div className="flex items-center">
            {mediaPreview && mediaPreview.type === 'image' && (
              <img 
                src={mediaPreview.url} 
                alt="预览图片" 
                className="h-10 w-10 object-cover rounded mr-2"
              />
            )}
            
            {mediaPreview && mediaPreview.type === 'video' && (
              <div className="h-10 w-10 bg-black flex items-center justify-center rounded mr-2">
                <FontAwesomeIcon icon={faVideo} className="text-white" />
              </div>
            )}
            
            {(!mediaPreview || mediaPreview.type !== 'image' && mediaPreview.type !== 'video') && (
              <div className="h-10 w-10 bg-gray-300 flex items-center justify-center rounded mr-2">
                <FontAwesomeIcon icon={faFile} className="text-gray-600" />
              </div>
            )}
            
            <span className="text-sm truncate max-w-xs">
              {fileToUpload.name}
            </span>
          </div>
          
          <button 
            className="text-red-500 hover:text-red-700"
            onClick={cancelFileUpload}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
      )}
      
      {/* 底部输入区域 */}
      <div className="border-t p-3">
        <form onSubmit={handleSendMessage} className="flex flex-col">
          {/* 表情选择器 */}
          {showEmojiPicker && (
            <div className="bg-white border rounded-lg shadow-lg p-2 mb-2 flex flex-wrap">
              {emojis.map((emoji, index) => (
                <button
                  key={index}
                  type="button"
                  className="p-2 text-xl hover:bg-gray-100 rounded"
                  onClick={() => addEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
          
          <div className="flex">
            {/* 附加文件按钮 */}
            <div className="flex">
              <button
                type="button"
                className="p-2 text-gray-500 hover:text-yellow-500"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <FontAwesomeIcon icon={faSmile} />
              </button>
              
              <label className="p-2 text-gray-500 hover:text-yellow-500 cursor-pointer">
                <FontAwesomeIcon icon={faImage} />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                  ref={fileInputRef}
                />
              </label>
              
              <label className="p-2 text-gray-500 hover:text-yellow-500 cursor-pointer">
                <FontAwesomeIcon icon={faVideo} />
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
              
              <label className="p-2 text-gray-500 hover:text-yellow-500 cursor-pointer">
                <FontAwesomeIcon icon={faFile} />
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
            </div>
            
            {/* 输入框 */}
            <input
              type="text"
              placeholder="输入消息..."
              className="flex-1 border rounded-l-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-yellow-500"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isUploading}
            />
            
            {/* 发送按钮 */}
            <button
              type="submit"
              className="bg-gradient-to-r from-red-600 to-yellow-500 text-white rounded-r-lg px-4"
              disabled={(!inputMessage.trim() && !fileToUpload) || isUploading}
            >
              <FontAwesomeIcon icon={faPaperPlane} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatArea;