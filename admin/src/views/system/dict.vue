<template>
  <div class="dict-config">
    <div class="page-header">
      <h2 class="page-title">选项配置</h2>
      <p class="page-desc">管理小程序编辑资料页的职业、我的特点、希望TA等下拉选项</p>
    </div>

    <el-tabs v-model="activeTab" class="dict-tabs">
      <!-- 职业 -->
      <el-tab-pane label="职业选项" name="occupation">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>职业选项列表（{{ flatDicts.occupation?.length || 0 }} 项）</span>
              <el-button type="primary" size="small" @click="addItem('occupation')">+ 新增</el-button>
            </div>
          </template>
          <div v-if="loading" class="loading-wrap"><el-icon class="is-loading"><Loading /></el-icon> 加载中...</div>
          <el-tag
            v-for="(item, idx) in flatDicts.occupation"
            :key="idx"
            closable
            class="dict-tag"
            @close="removeItem('occupation', idx)"
          >
            <template v-if="editKey === `occupation-${idx}`">
              <el-input
                v-model="editValue"
                size="small"
                class="tag-edit-input"
                maxlength="20"
                @blur="saveEdit('occupation', idx)"
                @keyup.enter="saveEdit('occupation', idx)"
              />
            </template>
            <template v-else>
              <span @click="startEdit('occupation', idx, item)">{{ item }}</span>
            </template>
          </el-tag>
          <div v-if="!loading && (!flatDicts.occupation || flatDicts.occupation.length === 0)" class="empty-tip">暂无职业选项</div>
          <div class="card-footer">
            <el-button type="primary" @click="saveDict('occupation')" :loading="saving">保存</el-button>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 希望TA -->
      <el-tab-pane label="希望TA" name="hopeTaTags">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>希望TA标签（{{ flatDicts.hopeTaTags?.length || 0 }} 项）</span>
              <el-button type="primary" size="small" @click="addItem('hopeTaTags')">+ 新增</el-button>
            </div>
          </template>
          <div v-if="loading" class="loading-wrap"><el-icon class="is-loading"><Loading /></el-icon> 加载中...</div>
          <el-tag
            v-for="(item, idx) in flatDicts.hopeTaTags"
            :key="idx"
            closable
            class="dict-tag"
            @close="removeItem('hopeTaTags', idx)"
          >
            <template v-if="editKey === `hopeTaTags-${idx}`">
              <el-input
                v-model="editValue"
                size="small"
                class="tag-edit-input"
                maxlength="20"
                @blur="saveEdit('hopeTaTags', idx)"
                @keyup.enter="saveEdit('hopeTaTags', idx)"
              />
            </template>
            <template v-else>
              <span @click="startEdit('hopeTaTags', idx, item)">{{ item }}</span>
            </template>
          </el-tag>
          <div v-if="!loading && (!flatDicts.hopeTaTags || flatDicts.hopeTaTags.length === 0)" class="empty-tip">暂无希望TA标签</div>
          <div class="card-footer">
            <el-button type="primary" @click="saveDict('hopeTaTags')" :loading="saving">保存</el-button>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 我的特点 -->
      <el-tab-pane label="我的特点" name="personalityTags">
        <el-tabs v-model="personalitySubTab" type="card" class="sub-tabs">
          <el-tab-pane label="性格" name="character">
            <el-card>
              <template #header>
                <div class="card-header">
                  <span>性格标签（{{ flatDicts.personalityTags?.character?.length || 0 }} 项）</span>
                  <el-button type="primary" size="small" @click="addPersonalityItem('character')">+ 新增</el-button>
                </div>
              </template>
              <el-tag
                v-for="(item, idx) in flatDicts.personalityTags?.character"
                :key="idx"
                closable
                class="dict-tag"
                @close="removePersonalityItem('character', idx)"
              >
                <template v-if="editKey === `character-${idx}`">
                  <el-input
                    v-model="editValue"
                    size="small"
                    class="tag-edit-input"
                    maxlength="20"
                    @blur="savePersonalityEdit('character', idx)"
                    @keyup.enter="savePersonalityEdit('character', idx)"
                  />
                </template>
                <template v-else>
                  <span @click="startEdit('character', idx, item)">{{ item }}</span>
                </template>
              </el-tag>
              <div class="card-footer">
                <el-button type="primary" @click="saveDict('personalityTags')" :loading="saving">保存</el-button>
              </div>
            </el-card>
          </el-tab-pane>
          <el-tab-pane label="爱好" name="hobby">
            <el-card>
              <template #header>
                <div class="card-header">
                  <span>爱好标签（{{ flatDicts.personalityTags?.hobby?.length || 0 }} 项）</span>
                  <el-button type="primary" size="small" @click="addPersonalityItem('hobby')">+ 新增</el-button>
                </div>
              </template>
              <el-tag
                v-for="(item, idx) in flatDicts.personalityTags?.hobby"
                :key="idx"
                closable
                class="dict-tag"
                @close="removePersonalityItem('hobby', idx)"
              >
                <template v-if="editKey === `hobby-${idx}`">
                  <el-input
                    v-model="editValue"
                    size="small"
                    class="tag-edit-input"
                    maxlength="20"
                    @blur="savePersonalityEdit('hobby', idx)"
                    @keyup.enter="savePersonalityEdit('hobby', idx)"
                  />
                </template>
                <template v-else>
                  <span @click="startEdit('hobby', idx, item)">{{ item }}</span>
                </template>
              </el-tag>
              <div class="card-footer">
                <el-button type="primary" @click="saveDict('personalityTags')" :loading="saving">保存</el-button>
              </div>
            </el-card>
          </el-tab-pane>
          <el-tab-pane label="恋爱准则" name="loveRule">
            <el-card>
              <template #header>
                <div class="card-header">
                  <span>恋爱准则标签（{{ flatDicts.personalityTags?.loveRule?.length || 0 }} 项）</span>
                  <el-button type="primary" size="small" @click="addPersonalityItem('loveRule')">+ 新增</el-button>
                </div>
              </template>
              <el-tag
                v-for="(item, idx) in flatDicts.personalityTags?.loveRule"
                :key="idx"
                closable
                class="dict-tag"
                @close="removePersonalityItem('loveRule', idx)"
              >
                <template v-if="editKey === `loveRule-${idx}`">
                  <el-input
                    v-model="editValue"
                    size="small"
                    class="tag-edit-input"
                    maxlength="20"
                    @blur="savePersonalityEdit('loveRule', idx)"
                    @keyup.enter="savePersonalityEdit('loveRule', idx)"
                  />
                </template>
                <template v-else>
                  <span @click="startEdit('loveRule', idx, item)">{{ item }}</span>
                </template>
              </el-tag>
              <div class="card-footer">
                <el-button type="primary" @click="saveDict('personalityTags')" :loading="saving">保存</el-button>
              </div>
            </el-card>
          </el-tab-pane>
        </el-tabs>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { adminSystem } from '../../api/system'

interface DictData {
  occupation?: string[]
  hopeTaTags?: string[]
  personalityTags?: {
    character?: string[]
    hobby?: string[]
    loveRule?: string[]
  }
}

const activeTab = ref('occupation')
const personalitySubTab = ref('character')
const loading = ref(false)
const saving = ref(false)
const editKey = ref('')
const editValue = ref('')

const flatDicts = reactive<DictData>({
  occupation: [],
  hopeTaTags: [],
  personalityTags: { character: [], hobby: [], loveRule: [] },
})

// ===== 加载 =====
onMounted(async () => {
  await loadAllDicts()
})

async function loadAllDicts() {
  loading.value = true
  try {
    const keys = ['dict.occupation', 'dict.hopeTaTags', 'dict.personalityTags']
    for (const key of keys) {
      const res = await adminSystem.getConfigByKey(key)
      if (res.data) {
        const dictKey = key.replace('dict.', '')
        try {
          (flatDicts as any)[dictKey] = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
        } catch {
          (flatDicts as any)[dictKey] = res.data
        }
      }
    }
  } catch (e: any) {
    ElMessage.error('加载失败: ' + (e?.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

// ===== 编辑标签 =====
function startEdit(_scope: string, idx: number, value: string) {
  editKey.value = `${_scope}-${idx}`
  editValue.value = value
}

function saveEdit(scope: string, idx: number) {
  const arr = flatDicts[scope as keyof DictData] as string[]
  if (arr && idx < arr.length) {
    arr[idx] = editValue.value.trim() || arr[idx]
  }
  editKey.value = ''
}

function savePersonalityEdit(subKey: string, idx: number) {
  const group = flatDicts.personalityTags
  if (group) {
    const arr = group[subKey as keyof typeof group]
    if (arr && idx < arr.length) {
      const newVal = editValue.value.trim()
      if (newVal) (arr as string[])[idx] = newVal
    }
  }
  editKey.value = ''
}

// ===== 新增/删除 =====
function addItem(scope: string) {
  const arr = flatDicts[scope as keyof DictData] as string[]
  if (!arr) {
    (flatDicts as any)[scope] = ['']
  } else {
    arr.push('新选项')
  }
}

function removeItem(scope: string, idx: number) {
  const arr = flatDicts[scope as keyof DictData] as string[]
  if (arr) arr.splice(idx, 1)
}

function addPersonalityItem(subKey: string) {
  const group = flatDicts.personalityTags
  if (group) {
    const arr = (group as any)[subKey] as string[]
    if (!arr) {
      (group as any)[subKey] = ['新选项']
    } else {
      arr.push('新选项')
    }
  }
}

function removePersonalityItem(subKey: string, idx: number) {
  const group = flatDicts.personalityTags
  if (group) {
    const arr = (group as any)[subKey] as string[]
    if (arr) arr.splice(idx, 1)
  }
}

// ===== 保存 =====
async function saveDict(key: string) {
  saving.value = true
  try {
    const configKey = `dict.${key}`
    const value = JSON.stringify(flatDicts[key as keyof DictData])
    await adminSystem.updateConfig(configKey, value)
    ElMessage.success('保存成功')
  } catch (e: any) {
    ElMessage.error('保存失败: ' + (e?.message || '未知错误'))
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.dict-config { padding: 20px; }
.page-header { margin-bottom: 16px; }
.page-title { font-size: 22px; font-weight: 600; margin: 0 0 4px; }
.page-desc { color: #909399; font-size: 13px; margin: 0; }

.card-header { display: flex; align-items: center; justify-content: space-between; }
.card-footer { margin-top: 16px; text-align: right; }

.dict-tag {
  margin: 6px 8px 6px 0;
  cursor: pointer;
  font-size: 14px;
  padding: 6px 12px;
}

.tag-edit-input { width: 100px; }

.sub-tabs { margin-top: -8px; }

.loading-wrap { text-align: center; color: #909399; padding: 40px 0; }
.empty-tip { text-align: center; color: #c0c4cc; padding: 40px 0; font-size: 14px; }
</style>
