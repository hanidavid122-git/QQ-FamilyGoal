/**
 * QQ-FamilyGoal 前端 Supabase 极简兼容适配器 (Vercel 反向代理版)
 * 
 * 作用：用标准的 fetch 和 WebSocket 模拟 @supabase/supabase-js 客户端的所有核心接口。
 * 从而使前端 2000 多行的业务逻辑代码 (App.tsx) 做到 100% 零修改，完美切换到本地轻量级后端！
 */

// 自动检测 API 服务器地址
// 在引入 vercel.json 的 URL Rewrites 反向代理后：
// 生产环境 Vercel 静态页面在请求 API 时，直接向同源的相对路径 `/api` 发起请求即可。
// Vercel 路由器会自动用高速网络代理转发给 RackNerd 服务，完全规避了浏览器的 Mixed Content 混合内容拦截！
const getApiBase = () => {
  if (typeof window === 'undefined') return '';
  const { protocol, hostname, port } = window.location;
  
  // 场景 A：本地开发 Vite 模式
  if (port === '5173' || port === '5174') {
    return `${protocol}//localhost:3000`;
  }
  
  // 场景 B：生产环境（无论是在 Vercel HTTPS 还是在服务器 3000 端口）
  // 直接走相对路径，彻底解决 Mixed Content 拦截和 CORS 跨域 OPTIONS 耗时！
  return '';
};

const getWsBase = () => {
  if (typeof window === 'undefined') return '';
  const { hostname, port } = window.location;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  
  if (port === '5173' || port === '5174') {
    return `ws://localhost:3000/ws`;
  }
  
  // 生产环境自动根据当前域名解析对应的 WebSocket 地址
  // 在 Vercel (https) 上，它会请求 wss://www.ddyy.me/ws 进而被反向代理转发
  return `${protocol}//${hostname}${port ? `:${port}` : ''}/ws`;
};

const API_BASE = getApiBase();
const WS_BASE = getWsBase();

export const isSupabaseConfigured = true;

class MockSupabaseQueryBuilder {
  private table: string;
  private filters: { type: string; column: string; value: any }[] = [];
  private orders: { column: string; ascending: boolean }[] = [];
  private _limit: number | null = null;
  
  // 记录执行的写操作
  private writeAction: { type: 'insert' | 'update' | 'upsert' | 'delete'; data?: any; options?: any } | null = null;
  private wantsSelectOnWrite = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns: string = '*') {
    // 如果之前已有写操作，这里的 select 相当于 update().select()
    if (this.writeAction) {
      this.wantsSelectOnWrite = true;
    }
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ type: 'eq', column, value });
    return this;
  }

  in(column: string, value: any[]) {
    this.filters.push({ type: 'in', column, value });
    return this;
  }

  is(column: string, value: any) {
    this.filters.push({ type: 'is', column, value });
    return this;
  }

  order(column: string, options: { ascending?: boolean } = {}) {
    this.orders.push({ column, ascending: options.ascending !== false });
    return this;
  }

  limit(value: number) {
    this._limit = value;
    return this;
  }

  insert(data: any) {
    this.writeAction = { type: 'insert', data };
    return this;
  }

  update(data: any) {
    this.writeAction = { type: 'update', data };
    return this;
  }

  upsert(data: any, options: any = {}) {
    this.writeAction = { type: 'upsert', data, options };
    return this;
  }

  delete() {
    this.writeAction = { type: 'delete' };
    return this;
  }

  // 使其成为一个 Thenable 对象，支持直接被 await 或者用 .then() 调用
  async then(onfulfilled?: (value: any) => any) {
    let result: { data: any; error: any } = { data: null, error: null };
    
    try {
      if (this.writeAction) {
        // 写操作：POST 统一提交给后端的 /api/:table
        const res = await fetch(`${API_BASE}/api/${this.table}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: this.writeAction.type,
            data: this.writeAction.data,
            options: this.writeAction.options,
            filters: this.filters,
            select: this.wantsSelectOnWrite
          })
        });

        if (!res.ok) {
          throw new Error(`HTTP Error: ${res.status}`);
        }
        
        const resJson = await res.json();
        result = { data: resJson.data, error: resJson.error || null };
      } else {
        // 读操作：GET 查询
        const queryParams = new URLSearchParams();
        if (this.filters.length > 0) queryParams.set('filters', JSON.stringify(this.filters));
        if (this.orders.length > 0) queryParams.set('orders', JSON.stringify(this.orders));
        if (this._limit !== null) queryParams.set('limit', String(this._limit));

        const res = await fetch(`${API_BASE}/api/${this.table}?${queryParams.toString()}`);
        if (!res.ok) {
          throw new Error(`HTTP Error: ${res.status}`);
        }

        const resJson = await res.json();
        result = { data: resJson.data, error: resJson.error || null };
      }
    } catch (e: any) {
      console.error(`MockSupabase API Error on ${this.table}:`, e);
      result = { data: null, error: { message: e.message } };
    }

    if (onfulfilled) {
      return Promise.resolve(result).then(onfulfilled);
    }
    return result;
  }
}

class MockSupabaseChannel {
  private channelName: string;
  private listeners: { event: string; filter: any; callback: Function }[] = [];
  private socket: WebSocket | null = null;

  constructor(name: string) {
    this.channelName = name;
  }

  on(event: string, filter: any, callback: Function) {
    this.listeners.push({ event, filter, callback });
    return this;
  }

  subscribe() {
    // 建立后台 WebSocket 长连接
    try {
      const socket = new WebSocket(WS_BASE);
      this.socket = socket;

      socket.onopen = () => {
        // console.log(`[WS] Connected to real-time sync channel: ${this.channelName}`);
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // 对接收到的通知进行过滤分发，兼容 Postgres Realtime 负载格式
          // 消息格式：{ table, eventType, new, old }
          this.listeners.forEach(listener => {
            const matchesTable = !listener.filter.table || listener.filter.table === message.table;
            if (matchesTable) {
              // 兼容 Supabase postgres_changes Payload
              const payload = {
                eventType: message.eventType, // 'INSERT', 'UPDATE', 'DELETE'
                new: message.new || {},
                old: message.old || {},
                schema: 'public',
                table: message.table
              };
              listener.callback(payload);
            }
          });
        } catch (e) {
          console.error('[WS] Failed to parse message:', e);
        }
      };

      socket.onclose = () => {
        // console.log('[WS] Connection closed.');
      };

      socket.onerror = (e) => {
        console.error('[WS] Connection error:', e);
      };

      // 挂载全局，方便移除
      if (typeof window !== 'undefined') {
        if (!(window as any)._activeChannels) (window as any)._activeChannels = {};
        (window as any)._activeChannels[this.channelName] = this;
      }
    } catch (err) {
      console.error('[WS] Failed to setup WebSocket connection:', err);
    }
    return this;
  }

  close() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

// 创建统一导出的 Mock 客户端
export const supabase = {
  from(table: string) {
    return new MockSupabaseQueryBuilder(table);
  },

  channel(name: string) {
    return new MockSupabaseChannel(name);
  },

  removeChannel(channel: any) {
    if (channel && typeof channel.close === 'function') {
      channel.close();
    }
    if (typeof window !== 'undefined' && (window as any)._activeChannels) {
      Object.keys((window as any)._activeChannels).forEach(key => {
        if ((window as any)._activeChannels[key] === channel) {
          delete (window as any)._activeChannels[key];
        }
      });
    }
  }
};
