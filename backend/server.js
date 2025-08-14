const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const winston = require('winston');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const { Server } = require('socket.io');
const http = require('http');

// 初始化Express应用
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 全局logger配置
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'app.log' })
  ]
});

// 全局异常捕获
process.on('uncaughtException', (err) => {
  logger.error('未捕获异常:', err);
});

// 数据库连接配置
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'chat_platform',
  password: process.env.DB_PASSWORD || 'admin123',
  port: process.env.DB_PORT || 5432,
});

// 初始化数据库表
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(100) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        status VARCHAR(20) DEFAULT 'active',
        avatar_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id),
        receiver_id INTEGER,
        group_id INTEGER,
        content_type VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        admin_id INTEGER REFERENCES users(id),
        invite_code VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(255) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 创建默认管理员账户
    const adminExists = await pool.query('SELECT * FROM users WHERE username = $1', ['admin']);
    if (adminExists.rows.length === 0) {
      const passwordHash = bcrypt.hashSync('admin123', 10);
      await pool.query(
        'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)',
        ['admin', passwordHash, 'admin']
      );
    }
    
    logger.info('数据库初始化完成');
  } catch (err) {
    logger.error('数据库初始化失败:', err);
  }
}

// 中间件配置
app.use(helmet({
  contentSecurityPolicy: false,
  frameguard: false
}));
app.use(cors());
app.use(express.json());

// 静态资源目录
const publicPath = path.resolve(__dirname, '../frontend/public');
app.use(express.static(publicPath));

// JWT验证中间件
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, process.env.JWT_SECRET || 'secret_key', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// 管理员权限检查中间件
function checkAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '无权访问' });
  }
  next();
}

// API路由
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '1h' }
    );
    
    res.json({ token });
  } catch (err) {
    logger.error('登录错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 新增: JWT验证接口
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  try {
    // 验证通过后，返回用户信息
    res.json({
      id: req.user.id,
      username: req.user.username,
      role: req.user.role
    });
  } catch (err) {
    logger.error('令牌验证错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 新增: 获取当前用户信息接口
app.get('/api/users/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, role, status, avatar_url, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('获取用户信息错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 用户管理API
app.route('/api/users')
  .all(authenticateToken, checkAdmin)
  .get(async (req, res) => {
    try {
      const result = await pool.query('SELECT id, username, role, status FROM users');
      res.json(result.rows);
    } catch (err) {
      logger.error('获取用户列表错误:', err);
      res.status(500).json({ error: '服务器错误' });
    }
  })
  .post(async (req, res) => {
    const { username, password, role } = req.body;
    
    try {
      const passwordHash = bcrypt.hashSync(password, 10);
      const result = await pool.query(
        'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role',
        [username, passwordHash, role || 'user']
      );
      
      logger.info(`管理员 ${req.user.username} 创建用户 ${username}`);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      logger.error('创建用户错误:', err);
      res.status(500).json({ error: '服务器错误' });
    }
  });

// 新增: 注册接口
app.post('/api/register', async (req, res) => {
  const { username, password, inviteCode } = req.body;
  
  try {
    // 检查用户名是否已存在
    const existingUser = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: '用户名已存在' });
    }
    
    // 检查是否需要邀请码
    const inviteCodeRequired = await checkInviteCodeRequired();
    if (inviteCodeRequired && !inviteCode) {
      return res.status(400).json({ error: '需要提供邀请码' });
    }
    
    // 验证邀请码
    if (inviteCodeRequired) {
      const validInviteCode = await validateInviteCode(inviteCode);
      if (!validInviteCode) {
        return res.status(400).json({ error: '无效的邀请码' });
      }
    }
    
    // 创建用户
    const passwordHash = bcrypt.hashSync(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, role',
      [username, passwordHash]
    );
    
    // 标记邀请码为已使用
    if (inviteCodeRequired && inviteCode) {
      await markInviteCodeAsUsed(inviteCode);
    }
    
    logger.info(`新用户注册: ${username}`);
    res.status(201).json({ message: '注册成功' });
  } catch (err) {
    logger.error('注册错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 检查是否需要邀请码
async function checkInviteCodeRequired() {
  try {
    // 这里实现检查逻辑，可以从数据库或配置中读取
    // 示例简单返回 false
    return false;
  } catch (err) {
    logger.error('检查邀请码要求错误:', err);
    return false;
  }
}

// 验证邀请码
async function validateInviteCode(code) {
  try {
    // 这里实现验证逻辑，可以从数据库中检查邀请码是否有效
    // 示例简单返回 true
    return true;
  } catch (err) {
    logger.error('验证邀请码错误:', err);
    return false;
  }
}

// 标记邀请码为已使用
async function markInviteCodeAsUsed(code) {
  try {
    // 这里实现标记邀请码为已使用的逻辑
    // 示例简单打印日志
    logger.info(`邀请码 ${code} 已被使用`);
  } catch (err) {
    logger.error('标记邀请码错误:', err);
  }
}

// 获取邀请码设置状态
app.get('/api/settings/invite-code-status', async (req, res) => {
  try {
    const required = await checkInviteCodeRequired();
    res.json({ required });
  } catch (err) {
    logger.error('获取邀请码设置错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.route('/api/users/:id')
  .all(authenticateToken, checkAdmin)
  .put(async (req, res) => {
    const { id } = req.params;
    const { username, password, role, status } = req.body;
    
    try {
      let query = 'UPDATE users SET ';
      const params = [];
      let paramIndex = 1;
      
      if (username) {
        query += `username = $${paramIndex}, `;
        params.push(username);
        paramIndex++;
      }
      
      if (password) {
        const passwordHash = bcrypt.hashSync(password, 10);
        query += `password_hash = $${paramIndex}, `;
        params.push(passwordHash);
        paramIndex++;
      }
      
      if (role) {
        query += `role = $${paramIndex}, `;
        params.push(role);
        paramIndex++;
      }
      
      if (status) {
        query += `status = $${paramIndex}, `;
        params.push(status);
        paramIndex++;
      }
      
      // 移除最后的逗号和空格
      query = query.slice(0, -2);
      query += ` WHERE id = $${paramIndex} RETURNING id, username, role, status`;
      params.push(id);
      
      const result = await pool.query(query, params);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: '用户不存在' });
      }
      
      logger.info(`管理员 ${req.user.username} 更新用户 ${id}`);
      res.json(result.rows[0]);
    } catch (err) {
      logger.error('更新用户错误:', err);
      res.status(500).json({ error: '服务器错误' });
    }
  })
  .delete(async (req, res) => {
    const { id } = req.params;
    
    try {
      const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: '用户不存在' });
      }
      
      logger.info(`管理员 ${req.user.username} 删除用户 ${id}`);
      res.sendStatus(204);
    } catch (err) {
      logger.error('删除用户错误:', err);
      res.status(500).json({ error: '服务器错误' });
    }
  });

// WebSocket连接处理
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('未提供认证令牌'));
  
  jwt.verify(token, process.env.JWT_SECRET || 'secret_key', (err, decoded) => {
    if (err) return next(new Error('认证失败'));
    socket.user = decoded;
    next();
  });
});

io.on('connection', (socket) => {
  logger.info(`用户 ${socket.user.username} 已连接`);
  
  // 加入公共群聊
  socket.join('public');
  
  // 消息处理
  socket.on('send_message', async (data) => {
    try {
      const { receiver_id, group_id, content_type, content } = data;
      
      // 存储消息到数据库
      const result = await pool.query(
        'INSERT INTO messages (sender_id, receiver_id, group_id, content_type, content) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [socket.user.id, receiver_id, group_id, content_type, content]
      );
      
      const message = result.rows[0];
      
      // 广播消息
      if (group_id) {
        // 群聊消息
        io.to(`group_${group_id}`).emit('receive_message', message);
      } else if (receiver_id) {
        // 私聊消息
        io.to(`user_${receiver_id}`).emit('receive_message', message);
      } else {
        // 公共群聊消息
        io.to('public').emit('receive_message', message);
      }
    } catch (err) {
      logger.error('发送消息错误:', err);
    }
  });
  
  socket.on('disconnect', () => {
    logger.info(`用户 ${socket.user.username} 已断开连接`);
  });
});

// 处理前端路由
app.get('*', (req, res) => {
  const filePath = path.join(publicPath, req.path);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.sendFile(path.join(publicPath, 'index.html'));
  }
});

// 启动服务器
(async () => {
  await initDatabase();
  
  const PORT = process.env.PORT || 59551;
  server.listen(PORT, () => {
    logger.info(`服务器已启动，监听端口 ${PORT}`);
  });
})();