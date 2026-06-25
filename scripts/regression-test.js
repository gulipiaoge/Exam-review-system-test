/**
 * 样本基线回归测试脚本
 * 功能：在每次修改后跑一遍所有样本文件，验证解析条目数无变化
 * 
 * 使用方法：
 *   node scripts/regression-test.js [--update-baseline] [--api-url=http://localhost:8787]
 * 
 * 选项：
 *   --update-baseline  更新基线快照（首次运行或配置变更后）
 *   --api-url          指定API地址（默认：http://localhost:8787）
 *   --config-version   指定配置版本（默认：1.1）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SAMPLES_DIR = path.join(ROOT_DIR, '__tests__', 'samples');
const BASELINE_FILE = path.join(ROOT_DIR, '__tests__', 'baseline.json');

// 解析命令行参数
const args = process.argv.slice(2);
const updateBaseline = args.includes('--update-baseline');
const apiUrlArg = args.find(arg => arg.startsWith('--api-url='));
const configVersionArg = args.find(arg => arg.startsWith('--config-version='));
const API_BASE = apiUrlArg ? apiUrlArg.split('=')[1] : 'https://2d2a635a.exam-review-system.pages.dev';
const CONFIG_VERSION = configVersionArg ? configVersionArg.split('=')[1] : '1.1';

/**
 * 读取基线快照
 */
function loadBaseline() {
  if (!fs.existsSync(BASELINE_FILE)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf-8'));
}

/**
 * 保存基线快照
 */
function saveBaseline(baseline) {
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2), 'utf-8');
  console.log(`✅ 基线快照已保存到：${BASELINE_FILE}`);
}

/**
 * 获取样本文件列表
 */
function getSampleFiles() {
  if (!fs.existsSync(SAMPLES_DIR)) {
    console.warn(`⚠️  样本目录不存在：${SAMPLES_DIR}`);
    return [];
  }
  
  return fs.readdirSync(SAMPLES_DIR)
    .filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.xlsx', '.xls', '.csv', '.docx', '.txt'].includes(ext);
    })
    .map(file => path.join(SAMPLES_DIR, file));
}

/**
 * 上传文件到API并解析（使用JSON格式，base64编码）
 */
async function parseFileViaAPI(filePath) {
  const fileName = path.basename(filePath);
  const fileBuffer = fs.readFileSync(filePath);
  
  // 将文件内容转换为base64
  const fileBase64 = fileBuffer.toString('base64');
  
  const response = await fetch(`${API_BASE}/api/library/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Test-Mode': 'true'  // 跳过认证（仅测试环境）
    },
    body: JSON.stringify({
      fileName: fileName,
      file: fileBase64,
      type: 'auto',
      configVersion: CONFIG_VERSION
    })
  });
  
  const result = await response.json();
  return {
    fileName,
    filePath,
    status: response.status,
    result
  };
}

/**
 * 运行回归测试
 */
async function runRegressionTest() {
  console.log('='.repeat(80));
  console.log('📊 样本基线回归测试');
  console.log('='.repeat(80));
  console.log(`API地址：${API_BASE}`);
  console.log(`配置版本：${CONFIG_VERSION}`);
  console.log(`样本目录：${SAMPLES_DIR}`);
  console.log('');
  
  // 获取样本文件
  const sampleFiles = getSampleFiles();
  
  if (sampleFiles.length === 0) {
    console.warn('⚠️  未找到样本文件，请先添加样本到 __tests__/samples/ 目录');
    console.warn('   支持格式：.xlsx, .xls, .csv, .docx, .txt');
    return;
  }
  
  console.log(`找到 ${sampleFiles.length} 个样本文件：\n`);
  
  // 加载基线
  const baseline = loadBaseline();
  const currentResults = {};
  let hasErrors = false;
  
  // 逐个解析样本文件
  for (const filePath of sampleFiles) {
    const fileName = path.basename(filePath);
    console.log(`📁 解析：${fileName}`);
    
    try {
      const apiResult = await parseFileViaAPI(filePath);
      
      if (apiResult.status !== 200 || !apiResult.result.success) {
        const errorMsg = apiResult.result.error || '未知错误';
        const errorDetail = apiResult.result.message || '';
        const errorStack = apiResult.result.stack || '';
        console.error(`   ❌ 解析失败：${errorMsg} ${errorDetail}`);
        if (errorStack) {
          console.error(`   堆栈：${errorStack.substring(0, 200)}`);
        }
        currentResults[fileName] = {
          success: false,
          error: apiResult.result.error,
          totalQuestions: 0,
          sheetCount: 0
        };
        hasErrors = true;
      } else {
        const { totalQuestions, sheetCount, sheetResults } = apiResult.result;
        console.log(`   ✅ 解析成功： ${totalQuestions} 道题目，${sheetCount} 个Sheet`);
        
        currentResults[fileName] = {
          success: true,
          totalQuestions,
          sheetCount,
          sheetResults: Object.keys(sheetResults).map(name => ({
            name,
            type: sheetResults[name].type,
            questionCount: sheetResults[name].questionCount
          }))
        };
      }
    } catch (error) {
      console.error(`   ❌ 请求失败：${error.message}`);
      currentResults[fileName] = {
        success: false,
        error: error.message,
        totalQuestions: 0,
        sheetCount: 0
      };
      hasErrors = true;
    }
    
    console.log('');
  }
  
  // 对比基线
  if (updateBaseline) {
    console.log('📝 更新基线快照...');
    saveBaseline({
      version: CONFIG_VERSION,
      createdAt: new Date().toISOString(),
      results: currentResults
    });
  } else if (baseline) {
    console.log('🔍 对比基线快照...');
    console.log('');
    
    let hasChanges = false;
    
    for (const [fileName, current] of Object.entries(currentResults)) {
      const base = baseline.results[fileName];
      
      if (!base) {
        console.warn(`   ⚠️  ${fileName}：新文件（基线中不存在）`);
        hasChanges = true;
        continue;
      }
      
      if (!current.success || !base.success) {
        if (current.success !== base.success) {
          console.error(`   ❌ ${fileName}：解析状态变化（基线：${base.success}, 当前：${current.success}）`);
          hasChanges = true;
        }
        continue;
      }
      
      // 对比题目数量
      if (current.totalQuestions !== base.totalQuestions) {
        console.error(`   ❌ ${fileName}：题目数量变化（基线：${base.totalQuestions}, 当前：${current.totalQuestions}）`);
        hasChanges = true;
      } else {
        console.log(`   ✅ ${fileName}：题目数量无变化（${current.totalQuestions}）`);
      }
      
      // 对比Sheet数量
      if (current.sheetCount !== base.sheetCount) {
        console.error(`   ❌ ${fileName}：Sheet数量变化（基线：${base.sheetCount}, 当前：${current.sheetCount}）`);
        hasChanges = true;
      }
    }
    
    console.log('');
    
    if (hasChanges) {
      console.error('❌ 回归测试失败：检测结果与基线不一致！');
      console.error('   请检查解析器是否有意外修改，或运行以下命令更新基线：');
      console.error('   node scripts/regression-test.js --update-baseline');
      process.exit(1);
    } else {
      console.log('✅ 回归测试通过：所有样本解析结果与基线一致！');
    }
  } else {
    console.warn('⚠️  基线快照不存在，请先运行以下命令创建基线：');
    console.warn('   node scripts/regression-test.js --update-baseline');
  }
  
  console.log('');
  console.log('='.repeat(80));
}

// 执行测试
runRegressionTest().catch(error => {
  console.error('测试执行失败：', error);
  process.exit(1);
});
