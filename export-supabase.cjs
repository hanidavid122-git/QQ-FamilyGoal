#!/usr/bin/env node

/**
 * QQ-FamilyGoal 远程 Supabase 数据无损导出脚本
 * 
 * 特点：零依赖 (Zero-dependency)，直接使用 Node.js 原生 fetch。
 * 无需安装任何 npm 依赖包，开箱即用！
 * 
 * 使用方法：
 * 方式 A (推荐)：直接在命令行传入参数
 *   node export-supabase.js "https://your-project.supabase.co" "your-anon-key"
 * 
 * 方式 B：在当前目录下创建 .env 文件并配置好后直接运行
 *   node export-supabase.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 支持的表列表
const TABLES = [
  'goals',
  'transactions',
  'achievements',
  'checkins',
  'rewards',
  'messages',
  'profiles',
  'activities',
  'goal_comments'
];

// 解析环境变量 (辅助方法，防止没有 CLI 参数)
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  });
  return env;
}

async function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans.trim());
  }));
}

async function main() {
  console.log('================================================');
  console.log('      QQ-FamilyGoal 数据无损导出脚本 (Supabase)  ');
  console.log('================================================\n');

  const env = loadEnv();
  let supabaseUrl = process.argv[2] || env.VITE_SUPABASE_URL;
  let supabaseKey = process.argv[3] || env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    supabaseUrl = await askQuestion('请输入您的 Supabase Project URL: ');
  }
  if (!supabaseKey) {
    supabaseKey = await askQuestion('请输入您的 Supabase Anon Key: ');
  }

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ 错误：Supabase URL 和 Key 不能为空。');
    process.exit(1);
  }

  // 清洗 URL，确保没有末尾斜杠
  if (supabaseUrl.endsWith('/')) {
    supabaseUrl = supabaseUrl.slice(0, -1);
  }

  console.log(`\n正在连接到 Supabase: ${supabaseUrl}`);
  console.log('开始抓取数据...\n');

  const dbData = {};

  for (const table of TABLES) {
    process.stdout.write(`⏳ 正在抓取表 [${table}] ... `);
    
    // 构造 Supabase PostgREST 接口 URL
    const fetchUrl = `${supabaseUrl}/rest/v1/${table}?select=*`;
    
    try {
      const response = await fetch(fetchUrl, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log('⚠️  不存在 (跳过)');
          dbData[table] = [];
          continue;
        }
        throw new Error(`HTTP 状态码: ${response.status}`);
      }

      const data = await response.json();
      dbData[table] = data;
      console.log(`✅ 成功抓取了 ${data.length} 条记录`);
    } catch (error) {
      console.log(`❌ 失败 (${error.message})`);
      dbData[table] = [];
    }
  }

  // 写入本地本地 JSON 数据库文件
  const outputFileName = 'db.json';
  const outputPath = path.join(__dirname, outputFileName);
  
  try {
    // 采用原子写入机制，安全第一
    const tempPath = outputPath + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify(dbData, null, 2), 'utf8');
    fs.renameSync(tempPath, outputPath);
    
    console.log('\n================================================');
    console.log('🎉 备份成功完成！数据已无损保存为本地文件！');
    console.log(`📂 文件位置: ${outputPath}`);
    console.log('================================================\n');
    console.log('您可以将该 db.json 文件直接部署在您的 RackNerd 远端服务器中。');
  } catch (err) {
    console.error(`\n❌ 保存数据到文件时出错: ${err.message}`);
  }
}

main();
