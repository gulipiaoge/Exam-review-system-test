import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../utils/api.js'

export const useExamStore = defineStore('exam', () => {
  const examRecords = ref([])
  const loading = ref(false)

  // 从后端加载考试记录
  async function loadRecords() {
    loading.value = true
    try {
      const res = await api.get('/exam/records')
      if (res && !res.error) {
        examRecords.value = res.records || []
        // 同时更新 localStorage 作为缓存
        localStorage.setItem('exam_exam_records', JSON.stringify(examRecords.value))
      } else {
        // 后端不可用时从 localStorage 恢复
        examRecords.value = JSON.parse(localStorage.getItem('exam_exam_records') || '[]')
      }
    } catch (e) {
      examRecords.value = JSON.parse(localStorage.getItem('exam_exam_records') || '[]')
    }
    loading.value = false
  }

  // 提交考试记录
  async function addRecord(record) {
    try {
      const res = await api.post('/exam/submit', record)
      if (res && !res.error && res.record) {
        examRecords.value.unshift(res.record)
        localStorage.setItem('exam_exam_records', JSON.stringify(examRecords.value))
        return { code: 200, data: res.record }
      }
    } catch (e) {
      console.warn('[ExamStore] 提交失败，存入本地', e)
    }
    // 降级：存到 localStorage
    record.id = 'e' + Date.now()
    record.createdAt = new Date().toISOString()
    examRecords.value.unshift(record)
    localStorage.setItem('exam_exam_records', JSON.stringify(examRecords.value))
    return { code: 200, data: record }
  }

  function getRecords() {
    return { code: 200, data: { list: examRecords.value, total: examRecords.value.length } }
  }

  return { examRecords, loading, loadRecords, addRecord, getRecords }
})
