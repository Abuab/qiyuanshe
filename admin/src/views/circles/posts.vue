<template>
  <div class="page">
    <div class="page-header">
      <h2 class="page-title">帖子审核</h2>
    </div>

    <el-tabs v-model="activeTab" @tab-change="onTabChange">
      <el-tab-pane label="圈子帖子" name="circle" />
      <el-tab-pane label="人气动态" name="dynamic" />
    </el-tabs>

    <el-card class="content-card">
      <el-table :data="list" border stripe v-loading="loading">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column v-if="activeTab === 'dynamic'" prop="nickname" label="昵称" width="100" />
        <el-table-column prop="userId" label="用户ID" width="80" />
        <el-table-column prop="content" label="内容" min-width="200" show-overflow-tooltip />
        <el-table-column label="图片" width="100">
          <template #default="{ row }">
            <el-image v-if="row.images?.[0]" :src="row.images[0]" style="width:60px;height:60px" fit="cover" :preview-src-list="row.images" />
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <template v-if="activeTab === 'circle'">
              <el-tag :type="row.status === 1 ? 'success' : row.status === 0 ? 'info' : 'warning'">
                {{ row.status === 1 ? '通过' : row.status === 0 ? '已删' : '待审' }}
              </el-tag>
            </template>
            <template v-else>
              <el-tag :type="row.status === 1 ? 'success' : row.status === 2 ? 'warning' : 'info'">
                {{ row.status === 1 ? '通过' : row.status === 2 ? '驳回' : '待审' }}
              </el-tag>
            </template>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="160">
          <template #default="{ row }">{{ row.createdAt?.slice(0, 16) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status !== 1" type="success" size="small" @click="handleAudit(row.id, 1)">通过</el-button>
            <el-button v-if="row.status !== 2" type="warning" size="small" @click="handleAudit(row.id, 2)">驳回</el-button>
            <el-button type="danger" size="small" @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          :page-size="pagination.limit"
          :total="pagination.total"
          layout="prev, pager, next"
          @current-change="fetchList"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminSystem } from '../../api'
import { useAdminStore } from '../../store/admin'

const loading = ref(false)
const list = ref<any[]>([])
const pagination = reactive({ page: 1, limit: 20, total: 0 })
const activeTab = ref('circle')
const adminStore = useAdminStore()

onMounted(() => fetchList())

async function fetchList() {
  loading.value = true
  try {
    let res: any
    if (activeTab.value === 'dynamic') {
      res = await adminSystem.getDynamics(pagination.page, pagination.limit)
    } else {
      res = await adminSystem.getCirclePosts(pagination.page, pagination.limit)
    }
    list.value = (res.data as any)?.list || []
    pagination.total = (res.data as any)?.total || 0
  } catch (e) { console.error(e) }
  loading.value = false
}

function onTabChange() {
  pagination.page = 1
  list.value = []
  fetchList()
}

async function handleAudit(id: number, status: number) {
  try {
    let res: any
    if (activeTab.value === 'dynamic') {
      res = await adminSystem.auditDynamic(id, status)
    } else {
      res = await adminSystem.auditCirclePost(id, status)
    }
    if (res.success) {
      ElMessage.success('操作成功')
      // 审核后立即刷新红点计数
      adminStore.fetchPendingAuditCount()
      fetchList()
    }
  } catch (e) { ElMessage.error('操作失败') }
}

async function handleDelete(id: number) {
  try {
    await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' })
    let res: any
    if (activeTab.value === 'dynamic') {
      res = await adminSystem.deleteDynamic(id)
    } else {
      res = await adminSystem.deleteCirclePost(id)
    }
    if (res.success) { ElMessage.success('已删除'); fetchList() }
  } catch (e) { /* cancelled */ }
}
</script>

<style scoped>
.page { padding: 20px; }
.page-header { margin-bottom: 20px; }
.page-title { font-size: 20px; font-weight: 600; color: #303133; margin: 0; }
.content-card { margin-bottom: 20px; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
