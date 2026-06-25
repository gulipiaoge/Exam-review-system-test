/**
 * 生成示例样本文件
 * 用于回归测试
 * 
 * 使用方法：
 *   node scripts/generate-samples.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SAMPLES_DIR = path.join(ROOT_DIR, '__tests__/samples');

/**
 * 生成题库样本 CSV
 */
function generateQuestionBankSample() {
  const filePath = path.join(SAMPLES_DIR, '题库样本.csv');
  
  const csvContent = 
`题干,选项A,选项B,选项C,选项D,正确答案,解析,题型,难度,章节,科目
什么是闭包？,函数嵌套函数,函数返回函数,内部函数访问外部函数变量,以上都不对,C,闭包是JavaScript中的重要概念,单选,3,第3章 JavaScript基础,前端开发
CSS 中如何居中一个元素？,使用 margin: auto,使用 text-align: center,使用 flexbox,使用 float,AC,CSS 居中方法有多种,多选,4,第5章 CSS布局,前端开发
解释什么是事件冒泡,事件是自下而上传播的,事件是自上而下传播的,事件在同一元素上触发,事件不会传播,A,事件冒泡是DOM事件流的一部分,简答,3,第4章 DOM操作,前端开发`;

  fs.writeFileSync(filePath, csvContent, 'utf-8');
  console.log(`✅ 已生成：${path.relative(ROOT_DIR, filePath)}`);
}

/**
 * 生成试卷样本 CSV
 */
function generateExamPaperSample() {
  const filePath = path.join(SAMPLES_DIR, '试卷样本.csv');
  
  const csvContent = 
`大题号,小题号,分值,题型,题干,正确答案,解析
1,1,2,单选,什么是闭包？,C,闭包是JavaScript中的重要概念
1,2,2,单选,CSS 中如何居中一个元素？,AC,CSS 居中方法有多种
2,1,5,简答,解释什么是事件冒泡,闭包是...,事件是...,事件冒泡是...
2,2,5,简答,解释什么是原型链,原型链是...,原型是...,__proto__是...`;

  fs.writeFileSync(filePath, csvContent, 'utf-8');
  console.log(`✅ 已生成：${path.relative(ROOT_DIR, filePath)}`);
}

/**
 * 生成单词样本 CSV
 */
function generateVocabularySample() {
  const filePath = path.join(SAMPLES_DIR, '单词样本.csv');
  
  const csvContent = 
`词头,词性,释义,音标,例句
closure,名词,闭包,/ˈkloʊʒər/,The function forms a closure.
callback,名词,回调函数,/ˈkɔːlbæk/,Pass a callback function as argument.
asynchronous,形容词,异步的,/eɪˈsɪŋkrənəs/,Use asynchronous programming.`;

  fs.writeFileSync(filePath, csvContent, 'utf-8');
  console.log(`✅ 已生成：${path.relative(ROOT_DIR, filePath)}`);
}

/**
 * 生成闪卡样本 CSV
 */
function generateFlashcardSample() {
  const filePath = path.join(SAMPLES_DIR, '闪卡样本.csv');
  
  const csvContent = 
`正面内容,反面内容,提示,标签
什么是闭包？,函数嵌套函数，内部函数可以访问外部函数的变量,JavaScript高级概念,JavaScript
CSS 如何居中？,使用 flexbox 或 grid 布局,布局技术,CSS
什么是事件冒泡？,事件从最内层元素向外层元素传播,DOM事件流,JavaScript`;

  fs.writeFileSync(filePath, csvContent, 'utf-8');
  console.log(`✅ 已生成：${path.relative(ROOT_DIR, filePath)}`);
}

/**
 * 主函数
 */
function main() {
  console.log('📊 生成示例样本文件...');
  console.log('');
  
  // 确保目录存在
  if (!fs.existsSync(SAMPLES_DIR)) {
    fs.mkdirSync(SAMPLES_DIR, { recursive: true });
    console.log(`📂 创建目录：${SAMPLES_DIR}`);
  }
  
  // 生成样本文件
  generateQuestionBankSample();
  generateExamPaperSample();
  generateVocabularySample();
  generateFlashcardSample();
  
  console.log('');
  console.log('✅ 所有样本文件已生成！');
  console.log(`📂 样本目录：${SAMPLES_DIR}`);
  console.log('');
  console.log('下一步：');
  console.log('  1. 检查样本文件内容是否符合预期');
  console.log('  2. 运行 npm run test:regression:update 创建基线');
  console.log('  3. 后续修改解析器后，运行 npm run test:regression 验证');
}

main();
