<template>
  <div class="lc-page">

    <!-- ==================== 主视图：资源库列表 ==================== -->
    <div v-if="view === 'main'">
      <!-- 页面标题 -->
      <div class="page-header">
        <h2 class="ph-title">📁 资源库</h2>
      </div>

      <!-- Tab栏 + 操作按钮 -->
      <div class="top-bar">
        <div class="tab-nav">
          <button
            v-for="lib in libraryTypes"
            :key="lib.type"
            :class="['tab-btn', { active: activeTab === lib.type }]"
            @click="activeTab = lib.type; loadItems()"
          >
            {{ lib.name }}
            <span class="tab-num">{{ getCount(lib.type) }}</span>
          </button>
        </div>
        <div class="top-actions">
          <button class="btn-upload" @click="openUploadDialog">
            ＋ 上传资料
          </button>
          <button v-if="activeTab === 'question_bank'" class="btn-create" @click="showCreate = true">
            新建题目
          </button>
        </div>
      </div>

      <!-- 上传区域（页面内） -->
      <div class="upload-zone"
        @dragover.prevent="uploadDragOver = true"
        @dragleave="uploadDragOver = false"
        @drop.prevent="handleUploadDrop"
        @click="openUploadDialog"
        :class="{ dragover: uploadDragOver }"
      >
        <div class="uz-icon">📁</div>
        <p class="uz-text">拖拽文件或点击上传</p>
        <p class="uz-hint">支持 PDF、DOCX、DOC、XLSX、JSON、图片等格式</p>
        <div class="uz-formats">
          <span class="fmt-tag fmt-pdf">PDF</span>
          <span class="fmt-tag fmt-docx">DOCX</span>
          <span class="fmt-tag fmt-xlsx">XLSX</span>
          <span class="fmt-tag fmt-txt">TXT</span>
          <span class="fmt-tag fmt-json">JSON</span>
          <span class="fmt-tag fmt-img">PNG/JPG</span>
        </div>
      </div>

      <!-- 资源卡片网格 -->
      <div v-if="displayItems.length > 0" class="card-grid">
        <div v-for="(item, idx) in displayItems" :key="item.id || idx" class="res-card" @click="handleCardClick(item)">
          <div class="rc-left">
            <div class="rc-icon" :style="{ background: getIconBg(idx) }">
              {{ getIcon(item) }}
            </div>
            <div class="rc-info">
              <h4 class="rc-title">{{ item.title || item.name || '未命名资源' }}</h4>
              <p class="rc-meta">{{ getMetaText(item) }} · {{ formatDate(item.updated_at || item.created_at) }} 更新</p>
            </div>
          </div>
          <div class="rc-tags">
            <span :class="['tag', item.is_public ? 'pub' : 'priv']">{{ item.is_public ? '公开库' : '私密导入' }}</span>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <p class="empty-text">暂无资料，请点击上方「上传资料」添加内容</p>
      </div>
    </div>

    <!-- ==================== 库详情视图：科目/章节列表 ==================== -->
    <div v-if="view === 'library_detail'" class="library-detail-page">
      <!-- 面包屑导航 + 操作栏 -->
      <div class="ld-topbar">
        <div class="ld-breadcrumb">
          <span class="bc-item" @click="backToLibList">资源库</span>
          <span class="bc-sep">›</span>
          <span class="bc-item" @click="backToLibList">{{ libraryTypes.find(t => t.type === activeTab)?.name || '题库' }}</span>
          <span class="bc-sep">›</span>
          <span class="bc-current">{{ selectedLibrary?.title || selectedLibrary?.name || '未知库' }}</span>
        </div>
        <div class="ld-actions">
          <button class="btn-upload" @click="openUploadDialog">＋ 上传资料</button>
        </div>
      </div>

      <!-- 库信息摘要卡 -->
      <div class="lib-summary-card">
        <div class="lsc-left">
          <div class="lsc-icon" :style="{ background: getIconBg(0) }">
            {{ selectedLibrary ? getIcon(selectedLibrary) : '📁' }}
          </div>
          <div class="lsc-info">
            <h3 class="lsc-title">{{ selectedLibrary?.title || selectedLibrary?.name }}</h3>
            <p class="lsc-meta">
              {{ getMetaText(selectedLibrary) }} ·
              {{ selectedLibrary?.is_public ? '公开库' : '私密导入' }} ·
              {{ formatDate(selectedLibrary?.updated_at || selectedLibrary?.created_at) }} 更新
            </p>
          </div>
        </div>
        <div class="lsc-stats">
          <div class="lsc-stat">
            <span class="lsc-stat-num">{{ librarySubjects.length }}</span>
            <span class="lsc-stat-label">个科目</span>
          </div>
          <div class="lsc-stat">
            <span class="lsc-stat-num">{{ selectedLibrary?.question_count || 0 }}</span>
            <span class="lsc-stat-label">道题目</span>
          </div>
        </div>
      </div>

      <!-- 科目卡片网格 -->
      <div class="section-title-row">
        <h3 class="st-title">科目列表</h3>
        <span class="st-count">共 {{ librarySubjects.length }} 个科目</span>
      </div>

      <div class="subject-grid">
        <div
          v-for="sub in librarySubjects"
          :key="sub.id"
          class="subject-card"
          @click="handleSubjectClick(sub)"
        >
          <div class="sc-top">
            <span class="sc-icon">📂</span>
            <span :class="['sc-badge', sub.qCount > 20 ? 'hot' : '']">
              {{ sub.qCount > 30 ? '热门' : sub.qCount > 15 ? '常用' : '' }}
            </span>
          </div>
          <h4 class="sc-name">{{ sub.name }}</h4>
          <p class="sc-meta">
            <span>{{ sub.qCount }} 道题目</span>
            <span class="sc-dot">·</span>
            <span>{{ sub.updated }} 更新</span>
          </p>
          <div class="sc-arrow">→</div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="librarySubjects.length === 0" class="empty-state">
        <p class="empty-text">该暂无科目，请上传资料后自动生成科目结构</p>
      </div>
    </div>

    <!-- ==================== 上传对话框视图 ==================== -->
    <div v-if="view === 'upload'" class="dialog-overlay" @click.self="closeUpload">
      <div class="dialog-box dlg-upload-box">
        <div class="dlg-header">
          <h3>上传文件到题库</h3>
          <button class="dlg-close" @click="closeUpload">&times;</button>
        </div>
        <div class="dlg-body">
          <!-- 拖拽上传区 -->
          <div
            class="dlg-dropzone"
            :class="{ 'has-file': selectedFile, dragover: dlgDragOver }"
            @dragover.prevent="dlgDragOver = true"
            @dragleave="dlgDragOver = false"
            @drop.prevent="handleDlgDrop"
            @click="$refs.dlgFileInput?.click()"
          >
            <input type="file" ref="dlgFileInput"
              accept=".pdf,.docx,.doc,.txt,.xlsx,.xls,.json,.png,.jpg,.jpeg"
              style="display:none" @change="handleFileSelected" />
            <div class="dd-icon">📄</div>
            <p class="dd-text">拖拽文件到此处或点击选择文件</p>
            <p class="dd-hint">支持 pdf/docx/doc/txt/xlsx/json/图片 格式</p>
          </div>

          <!-- 已选文件名 -->
          <div v-if="selectedFile" class="selected-file-bar">
            <span class="sfb-icon">📄</span>
            <span class="sfb-name">{{ selectedFile.name }}</span>
            <button class="sfb-remove" @click.stop="removeSelectedFile">&times;</button>
          </div>

          <!-- 选择目标库 -->
          <div class="dlg-field">
            <label>选择目标库</label>
            <div class="target-select-wrapper">
              <select v-model="uploadTarget" class="dlg-select target-select">
                <optgroup label="题库">
                  <option value="qb_private">题库 - 我的题库</option>
                  <option value="qb_public">题库 - 公共题库</option>
                </optgroup>
                <optgroup label="试卷库">
                  <option value="ep_mine">试卷库 - 我的试卷</option>
                </optgroup>
                <optgroup label="复习指导">
                  <option value="sg_lib">复习指导库</option>
                </optgroup>
                <optgroup label="资料">
                  <option value="material_lib">资料库</option>
                </optgroup>
              </select>
            </div>
          </div>

          <!-- 底部操作 -->
          <div v-if="selectedFile" class="dlg-upload-actions">
            <button class="btn-start-parse" @click="startParsing" :disabled="parsing">
              开始解析并预览
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 解析进度视图 ==================== -->
    <div v-if="view === 'parsing'" class="dialog-overlay">
      <div class="dialog-box dlg-parse-box">
        <div class="dlg-header">
          <h3>上传文件到题库</h3>
          <button class="dlg-close" @click="cancelParsing" :disabled="!parsing">&times;</button>
        </div>
        <div class="dlg-body">
          <!-- 文件上传区（解析中变绿） -->
          <div
            class="dlg-dropzone parsing-mode"
            :class="{ 'parse-active': parseStep >= 1 }"
          >
            <div class="dd-icon">📄</div>
            <p class="dd-text">拖拽文件到此处或点击选择文件</p>
            <p class="dd-hint">支持 pdf/docx/doc/txt/xlsx/json/图片 格式</p>
          </div>

          <!-- 已选文件名条 -->
          <div class="selected-file-bar">
            <span class="sfb-icon">📄</span>
            <span class="sfb-name">{{ selectedFile?.name || '未知文件' }}</span>
          </div>

          <!-- 目标库（只读展示） -->
          <div class="dlg-field">
            <label>选择目标库</label>
            <select v-model="uploadTarget" class="dlg-select target-select" disabled>
              <option value="qb_private">题库 - 我的题库</option>
              <option value="qb_public">题库 - 公共题库</option>
              <option value="ep_mine">试卷库 - 我的试卷</option>
              <option value="sg_lib">复习指导库</option>
              <option value="material_lib">资料库</option>
            </select>
          </div>

          <!-- 解析进度步骤 -->
          <div class="parse-steps">
            <div v-for="(step, i) in parseSteps" :key="i" :class="['ps-item', stepStatus(i)]">
              <div class="ps-icon-wrap">
                <span v-if="stepStatus(i) === 'done'" class="ps-icon ps-done">&#10003;</span>
                <span v-else-if="stepStatus(i) === 'active'" class="ps-icon ps-active">
                  <span class="ps-spinner"></span>
                </span>
                <span v-else class="ps-icon ps-pending">&#9677;</span>
              </div>
              <div class="ps-content">
                <span class="ps-label">{{ step.label }}</span>
                <span v-if="step.detail" class="ps-detail">{{ getStepDetail(i) }}</span>
              </div>
            </div>
          </div>

          <!-- 预计时间 + 取消 -->
          <div class="parse-footer">
            <span v-if="parsing" class="pf-time">
              &#9201; 预计剩余时间：约 {{ estimatedTime }} 秒
            </span>
            <button v-if="parsing" class="btn-cancel-parse" @click="cancelParsing">
              取消解析
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 预览页面（全屏） ==================== -->
    <div v-if="view === 'preview'" class="preview-page">
      <!-- 顶部操作栏 -->
      <div class="pv-topbar">
        <div class="pv-back-group">
          <button class="pv-back" @click="selectedLibrary ? backToLibraryDetail() : exitPreview()">
            &larr; {{ selectedLibrary ? '返回科目列表' : '返回资源库' }}
          </button>
          <!-- 面包屑：当从库详情进入时显示完整路径 -->
          <div v-if="selectedLibrary" class="pv-breadcrumb">
            <span class="bc-mini">{{ selectedLibrary.title || selectedLibrary.name }}</span>
            <span class="bc-sep-mini">›</span>
            <span class="bc-mini bc-current">{{ selectedSubject?.name || '全部题目' }}</span>
          </div>
        </div>
        <div class="pv-actions-right">
          <button class="btn-pv-primary" @click="confirmImport" :disabled="!parsedQuestions.length">
            确认导入 ({{ parsedQuestions.length }} 题)
          </button>
        </div>
      </div>

      <!-- 主体：左右布局 -->
      <div class="pv-body">
        <!-- ===== 左侧：文件摘要面板 ===== -->
        <div class="pv-left">
          <!-- 文件信息卡片 -->
          <div class="file-info-card">
            <div class="fic-icon-wrap">
              <span class="fic-icon">&#128196;</span>
            </div>
            <h3 class="fic-name">{{ previewFileName }}</h3>
            <div class="fic-meta">
              <span>文件大小：{{ fileSizeStr }}</span>
              <span>上传时间：{{ uploadTimeStr }}</span>
            </div>
          </div>

          <!-- 统计数据 -->
          <div class="stat-rows">
            <div class="stat-row">
              <span class="stat-label">识别题目</span>
              <span class="stat-value stat-green">{{ parsedQuestions.length }} 道</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">题型分布</span>
              <span class="stat-value">{{ typeDistribution }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">章节覆盖</span>
              <span class="stat-value stat-green">{{ chapterCount }} 个章节</span>
            </div>
          </div>

          <!-- 快速筛选 -->
          <div class="filter-section">
            <div class="fs-title">快速筛选</div>
            <div class="filter-tags">
              <button
                v-for="ft in filterTypes"
                :key="ft.key"
                v-show="ft.count > 0"
                :class="['ftag', { active: activeFilter === ft.key }]"
                @click="activeFilter = ft.key"
              >
                {{ ft.label }}<span class="ftag-count">({{ ft.count }})</span>
              </button>
            </div>
          </div>
        </div>

        <!-- ===== 右侧：题目卡片列表 ===== -->
        <div class="pv-right">
          <!-- 列表头部工具栏 -->
          <div class="list-toolbar">
            <div class="lt-left">
              <label class="cb-all">
                <input type="checkbox" v-model="selectAll" @change="toggleSelectAll" />
                全选
              </label>
              <button class="lt-btn" @click="batchDelete" :disabled="!selectedIds.length">批量删除</button>
              <button class="lt-btn lt-btn-math" @click="rerenderFormulas" title="重新渲染所有公式">&#8635; 重新渲染公式</button>
            </div>
            <div class="lt-right">
              <span class="lt-count">共 <b>{{ filteredQuestions.length }}</b> 道题目</span>
            </div>
          </div>

          <!-- 题目卡片列表（KaTeX 渲染目标） -->
          <div ref="questionListRef" class="q-card-list math-content">
            <div v-for="(q, idx) in filteredQuestions" :key="q._id || idx"
              :class="['q-card', `status-${q.status}`, `card-${q.typeKey}`, { selected: selectedIds.includes(q._id) }]">

              <!-- 卡片头部：状态+题号+题型 -->
              <div class="qc-header">
                <div class="qc-status-icon">
                  <span v-if="q.status === 'ok'" class="si-ok">&#10003;</span>
                  <span v-else-if="q.status === 'warning'" class="si-warn">!</span>
                  <span v-else-if="q.status === 'duplicate'" class="si-dup">&#9888;</span>
                  <span v-else class="si-pending">?</span>
                </div>
                <span class="qc-index">题目 {{ q.displayIndex }}</span>
                <span :class="['qc-type', `type-${q.typeKey}`]">{{ q.typeLabel }}</span>
                <label class="qc-cb">
                  <input type="checkbox" :value="q._id" v-model="selectedIds" />
                </label>
              </div>

              <!-- ===== 题干区域 ===== -->
              <div class="qc-body">
                <p class="qc-text" v-html="q.questionText || q.question || '<span class=ans-empty>（题目内容为空）</span>'"></p>
              </div>

              <!-- ===== 选项区域（单选/多选） ===== -->
              <div v-if="q.options && q.options.length" class="qc-options">
                <div v-for="opt in q.options" :key="opt.label"
                  :class="['qc-opt', { 'opt-correct': isCardOptionCorrect(q, opt.label) }]">
                  <span class="opt-label">{{ opt.label }}.</span>
                  <span class="opt-text" v-html="opt.text"></span>
                  <span v-if="isCardOptionCorrect(q, opt.label)" class="opt-correct-mark">✓</span>
                </div>
              </div>

              <!-- ===== 判断题答案展示 ===== -->
              <div v-else-if="q.typeKey === 'judge'" class="qc-judge-answer">
                <span :class="['judge-badge', q.answer === '正确' ? 'judge-right' : 'judge-wrong']">
                  {{ q.answer === '正确' ? '✓ 正确' : '✗ 错误' }}
                </span>
              </div>

              <!-- ===== 填空题答案展示 ===== -->
              <div v-else-if="q.typeKey === 'fill'" class="qc-fill-answer">
                <span class="fill-answer-label">答案：</span>
                <span class="fill-answer-content" v-html="formatFillAnswer(q.answer)"></span>
              </div>

              <!-- ===== 主观题/综合题 答案区域（简答/计算/分析/综合） ===== -->
              <div v-if="isSubjectiveType(q.typeKey)" class="qc-answer-section">
                <div class="answer-header">📖 参考答案</div>
                <div class="answer-body" v-html="formatSubjectiveAnswer(q)"></div>
              </div>

              <!-- 缺失答案提示 + 手动补充输入框 -->
              <div v-if="q.missingAnswer" class="qc-missing">
                <span class="qm-badge">(答案缺失，请手动补充)</span>
                <textarea
                  v-model="q.manualAnswer"
                  class="qm-input"
                  placeholder="请输入答案..."
                  rows="2"
                ></textarea>
              </div>

              <!-- 重复警告横幅 -->
              <div v-if="q.status === 'duplicate' && q.dupInfo" class="qc-dup-banner">
                <span class="dup-icon">&#9888;</span>
                <span>与题库中【{{ q.dupInfo.id }}】相似度 {{ q.dupInfo.similarity }}%，疑似重复题目</span>
                <div class="dup-actions">
                  <button class="dup-skip" @click="skipDuplicate(q)">跳过</button>
                  <button class="dup-keep" @click="keepDuplicate(q)">仍然导入</button>
                </div>
              </div>

              <!-- 元数据行（紧凑版） -->
              <div class="qc-meta-row">
                <span class="qcm-chapter">{{ q.chapter || '未分类' }} · {{ q.knowledgePoint || '通用' }}</span>
                <span class="qcm-difficulty">难度：
                  <span v-for="n in 5" :key="n" :class="['star', { filled: n <= (q.difficulty || 3) }]">&#9733;</span>
                </span>
                <span v-if="q.tags && q.tags.length" class="qcm-tags">标签：{{ q.tags.join('、') }}</span>
                <div class="qcm-actions">
                  <button class="qca-edit" @click="editQuestion(q)">编辑</button>
                  <button class="qca-delete" @click="deleteQuestion(q)">删除</button>
                </div>
              </div>
            </div>

            <!-- 空列表 -->
            <div v-if="filteredQuestions.length === 0" class="empty-list">
              <p>当前筛选条件下暂无题目</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 题目编辑弹窗（分题型） ===== -->
    <div v-if="editingQuestion" class="dialog-overlay" @click.self="editingQuestion = null">
      <div class="dialog-box edit-dialog" :class="'edit-' + editingQuestion.typeKey">

        <!-- ===== 通用头部 ===== -->
        <div class="dlg-header">
          <div class="dlg-header-left">
            <h3>编辑题目 #{{ editingQuestion?.displayIndex }}</h3>
            <span class="dlg-type-badge" :class="'badge-' + editingQuestion.typeKey">{{ editingQuestion.typeLabel }}</span>
          </div>
          <button class="dlg-close" @click="editingQuestion = null">&times;</button>
        </div>

        <div class="dlg-body edit-body" v-if="editingQuestion">

          <!-- ========== 单选题/多选题 编辑 ========== -->
          <template v-if="editingQuestion.typeKey === 'single' || editingQuestion.typeKey === 'multi'">
            <!-- 题干 -->
            <div class="eb-field eb-field-stem">
              <label>📝 题目</label>
              <textarea v-model="editingQuestion.questionText" rows="3" class="eb-textarea eb-textarea-stem"
                placeholder="请输入题干内容..."></textarea>
            </div>
            <!-- 可视化选项编辑器 -->
            <div class="eb-field eb-field-options">
              <label>📋 选项 <span class="eb-hint">（点击选项前的标记设置正确答案）</span></label>
              <div class="options-editor">
                <div class="option-row" v-for="(opt, idx) in editingOptionList" :key="idx"
                  :class="{ 'option-correct': isOptionCorrect(opt.label) }">
                  <span class="opt-label">{{ opt.label }}</span>
                  <!-- 单选用radio，多选用checkbox -->
                  <input v-if="editingQuestion.typeKey === 'single'" type="radio"
                    name="correctOpt" :value="opt.label" v-model="editingQuestion.answer"
                    class="opt-radio" />
                  <input v-else type="checkbox" :value="opt.label"
                    v-model="editingMultiAnswers" class="opt-checkbox" />
                  <input v-model="opt.text" class="opt-text" :placeholder="'选项内容 ' + opt.label" />
                  <button class="opt-del" @click="removeOption(idx)" v-if="editingOptionList.length > 2">&times;</button>
                </div>
                <button class="opt-add-btn" @click="addOption" v-if="editingOptionList.length < 8">
                  + 添加选项
                </button>
              </div>
            </div>
            <!-- 答案预览 -->
            <div class="eb-field eb-field-answer-preview" v-if="editingQuestion.typeKey === 'single' && editingQuestion.answer">
              <label>✅ 正确答案</label>
              <div class="answer-preview-box">{{ editingQuestion.answer }}. {{ getOptionText(editingQuestion.answer) }}</div>
            </div>
            <div class="eb-field eb-field-answer-preview" v-if="editingQuestion.typeKey === 'multi' && editingMultiAnswers.length">
              <label>✅ 正确答案</label>
              <div class="answer-preview-box">{{ editingMultiAnswers.sort().join('、') }}</div>
            </div>
          </template>

          <!-- ========== 判断题 编辑 ========== -->
          <template v-else-if="editingQuestion.typeKey === 'judge'">
            <div class="eb-field eb-field-stem">
              <label>📝 题目</label>
              <textarea v-model="editingQuestion.questionText" rows="4" class="eb-textarea eb-textarea-stem"
                placeholder="请输入判断题题干..."></textarea>
            </div>
            <div class="eb-field eb-field-judge-answer">
              <label>✅ 正确答案</label>
              <div class="judge-buttons">
                <button class="judge-btn judge-true" :class="{ active: editingQuestion.answer === '正确' }"
                  @click="editingQuestion.answer = '正确'">
                  <span class="judge-icon">✓</span> 正确
                </button>
                <button class="judge-btn judge-false" :class="{ active: editingQuestion.answer === '错误' }"
                  @click="editingQuestion.answer = '错误'">
                  <span class="judge-icon">✗</span> 错误
                </button>
              </div>
            </div>
          </template>

          <!-- ========== 填空题 编辑 ========== -->
          <template v-else-if="editingQuestion.typeKey === 'fill'">
            <div class="eb-field eb-field-stem">
              <label>📝 题目（含空位）</label>
              <textarea v-model="editingQuestion.questionText" rows="3" class="eb-textarea eb-textarea-stem"
                placeholder="使用 ____ 或（ ）表示填空位置..."></textarea>
            </div>
            <div class="eb-field eb-field-fill-answers">
              <label>✍️ 各空答案 <span class="eb-hint">（每行对应一个空）</span></label>
              <div class="fill-answers-list">
                <div class="fill-answer-row" v-for="(fa, idx) in editingFillAnswers" :key="idx">
                  <span class="fill-index">第{{ idx + 1 }}空</span>
                  <input v-model="editingFillAnswers[idx]" class="fill-input" placeholder="该空的答案..." />
                  <button class="fill-del" @click="editingFillAnswers.splice(idx, 1)" v-if="editingFillAnswers.length > 1">×</button>
                </div>
                <button class="fill-add-btn" @click="editingFillAnswers.push('')">+ 添加一个空</button>
              </div>
            </div>
          </template>

          <!-- ========== 简答题/计算题/分析题 编辑 ========== -->
          <template v-else-if="editingQuestion.typeKey === 'essay' || editingQuestion.typeKey === 'calc' || editingQuestion.typeKey === 'analysis'">
            <div class="eb-split-layout">
              <!-- 左侧：题目 -->
              <div class="eb-split-col eb-col-question">
                <div class="eb-field">
                  <label class="eb-col-title">📝 题目</label>
                  <textarea v-model="editingQuestion.questionText" rows="8"
                    class="eb-textarea eb-textarea-large"
                    :placeholder="getStemPlaceholder(editingQuestion.typeKey)"></textarea>
                </div>
              </div>
              <!-- 右侧：答案 -->
              <div class="eb-split-col eb-col-answer">
                <div class="eb-field">
                  <label class="eb-col-title">✅ 参考答案</label>
                  <textarea v-model="editingQuestion.answer" rows="8"
                    class="eb-textarea eb-textarea-large eb-textarea-answer"
                    :placeholder="getAnswerPlaceholder(editingQuestion.typeKey)"></textarea>
                </div>
              </div>
            </div>
          </template>

          <!-- ========== 综合题 编辑 ========== -->
          <template v-else-if="editingQuestion.typeKey === 'comprehensive'">
            <div class="eb-field eb-field-stem">
              <label>📝 大题题干</label>
              <textarea v-model="editingQuestion.questionText" rows="4" class="eb-textarea eb-textarea-stem"
                placeholder="请输入综合题的大题背景/题干..."></textarea>
            </div>
            <!-- 子题列表 -->
            <div class="eb-field eb-field-subquestions">
              <label>📑 子题目 <span class="eb-hint">（综合题包含多个小问）</span></label>
              <div class="subq-list">
                <div class="subq-item" v-for="(sq, idx) in editingSubQuestions" :key="idx">
                  <div class="subq-header">
                    <span class="subq-index">（{{ toChineseNum(idx + 1) }}）</span>
                    <select v-model="sq.typeKey" class="subq-type-select">
                      <option value="essay">简答</option><option value="calc">计算</option>
                      <option value="analysis">分析</option><option value="fill">填空</option>
                      <option value="judge">判断</option>
                    </select>
                    <button class="subq-del" @click="editingSubQuestions.splice(idx,1)" v-if="editingSubQuestions.length > 1">×</button>
                  </div>
                  <input v-model="sq.text" class="subq-text" placeholder="子题题干..." />
                  <input v-model="sq.answer" class="subq-answer" placeholder="子题答案..." />
                </div>
                <button class="subq-add-btn" @click="addSubQuestion()">+ 添加子题</button>
              </div>
            </div>
          </template>

          <!-- ========== 兜底（未知题型） ========== -->
          <template v-else>
            <div class="eb-field"><label>📝 题干内容</label><textarea v-model="editingQuestion.questionText" rows="4" class="eb-textarea"></textarea></div>
            <div class="eb-field"><label>题型</label><select v-model="editingQuestion.typeKey" class="eb-select">
              <option value="single">单选题</option><option value="multi">多选题</option>
              <option value="judge">判断题</option><option value="fill">填空题</option>
              <option value="essay">简答题</option><option value="calc">计算题</option><option value="analysis">分析题</option><option value="comprehensive">综合题</option>
            </select></div>
            <div class="eb-field"><label>选项（每行一个）</label><textarea v-model="editingOptionsRaw" rows="4" class="eb-textarea" placeholder="A. 选项A&#10;B. 选项B"></textarea></div>
            <div class="eb-field eb-row">
              <div class="eb-half"><label>正确答案</label><input v-model="editingQuestion.answer" class="eb-input"/></div>
              <div class="eb-half"><label>章节</label><input v-model="editingQuestion.chapter" class="eb-input"/></div>
            </div>
          </template>

          <!-- ===== 通用底部信息 ===== -->
          <div class="eb-common-info">
            <div class="eb-field eb-row">
              <div class="eb-half">
                <label>📂 章节</label>
                <input v-model="editingQuestion.chapter" class="eb-input" />
              </div>
              <div class="eb-half" v-if="editingQuestion.typeKey !== 'comprehensive'">
                <label>🏷️ 知识点标签</label>
                <input v-model="editingTagsRaw" class="eb-input" placeholder="用逗号分隔" />
              </div>
            </div>
          </div>
        </div>

        <div class="dlg-footer">
          <button class="dlg-cancel" @click="editingQuestion = null">取消</button>
          <button class="dlg-confirm" @click="saveEditedQuestion">保存修改</button>
        </div>
      </div>
    </div>

    <!-- ===== 新建题目对话框 ===== -->
    <div v-if="showCreate" class="dialog-overlay" @click.self="showCreate = false">
      <div class="dialog-box create-dialog">
        <div class="dlg-header">
          <h3>新建题目</h3>
          <button class="dlg-close" @click="showCreate = false">&times;</button>
        </div>
        <div class="dlg-body">
          <div class="form-field">
            <label>科目</label>
            <input v-model="newQuestion.subject" placeholder="如：计算机网络" class="form-input" />
          </div>
          <div class="form-field">
            <label>章节</label>
            <input v-model="newQuestion.chapter" placeholder="如：HTTP协议" class="form-input" />
          </div>
          <div class="form-field">
            <label>题型</label>
            <select v-model="newQuestion.type" class="form-input">
              <option value="选择题">选择题</option>
              <option value="判断题">判断题</option>
              <option value="填空题">填空题</option>
              <option value="简答题">简答题</option>
            </select>
          </div>
          <div class="form-field">
            <label>难度</label>
            <select v-model="newQuestion.difficulty" class="form-input">
              <option value="easy">简单</option>
              <option value="medium">中等</option>
              <option value="hard">困难</option>
            </select>
          </div>
          <div class="form-field">
            <label>题干</label>
            <textarea v-model="newQuestion.question" rows="4" placeholder="请输入题目内容..." class="form-input"></textarea>
          </div>
          <div class="form-field">
            <label>答案</label>
            <textarea v-model="newQuestion.answer" rows="3" placeholder="请输入答案..." class="form-input"></textarea>
          </div>
          <div class="form-field">
            <label>解析（可选）</label>
            <textarea v-model="newQuestion.explanation" rows="3" placeholder="请输入解析..." class="form-input"></textarea>
          </div>
        </div>
        <div class="dlg-footer">
          <button class="btn-cancel" @click="showCreate = false">取消</button>
          <button class="btn-save" @click="handleCreateQuestion">保存</button>
        </div>
      </div>
    </div>
    
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick, onBeforeUnmount } from 'vue'
import { useAuthStore } from '../store/auth'
import { useQuestionStore } from '../store/question'
import { useAiStore } from '../store/ai'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../utils/api'
// KaTeX 渲染工具
import { renderMath, renderMathAsync, createAutoRenderer, sanitizeWithMath } from '@/utils/renderMath'
// 新解析器架构（五层架构）
import { parseFile, quickPreview } from '@/parser-v2/index.js'

const auth = useAuthStore()
const qs = useQuestionStore()
const ai = useAiStore()

// ========== 视图状态 ==========
const view = ref('main') // main | library_detail | upload | parsing | preview

// ========== 主页数据 ==========
const activeTab = ref('question_bank')
const items = ref([])
const showCreate = ref(false)
const newQuestion = ref({
  subject: '',
  chapter: '',
  type: '选择题',
  difficulty: 'medium',
  question: '',
  answer: '',
  explanation: ''
})
const uploadDragOver = ref(false)

// ========== 钻取导航状态 ==========
const selectedLibrary = ref(null)      // 当前选中的库卡片
const selectedSubject = ref(null)      // 当前选中的科目
const librarySubjects = ref([])        // 当前库的科目列表

// ========== 从 question store 派生真实的库卡片列表 ==========
// 题库 tab：从已加载的题目中按科目聚合生成库卡片；其他 tab：使用 API 返回的 items
const displayItems = computed(() => {
  if (activeTab.value === 'question_bank') {
    // 优先用 API 返回的数据，否则从 question store 的科目统计派生
    if (items.value.length > 0) return items.value
    return qs.subjectStats.map((sub, idx) => ({
      id: `qb_${idx}`,
      title: sub.subject,
      chapter_count: Object.keys(sub.byType).length,
      question_count: sub.total,
      updated_at: new Date().toISOString().slice(0, 10),
      is_public: true,
      content_type: 'question_refs',
      _sourceSubject: sub.subject,
    }))
  }
  return items.value
})

const libraryTypes = [
  { type: 'question_bank', name: '题库', icon: '\uD83D\uDCDD' },
  { type: 'exam_paper', name: '试卷库', icon: '\uD83D\uDCC4' },
  { type: 'study_guide', name: '复习指导库', icon: '\uD83D\uDCD6' },
  { type: 'material', name: '资料库', icon: '\uD83D\uDCC1' }
]

function getCount(type) {
  if (type === 'question_bank') return qs.allQuestions.length || 0
  // 其他 tab 返回 API items 数量或 0
  return type === activeTab.value ? (items.value.length || 0) : 0
}

function getIcon(item) {
  const icons = { question_refs: '\uD83D\uDCD8', markdown: '\uD83D\uDCDD', file_meta: '\uD83D\uDCC1', text: '\uD83D\uDCCB' }
  return icons[item.content_type] || '\uD83D\uDCE6'
}

function getIconBg(idx) {
  const colors = ['#dbeafe', '#dcfce7', '#fef9c3', '#fee2e2']
  return colors[idx % colors.length]
}

function getMetaText(item) {
  const parts = []
  if (item.chapter_count) parts.push(`${item.chapter_count}章`)
  if (item.question_count) parts.push(`${item.question_count}题`)
  else if (item.file_size) parts.push(`${(item.file_size / 1024).toFixed(0)}KB`)
  return parts.join(' ') || '未知'
}

function formatDate(date) {
  if (!date) return ''
  try { return new Date(date).toLocaleDateString('zh-CN').replace(/\//g, '-') } catch { return date }
}

function handleUploadDrop(e) {
  uploadDragOver.value = false
  const files = Array.from(e.dataTransfer.files)
  if (files.length > 0) {
    openUploadDialog()
    setTimeout(() => { selectedFile.value = files[0] }, 50)
  }
}

/** 点击库卡片 → 进入库详情（科目/章节列表） */
function handleCardClick(item) {
  selectedLibrary.value = item
  selectedSubject.value = null
  // 从 question store 中按该库对应的科目筛选题目，聚合章节
  const subjectName = item._sourceSubject || item.title
  const questionsInLib = qs.allQuestions.filter(q => q.subject === subjectName)
  if (questionsInLib.length > 0) {
    // 按章节聚合
    const chapterMap = {}
    for (const q of questionsInLib) {
      const ch = q.chapter || '未分章'
      if (!chapterMap[ch]) chapterMap[ch] = []
      chapterMap[ch].push(q)
    }
    librarySubjects.value = Object.entries(chapterMap).map(([name, qs], i) => ({
      id: `ch_${i}`,
      name,
      qCount: qs.length,
      updated: new Date(Math.max(...qs.map(q => new Date(q.updated_at || q.created_at || Date.now()).valueOf()))).toISOString().slice(0, 10),
    }))
  } else {
    librarySubjects.value = []
  }
  view.value = 'library_detail'
}

/** 点击科目/章节卡片 → 进入题目预览 */
function handleSubjectClick(subject) {
  selectedSubject.value = subject
  // 从 question store 中筛选该章节的题目，转为预览格式
  const subjectName = selectedLibrary.value?._sourceSubject || selectedLibrary.value?.title
  const questionsInChapter = qs.allQuestions.filter(q =>
    q.subject === subjectName && q.chapter === subject.name
  )
  if (questionsInChapter.length > 0) {
    // 将 store 中的题目转换为预览所需的格式
    parsedQuestions.value = questionsInChapter.map(q => ({
      number: q.id,
      type: q.type || '单选',
      rawText: q.question,
      options: q.options || [],
      answer: q.answer || '',
      explanation: q.explanation || '',
      difficulty: q.difficulty || 3,
      chapter: q.chapter || '',
      subject: q.subject || '',
    }))
    view.value = 'preview'
  } else if (parsedQuestions.value.length > 0) {
    view.value = 'preview'
  } else {
    ElMessage.info(`「${subject.name}」暂无已解析的题目，请先上传并解析题库文件`)
  }
}

/** 从库详情返回到库列表 */
function backToLibList() {
  selectedLibrary.value = null
  selectedSubject.value = null
  librarySubjects.value = []
  view.value = 'main'
}

/** 从题目预览返回到库详情 */
function backToLibraryDetail() {
  view.value = 'library_detail'
}

async function loadItems() {
  try {
    const res = await api.get(`/resource/items?lib_type=${activeTab.value}`)
    items.value = res.data?.items || []
  } catch (e) {
    items.value = []
  }
}

// ========== 上传对话框 ==========
const uploadTarget = ref('qb_private')
const selectedFile = ref(null)
const dlgDragOver = ref(false)

function openUploadDialog() {
  view.value = 'upload'
  selectedFile.value = null
  uploadTarget.value = 'qb_private'
}

function closeUpload() {
  view.value = 'main'
  selectedFile.value = null
}

// 新建题目
async function handleCreateQuestion() {
  // 验证表单
  if (!newQuestion.value.subject || !newQuestion.value.question || !newQuestion.value.answer) {
    alert('请填写科目、题干和答案')
    return
  }
  
  try {
    // 调用question store创建题目
    const qs = useQuestionStore()
    const newQ = await qs.createQuestion({
      subject: newQuestion.value.subject,
      chapter: newQuestion.value.chapter,
      type: newQuestion.value.type,
      difficulty: newQuestion.value.difficulty,
      question: newQuestion.value.question,
      answer: newQuestion.value.answer,
      explanation: newQuestion.value.explanation
    })
    
    // 关闭对话框并重置表单
    showCreate.value = false
    newQuestion.value = {
      subject: '',
      chapter: '',
      type: '选择题',
      difficulty: 'medium',
      question: '',
      answer: '',
      explanation: ''
    }
    
    alert('题目创建成功！')
  } catch (err) {
    console.error('创建题目失败:', err)
    alert('创建题目失败，请重试')
  }
}

function handleFileSelected(e) {
  const files = e.target.files
  if (files && files[0]) {
    // 选择新文件时清除旧缓存，防止显示过期数据
    clearPreviewCache()
    parsedQuestions.value = []
    selectedFile.value = files[0]
  }
}

function handleDlgDrop(e) {
  dlgDragOver.value = false
  const files = e.dataTransfer.files
  if (files[0]) {
    clearPreviewCache()
    parsedQuestions.value = []
    selectedFile.value = files[0]
  }
}

function removeSelectedFile() {
  selectedFile.value = null
}

// ========== 解析进度 ==========
const parsing = ref(false)
const parseStep = ref(0)
const parseDetailText = ref('')
const estimatedTime = ref(5)
let parseTimer = null
let parseAbortController = null

const parseSteps = [
  { label: '上传完成', key: 'upload' },
  { label: '提取文本', key: 'extract' },
  { label: 'AI识别结构', key: 'ai' },
  { label: '整理预览', key: 'organize' }
]

function stepStatus(index) {
  if (parseStep.value > index) return 'done'
  if (parseStep.value === index) return 'active'
  return 'pending'
}

function getStepDetail(index) {
  const details = [
    '',
    extractDetail.value,
    aiDetail.value,
    ''
  ]
  return details[index] || ''
}

const extractDetail = ref('')
const aiDetail = ref('')

async function startParsing() {
  if (!selectedFile.value) return

  view.value = 'parsing'
  parsing.value = true
  parseStep.value = 0
  parseDetailText.value = ''
  extractDetail.value = ''
  aiDetail.value = ''
  estimatedTime.value = 5

  try {
    // 使用新的五层解析器架构
    const result = await parseFile(selectedFile.value, {
      onProgress: (percent, message) => {
        // 更新进度步骤
        if (percent <= 15) {
          parseStep.value = 0  // 预检
          extractDetail.value = message || '正在检查文件...'
        } else if (percent <= 25) {
          parseStep.value = 1  // 清洗
          extractDetail.value = message || '正在清洗文件格式...'
        } else if (percent <= 40) {
          parseStep.value = 2  // 识别
          aiDetail.value = message || '正在识别文件类型...'
        } else if (percent <= 70) {
          parseStep.value = 3  // 解析
          aiDetail.value = message || '正在解析文件内容...'
        } else {
          parseStep.value = 4  // 完成
          extractDetail.value = message || '正在保存数据...'
        }
      },
      onPreview: async (preview) => {
        // 试解析预览：显示前3-5条结果让用户确认
        console.log('[Parse] Preview:', preview)
        return true  // 继续导入
      }
    })

    if (result.success) {
      // 将解析结果映射为UI需要的格式
      const questions = result.data.map((q, idx) => ({
        ...q,
        questionText: q.questionText || q.question || '',
        typeKey: q.type || 'single',
        typeLabel: getTypeLabel(q.type),
        chapter: q.chapter || '未分类',
        difficulty: q.difficulty || 'medium',
        tags: [],
        knowledgePoint: '',
        status: 'ok',
        displayIndex: idx + 1,
        skipped: false,
        dupInfo: null,
        subQuestions: q.subQuestions || [],
        missingAnswer: !q.answer,
        manualAnswer: '',
        options: buildOptionsArray(q)
      }))

      parsedQuestions.value = questions
      extractDetail.value = `已识别 ${questions.length} 道题目`
      ElMessage.success(`解析完成，共 ${questions.length} 道题目`)
      
      // 完成解析
      parseStep.value = 4
      parsing.value = false
      cachePreviewData()
      
      // 自动进入预览
      await delay(300)
      view.value = 'preview'
      setTimeout(() => renderPreviewMath(), 200)
    } else {
      throw new Error(result.error || '解析失败')
    }
  } catch (e) {
    console.error('[Parse] Error:', e)
    ElMessage.error('文件解析出错：' + (e.message || '未知错误'))
    parsing.value = false
    view.value = 'main'
  }
}

// 辅助函数：根据题型获取标签
function getTypeLabel(type) {
  const labels = {
    'single': '单选题',
    'multi': '多选题',
    'judge': '判断题',
    'essay': '简答题',
    'fill': '填空题',
    'comprehensive': '综合题'
  }
  return labels[type] || '未知'
}

// 辅助函数：构建选项数组
function buildOptionsArray(record) {
  const options = []
  if (record.optionA) options.push({ label: 'A', text: record.optionA })
  if (record.optionB) options.push({ label: 'B', text: record.optionB })
  if (record.optionC) options.push({ label: 'C', text: record.optionC })
  if (record.optionD) options.push({ label: 'D', text: record.optionD })
  return options
}

function cancelParsing() {
  parsing.value = false
  if (parseTimer) clearTimeout(parseTimer)
  ElMessage.info('已取消解析')
  view.value = 'main'
  selectedFile.value = null
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// ========== 预览数据 ==========
const parsedQuestions = ref([])
const selectedIds = ref([])
const selectAll = ref(false)
const activeFilter = ref('all')
const editingQuestion = ref(null)
const editingOptionsRaw = ref('')
const editingTagsRaw = ref('')
// 分题型编辑专用状态
const editingOptionList = ref([])           // 单选/多选：选项列表 [{label,text}]
const editingMultiAnswers = ref([])          // 多选：正确答案数组 ['A','C']
const editingFillAnswers = ref([''])        // 填空题：各空答案数组
const editingSubQuestions = ref([])         // 综合题：子题列表
const showEditDialog = ref(false)

// ========== 编辑辅助函数 ==========

/** 将多选答案字符串拆分为选项字母数组 */
function parseMultiAnswer(ans) {
  if (!ans) return []
  const str = String(ans).trim()
  // 优先按分隔符拆分（兼容 "A,C,D" / "A C D" / "ACD" 等格式）
  let parts = str.split(/[,，、\s|\/]+/).map(s => s.trim()).filter(Boolean)
  // 如果拆分后只有一个元素且是多个连续大写字母（如 "BC" "ACD"），逐字母拆分
  if (parts.length === 1 && /^[A-Z]{2,}$/.test(parts[0])) {
    parts = parts[0].split('')
  }
  return parts
}

/** 检查某选项是否为正确答案（支持单选和多选） */
function isOptionCorrect(label) {
  const ans = editingQuestion.value?.answer
  if (!ans || !label) return false
  // 单选：精确匹配
  if (editingQuestion.value?.typeKey === 'single') return String(ans).trim() === label
  // 多选：支持多种答案格式
  return parseMultiAnswer(ans).includes(label)
}

/** 获取选项文本 */
function getOptionText(label) {
  const opt = editingOptionList.value.find(o => o.label === label)
  return opt?.text || ''
}

/** 添加选项 */
function addOption() {
  const labels = 'ABCDEFGH'
  const nextIdx = editingOptionList.value.length
  if (nextIdx < 8) {
    editingOptionList.value.push({ label: labels[nextIdx], text: '' })
  }
}

/** 删除选项 */
function removeOption(idx) {
  editingOptionList.value.splice(idx, 1)
  // 重新编号
  const labels = 'ABCDEFGH'
  editingOptionList.value.forEach((o, i) => { o.label = labels[i] })
  // 如果删除的是正确答案，清除
  if (editingQuestion.value && !editingOptionList.value.find(o => o.label === editingQuestion.value.answer)) {
    editingQuestion.value.answer = ''
  }
}

/** 添加子题 */
function addSubQuestion() {
  editingSubQuestions.value.push({ typeKey: 'essay', text: '', answer: '' })
}

/** 数字转中文 */
function toChineseNum(n) {
  return '一二三四五六七八九十'[n - 1] || n
}

/** 获取各题型题干占位符 */
function getStemPlaceholder(typeKey) {
  const map = { essay: '请输入简答题题目...', calc: '请输入计算题题目...', analysis: '请输入分析题题目...' }
  return map[typeKey] || '请输入题目...'
}

/** 获取各题型答案占位符 */
function getAnswerPlaceholder(typeKey) {
  const map = { essay: '请输入参考答案要点...', calc: '请输入解题过程和最终答案...', analysis: '请输入分析要点和结论...' }
  return map[typeKey] || '请输入答案...'
}

// ========== 题型/字段标准化工具函数 ==========

/** 将原始类型名（中文）映射到 typeKey */
const RAW_TYPE_MAP = {
  '单选': 'single', '单项选择': 'single', '单选题': 'single', '选择题': 'single',
  '多选': 'multi', '多项选择': 'multi', '多选题': 'multi',
  '判断': 'judge', '判断题': 'judge', '是非题': 'judge',
  '填空': 'fill', '填空题': 'fill',
  '简答': 'essay', '简答题': 'essay', '问答': 'essay',
  '计算': 'calc', '计算题': 'calc',
  '分析': 'analysis', '分析题': 'analysis',
  '综合': 'comprehensive', '综合题': 'comprehensive', '组合': 'comprehensive'
}
function mapRawTypeToKey(rawType) {
  if (!rawType) return 'essay'
  const normalized = String(rawType).trim()
  return RAW_TYPE_MAP[normalized] || RAW_TYPE_MAP[normalType.replace(/题$/, '')] || 'essay'
}

/** typeKey → 中文标签（冗余但确保存在） */
const TYPE_LABEL_MAP = {
  single: '单选题', multi: '多选题', judge: '判断题',
  fill: '填空题', essay: '简答题', calc: '计算题',
  analysis: '分析题', comprehensive: '综合题'
}
function mapKeyTypeToLabel(key) {
  return TYPE_LABEL_MAP[key] || key || '未分类'
}

/** 从题目上下文推断章节名 */
function inferChapterFromContext(q) {
  // 优先使用已有的 chapter
  if (q.chapter && q.chapter !== '未分类') return q.chapter
  // 使用文件名
  if (selectedFile.value) {
    const name = selectedFile.value.name.replace(/\.(docx|doc|pdf)$/i, '')
    if (name) return name
  }
  return '自定义导入'
}

// ========== 卡片展示辅助函数 ==========

/** 判断是否为主观题型（需要显示大段答案区域） */
const SUBJECTIVE_TYPES = ['essay', 'calc', 'analysis', 'comprehensive']
function isSubjectiveType(typeKey) {
  return SUBJECTIVE_TYPES.includes(typeKey)
}

/** 判断某选项是否为正确答案（用于卡片高亮） */
function isCardOptionCorrect(q, label) {
  if (!q.answer || !label) return false
  // 单选：答案就是选项字母
  if (q.typeKey === 'single') return String(q.answer).trim() === label
  // 多选：支持多种答案格式（"ACD" / "A,C,D" / "A C D"）
  if (q.typeKey === 'multi') {
    return parseMultiAnswer(q.answer).includes(label)
  }
  return false
}

/** 格式化填空题答案（将分号/换行替换为可读格式） */
function formatFillAnswer(answer) {
  if (!answer) return '<span class="ans-empty">暂无</span>'
  // 将分号或换行分隔的多个空答案用竖线显示
  return answer.split(/[;；]/).map(s => s.trim())
    .filter(Boolean)
    .map((s, i) => `<span class="fill-ans-item"><b>${i + 1}.</b> ${s}</span>`)
    .join(' &nbsp;|&nbsp; ')
}

/** 格式化主观题/综合题答案 */
function formatSubjectiveAnswer(q) {
  if (!q.answer) return '<span class="ans-empty">暂无参考答案</span>'
  // 综合题：如果有子题，按子题结构展示（题目文本 + 答案）
  if (q.typeKey === 'comprehensive' && q.subQuestions && q.subQuestions.length) {
    return q.subQuestions.map((sq, i) => {
      const numText = `（${sq.number || toChineseNum(i+1)}）`
      const textHtml = sq.text ? `<div class="subq-text">${sq.text}</div>` : ''
      const ansHtml = sq.answer
        ? `<div class="subq-answer">${sq.answer.replace(/\n/g, '<br>')}</div>`
        : '<div class="subq-answer subq-empty">暂无答案</div>'
      return `<div class="subq-ans-item"><b>${numText}</b>${textHtml}${ansHtml}</div>`
    }).join('')
  }
  // 简单换行处理：将换行符转为<br>
  return q.answer.replace(/\n/g, '<br>')
}

// ========== KaTeX 公式渲染系统 ==========
const questionListRef = ref(null)        // 题目列表容器引用
let autoRenderer = null                  // MutationObserver 实例
let mathRendered = false                 // 是否已渲染过公式
let mathRetryTimer = null                // 重试定时器

/**
 * 预览页面公式渲染入口
 * 在进入预览视图、数据变化后调用
 * 包含多重保障：双 rAF + 延迟重试 + 多次尝试
 */
function renderPreviewMath() {
  if (!questionListRef.value) return

  // 使用 nextTick 确保 DOM 已更新
  nextTick(() => {
    // 双 rAF 确保浏览器完成布局和渲染
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        doRenderMath()

        // 额外保障：延迟后再渲染一次（处理动态内容延迟插入的情况）
        if (mathRetryTimer) clearTimeout(mathRetryTimer)
        mathRetryTimer = setTimeout(() => {
          doRenderMath()
          // 再一次延迟（极端情况）
          mathRetryTimer = setTimeout(() => {
            doRenderMath()
          }, 300)
        }, 200)
      })
    })
  })
}

/** 执行实际的 KaTeX 渲染 */
function doRenderMath() {
  const container = questionListRef.value
  if (!container) return

  try {
    // 1. 先移除隐藏类（防闪现）
    container.classList.add('rendered')

    // 2. 检查 window.renderMathInElement 是否可用
    if (typeof window.renderMathInElement !== 'function') {
      console.warn('[KaTeX] window.renderMathInElement 不可用，跳过渲染')
      return
    }

    // 3. 执行 KaTeX 渲染
    window.renderMathInElement(container, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '\\[', right: '\\]', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false },
      ],
      throwOnError: false,
      strict: false,
      errorColor: '#cc0000',
    })
    mathRendered = true
    console.log('[KaTeX] 渲染完成')
  } catch (e) {
    console.warn('[KaTeX] 预览渲染失败:', e.message)
  }
}

/**
 * 手动重新渲染所有公式（按钮触发）
 */
function rerenderFormulas() {
  if (mathRetryTimer) clearTimeout(mathRetryTimer)
  mathRendered = false
  ElMessage.info('正在重新渲染公式...')
  renderPreviewMath()
}

/**
 * 清理 KaTeX 资源
 */
function cleanupMath() {
  if (autoRenderer) {
    autoRenderer.disconnect()
    autoRenderer = null
  }
  mathRendered = false
}

const previewFileName = computed(() => selectedFile.value?.name || '未知文件.docx')
const fileSizeStr = computed(() => {
  if (!selectedFile.value) return '0 KB'
  const size = selectedFile.value.size
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
  return (size / (1024 * 1024)).toFixed(1) + ' MB'
})
const uploadTimeStr = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
})

const typeDistribution = computed(() => {
  const counts = {}
  parsedQuestions.value.forEach(q => { counts[q.typeLabel] = (counts[q.typeLabel] || 0) + 1 })
  return Object.entries(counts).map(([k,v]) => `${k}${v}`).join(' / ') || '-'
})

const chapterCount = computed(() => {
  const chapters = new Set(parsedQuestions.value.map(q => q.chapter).filter(Boolean))
  return chapters.size || 0
})

const filterTypes = computed(() => {
  const total = parsedQuestions.value.length
  const byType = {}
  parsedQuestions.value.forEach(q => { byType[q.typeKey] = (byType[q.typeKey] || 0) + 1 })
  const missing = parsedQuestions.value.filter(q => q.missingAnswer).length
  const dups = parsedQuestions.value.filter(q => q.status === 'duplicate').length

  return [
    { key: 'all', label: '全部', count: total },
    { key: 'single', label: '单选题', count: byType.single || 0 },
    { key: 'multi', label: '多选题', count: byType.multi || 0 },
    { key: 'judge', label: '判断题', count: byType.judge || 0 },
    { key: 'fill', label: '填空', count: byType.fill || 0 },
    { key: 'essay', label: '简答题', count: byType.essay || 0 },
    { key: 'calc', label: '计算题', count: byType.calc || 0 },
    { key: 'analysis', label: '分析题', count: byType.analysis || 0 },
    { key: 'comprehensive', label: '综合题', count: byType.comprehensive || 0 },
    { key: 'missing', label: '缺失字段', count: missing },
    { key: 'duplicate', label: '重复', count: dups }
  ]
})

const filteredQuestions = computed(() => {
  let list = parsedQuestions.value
  // 分配显示索引
  list.forEach((q, i) => { q.displayIndex = i + 1 })

  if (activeFilter.value !== 'all') {
    if (['single','multi','judge','fill','essay','calc','analysis','comprehensive'].includes(activeFilter.value)) {
      list = list.filter(q => q.typeKey === activeFilter.value)
    } else if (activeFilter.value === 'missing') {
      list = list.filter(q => q.missingAnswer)
    } else if (activeFilter.value === 'duplicate') {
      list = list.filter(q => q.status === 'duplicate')
    }
  }

  // 排除已跳过的
  return list.filter(q => !q.skipped)
})

watch(activeFilter, () => { selectAll.value = false })

// 当题目数据变化且处于预览视图时，自动重新渲染公式（处理图片还原后的延迟更新）
watch(parsedQuestions, (newVal) => {
  if (newVal && newVal.length > 0 && view.value === 'preview') {
    // 多次延迟渲染确保 DOM 完全就绪
    nextTick(() => {
      setTimeout(() => renderPreviewMath(), 100)
      setTimeout(() => renderPreviewMath(), 400)
      setTimeout(() => renderPreviewMath(), 800)
    })
  }
}, { deep: true })

function toggleSelectAll(e) {
  if (e.target.checked) {
    selectedIds.value = filteredQuestions.value.map(q => q._id)
  } else {
    selectedIds.value = []
  }
}

// --- 题目结构解析（备用回退入口） ---
// 主解析流程已迁移到 robustParser.js，此处仅保留轻量回退

/** 备用解析：直接调用智能规则解析器 */
function parseTextToQuestions(text) {
  try {
    // 动态导入避免循环依赖
    return parseWithExplicitMarkers_Sync(text, selectedFile.value?.name || '')
  } catch (e) {
    console.warn('[Fallback Parse] Error:', e)
    return []
  }
}

/** 同步简化版解析器（内联备用） */
function parseWithExplicitMarkers_Sync(text, fileName) {
  const NL = String.fromCharCode(10)
  const Q = [], L = text.split(NL)
  let n=0, tk='essay', tl='简答题', cq=null, ia=false
  const secP = (l) => { 
    const m=l.match(/^[一二三四五六七八九十]+[、.。]\s*(.+?)(?:[（(]\d*题?[)）])?\s*$/); 
    if(!m)return null; const c=m[1]
    if(/综合/.test(c))return{k:'comprehensive',l:'综合题'}
    if(/分析/.test(c))return{k:'analysis',l:'分析题'}
    if(/计算/.test(c))return{k:'calc',l:'计算题'}
    if(/简答|论述/.test(c))return{k:'essay',l:'简答题'}
    if(/多选/.test(c))return{k:'multi',l:'多选题'}
    if(/单选|选择/.test(c))return{k:'single',l:'单选题'}
    if(/判断/.test(c))return{k:'judge',l:'判断题'}
    if(/填空/.test(c))return{k:'fill',l:'填空题'}
    return null 
  }
  const done = () => { 
    if(!cq||!cq.questionText||cq.questionText.trim().length<2){cq=null;return}
    let qt = cq.questionText.trim()
    qt = qt.replace(/\[OPTIONS_START\]|\[OPTIONS_END\]|[【题目】]\d+[\.、.．]\s*/g,'').replace(/\s+/g,' ')
    cq.questionText = qt
    if(cq.answer) cq.answer = cq.answer.trim().replace(/\s+/g,' ')
    cq.missingAnswer = !(cq.answer && cq.answer.length>1)
    cq.status = cq.missingAnswer ? 'warning' : 'ok'
    Q.push({...cq});cq=null;ia=false 
  }
  let skipHead=0
  for(let i=0;i<L.length;i++){
    const l=L[i].trim()
    if(!l)continue
    if(skipHead<6 && /^(软件项目管理|模拟试卷|满分|考试时间)/.test(l)){skipHead++;continue}
    const s=secP(l)
    if(s){done();tk=s.k;tl=s.l;continue}
    const qm=l.match(/^(\d{1,3})[\.、.．]\s*(.*)/)
    if(qm && qm[2].trim()){done();n++
      cq={
        _id:'pq_'+n, typeKey:tk, typeLabel:tl, questionText:qm[2].trim(), options:[], answer:'',
        chapter:fileName ? fileName.replace(/\.(docx|doc|pdf)$/i,'') : '自定义导入',
        difficulty:3, tags:[], knowledgePoint:'', missingAnswer:false, manualAnswer:'', 
        skipped:false, dupInfo:null, number:n
      }
      continue
    }
    const om=l.match(/^\s*([A-Ga-g])[\.、.)｝]\s*(.*)/)
    if(om && cq){
      cq.options.push({label:om[1].toUpperCase(), text:om[2].trim()})
      if(cq.typeKey==='essay'){cq.typeKey='single';cq.typeLabel='单选题'}
      continue
    }
    const am=/^(?:[【\s*答案\s*【]|答案?[\s：:]|参考答案?[\s：:])/i.test(l)
    if(am && cq){
      ia=true
      const c=l.replace(/^(?:[【\s*答案\s*【]|答案?[\s：:]|参考答案?[\s：:])/i,'').trim()
      if(c)cq.answer=c
      continue
    }
    if(!cq)continue
    if(ia){
      cq.answer+=(cq.answer ? NL : '')+l
    }else{
      if(/^(（\d+）|^①②③④⑤⑥⑦⑧⑨⑩)/.test(l)){
        ia=true; cq.answer+=l
      }else{
        cq.questionText+=(cq.questionText ? NL : '')+l
      }
    }
  }
  done()
  return Q
}

function generateParsedQuestionsFallback() {
  // 解析失败时不显示假数据，显示空列表让用户知道解析出了问题
  parsedQuestions.value = []
}

// --- 操作方法 ---

function editQuestion(q) {
  editingQuestion.value = { ...q }
  editingTagsRaw.value = (q.tags || []).join(',')

  const typeKey = q.typeKey || 'essay'

  // 单选/多选题：初始化选项列表
  if (typeKey === 'single' || typeKey === 'multi') {
    let opts = q.options || []
    // 如果没有选项数据，尝试从题干或答案推断
    if (opts.length === 0 && q.questionText) {
      // 尝试生成默认ABCD空选项
      opts = ['A', 'B', 'C', 'D'].map(l => ({ label: l, text: '' }))
    }
    editingOptionList.value = opts.map(o => ({ ...o }))
    // 多选：初始化正确答案数组
    if (typeKey === 'multi') {
      editingMultiAnswers.value = (q.answer || '').split(/[,，、]/).map(s => s.trim()).filter(Boolean)
    }
  }

  // 填空题：初始化各空答案
  if (typeKey === 'fill') {
    const ansStr = q.answer || ''
    // 尝试按分号/换行/逗号分割
    const parts = ansStr.split(/[;；\n]/).map(s => s.trim()).filter(Boolean)
    editingFillAnswers.value = parts.length > 0 ? parts : ['']
  }

  // 综合题：初始化子题列表
  if (typeKey === 'comprehensive' && q.subQuestions) {
    editingSubQuestions.value = q.subQuestions.map(sq => ({ ...sq }))
  } else if (typeKey === 'comprehensive') {
    editingSubQuestions.value = [{ typeKey: 'essay', text: '', answer: q.answer || '' }]
  }

  // 兼容旧格式：保留 raw options
  editingOptionsRaw.value = (q.options || []).map(o => `${o.label}. ${o.text}`).join('\n')
}

function saveEditedQuestion() {
  if (!editingQuestion.value) return
  const q = editingQuestion.value
  const typeKey = q.typeKey || 'essay'

  // 单选/多选题：从选项列表回写
  if (typeKey === 'single' || typeKey === 'multi') {
    // 过滤空选项
    q.options = editingOptionList.value
      .filter(o => o.text && o.text.trim())
      .map(o => ({ label: o.label, text: o.text.trim() }))
    // 多选：合并答案
    if (typeKey === 'multi') {
      q.answer = editingMultiAnswers.value.sort().join('、')
    }
  }

  // 填空题：合并各空答案
  if (typeKey === 'fill') {
    q.answer = editingFillAnswers.value.filter(s => s && s.trim()).join('; ')
  }

  // 综合题：保存子题
  if (typeKey === 'comprehensive') {
    q.subQuestions = editingSubQuestions.value.map(sq => ({ ...sq }))
    // 合并所有子题答案
    q.answer = editingSubQuestions.value.map((sq, i) => `（${toChineseNum(i+1)}）${sq.answer}`).join('\n')
  }

  // 标签解析
  if (editingTagsRaw.value.trim()) {
    q.tags = editingTagsRaw.value.split(/[,，]/).map(s => s.trim()).filter(Boolean)
  }

  // 兼容旧格式：从 raw 文本重新解析 options（兜底）
  if (!q.options || q.options.length === 0) {
    if (editingOptionsRaw.value.trim()) {
      const optLines = editingOptionsRaw.value.split('\n').filter(l => l.trim())
      q.options = optLines.map(line => {
        const m = line.match(/^([A-Z])\.\s*(.+)$/i)
        return m ? { label: m[1].toUpperCase(), text: m[2] } : { label: '?', text: line }
      })
    }
  }

  // 更新题型标签
  const typeMap = { single: '单选题', multi: '多选题', judge: '判断题', fill: '填空题',
                    essay: '简答题', calc: '计算题', analysis: '分析题', comprehensive: '综合题' }
  q.typeLabel = typeMap[typeKey] || q.typeLabel

  // 写回原数组
  const idx = parsedQuestions.value.findIndex(x => x._id === q._id)
  if (idx >= 0) {
    parsedQuestions.value[idx] = { ...q }
  }
  editingQuestion.value = null
  cachePreviewData()
  ElMessage.success('题目已更新')
}

function deleteQuestion(q) {
  ElMessageBox.confirm(`确定删除「题目 ${q.displayIndex}」吗？`, '确认', { type: 'warning' }).then(() => {
    parsedQuestions.value = parsedQuestions.value.filter(x => x._id !== q._id)
    selectedIds.value = selectedIds.value.filter(id => id !== q._id)
    cachePreviewData()
    ElMessage.success('已删除')
  }).catch(() => {})
}

function batchDelete() {
  if (!selectedIds.value.length) return
  ElMessageBox.confirm(`确定删除选中的 ${selectedIds.value.length} 道题目？`, '批量删除', { type: 'warning' }).then(() => {
    parsedQuestions.value = parsedQuestions.value.filter(x => !selectedIds.value.includes(x._id))
    selectedIds.value = []
    selectAll.value = false
    cachePreviewData()
    ElMessage.success('已删除选中题目')
  }).catch(() => {})
}

function skipDuplicate(q) {
  q.skipped = true
  ElMessage.info('已跳过该重复题目')
}

function keepDuplicate(q) {
  q.status = 'ok'
  q.dupInfo = null
  ElMessage.success('标记为保留')
}

function exitPreview() {
  ElMessageBox.confirm('预览数据已缓存，关闭后可重新进入。是否返回资源库？', '确认', {
    confirmButtonText: '返回',
    cancelButtonText: '继续编辑',
    type: 'info'
  }).then(() => {
    cleanupMath()
    view.value = 'main'
  }).catch(() => {})
}

// 组件卸载时清理
onBeforeUnmount(() => {
  cleanupMath()
})

async function confirmImport() {
  const validQs = parsedQuestions.value.filter(q => !q.skipped && q.status !== 'duplicate')

  // 检查缺失答案的
  const incomplete = validQs.filter(q => q.missingAnswer && !q.manualAnswer)
  if (incomplete.length > 0) {
    ElMessage.warning(`还有 ${incomplete.length} 道题目缺少答案，请补充后重试`)
    return
  }

  try {
    ElMessage.success(`正在导入 ${validQs.length} 道题目...`)
    
    // Bug #2修复：实际使用uploadTarget分类导入内容
    const target = uploadTarget.value || 'qb_private'
    
    // 根据uploadTarget确定分类
    let category = 'question_bank' // 默认题库
    if (target.startsWith('ep_')) {
      category = 'exam_paper'
    } else if (target.startsWith('sg_')) {
      category = 'study_guide'
    } else if (target.startsWith('material_')) {
      category = 'material'
    }
    
    // 调用实际API导入
    const qs = useQuestionStore()
    
    // 批量创建题目
    for (const q of validQs) {
      const questionData = {
        subject: q.subject || '未分类',
        chapter: q.chapter || '未分类',
        type: mapTypeToChinese(q.type || q.typeKey),
        difficulty: q.difficulty || 'medium',
        question: q.questionText || q.question || '',
        answer: q.answer || q.manualAnswer || '',
        explanation: q.explanation || '',
        category: category, // Bug #2修复：添加分类字段
        uploadTarget: target // 保存原始uploadTarget
      }
      
      await qs.createQuestion(questionData)
    }
    
    ElMessage.success(`成功导入 ${validQs.length} 道题目到${getCategoryName(category)}！`)
    clearPreviewCache()
    view.value = 'main'
    selectedFile.value = null
    parsedQuestions.value = []
  } catch (e) {
    console.error('导入失败:', e)
    ElMessage.error('导入失败：' + (e.message || '未知错误'))
  }
}

// 辅助函数：映射题型到中文
function mapTypeToChinese(type) {
  const typeMap = {
    'single': '选择题',
    'multi': '多选题',
    'judge': '判断题',
    'essay': '简答题',
    'fill': '填空题',
    'comprehensive': '综合题',
    '选择题': '选择题',
    '多选题': '多选题',
    '判断题': '判断题',
    '简答题': '简答题',
    '填空题': '填空题',
    '综合题': '综合题'
  }
  return typeMap[type] || '选择题'
}

// 辅助函数：获取分类名称
function getCategoryName(category) {
  const categoryMap = {
    'question_bank': '题库',
    'exam_paper': '试卷库',
    'study_guide': '复习指导库',
    'material': '资料库'
  }
  return categoryMap[category] || '题库'
}

// ========== 缓存 ==========
const CACHE_KEY = 'lc_upload_preview'

function cachePreviewData() {
  try {
    const data = {
      fileName: selectedFile.value?.name || '',
      fileSize: selectedFile.value?.size || 0,
      questions: parsedQuestions.value,
      uploadTarget: uploadTarget.value,
      cachedAt: Date.now()
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch (e) {
    /* localStorage 可能不可用 */
  }
}

function loadCachedPreview() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    // 缓存24小时有效
    if (Date.now() - data.cachedAt > 86400000) {
      clearPreviewCache()
      return null
    }
    return data
  } catch (e) { return null }
}

function clearPreviewCache() {
  try { localStorage.removeItem(CACHE_KEY) } catch (e) {}
}

onMounted(async () => {
  await qs.init()
  // 检查是否有缓存的上次预览数据
  const cached = loadCachedPreview()
  if (cached && cached.questions && cached.questions.length > 0) {
    // 可选：自动恢复上次的预览
    // 当前不自动恢复，用户需要手动触发
  }
})
</script>

<style scoped>
/* ========== 页面容器 ========== */
.lc-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 20px;
}

.page-header { margin-bottom: 22px; }
.ph-title {
  font-size: 22px; font-weight: 700; color: #111827; margin: 0;
}

/* ========== Tab栏 ========== */
.top-bar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 20px; gap: 16px;
}
.tab-nav { display: flex; gap: 6px; }
.tab-btn {
  position: relative; display: flex; align-items: center; gap: 5px;
  padding: 10px 18px; border: none; background: transparent; cursor: pointer;
  font-size: 14px; color: #6b7280; border-bottom: 2.5px solid transparent; transition: all 0.25s;
}
.tab-btn:hover { color: #374151; }
.tab-btn.active { color: #10b981; font-weight: 600; border-bottom-color: #10b981; }
.tab-num { font-size: 12px; color: #9ca3af; }
.tab-btn.active .tab-num { color: #10b981; opacity: 0.7; }

.top-actions { display: flex; gap: 10px; }
.btn-upload {
  display: flex; align-items: center; gap: 4px; padding: 8px 18px;
  background: #10b981; color: #fff; border: none; border-radius: 8px;
  font-size: 13.5px; font-weight: 600; cursor: pointer; transition: all 0.2s;
}
.btn-upload:hover { background: #059669; }
.btn-create {
  padding: 8px 18px; background: #fff; color: #10b981;
  border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 13.5px; font-weight: 500; cursor: pointer;
}
.btn-create:hover { border-color: #10b981; background: #f0fdf4; }

/* ========== 上传区域 ========== */
.upload-zone {
  border: 2px dashed #d1d5db; border-radius: 12px; padding: 44px 24px;
  text-align: center; cursor: pointer; background: #fafbfc; transition: all 0.25s; margin-bottom: 24px;
}
.upload-zone:hover, .upload-zone.dragover { border-color: #10b981; background: #f0fdf4; }
.uz-icon { font-size: 42px; margin-bottom: 10px; }
.uz-text { font-size: 14.5px; font-weight: 600; color: #374151; margin: 0 0 6px; }
.uz-hint { font-size: 12.5px; color: #9ca3af; margin: 0 0 16px; }
.uz-formats { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; }
.fmt-tag {
  padding: 3px 11px; border-radius: 12px; font-size: 11.5px; font-weight: 600; letter-spacing: 0.3px;
}
.fmt-pdf  { background: #fef2f2; color: #dc2626; }
.fmt-docx { background: #eff6ff; color: #2563eb; }
.fmt-xlsx { background: #ecfdf5; color: #16a34a; }
.fmt-txt  { background: #fffbeb; color: #d97706; }
.fmt-json { background: #f3e8ff; color: #7c3aed; }
.fmt-img { background: #fdf2f8; color: #db2777; }

/* ========== 资源卡片 ========== */
.card-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.res-card {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; transition: all 0.2s; cursor: pointer;
}
.res-card:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.06); transform: translateY(-2px); }
.rc-left { display: flex; align-items: center; gap: 14px; min-width: 0; }
.rc-icon {
  width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
  font-size: 20px; flex-shrink: 0;
}
.rc-info { min-width: 0; }
.rc-title {
  font-size: 14.5px; font-weight: 600; color: #111827; margin: 0 0 4px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.rc-meta {
  font-size: 12px; color: #9ca3af; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.rc-tags { flex-shrink: 0; margin-left: 12px; }
.tag { display: inline-block; padding: 3px 10px; border-radius: 10px; font-size: 11.5px; font-weight: 500; white-space: nowrap; }
.tag.pub { background: #ecfdf5; color: #059669; }
.tag.priv { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }

.empty-state { text-align: center; padding: 60px 20px; }
.empty-text { font-size: 14px; color: #9ca3af; margin: 0; }

/* ========== 对话框公共样式 ========== */
.dialog-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.dialog-box {
  background: #fff; border-radius: 14px; width: 90%; max-width: 580px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.18);
}
.dlg-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 22px; border-bottom: 1px solid #e5e7eb;
}
.dlg-header h3 { font-size: 16px; font-weight: 700; color: #111827; margin: 0; }
.dlg-close {
  width: 30px; height: 30px; border: none; background: #f3f4f6; border-radius: 7px;
  font-size: 17px; cursor: pointer; color: #6b7280;
}
.dlg-close:hover { background: #e5e7eb; }
.dlg-body { padding: 22px; }
.dlg-footer {
  display: flex; justify-content: flex-end; gap: 10px; padding: 14px 22px; border-top: 1px solid #e5e7eb;
}
.dlg-cancel {
  padding: 8px 18px; border: 1.5px solid #d1d5db; border-radius: 8px;
  background: #fff; color: #6b7280; font-size: 13.5px; cursor: pointer;
}
.dlg-confirm {
  padding: 8px 18px; border: none; border-radius: 8px;
  background: #10b981; color: #fff; font-size: 13.5px; font-weight: 600; cursor: pointer;
}
.dlg-confirm:disabled { opacity: 0.45; cursor: not-allowed; }

/* ========== 上传对话框专用 ========== */
.dlg-upload-box { max-width: 580px; }

.dlg-dropzone {
  border: 2px dashed #d1d5db; border-radius: 12px; padding: 40px 20px;
  text-align: center; cursor: pointer; transition: all 0.25s; margin-bottom: 16px;
  background: #fafbfc;
}
.dlg-dropzone:hover, .dlg-dropzone.dragover { border-color: #10b981; background: #f0fdf4; }
.dlg-dropzone.parsing-mode { border-color: #10b981; background: #ecfdf5; }
.dd-icon { font-size: 48px; margin-bottom: 10px; }
.dd-text { font-size: 14.5px; color: #374151; margin: 0 0 6px; }
.dd-hint { font-size: 12.5px; color: #9ca3af; margin: 0; }

.selected-file-bar {
  display: flex; align-items: center; gap: 8px; padding: 10px 14px;
  background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; margin-bottom: 16px;
}
.sfb-icon { font-size: 16px; }
.sfb-name { font-size: 13.5px; font-weight: 600; color: #065f46; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sfb-remove {
  border: none; background: transparent; color: #10b981; font-size: 18px; cursor: pointer; width: 22px; text-align: center;
}
.sfb-remove:hover { color: #dc2626; }

.dlg-field { margin-bottom: 16px; }
.dlg-field label {
  display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px;
}
.target-select-wrapper { position: relative; }
.target-select {
  width: 100%; padding: 10px 14px; border: 1.5px solid #d1d5db; border-radius: 8px;
  font-size: 13.5px; color: #1f2937; outline: none; appearance: auto; background: #fff;
}
.target-select:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.1); }
.target-select:disabled { background: #f9fafb; color: #9ca3af; cursor: not-allowed; }

.dlg-upload-actions { margin-top: 20px; }
.btn-start-parse {
  width: 100%; padding: 11px; border: none; border-radius: 8px;
  background: #10b981; color: #fff; font-size: 14.5px; font-weight: 600; cursor: pointer; transition: all 0.2s;
}
.btn-start-parse:hover { background: #059669; }
.btn-start-parse:disabled { opacity: 0.45; cursor: not-allowed; }

/* ========== 解析进度视图 ========== */
.dlg-parse-box { max-width: 580px; }

.parse-steps { margin-top: 18px; }
.ps-item {
  display: flex; align-items: flex-start; gap: 12px; padding: 11px 0;
  border-bottom: 1px solid #f3f4f6;
}
.ps-item:last-child { border-bottom: none; }
.ps-icon-wrap { flex-shrink: 0; margin-top: 1px; }
.ps-icon {
  width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700;
}
.ps-done { background: #10b981; color: #fff; }
.ps-active { background: #fef3c7; color: #d97706; }
.ps-pending { background: #e5e7eb; color: #9ca3af; }
.ps-spinner {
  display: inline-block; width: 12px; height: 12px; border: 2px solid #d97706;
  border-top-color: transparent; border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.ps-content { flex: 1; min-width: 0; }
.ps-label { display: block; font-size: 14px; font-weight: 600; color: #111827; }
.ps-detail { display: block; font-size: 12.5px; color: #6b7280; margin-top: 2px; }
.ps-item.done .ps-detail { color: #059669; }
.ps-item.active .ps-label { color: #d97706; }

.parse-footer {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 20px; padding-top: 16px; border-top: 1px solid #f3f4f6;
}
.pf-time { font-size: 13px; color: #6b7280; }
.btn-cancel-parse {
  padding: 8px 22px; border: 1.5px solid #d1d5db; border-radius: 8px;
  background: #fff; color: #6b7280; font-size: 13.5px; cursor: pointer;
}
.btn-cancel-parse:hover { border-color: #ef4444; color: #ef4444; }
.btn-cancel-parse:disabled { opacity: 0.4; cursor: not-allowed; }

/* ========== 预览页面（全屏） ========== */
.preview-page {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 900;
  background: #f3f4f6; display: flex; flex-direction: column;
}

.pv-topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 24px; background: #fff; border-bottom: 1px solid #e5e7eb; flex-shrink: 0;
}
.pv-back {
  padding: 7px 18px; border: 1.5px solid #d1d5db; border-radius: 8px;
  background: #fff; color: #374151; font-size: 13.5px; cursor: pointer;
}
.pv-back:hover { border-color: #10b981; color: #10b981; }
.btn-pv-primary {
  padding: 7px 22px; border: none; border-radius: 8px; background: #10b981;
  color: #fff; font-size: 13.5px; font-weight: 600; cursor: pointer;
}
.btn-pv-primary:hover { background: #059669; }
.btn-pv-primary:disabled { opacity: 0.45; cursor: not-allowed; }

.pv-body {
  display: flex; flex: 1; overflow: hidden;
}

/* ----- 左侧摘要面板 ----- */
.pv-left {
  width: 280px; flex-shrink: 0; background: #fff; border-right: 1px solid #e5e7eb;
  overflow-y: auto; padding: 24px 20px;
}

.file-info-card { text-align: center; margin-bottom: 24px; }
.fic-icon-wrap {
  width: 64px; height: 64px; margin: 0 auto 12px; border-radius: 14px;
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  display: flex; align-items: center; justify-content: center;
}
.fic-icon { font-size: 28px; }
.fic-name { font-size: 15px; font-weight: 700; color: #111827; margin: 0 0 8px; word-break: break-word; }
.fic-meta {
  display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #9ca3af;
}

.stat-rows { margin-bottom: 24px; }
.stat-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 0; border-bottom: 1px solid #f3f4f6;
}
.stat-row:last-child { border-bottom: none; }
.stat-label { font-size: 13px; color: #6b7280; }
.stat-value { font-size: 13px; font-weight: 600; color: #111827; }
.stat-value.stat-green { color: #059669; }

.filter-section .fs-title {
  font-size: 13px; font-weight: 700; color: #111827; margin: 0 0 10px;
}
.filter-tags { display: flex; flex-wrap: wrap; gap: 7px; }
.ftag {
  padding: 5px 11px; border: 1.5px solid #e5e7eb; border-radius: 16px;
  background: #fff; font-size: 12px; color: #6b7280; cursor: pointer; transition: all 0.15s;
}
.ftag:hover { border-color: #10b981; color: #10b981; }
.ftag.active { background: #10b981; border-color: #10b981; color: #fff; }
.ftag-count { opacity: 0.75; margin-left: 1px; }

/* ----- 右侧题目列表 ----- */
.pv-right { flex: 1; overflow-y: auto; padding: 20px 24px; }

.list-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px; flex-wrap: wrap; gap: 10px;
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg-page, #f9fafb);
  padding: 12px 4px 14px;
}
.lt-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.cb-all {
  display: flex; align-items: center; gap: 5px; font-size: 13px; color: #374151; cursor: pointer;
}
.lt-btn {
  padding: 5px 12px; border: 1.5px solid #e5e7eb; border-radius: 6px;
  background: #fff; font-size: 12px; color: #6b7280; cursor: pointer;
}
.lt-btn:hover:not(:disabled) { border-color: #10b981; color: #10b981; }
.lt-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.lt-btn-math {
  border-color: #10b981; color: #10b981; background: #ecfdf5;
}
.lt-btn-math:hover:not(:disabled) { background: #10b981; color: #fff; }
.lt-right { font-size: 13px; color: #6b7280; }
.lt-count b { color: #111827; }

/* ----- KaTeX 渲染区域 ----- */
.math-content { visibility: hidden; }
.math-content.rendered { visibility: visible; }

/* ----- 题目卡片（内容直接展示） ----- */
.q-card-list { display: flex; flex-direction: column; gap: 16px; }
.q-card {
  background: #fff; border: 1.5px solid #e5e7eb; border-radius: 12px;
  padding: 18px 22px; transition: all 0.2s;
}
.q-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
.q-card.selected { border-color: #10b981; background: #f0fdf4; }
.q-card.status-warning { border-left: 4px solid #f59e0b; }
.q-card.status-duplicate { border-left: 4px solid #ef4444; }
.q-card.status-ok { border-left: 4px solid #10b981; }

.qc-header {
  display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
}
.qc-status-icon { flex-shrink: 0; }
.si-ok, .si-warn, .si-dup, .si-pending {
  width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700;
}
.si-ok { background: #d1fae5; color: #059669; }
.si-warn { background: #fef3c7; color: #d97706; }
.si-dup { background: #fee2e2; color: #dc2626; }
.si-pending { background: #e5e7eb; color: #9ca3af; }

.qc-index { font-size: 13.5px; font-weight: 700; color: #111827; }
.qc-type {
  padding: 2px 10px; border-radius: 10px; font-size: 11.5px; font-weight: 600;
}
.type-single { background: #dbeafe; color: #2563eb; }
.type-multi { background: #ede9fe; color: #7c3aed; }
.type-judge { background: #d1fae5; color: #059669; }
.type-fill { background: #fef3c7; color: #d97706; }
.type-essay { background: #fee2e2; color: #dc2626; }
.type-calc { background: #e0e7ff; color: #4338ca; }
.type-analysis { background: #fef3c7; color: #b45309; }
.type-comprehensive { background: #f3e8ff; color: #7c3aed; }
.qc-cb { margin-left: auto; }

/* --- 题干区域 --- */
.qc-body { margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px dashed #f0f0f0; }
.qc-text {
  font-size: 15px; line-height: 1.75; color: #1f2937; margin: 0;
  font-weight: 500;
}

/* --- 选项区域 --- */
.qc-options { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }
.qc-opt {
  display: flex; align-items: flex-start; gap: 6px;
  padding: 8px 12px; border: 1.5px solid #f0f0f0; border-radius: 8px;
  font-size: 13.5px; color: #374151; line-height: 1.55;
  transition: all 0.15s; cursor: default;
}
.qc-opt:hover { border-color: #d1d5db; background: #fafafa; }
.qc-opt.opt-correct {
  border-color: #10b981; background: #ecfdf5;
  box-shadow: 0 0 0 2px rgba(16,185,129,0.1);
}
.opt-label {
  font-weight: 700; color: #6b7280; margin-right: 2px;
  flex-shrink: 0; width: 18px;
}
.opt-opt-correct .opt-label { color: #059669; }
.opt-text { color: #1f2937; word-break: break-word; }
.opt-correct-mark {
  margin-left: auto; color: #10b981; font-weight: 900; font-size: 15px;
  flex-shrink: 0;
}

/* --- 判断题答案 --- */
.qc-judge-answer { margin-bottom: 14px; }
.judge-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 20px; border-radius: 8px; font-size: 15px; font-weight: 700;
}
.judge-right { background: #ecfdf5; color: #059669; border: 1.5px solid #a7f3d0; }
.judge-wrong { background: #fef2f2; color: #dc2626; border: 1.5px solid #fecaca; }

/* --- 填空题答案 --- */
.qc-fill-answer {
  display: flex; align-items: baseline; gap: 6px; margin-bottom: 14px;
  padding: 10px 14px; background: #faf5ff; border: 1px solid #ede9fe; border-radius: 8px;
}
.fill-answer-label { font-size: 13px; font-weight: 700; color: #7c3aed; white-space: nowrap; }
.fill-answer-content { font-size: 13.5px; color: #4c1d95; line-height: 1.6; }
.fill-ans-item { display: inline; }
.ans-empty { color: #d1d5db; font-style: italic; }

/* --- 主观题答案区域 --- */
.qc-answer-section {
  margin-bottom: 14px; border: 1px solid #ecfdf5; border-radius: 10px;
  overflow: hidden; background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
}
.answer-header {
  padding: 8px 14px; background: #10b981; color: white;
  font-size: 12.5px; font-weight: 700; letter-spacing: 0.5px;
}
.answer-body {
  padding: 12px 14px; font-size: 13.5px; line-height: 1.75; color: #1f2937;
  white-space: pre-wrap; word-break: break-word;
}
/* 答案区域中的图片（docx内嵌图片） */
.answer-body img, .qc-text img, .subq-text img, .subq-answer img {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  margin: 8px 0;
  display: block;
}
.subq-ans-item {
  margin-bottom: 14px; padding: 10px 12px; background: #f9fafb; border-radius: 8px;
  border-left: 3px solid #10b981;
}
.subq-ans-item:last-child { margin-bottom: 0; }
.subq-text {
  margin: 6px 0 8px; font-size: 13.2px; line-height: 1.7; color: #374151; font-weight: 500;
}
.subq-answer {
  font-size: 13px; line-height: 1.75; color: #059669; padding-left: 12px; border-left: 2px solid #d1fae5;
}
.subq-answer.subq-empty { color: #9ca3af; font-style: italic; }

/* 缺失答案补充 */
.qc-missing { margin-bottom: 10px; }
.qm-badge {
  display: inline-block; padding: 3px 10px; background: #fef3c7; color: #b45309;
  border-radius: 6px; font-size: 12px; font-weight: 500; margin-bottom: 6px;
}
.qm-input {
  width: 100%; padding: 8px 12px; border: 1.5px dashed #f59e0b; border-radius: 8px;
  font-size: 13px; outline: none; resize: vertical; background: #fffbeb;
  box-sizing: border-box; font-family: inherit;
}
.qm-input:focus { border-style: solid; border-color: #f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,0.1); }

/* 重复警告横幅 */
.qc-dup-banner {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 10px 14px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px;
  margin-bottom: 10px; font-size: 12.5px; color: #92400e;
}
.dup-icon { font-size: 14px; }
.dup-actions { display: flex; gap: 8px; margin-left: auto; }
.dup-skip, .dup-keep {
  padding: 4px 14px; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer;
}
.dup-skip { border: 1px solid #d1d5db; background: #fff; color: #6b7280; }
.dup-skip:hover { border-color: #6b7280; }
.dup-keep { border: 1.5px solid #10b981; background: #ecfdf5; color: #059669; }
.dup-keep:hover { background: #d1fae5; }

/* 元数据行 */
.qc-meta-row {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding-top: 10px; border-top: 1px solid #f3f4f6;
  font-size: 12px; color: #9ca3af;
}
.qcm-chapter { font-weight: 500; color: #374151; }
.star { color: #e5e7eb; font-size: 12px; }
.star.filled { color: #f59e0b; }
.qcm-tags { color: #6b7280; }
.qcm-actions { margin-left: auto; display: flex; gap: 8px; }
.qca-edit, .qca-delete {
  padding: 4px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; border: 1px solid transparent;
}
.qca-edit { background: #f0fdf4; color: #059669; border-color: #a7f3d0; }
.qca-edit:hover { background: #d1fae5; }
.qca-delete { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
.qca-delete:hover { background: #fee2e2; }

.empty-list { text-align: center; padding: 40px 20px; color: #9ca3af; font-size: 14px; }

/* ========== 编辑弹窗（分题型） ========== */
.edit-dialog { max-width: 720px; width: 92%; }
.edit-dialog.edit-comprehensive { max-width: 800px; }

.dlg-header { display: flex; align-items: center; justify-content: space-between; }
.dlg-header-left { display: flex; align-items: center; gap: 10px; }
.dlg-header-left h3 { margin: 0; font-size: 16px; color: #1f2937; }
.dlg-type-badge {
  display: inline-block; padding: 2px 10px; border-radius: 12px;
  font-size: 12px; font-weight: 600;
}
.badge-single { background: #dbeafe; color: #2563eb; }
.badge-multi { background: #e0e7ff; color: #4338ca; }
.badge-judge { background: #fef3c7; color: #d97706; }
.badge-fill { background: #ede9fe; color: #7c3aed; }
.badge-essay { background: #dcfce7; color: #16a34a; }
.badge-calc { background: #fce7f3; color: #db2777; }
.badge-analysis { background: #f3e8ff; color: #9333ea; }
.badge-comprehensive { background: #fff7ed; color: #c2410c; }

.edit-body { display: flex; flex-direction: column; gap: 14px; }
.eb-field { display: flex; flex-direction: column; gap: 5px; }
.eb-field label {
  font-size: 13px; font-weight: 600; color: #374151;
}
.eb-hint { font-weight: 400; font-size: 11.5px; color: #9ca3af; margin-left: 4px; }
.eb-col-title { font-size: 14px !important; color: #10b981 !important; }

.eb-textarea, .eb-input, .eb-select {
  padding: 9px 12px; border: 1.5px solid #d1d5db; border-radius: 8px;
  font-size: 13.5px; color: #1f2937; outline: none; font-family: inherit;
  transition: border-color 0.2s;
}
.eb-textarea:focus, .eb-input:focus, .eb-select:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.1); }
.eb-textarea { resize: vertical; line-height: 1.6; }
.eb-row { display: flex; gap: 12px; }
.eb-half { flex: 1; }

/* 题干区域 */
.eb-textarea-stem { font-weight: 500; background: #fafafa; }
.eb-textarea-large { min-height: 140px; }
.eb-textarea-answer { background: #f0fdf4; border-color: #a7f3d0; }

/* --- 单选/多选选项编辑器 --- */
.options-editor { display: flex; flex-direction: column; gap: 8px; }
.option-row {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px; border: 1.5px solid #e5e7eb; border-radius: 8px;
  transition: all 0.2s;
}
.option-row:hover { border-color: #10b981; background: #f0fdf4; }
.option-row.option-correct { border-color: #10b981; background: #ecfdf5; box-shadow: 0 0 0 2px rgba(16,185,129,0.15); }
.opt-label {
  width: 28px; height: 28px; border-radius: 6px; background: #f3f4f6;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 13px; color: #6b7280; flex-shrink: 0;
}
.option-correct .opt-label { background: #10b981; color: white; }
.opt-radio, .opt-checkbox {
  width: 18px; height: 18px; accent-color: #10b981; cursor: pointer; flex-shrink: 0;
}
.opt-text { flex: 1; padding: 6px 10px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 13px; outline: none; }
.opt-text:focus { border-color: #10b981; }
.opt-del {
  width: 26px; height: 26px; border: none; background: #fef2f2; color: #ef4444;
  border-radius: 6px; cursor: pointer; font-size: 16px; flex-shrink: 0;
  transition: background 0.15s;
}
.opt-del:hover { background: #fee2e2; }
.opt-add-btn {
  padding: 8px; border: 1.5px dashed #d1d5db; border-radius: 8px; background: none;
  color: #6b7280; font-size: 13px; cursor: pointer; border-style: dashed;
  transition: all 0.2s;
}
.opt-add-btn:hover { border-color: #10b981; color: #10b981; background: #ecfdf5; }

/* 答案预览 */
.answer-preview-box {
  padding: 10px 14px; background: #ecfdf5; border: 1.5px solid #a7f3d0;
  border-radius: 8px; font-weight: 600; color: #059669; font-size: 14px;
}

/* --- 判断题 --- */
.judge-buttons { display: flex; gap: 12px; }
.judge-btn {
  flex: 1; padding: 18px 24px; border: 2px solid #e5e7eb; border-radius: 12px;
  background: #fafafa; font-size: 17px; font-weight: 700; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: all 0.2s;
}
.judge-icon { font-size: 22px; font-weight: 900; }
.judge-true.active { border-color: #10b981; background: #ecfdf5; color: #059669; }
.judge-false.active { border-color: #ef4444; background: #fef2f2; color: #dc2626; }
.judge-true:not(.active):hover { border-color: #86efac; background: #f0fdf4; }
.judge-false:not(.active):hover { border-color: #fca5a5; background: #fff1f2; }

/* --- 填空题 --- */
.fill-answers-list { display: flex; flex-direction: column; gap: 8px; }
.fill-answer-row {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px; border: 1.5px solid #e5e7eb; border-radius: 8px;
}
.fill-index {
  font-size: 12px; font-weight: 600; color: #7c3aed; background: #ede9fe;
  padding: 3px 8px; border-radius: 4px; white-space: nowrap; flex-shrink: 0;
}
.fill-input { flex: 1; padding: 6px 10px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 13px; outline: none; }
.fill-input:focus { border-color: #10b981; }
.fill-del {
  width: 26px; height: 26px; border: none; background: #fef2f2; color: #ef4444;
  border-radius: 6px; cursor: pointer; font-size: 16px; flex-shrink: 0;
}
.fill-del:hover { background: #fee2e2; }
.fill-add-btn {
  padding: 8px; border: 1.5px dashed #d1d5db; border-radius: 8px; background: none;
  color: #6b7280; font-size: 13px; cursor: pointer;
}
.fill-add-btn:hover { border-color: #a78bfa; color: #7c3aed; background: #f5f3ff; }

/* --- 简答/计算/分析 左右分栏 --- */
.eb-split-layout { display: flex; gap: 14px; }
.eb-split-col { flex: 1; display: flex; flex-direction: column; }
.eb-col-question { border-right: 1px solid #e5e7eb; padding-right: 10px; }
.eb-split-layout .eb-field { gap: 6px; }

/* --- 综合题子题 --- */
.subq-list { display: flex; flex-direction: column; gap: 10px; }
.subq-item {
  padding: 12px; border: 1.5px solid #e5e7eb; border-radius: 10px;
  background: #fffbfb; transition: border-color 0.2s;
}
.subq-item:hover { border-color: #fdba74; }
.subq-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.subq-index {
  font-weight: 700; color: #c2410c; background: #fff7ed;
  padding: 2px 8px; border-radius: 4px; font-size: 13px;
}
.subq-type-select {
  padding: 3px 8px; border: 1px solid #d1d5db; border-radius: 5px;
  font-size: 12px; outline: none; color: #6b7280;
}
.subq-type-select:focus { border-color: #10b981; }
.subq-del {
  margin-left: auto; width: 24px; height: 24px; border: none; background: #fef2f2;
  color: #ef4444; border-radius: 4px; cursor: pointer; font-size: 14px;
}
.subq-text, .subq-answer {
  width: 100%; padding: 6px 10px; border: 1px solid #e5e7eb; border-radius: 6px;
  font-size: 13px; margin-bottom: 6px; outline: none;
}
.subq-text:last-of-type, .subq-answer:last-of-type { margin-bottom: 0; }
.subq-text:focus, .subq-answer:focus { border-color: #10b981; }
.subq-answer { background: #f0fdf4; }
.subq-add-btn {
  padding: 10px; border: 1.5px dashed #fdba74; border-radius: 8px; background: none;
  color: #c2410c; font-size: 13px; cursor: pointer; font-weight: 500;
}
.subq-add-btn:hover { background: #fff7ed; border-color: #f97316; }

/* 通用底部信息 */
.eb-common-info { border-top: 1px solid #f3f4f6; padding-top: 10px; margin-top: 2px; }

/* ========== 响应式 ========== */
@media (max-width: 900px) {
  .pv-body { flex-direction: column; overflow-y: auto; }
  .pv-left { width: 100%; border-right: none; border-bottom: 1px solid #e5e7eb; }
  .pv-right { overflow-y: visible; }
  .card-grid { grid-template-columns: 1fr; }
  .top-bar { flex-direction: column; align-items: flex-start; }
  .top-actions { width: 100%; justify-content: flex-start; }
}

@media (max-width: 600px) {
  .list-toolbar { flex-direction: column; align-items: flex-start; }
  .lt-left { width: 100%; }
  .qc-meta-row { flex-direction: column; align-items: flex-start; gap: 6px; }
  .qcm-actions { margin-left: 0; width: 100%; }
  .dup-banner { flex-direction: column; align-items: flex-start; }
  .dup-actions { margin-left: 0; margin-top: 6px; }
}

/* ========== 库详情页：科目列表 ========== */
.library-detail-page { padding-top: 4px; }

.ld-topbar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 20px; flex-wrap: wrap; gap: 12px;
}
.ld-breadcrumb {
  display: flex; align-items: center; gap: 6px;
  font-size: 14px; color: #6b7280;
}
.bc-item {
  cursor: pointer; transition: color 0.2s;
}
.bc-item:hover { color: #10b981; }
.bc-sep { color: #d1d5db; user-select: none; }
.bc-current { color: #111827; font-weight: 600; }

.ld-actions { display: flex; gap: 10px; }

/* 库摘要卡片 */
.lib-summary-card {
  display: flex; align-items: center; justify-content: space-between;
  background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 50%, #f0f9ff 100%);
  border: 1px solid #d1fae5; border-radius: 12px; padding: 20px 24px;
  margin-bottom: 24px;
}
.lsc-left { display: flex; align-items: center; gap: 14px; }
.lsc-icon {
  width: 48px; height: 48px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; flex-shrink: 0;
}
.lsc-title { font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 4px; }
.lsc-meta { font-size: 13px; color: #6b7280; margin: 0; }
.lsc-stats { display: flex; gap: 24px; }
.lsc-stat { text-align: center; }
.lsc-stat-num { display: block; font-size: 24px; font-weight: 700; color: #10b981; }
.lsc-stat-label { font-size: 12px; color: #9ca3af; }

/* 科目标题行 */
.section-title-row {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px;
}
.st-title { font-size: 16px; font-weight: 600; color: #374151; margin: 0; }
.st-count { font-size: 13px; color: #9ca3af; }

/* 科目卡片网格 */
.subject-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}
.subject-card {
  background: #fff; border: 1px solid #e5e7eb; border-radius: 10px;
  padding: 18px 20px; cursor: pointer; transition: all 0.2s;
  position: relative;
}
.subject-card:hover {
  border-color: #10b981; box-shadow: 0 4px 14px rgba(16,185,129,0.12);
  transform: translateY(-2px);
}
.sc-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.sc-icon { font-size: 20px; }
.sc-badge {
  font-size: 11px; padding: 2px 8px; border-radius: 10px;
  background: #f3f4f6; color: #9ca3af; font-weight: 500;
}
.sc-badge.hot { background: #fef2f2; color: #ef4444; }
.sc-name {
  font-size: 15px; font-weight: 600; color: #1f2937; margin: 0 0 8px;
  line-height: 1.4;
}
.sc-meta {
  font-size: 12.5px; color: #9ca3af; margin: 0; display: flex; align-items: center; gap: 6px;
}
.sc-dot { color: #d1d5db; }
.sc-arrow {
  position: absolute; right: 18px; top: 50%; transform: translateY(-50%);
  font-size: 16px; color: #d1d5db; transition: all 0.2s;
}
.subject-card:hover .sc-arrow { color: #10b981; transform: translateY(-50%) translateX(3px); }

/* 预览页面包屑增强 */
.pv-back-group { display: flex; align-items: center; gap: 12px; }
.pv-breadcrumb {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; color: #6b7280;
}
.bc-mini { font-size: 13px; }
.bc-mini.bc-current { color: #10b981; font-weight: 500; }
.bc-sep-mini { color: #d1d5db; user-select: none; }

@media (max-width: 700px) {
  .lib-summary-card { flex-direction: column; align-items: flex-start; gap: 14px; }
  .lsc-stats { width: 100%; justify-content: flex-start; gap: 32px; }
  .subject-grid { grid-template-columns: 1fr; }
  .ld-topbar { flex-direction: column; align-items: flex-start; }
}
</style>
