import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface FilterData {
  keyword?: string
  ageMin?: number
  ageMax?: number
  heightMin?: number
  heightMax?: number
  education?: string
  incomeRange?: string
  maritalStatus?: string
  isRealName?: number
  residence?: string
  hometown?: string
}

/** 筛选条件暂存 store，作为 EventChannel 的备选通信方案 */
export const useFilterStore = defineStore('filter', () => {
  const filterData = ref<FilterData | null>(null)

  const hasFilter = computed(() => filterData.value !== null)

  /** 设置筛选条件（filter 页调用） */
  const setFilter = (data: FilterData) => {
    filterData.value = { ...data }
  }

  /** 读取并清除筛选条件（首页调用后清除，避免重复） */
  const takeFilter = (): FilterData | null => {
    const data = filterData.value
    filterData.value = null
    return data
  }

  /** 仅清除 */
  const clearFilter = () => {
    filterData.value = null
  }

  return {
    filterData,
    hasFilter,
    setFilter,
    takeFilter,
    clearFilter,
  }
})
