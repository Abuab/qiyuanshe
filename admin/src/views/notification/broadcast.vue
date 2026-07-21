<template>
  <div class="broadcast-container">
    <el-card class="broadcast-card">
      <template #header>
        <span class="card-title">群发系统消息</span>
      </template>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
        class="broadcast-form"
      >
        <el-form-item label="消息标题" prop="title">
          <el-input
            v-model="form.title"
            placeholder="请输入消息标题"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="消息内容" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="6"
            placeholder="请输入消息内容"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-alert
          title="提示"
          type="info"
          :closable="false"
          show-icon
          class="broadcast-tip"
        >
          <template #default>
            <p>群发后，所有活跃用户将在小程序「消息 → 系统消息」页收到此通知。</p>
            <p>请谨慎操作，消息发送后无法撤回。</p>
          </template>
        </el-alert>

        <el-form-item>
          <el-button
            type="primary"
            :loading="sending"
            @click="handleSend"
          >
            {{ sending ? '发送中...' : '确认发送' }}
          </el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 发送结果弹窗 -->
    <el-dialog
      v-model="resultVisible"
      title="发送结果"
      width="400px"
      :close-on-click-modal="false"
    >
      <div class="result-content">
        <el-result
          :icon="resultSuccess ? 'success' : 'error'"
          :title="resultSuccess ? '发送成功' : '发送失败'"
          :sub-title="resultMsg"
        />
      </div>
      <template #footer>
        <el-button type="primary" @click="resultVisible = false">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox, FormInstance, FormRules } from 'element-plus'
import request from '../../api/request'

interface FormData {
  title: string
  content: string
}

const formRef = ref<FormInstance>()
const sending = ref(false)
const resultVisible = ref(false)
const resultSuccess = ref(false)
const resultMsg = ref('')

const form = reactive<FormData>({
  title: '',
  content: '',
})

const rules: FormRules = {
  title: [
    { required: true, message: '请输入消息标题', trigger: 'blur' },
    { max: 50, message: '标题最多50个字符', trigger: 'blur' },
  ],
  content: [
    { required: true, message: '请输入消息内容', trigger: 'blur' },
    { max: 500, message: '内容最多500个字符', trigger: 'blur' },
  ],
}

async function handleSend() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  await ElMessageBox.confirm(
    '确认向所有用户发送此消息？此操作不可撤回。',
    '二次确认',
    {
      confirmButtonText: '确认发送',
      cancelButtonText: '取消',
      type: 'warning',
    },
  )

  sending.value = true
  try {
    const res: any = await request({
      url: '/admin/user-profiles/notifications/broadcast',
      method: 'POST',
      data: {
        title: form.title,
        content: form.content,
      },
    })
    resultSuccess.value = true
    resultMsg.value = res?.msg || '消息已成功发送'
  } catch (e: any) {
    resultSuccess.value = false
    resultMsg.value = e?.message || '发送失败，请稍后重试'
  } finally {
    sending.value = false
    resultVisible.value = true
  }
}

function handleReset() {
  form.title = ''
  form.content = ''
  formRef.value?.resetFields()
}
</script>

<style lang="scss" scoped>
.broadcast-container {
  max-width: 700px;
  margin: 0 auto;
  padding: 20px;
}

.broadcast-card {
  .card-title {
    font-size: 18px;
    font-weight: 600;
  }
}

.broadcast-form {
  margin-top: 10px;
}

.broadcast-tip {
  margin-bottom: 18px;

  p {
    margin: 0;
    line-height: 1.8;
  }
}

.result-content {
  text-align: center;
}
</style>
