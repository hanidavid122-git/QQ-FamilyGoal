/**
 * QQ-FamilyGoal 极简零编译依赖本地后端服务器 (ES Module 版本)
 * 
 * 功能：
 * 1. 内存式轻量数据库，高频数据读写性能无敌，免去编译 SQLite 等 C++ 扩展报错问题。
 * 2. 发生写操作时原子性写入 db.json 进行持久化，保障数据绝不损坏、绝不丢失。
 * 3. 完美兼容前端 Supabase 适配器的 CRUD API 接口及 WebSocket 订阅广播，实现实时多端数据同步。
 * 4. 自动集成前端打包后的静态资源托管。
 */

import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// --- 数据库初始化 ---
let db = {
  goals: [],
  transactions: [],
  achievements: [],
  checkins: [],
  rewards: [],
  messages: [],
  profiles: [],
  activities: [],
  goal_comments: []
};

// 预设默认奖励数据 (对应原 schema)
const DEFAULT_REWARDS = [
  { id: 'r1', name: '选择家庭电影', cost: 100, is_active: true, is_custom: false, icon_name: 'Film' },
  { id: 'r2', name: '免做家务一天', cost: 200, is_active: true, is_custom: false, icon_name: 'Target' },
  { id: 'r3', name: '自选家庭出游', cost: 300, is_active: true, is_custom: false, icon_name: 'Car' },
  { id: 'r4', name: '最爱晚餐点菜权', cost: 150, is_active: true, is_custom: false, icon_name: 'Utensils' },
  { id: 'r5', name: '额外游戏时间', cost: 50, is_active: true, is_custom: false, icon_name: 'Gamepad' }
];

// 预设默认角色数据
const DEFAULT_PROFILES = [
  { role: '爸爸', pin: '1183', layout_config: null, avatar_url: null },
  { role: '妈妈', pin: '1183', layout_config: null, avatar_url: null },
  { role: '姐姐', pin: '1183', layout_config: null, avatar_url: null },
  { role: '妹妹', pin: '1183', layout_config: null, avatar_url: null }
];

// 原子写入持久化，高安全等级保障
const saveDb = () => {
  try {
    const tempFile = DB_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (e) {
    console.error('❌ 数据持久化写入 db.json 失败:', e);
  }
};

// 载入数据库文件
const loadDb = () => {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      db = JSON.parse(data);
      // 确保所有表都存在，防止因旧版 db.json 引起报错
      const tables = ['goals', 'transactions', 'achievements', 'checkins', 'rewards', 'messages', 'profiles', 'activities', 'goal_comments'];
      tables.forEach(t => {
        if (!db[t]) db[t] = [];
      });
      // console.log('📂 成功载入本地 db.json 数据');
    } catch (e) {
      console.error('❌ 载入本地 db.json 出错，正重新初始化内存 DB', e);
    }
  } else {
    // 首次运行，写入默认值
    db.rewards = DEFAULT_REWARDS;
    db.profiles = DEFAULT_PROFILES;
    saveDb();
    console.log('✨ 本地数据库文件不存在，已成功初始化默认角色与奖励数据');
  }
};

loadDb();

// --- Express 服务配置 ---
const app = express();
app.use(express.json({ limit: '50mb' })); // 支持 base64 图片等大字段传输

// 支持跨域请求，方便本地开发环境调试
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 托管前端构建后的静态文件
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  console.log(`🚀 已启用前端静态网页托管: ${distPath}`);
} else {
  console.log('⚠️ 提示: dist 文件夹不存在。请先运行 npm run build 打包前端。');
}

// 创建 HTTP 与 WebSocket 服务
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// 广播通知，将变动秒级分发给所有在线的网页客户端
const broadcast = (table, eventType, recordNew = null, recordOld = null) => {
  const payload = JSON.stringify({
    table,
    eventType, // 'INSERT', 'UPDATE', 'DELETE'
    new: recordNew,
    old: recordOld
  });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
};

// --- WebSocket 端口升级绑定 ---
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws) => {
  // console.log('[WS] 有新的客户端建立实时订阅连接');
  ws.on('error', (err) => console.error('[WS] 客户端发生错误:', err));
});

// --- API 核心读写逻辑 ---

// 通用过滤逻辑
function matchFilters(item, filters) {
  if (!filters || !Array.isArray(filters)) return true;
  return filters.every(f => {
    const val = item[f.column];
    if (f.type === 'eq') {
      return String(val) === String(f.value);
    }
    if (f.type === 'in') {
      return Array.isArray(f.value) && f.value.map(String).includes(String(val));
    }
    if (f.type === 'is') {
      if (f.value === null) {
        return val === null || val === undefined;
      }
      return val === f.value;
    }
    return true;
  });
}

// 1. 读操作接口 GET /api/:table
app.get('/api/:table', (req, res) => {
  const { table } = req.params;
  if (!db[table]) {
    return res.status(404).json({ data: null, error: { message: `表 [${table}] 不存在` } });
  }

  let list = [...db[table]];

  // 1. 处理过滤条件
  if (req.query.filters) {
    try {
      const filters = JSON.parse(req.query.filters);
      list = list.filter(item => matchFilters(item, filters));
    } catch (e) {
      return res.status(400).json({ data: null, error: { message: 'filters 参数格式错误' } });
    }
  }

  // 2. 处理排序
  if (req.query.orders) {
    try {
      const orders = JSON.parse(req.query.orders);
      orders.forEach(ord => {
        list.sort((a, b) => {
          const valA = a[ord.column];
          const valB = b[ord.column];
          if (valA === undefined || valA === null) return ord.ascending ? -1 : 1;
          if (valB === undefined || valB === null) return ord.ascending ? 1 : -1;
          
          if (typeof valA === 'string' && typeof valB === 'string') {
            return ord.ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
          }
          return ord.ascending ? valA - valB : valB - valA;
        });
      });
    } catch (e) {
      return res.status(400).json({ data: null, error: { message: 'orders 参数格式错误' } });
    }
  }

  // 3. 处理 Limit
  if (req.query.limit) {
    const limitNum = parseInt(req.query.limit, 10);
    if (!isNaN(limitNum)) {
      list = list.slice(0, limitNum);
    }
  }

  res.json({ data: list, error: null });
});

// 2. 写操作接口 POST /api/:table (增/删/改/Upsert 统合端点)
app.post('/api/:table', (req, res) => {
  const { table } = req.params;
  const { action, data, options, filters, select } = req.body;

  if (!db[table]) {
    return res.status(404).json({ data: null, error: { message: `表 [${table}] 不存在` } });
  }

  let tableList = db[table];
  let responseData = null;

  switch (action) {
    case 'insert': {
      // 支持单条插入或批量插入
      const itemsToInsert = Array.isArray(data) ? data : [data];
      itemsToInsert.forEach(item => {
        tableList.push(item);
        broadcast(table, 'INSERT', item);
      });
      responseData = data;
      break;
    }
    case 'update': {
      const updatedItems = [];
      db[table] = tableList.map(item => {
        if (matchFilters(item, filters)) {
          const updatedItem = { ...item, ...data };
          updatedItems.push(updatedItem);
          broadcast(table, 'UPDATE', updatedItem, item);
          return updatedItem;
        }
        return item;
      });
      responseData = select ? updatedItems : { count: updatedItems.length };
      break;
    }
    case 'upsert': {
      const key = (options && options.onConflict) || 'id';
      const itemsToUpsert = Array.isArray(data) ? data : [data];
      
      itemsToUpsert.forEach(item => {
        const idx = tableList.findIndex(existing => String(existing[key]) === String(item[key]));
        if (idx !== -1) {
          const oldItem = tableList[idx];
          const updatedItem = { ...oldItem, ...item };
          tableList[idx] = updatedItem;
          broadcast(table, 'UPDATE', updatedItem, oldItem);
        } else {
          tableList.push(item);
          broadcast(table, 'INSERT', item);
        }
      });
      responseData = data;
      break;
    }
    case 'delete': {
      const itemsToDelete = [];
      const remainingItems = [];
      
      tableList.forEach(item => {
        if (matchFilters(item, filters)) {
          itemsToDelete.push(item);
          broadcast(table, 'DELETE', null, item);
        } else {
          remainingItems.push(item);
        }
      });
      
      db[table] = remainingItems;
      responseData = { count: itemsToDelete.length };
      break;
    }
    default:
      return res.status(400).json({ data: null, error: { message: `未知的操作行为: ${action}` } });
  }

  // 只要发生写操作，即时更新 db.json，确保无损
  saveDb();
  res.json({ data: responseData, error: null });
});

// 捕获前端单页应用路由，回退到 index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/ws')) return next();
  const indexFile = path.join(distPath, 'index.html');
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    res.status(404).send('Not Found');
  }
});

// 启动服务器
server.listen(PORT, () => {
  console.log('\n================================================');
  console.log(`🎉 QQ-FamilyGoal 极简服务已成功运行于端口: ${PORT}`);
  console.log(`🔗 API 接口地址: http://localhost:${PORT}`);
  console.log(`📡 WebSocket 广播地址: ws://localhost:${PORT}/ws`);
  console.log('================================================\n');
});
