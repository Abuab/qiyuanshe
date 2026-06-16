<template>
  <div class="user-list">
    <div class="page-header">
      <h2 class="page-title">用户列表</h2>
      <div class="header-actions">
        <el-button v-if="!isReadonly" type="primary" @click="handleCreate">
          <el-icon><Plus /></el-icon>
          添加用户
        </el-button>
        <el-button type="success" @click="handleExport" :loading="exportLoading">
          <el-icon><Download /></el-icon>
          导出Excel
        </el-button>
      </div>
    </div>

    <div class="card">
      <div class="filter-bar">
        <el-form :inline="true" :model="filterForm" class="filter-form">
          <!-- 第一行：基础筛选 -->
          <div class="filter-row">
            <el-form-item label="关键词">
              <el-input
                v-model="filterForm.keyword"
                placeholder="昵称/ID/手机号"
                clearable
                :prefix-icon="Search"
                style="width: 180px"
              />
            </el-form-item>
            <el-form-item label="性别">
              <el-select v-model="filterForm.gender" placeholder="全部" clearable style="width: 100px">
                <el-option label="全部" :value="undefined" />
                <el-option label="男" :value="1" />
                <el-option label="女" :value="2" />
              </el-select>
            </el-form-item>
            <el-form-item label="年龄">
              <el-input-number
                v-model="filterForm.minAge"
                :min="18"
                :max="100"
                placeholder="最小"
                controls-position="right"
                style="width: 120px"
              />
              <span class="range-separator">—</span>
              <el-input-number
                v-model="filterForm.maxAge"
                :min="18"
                :max="100"
                placeholder="最大"
                controls-position="right"
                style="width: 120px"
              />
            </el-form-item>
            <el-form-item label="身高">
              <el-input-number
                v-model="filterForm.minHeight"
                :min="100"
                :max="250"
                placeholder="最低"
                controls-position="right"
                style="width: 110px"
              />
              <span class="range-separator">—</span>
              <el-input-number
                v-model="filterForm.maxHeight"
                :min="100"
                :max="250"
                placeholder="最高"
                controls-position="right"
                style="width: 110px"
              />
            </el-form-item>
            <el-form-item label="体重">
              <el-input-number
                v-model="filterForm.minWeight"
                :min="20"
                :max="300"
                placeholder="最轻"
                controls-position="right"
                style="width: 110px"
              />
              <span class="range-separator">—</span>
              <el-input-number
                v-model="filterForm.maxWeight"
                :min="20"
                :max="300"
                placeholder="最重"
                controls-position="right"
                style="width: 110px"
              />
            </el-form-item>
            <el-form-item label="会员等级">
              <el-select v-model="filterForm.vipLevel" placeholder="全部" clearable style="width: 120px">
                <el-option label="全部" :value="undefined" />
                <el-option label="普通" :value="0" />
                <el-option label="会员" :value="1" />
              </el-select>
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="filterForm.status" placeholder="全部" clearable style="width: 120px">
                <el-option label="全部" :value="undefined" />
                <el-option label="正常" :value="1" />
                <el-option label="禁用" :value="0" />
                <el-option label="待审核" :value="2" />
              </el-select>
            </el-form-item>
          </div>
          <!-- 标签筛选 -->
          <div class="filter-row">
            <el-form-item label="用户标签">
              <el-select v-model="filterForm.tags" multiple placeholder="全部" clearable style="width: 320px">
                <el-option label="后台添加" value="后台添加" />
                <el-option label="真实注册" value="真实注册" />
              </el-select>
            </el-form-item>
            <el-form-item label="匹配次数">
              <el-input-number
                v-model="filterForm.minMatchCount"
                :min="0"
                placeholder="最少"
                controls-position="right"
                style="width: 110px"
              />
              <span class="range-separator">—</span>
              <el-input-number
                v-model="filterForm.maxMatchCount"
                :min="0"
                placeholder="最多"
                controls-position="right"
                style="width: 110px"
              />
            </el-form-item>
          </div>
          <!-- 第二行：详细筛选 -->
          <div class="filter-row">
            <el-form-item label="婚况">
              <el-select v-model="filterForm.maritalStatus" placeholder="全部" clearable style="width: 120px">
                <el-option label="全部" :value="undefined" />
                <el-option
                  v-for="item in createDicts.maritalStatus"
                  :key="item"
                  :label="item"
                  :value="item"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="月收入">
              <el-select v-model="filterForm.incomeRange" placeholder="全部" clearable style="width: 140px">
                <el-option label="全部" :value="undefined" />
                <el-option
                  v-for="item in createDicts.incomeRange"
                  :key="item"
                  :label="item"
                  :value="item"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="住房">
              <el-select v-model="filterForm.housingStatus" placeholder="全部" clearable style="width: 120px">
                <el-option label="全部" :value="undefined" />
                <el-option
                  v-for="item in createDicts.housingStatus"
                  :key="item"
                  :label="item"
                  :value="item"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="车辆">
              <el-select v-model="filterForm.carStatus" placeholder="全部" clearable style="width: 120px">
                <el-option label="全部" :value="undefined" />
                <el-option
                  v-for="item in createDicts.carStatus"
                  :key="item"
                  :label="item"
                  :value="item"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="学历">
              <el-select v-model="filterForm.education" placeholder="全部" clearable style="width: 120px">
                <el-option label="全部" :value="undefined" />
                <el-option
                  v-for="item in createDicts.education"
                  :key="item"
                  :label="item"
                  :value="item"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="职业">
              <el-select v-model="filterForm.occupation" placeholder="全部" clearable style="width: 140px">
                <el-option label="全部" :value="undefined" />
                <el-option
                  v-for="item in createDicts.occupation"
                  :key="item"
                  :label="item"
                  :value="item"
                />
              </el-select>
            </el-form-item>
          </div>
          <!-- 第二行半：属相星座等 -->
          <div class="filter-row">
            <el-form-item label="属相">
              <el-select v-model="filterForm.zodiac" placeholder="全部" clearable style="width: 120px">
                <el-option label="全部" :value="undefined" />
                <el-option
                  v-for="item in createDicts.zodiac"
                  :key="item"
                  :label="item"
                  :value="item"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="星座">
              <el-select v-model="filterForm.constellation" placeholder="全部" clearable style="width: 120px">
                <el-option label="全部" :value="undefined" />
                <el-option
                  v-for="item in createDicts.constellation"
                  :key="item"
                  :label="item"
                  :value="item"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="独生子女">
              <el-select v-model="filterForm.onlyChild" placeholder="全部" clearable style="width: 120px">
                <el-option label="全部" :value="undefined" />
                <el-option label="是" value="是" />
                <el-option label="否" value="否" />
              </el-select>
            </el-form-item>
            <el-form-item label="何时结婚">
              <el-select v-model="filterForm.whenMarry" placeholder="全部" clearable style="width: 140px">
                <el-option label="全部" :value="undefined" />
                <el-option
                  v-for="item in createDicts.whenMarry"
                  :key="item"
                  :label="item"
                  :value="item"
                />
              </el-select>
            </el-form-item>
          </div>
          <!-- 第三行：时间和操作 -->
          <div class="filter-row">
            <el-form-item label="注册时间">
              <el-date-picker
                v-model="dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
                style="width: 240px"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSearch" :icon="Search">搜索</el-button>
              <el-button @click="handleReset">重置</el-button>
            </el-form-item>
          </div>
        </el-form>
      </div>

      <div class="batch-actions" v-if="selectedRows.length > 0 && !isReadonly">
        <el-checkbox v-model="selectAll" @change="handleSelectAll">全选</el-checkbox>
        <span class="selected-count">已选择 {{ selectedRows.length }} 项</span>
        <el-button type="warning" size="small" @click="handleBatchDisable">批量禁用</el-button>
        <el-button type="success" size="small" @click="handleBatchEnable">批量启用</el-button>
        <el-button type="danger" size="small" @click="handleBatchDelete">批量删除</el-button>
      </div>

      <el-table
        ref="tableRef"
        :data="tableData"
        v-loading="loading"
        @selection-change="handleSelectionChange"
        @sort-change="handleSortChange"
        row-key="id"
        stripe
      >
        <el-table-column v-if="!isReadonly" type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" sortable="custom" />
        <el-table-column prop="avatar" label="头像" width="80">
          <template #default="{ row }">
            <el-popover placement="right" :width="200" trigger="hover">
              <template #reference>
                <el-image :src="row.avatar" fit="cover" style="width: 40px; height: 40px; border-radius: 50%">
                  <template #error>
                    <div style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #f5f5f5; border-radius: 50%">
                      <el-icon :size="20"><UserIcon /></el-icon>
                    </div>
                  </template>
                </el-image>
              </template>
              <div class="avatar-preview">
                <el-image :src="row.avatar" fit="cover" style="width: 120px; height: 120px; border-radius: 50%">
                  <template #error>
                    <div style="width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; background: #f5f5f5; border-radius: 50%">
                      <el-icon :size="60"><UserIcon /></el-icon>
                    </div>
                  </template>
                </el-image>
                <p>{{ row.nickname }}</p>
              </div>
            </el-popover>
          </template>
        </el-table-column>
        <el-table-column prop="nickname" label="昵称" min-width="120" sortable="custom">
          <template #default="{ row }">
            <span class="nickname">{{ row.nickname }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="gender" label="性别" width="80" sortable="custom">
          <template #default="{ row }">
            <el-tag v-if="row.gender === 1" type="primary" size="small">男</el-tag>
            <el-tag v-else-if="row.gender === 2" type="danger" size="small">女</el-tag>
            <span v-else class="text-info">未知</span>
          </template>
        </el-table-column>
        <el-table-column prop="age" label="年龄" width="90" sortable="custom">
          <template #default="{ row }">
            {{ row.age || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" width="120">
          <template #default="{ row }">
            {{ row.phone || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="maritalStatus" label="婚况" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.maritalStatus === '未婚'" type="success" size="small">未婚</el-tag>
            <el-tag v-else-if="row.maritalStatus === '离异'" type="warning" size="small">离异</el-tag>
            <el-tag v-else-if="row.maritalStatus === '丧偶'" type="info" size="small">丧偶</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="incomeRange" label="月收入" width="100">
          <template #default="{ row }">
            <span>{{ row.incomeRange || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="carStatus" label="车辆" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.carStatus === '已购车'" type="success" size="small">有车</el-tag>
            <el-tag v-else-if="row.carStatus === '未购车'" type="info" size="small">无车</el-tag>
            <span v-else>{{ row.carStatus || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="housingStatus" label="住房" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.housingStatus === '已购房'" type="success" size="small">有房</el-tag>
            <el-tag v-else-if="row.housingStatus === '租房'" type="warning" size="small">租房</el-tag>
            <el-tag v-else-if="row.housingStatus === '与父母同住'" type="info" size="small">与父母同住</el-tag>
            <el-tag v-else-if="row.housingStatus === '其他'" type="info" size="small">其他</el-tag>
            <span v-else>{{ row.housingStatus || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="education" label="学历" width="80">
          <template #default="{ row }">
            <span>{{ row.education || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="vipLevel" label="会员等级" width="120" sortable="custom">
          <template #default="{ row }">
            <div class="vip-cell">
              <el-tag v-if="row.vipLevel === 0 || !row.isVip" type="info" size="small">普通</el-tag>
              <el-tag v-else-if="row.vipLevel === 1" type="warning" size="small">会员</el-tag>
              <div v-if="row.vipLevel > 0" class="vip-expire">
                <template v-if="row.vipExpireTime">
                  {{ formatVipExpire(row.vipExpireTime) }}
                </template>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="注册时间" width="160" sortable="custom">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" sortable="custom">
          <template #default="{ row }">
            <el-tag v-if="row.status === 1" type="success" size="small">正常</el-tag>
            <el-tag v-else-if="row.status === 2" type="warning" size="small">待审核</el-tag>
            <el-tag v-else type="danger" size="small">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="资料审核" width="110">
          <template #default="{ row }">
            <el-tooltip content="点击跳转审核管理" placement="top" :disabled="!row.profileAuditStatus || row.profileAuditStatus === 'unsubmitted'">
              <el-tag
                :type="getAuditTagType(row.profileAuditStatus)"
                size="small"
                :style="row.profileAuditStatus && row.profileAuditStatus !== 'unsubmitted' ? 'cursor:pointer' : ''"
                @click="goAudit(row, 'user')"
              >
                {{ getAuditStatusLabel(row.profileAuditStatus) }}
              </el-tag>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="照片审核" width="110">
          <template #default="{ row }">
            <el-tooltip content="点击跳转审核管理" placement="top" :disabled="!row.photoAuditStatus || row.photoAuditStatus === 'unsubmitted'">
              <el-tag
                :type="getAuditTagType(row.photoAuditStatus)"
                size="small"
                :style="row.photoAuditStatus && row.photoAuditStatus !== 'unsubmitted' ? 'cursor:pointer' : ''"
                @click="goAudit(row, 'photo')"
              >
                {{ getAuditStatusLabel(row.photoAuditStatus) }}
              </el-tag>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="用户标签" width="160">
          <template #default="{ row }">
            <template v-if="getUserTags(row).length">
              <el-tag v-for="tag in getUserTags(row)" :key="tag" size="small" style="margin-right:4px">{{ tag }}</el-tag>
            </template>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="matchCount" label="匹配次数" width="90" sortable="custom">
          <template #default="{ row }">
            <span>{{ row.matchCount ?? 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column v-if="!isReadonly" label="操作" width="340" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleView(row)">详情</el-button>
            <el-button type="info" link @click="handleEditUser(row)">编辑</el-button>
            <el-button type="warning" link @click="handleToggleStatus(row)">
              {{ row.status === 1 ? '禁用' : '启用' }}
            </el-button>
            <el-button type="success" link @click="handleSetVip(row)">设为VIP</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[20, 50, 100, 200]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <el-dialog v-model="vipDialogVisible" title="调整VIP等级" width="400px">
      <el-form :model="vipForm" label-width="100px">
        <el-form-item label="用户">
          <span>{{ currentUser?.nickname }}</span>
        </el-form-item>
        <el-form-item label="VIP等级" required>
          <el-select v-model="vipForm.level" style="width: 200px">
            <el-option label="普通用户" :value="0" />
            <el-option label="会员" :value="1" />
          </el-select>
        </el-form-item>
        <el-form-item label="有效期">
          <el-input-number v-model="vipForm.days" :min="1" :max="3650" />
          <span class="ml-10">天</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="vipDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleVipSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="notifyDialogVisible" title="发送通知" width="500px">
      <el-form :model="notifyForm" label-width="80px">
        <el-form-item label="用户">
          <span>{{ currentUser?.nickname }}</span>
        </el-form-item>
        <el-form-item label="通知内容" required>
          <el-input
            v-model="notifyForm.content"
            type="textarea"
            :rows="4"
            placeholder="请输入通知内容..."
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="notifyDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleNotifySubmit">发送</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="createDialogVisible" :title="editingUserId ? '编辑用户' : '添加用户'" width="860px" destroy-on-close>
      <el-form ref="createFormRef" :key="'createForm-' + dialogVersion" :model="createForm" :rules="createRules" label-width="100px">
        <!-- 头像 -->
        <el-form-item label="头像">
          <div style="display:flex;align-items:center;gap:12px">
            <el-upload
              :show-file-list="false"
              :http-request="handleCreateAvatarUpload"
              :before-upload="beforeAvatarUpload"
              accept="image/*"
            >
              <el-button type="primary" :loading="createAvatarUploading">上传头像</el-button>
            </el-upload>
            <el-image v-if="createForm.avatar" :src="createForm.avatar" style="width:60px;height:60px;border-radius:50%;border:1px solid #dcdfe6" fit="cover" />
          </div>
        </el-form-item>

        <el-form-item label="更多照片">
          <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px">
            <el-upload
              :show-file-list="false"
              :http-request="handleCreatePhotoUpload"
              :before-upload="beforeCreatePhotoUpload"
              accept="image/*"
              multiple
            >
              <el-button type="primary" :loading="createPhotoUploading">上传照片</el-button>
            </el-upload>
            <el-image
              v-for="(url, idx) in createPhotoUrls"
              :key="idx"
              :src="url"
              style="width:60px;height:60px;border-radius:4px;border:1px solid #dcdfe6"
              fit="cover"
            />
          </div>
          <div v-if="createPhotoUrls.length > 0" style="margin-top:4px;font-size:12px;color:#999">
            已上传 {{ createPhotoUrls.length }} 张照片（第一张自动设为主图）
          </div>
        </el-form-item>

        <el-divider content-position="left">基本信息</el-divider>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="昵称" prop="nickname">
              <el-input v-model="createForm.nickname" placeholder="请输入昵称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="createForm.phone" placeholder="请输入手机号" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="密码" :prop="editingUserId ? undefined : 'password'">
              <el-input v-model="createForm.password" type="password" :placeholder="editingUserId ? '留空则不修改密码' : '请输入密码'" show-password />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别" prop="gender">
              <el-radio-group v-model="createForm.gender">
                <el-radio :label="1">男</el-radio>
                <el-radio :label="2">女</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="出生年份">
              <el-select v-model="createForm.birthYear" placeholder="请选择" filterable clearable style="width:100%">
                <el-option v-for="y in birthYearOptions" :key="y" :label="y + '年'" :value="y" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="身高(cm)">
              <el-input-number v-model="createForm.height" :min="100" :max="250" placeholder="身高" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="体重(kg)">
              <el-input-number v-model="createForm.weight" :min="20" :max="300" placeholder="体重" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="学历">
              <el-select v-model="createForm.education" placeholder="请选择" clearable style="width:100%">
                <el-option v-for="o in createDicts.education" :key="o" :label="o" :value="o" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="职业">
              <el-select v-model="createForm.occupation" placeholder="请选择" clearable filterable style="width:100%">
                <el-option v-for="o in createDicts.occupation" :key="o" :label="o" :value="o" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="月收入">
              <el-select v-model="createForm.incomeRange" placeholder="请选择" clearable style="width:100%">
                <el-option v-for="o in createDicts.incomeRange" :key="o" :label="o" :value="o" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="住房情况">
              <el-select v-model="createForm.housingStatus" placeholder="请选择" clearable style="width:100%">
                <el-option v-for="o in createDicts.housingStatus" :key="o" :label="o" :value="o" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="车辆情况">
              <el-select v-model="createForm.carStatus" placeholder="请选择" clearable style="width:100%">
                <el-option v-for="o in createDicts.carStatus" :key="o" :label="o" :value="o" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="婚姻状况">
              <el-select v-model="createForm.maritalStatus" placeholder="请选择" clearable style="width:100%">
                <el-option v-for="o in createDicts.maritalStatus" :key="o" :label="o" :value="o" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="独生子女">
              <el-select v-model="createForm.onlyChild" placeholder="请选择" clearable style="width:100%">
                <el-option label="是" value="是" />
                <el-option label="否" value="否" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="何时结婚">
              <el-select v-model="createForm.whenMarry" placeholder="请选择" clearable style="width:100%">
                <el-option v-for="o in createDicts.whenMarry" :key="o" :label="o" :value="o" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="属相">
              <el-select v-model="createForm.zodiac" placeholder="请选择" clearable style="width:100%">
                <el-option v-for="o in createDicts.zodiac" :key="o" :label="o" :value="o" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="星座">
              <el-select v-model="createForm.constellation" placeholder="请选择" clearable style="width:100%">
                <el-option v-for="o in createDicts.constellation" :key="o" :label="o" :value="o" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8" />
        </el-row>

        <!-- 家乡 -->
        <el-form-item label="家乡">
          <div style="display:flex;gap:8px">
            <el-select v-model="hometownProvinceId" placeholder="省" style="width:210px" clearable @change="onHometownProvinceChange">
              <el-option v-for="p in hometownProvinces" :key="p.id" :label="p.name" :value="p.id" />
            </el-select>
            <el-select v-model="hometownCityId" placeholder="市" style="width:210px" clearable :disabled="!hometownProvinceId" @change="onHometownCityChange">
              <el-option v-for="c in hometownCities" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
            <el-select v-model="hometownDistrictId" placeholder="区/县" style="width:210px" clearable :disabled="!hometownCityId">
              <el-option v-for="d in hometownDistricts" :key="d.id" :label="d.name" :value="d.id" />
            </el-select>
          </div>
        </el-form-item>

        <!-- 居住地 -->
        <el-form-item label="居住地">
          <div style="display:flex;gap:8px">
            <el-select v-model="residenceProvinceId" placeholder="省" style="width:210px" clearable @change="onResidenceProvinceChange">
              <el-option v-for="p in residenceProvinces" :key="p.id" :label="p.name" :value="p.id" />
            </el-select>
            <el-select v-model="residenceCityId" placeholder="市" style="width:210px" clearable :disabled="!residenceProvinceId" @change="onResidenceCityChange">
              <el-option v-for="c in residenceCities" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
            <el-select v-model="residenceDistrictId" placeholder="区/县" style="width:210px" clearable :disabled="!residenceCityId">
              <el-option v-for="d in residenceDistricts" :key="d.id" :label="d.name" :value="d.id" />
            </el-select>
          </div>
        </el-form-item>

        <el-form-item label="性格">
          <el-select
            v-model="createForm.characterTagsArr"
            placeholder="性格标签（多选）"
            multiple
            filterable
            clearable
            style="width:100%"
          >
            <el-option v-for="o in createDicts.characterTags" :key="o" :label="o" :value="o" />
          </el-select>
        </el-form-item>

        <el-form-item label="爱好">
          <el-select
            v-model="createForm.hobbyTagsArr"
            placeholder="爱好标签（多选）"
            multiple
            filterable
            clearable
            style="width:100%"
          >
            <el-option v-for="o in createDicts.hobbyTags" :key="o" :label="o" :value="o" />
          </el-select>
        </el-form-item>

        <el-form-item label="恋爱准则">
          <el-select
            v-model="createForm.loveRuleTagsArr"
            placeholder="恋爱准则（多选）"
            multiple
            filterable
            clearable
            style="width:100%"
          >
            <el-option v-for="o in createDicts.loveRuleTags" :key="o" :label="o" :value="o" />
          </el-select>
        </el-form-item>

        <el-form-item label="希望TA">
          <el-select
            v-model="createForm.hopeTaTagsArr"
            placeholder="请选择希望TA标签"
            multiple
            filterable
            clearable
            style="width:100%"
          >
            <el-option v-for="o in createDicts.hopeTaTags" :key="o" :label="o" :value="o" />
          </el-select>
        </el-form-item>

        <el-divider content-position="left">择偶要求</el-divider>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="年龄范围">
              <el-select v-model="createForm.partnerAgeRange" placeholder="请选择" clearable style="width:100%">
                <el-option v-for="o in createDicts.partnerAgeRange" :key="o" :label="o" :value="o" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="最低身高">
              <el-select v-model="createForm.partnerHeightMin" placeholder="请选择" clearable style="width:100%">
                <el-option v-for="o in createDicts.partnerHeight" :key="o" :label="o" :value="o" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="最低学历">
              <el-select v-model="createForm.partnerEducation" placeholder="请选择" clearable style="width:100%">
                <el-option v-for="o in createDicts.partnerEducation" :key="o" :label="o" :value="o" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="收入要求">
              <el-select v-model="createForm.partnerIncome" placeholder="请选择" clearable style="width:100%">
                <el-option v-for="o in createDicts.partnerIncome" :key="o" :label="o" :value="o" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="住房要求">
              <el-select v-model="createForm.housingRequirement" placeholder="请选择" clearable style="width:100%">
                <el-option v-for="o in createDicts.housingRequirement" :key="o" :label="o" :value="o" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="婚况要求">
              <el-select v-model="createForm.partnerMaritalStatus" placeholder="请选择" clearable style="width:100%">
                <el-option v-for="o in createDicts.partnerMaritalStatus" :key="o" :label="o" :value="o" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="接受小孩">
              <el-select v-model="createForm.acceptChildren" placeholder="请选择" clearable style="width:100%">
                <el-option v-for="o in createDicts.acceptChildren" :key="o" :label="o" :value="o" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="状态">
              <el-radio-group v-model="createForm.status">
                <el-radio :label="1">正常</el-radio>
                <el-radio :label="0">禁用</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="实名认证">
              <el-radio-group v-model="createForm.isRealName">
                <el-radio :label="1">已实名</el-radio>
                <el-radio :label="0">未实名</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreateSubmit" :loading="createLoading || editLoading">{{ editingUserId ? '保存' : '确定' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Download, Plus, User as UserIcon } from '@element-plus/icons-vue'
import { adminUsers } from '../../api'
import { useAdminStore } from '../../store/admin'
import { adminSystem } from '../../api/system'
import { formatDate } from '../../utils/date'
import type { User, UserFilter } from '../../api/user'

const router = useRouter()
const adminStore = useAdminStore()
const isReadonly = computed(() => adminStore.userInfo?.role === 'readonly')
const loading = ref(false)
const exportLoading = ref(false)
const tableData = ref<User[]>([])
const selectedRows = ref<User[]>([])
const tableRef = ref()

// 创建用户表单 - 硬编码选项（与小程序一致）
const birthYearOptions = (() => {
  const currentYear = new Date().getFullYear()
  const years: number[] = []
  for (let y = currentYear - 18; y >= 1940; y--) years.push(y)
  return years
})()

const createDicts: Record<string, string[]> = {
  education: ['高中', '大专', '本科', '硕士', '博士'],
  incomeRange: ['3千以下', '3-5千', '5-8千', '8千-1.2万', '1.2-2万', '2-5万', '5万以上'],
  housingStatus: ['已购房', '租房', '与父母同住', '其他'],
  carStatus: ['已购车', '未购车'],
  maritalStatus: ['未婚', '离异', '丧偶'],
  occupation: [],
  personalityTags: [],
  characterTags: [] as string[],
  hobbyTags: [] as string[],
  loveRuleTags: [] as string[],
  hopeTaTags: [],
  whenMarry: ['闪婚', '一年内', '两年内', '三年内', '时机成熟就结婚', '顺其自然'],
  zodiac: ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'],
  constellation: ['白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座'],
  partnerAgeRange: ['不限', '18-22岁', '20-25岁', '22-28岁', '25-30岁', '28-33岁', '30-35岁', '33-38岁', '35-40岁', '40岁以上'],
  partnerHeight: ['不限', '150cm以上', '155cm以上', '160cm以上', '165cm以上', '170cm以上', '175cm以上', '180cm以上', '185cm以上'],
  partnerEducation: ['不限', '高中', '大专', '本科', '硕士', '博士'],
  partnerIncome: ['不限', '3千以上', '5千以上', '8千以上', '1万以上', '2万以上', '3万以上', '5万以上'],
  housingRequirement: ['不限', '已购房', '租房', '与父母同住', '婚后购房', '已购房无贷款', '已购房有贷款', '需要时可购置'],
  partnerMaritalStatus: ['不限', '仅限未婚', '仅限离异'],
  acceptChildren: ['不限', '不接受', '无所谓'],
}

const filterForm = reactive<UserFilter>({
  keyword: '',
  gender: undefined,
  vipLevel: undefined,
  status: undefined,
  minAge: undefined,
  maxAge: undefined,
  minHeight: undefined,
  maxHeight: undefined,
  minWeight: undefined,
  maxWeight: undefined,
  maritalStatus: undefined,
  incomeRange: undefined,
  housingStatus: undefined,
  carStatus: undefined,
  education: undefined,
  occupation: undefined,
  startDate: undefined,
  endDate: undefined,
  tags: [],
  zodiac: undefined,
  constellation: undefined,
  onlyChild: undefined,
  whenMarry: undefined,
  minMatchCount: undefined,
  maxMatchCount: undefined,
  sort: 'createdAt',
  order: 'desc',
})

const dateRange = ref<string[]>([])
const selectAll = ref(false)

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
})

const vipDialogVisible = ref(false)
const notifyDialogVisible = ref(false)
const createDialogVisible = ref(false)
const dialogVersion = ref(0)
const editingUserId = ref<number | null>(null)
const editLoading = ref(false)
const currentUser = ref<User | null>(null)

const vipForm = reactive({
  level: 0,
  days: 30,
})

const notifyForm = reactive({
  content: '',
})

const createFormRef = ref()
const createLoading = ref(false)
const createAvatarUploading = ref(false)
const createPhotoUploading = ref(false)
const createPhotoUrls = ref<string[]>([])
const createForm = reactive({
  avatar: '',
  nickname: '',
  phone: '',
  password: '',
  gender: 1,
  birthYear: undefined as number | undefined,
  height: undefined as number | undefined,
  weight: undefined as number | undefined,
  education: undefined as string | undefined,
  occupation: '',
  incomeRange: undefined as string | undefined,
  housingStatus: undefined as string | undefined,
  carStatus: undefined as string | undefined,
  maritalStatus: undefined as string | undefined,
  hometown: '',
  residence: '',
  onlyChild: undefined as string | undefined,
  whenMarry: undefined as string | undefined,
  zodiac: undefined as string | undefined,
  constellation: undefined as string | undefined,
  personalityTags: '',
  personalityTagsArr: [] as string[],
  characterTagsArr: [] as string[],
  hobbyTagsArr: [] as string[],
  loveRuleTagsArr: [] as string[],
  hopeTaTags: '',
  hopeTaTagsArr: [] as string[],
  partnerAgeRange: undefined as string | undefined,
  partnerHeightMin: undefined as string | undefined,
  partnerEducation: undefined as string | undefined,
  partnerIncome: undefined as string | undefined,
  housingRequirement: undefined as string | undefined,
  partnerMaritalStatus: undefined as string | undefined,
  acceptChildren: undefined as string | undefined,
  status: 1,
  isRealName: 0 as number,
})

const createRules = {
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
}

// ===== 城市选择器 =====
interface RegionOption { id: number; name: string; hasChildren: boolean }

// 家乡
const hometownProvinceId = ref<number | undefined>()
const hometownCityId = ref<number | undefined>()
const hometownDistrictId = ref<number | undefined>()
const hometownProvinces = ref<RegionOption[]>([])
const hometownCities = ref<RegionOption[]>([])
const hometownDistricts = ref<RegionOption[]>([])

async function loadHometownProvinces() {
  const res = await adminSystem.getRegionChildren(0)
  hometownProvinces.value = res.data || []
}

async function onHometownProvinceChange(pid: number | undefined) {
  hometownCityId.value = undefined
  hometownDistrictId.value = undefined
  hometownCities.value = []
  hometownDistricts.value = []
  await nextTick()
  if (!pid) return
  const res = await adminSystem.getRegionChildren(pid)
  hometownCities.value = res.data || []
}

async function onHometownCityChange(cid: number | undefined) {
  hometownDistrictId.value = undefined
  hometownDistricts.value = []
  await nextTick()
  if (!cid) return
  const res = await adminSystem.getRegionChildren(cid)
  hometownDistricts.value = res.data || []
}

function buildCityLabel(pId?: number, cId?: number, dId?: number): string {
  const p = hometownProvinces.value.find(x => x.id === pId)
  const c = hometownCities.value.find(x => x.id === cId)
  const d = hometownDistricts.value.find(x => x.id === dId)
  return [p?.name, c?.name, d?.name].filter(Boolean).join('/')
}

// 居住地
const residenceProvinceId = ref<number | undefined>()
const residenceCityId = ref<number | undefined>()
const residenceDistrictId = ref<number | undefined>()
const residenceProvinces = ref<RegionOption[]>([])
const residenceCities = ref<RegionOption[]>([])
const residenceDistricts = ref<RegionOption[]>([])

async function loadResidenceProvinces() {
  const res = await adminSystem.getRegionChildren(0)
  residenceProvinces.value = res.data || []
}

async function onResidenceProvinceChange(pid: number | undefined) {
  residenceCityId.value = undefined
  residenceDistrictId.value = undefined
  residenceCities.value = []
  residenceDistricts.value = []
  await nextTick()
  if (!pid) return
  const res = await adminSystem.getRegionChildren(pid)
  residenceCities.value = res.data || []
}

async function onResidenceCityChange(cid: number | undefined) {
  residenceDistrictId.value = undefined
  residenceDistricts.value = []
  await nextTick()
  if (!cid) return
  const res = await adminSystem.getRegionChildren(cid)
  residenceDistricts.value = res.data || []
}

function buildResidenceLabel(pId?: number, cId?: number, dId?: number): string {
  const p = residenceProvinces.value.find(x => x.id === pId)
  const c = residenceCities.value.find(x => x.id === cId)
  const d = residenceDistricts.value.find(x => x.id === dId)
  return [p?.name, c?.name, d?.name].filter(Boolean).join('/')
}

onMounted(() => {
  fetchData()
  loadDicts()
  loadHometownProvinces()
  loadResidenceProvinces()
})

async function loadDicts() {
  try {
    const keys = ['dict.occupation', 'dict.hopeTaTags', 'dict.personalityTags']
    for (const key of keys) {
      const res = await adminSystem.getConfigByKey(key)
      if (res.data) {
        const dictKey = key.replace('dict.', '')
        const parsed = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
        if (dictKey === 'personalityTags' && typeof parsed === 'object' && !Array.isArray(parsed)) {
          // 结构化: {character:[...], hobby:[...], loveRule:[...]} → 拆分为三个独立数组
          createDicts.characterTags = Array.isArray(parsed.character) ? parsed.character : []
          createDicts.hobbyTags = Array.isArray(parsed.hobby) ? parsed.hobby : []
          createDicts.loveRuleTags = Array.isArray(parsed.loveRule) ? parsed.loveRule : []
          // 兼容旧的扁平化选项
          const all: string[] = []
          for (const arr of [createDicts.characterTags, createDicts.hobbyTags, createDicts.loveRuleTags]) {
            all.push(...arr)
          }
          createDicts.personalityTags = [...new Set(all)]
        } else if (Array.isArray(parsed)) {
          createDicts[dictKey as keyof typeof createDicts] = parsed
        }
      }
    }
  } catch (e) {
    console.error('加载选项字典失败:', e)
  }
}

async function fetchData() {
  loading.value = true
  try {
    const params: UserFilter = {
      page: pagination.page,
      limit: pagination.limit,
      ...filterForm,
    }

    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }

    const res = await adminUsers.list(params)
    if (res.success && res.data) {
      tableData.value = (res.data.list || []).map(normalizeUser)
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    console.error('Fetch data error:', error)
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  fetchData()
}

async function handleCreate() {
  editingUserId.value = null
  Object.assign(createForm, {
    avatar: '',
    nickname: '',
    phone: '',
    password: '',
    gender: 1,
    birthYear: undefined,
    height: undefined,
    weight: undefined,
    education: undefined,
    occupation: '',
    incomeRange: undefined,
    housingStatus: undefined,
    carStatus: undefined,
    maritalStatus: undefined,
    hometown: '',
    residence: '',
    onlyChild: undefined,
    whenMarry: undefined,
    zodiac: undefined,
    constellation: undefined,
    personalityTags: '',
    personalityTagsArr: [],
    characterTagsArr: [],
    hobbyTagsArr: [],
    loveRuleTagsArr: [],
    hopeTaTags: '',
    hopeTaTagsArr: [],
    partnerAgeRange: undefined,
    partnerHeightMin: undefined,
    partnerEducation: undefined,
    partnerIncome: undefined,
    housingRequirement: undefined,
    partnerMaritalStatus: undefined,
    acceptChildren: undefined,
    status: 1,
    isRealName: 0,
  })
  createPhotoUrls.value = []
  // 重置城市选择器
  hometownProvinceId.value = undefined
  hometownCityId.value = undefined
  hometownDistrictId.value = undefined
  hometownCities.value = []
  hometownDistricts.value = []
  await loadHometownProvinces()
  residenceProvinceId.value = undefined
  residenceCityId.value = undefined
  residenceDistrictId.value = undefined
  residenceCities.value = []
  residenceDistricts.value = []
  await loadResidenceProvinces()
  dialogVersion.value++
  createDialogVisible.value = true
}

async function handleCreateSubmit() {
  if (!editingUserId.value && (!createForm.nickname || !createForm.phone || !createForm.password)) {
    ElMessage.warning('请填写昵称、手机号和密码')
    return
  }
  if (!createForm.nickname || !createForm.phone) {
    ElMessage.warning('请填写昵称和手机号')
    return
  }

  const payload = {
    ...createForm,
    hometown: buildCityLabel(hometownProvinceId.value, hometownCityId.value, hometownDistrictId.value),
    residence: buildResidenceLabel(residenceProvinceId.value, residenceCityId.value, residenceDistrictId.value),
    personalityTags: {
      character: createForm.characterTagsArr,
      hobby: createForm.hobbyTagsArr,
      loveRule: createForm.loveRuleTagsArr,
    },
    hopeTaTags: createForm.hopeTaTagsArr.join(','),
    photoUrls: createPhotoUrls.value,
  } as any

  if (editingUserId.value) {
    // Edit mode — hopeTaTags 直接传数组
    payload.personalityTags = {
      character: createForm.characterTagsArr,
      hobby: createForm.hobbyTagsArr,
      loveRule: createForm.loveRuleTagsArr,
    }
    payload.hopeTaTags = createForm.hopeTaTagsArr
    editLoading.value = true
    try {
      if (!payload.password) {
        delete payload.password
      }
      delete payload.photoUrls
      await adminUsers.update(editingUserId.value, payload)
      ElMessage.success('用户资料已更新')
      createDialogVisible.value = false
      editingUserId.value = null
      fetchData()
    } catch (error) {
      console.error(error)
      ElMessage.error('更新失败')
    } finally {
      editLoading.value = false
    }
  } else {
    // Create mode
    createLoading.value = true
    try {
      await adminUsers.create(payload)
      ElMessage.success('用户创建成功')
      createDialogVisible.value = false
      fetchData()
    } catch (error) {
      console.error(error)
      ElMessage.error('创建失败')
    } finally {
      createLoading.value = false
    }
  }
}

function beforeAvatarUpload(file: File) {
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    return false
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过5MB')
    return false
  }
  return true
}

async function handleCreateAvatarUpload(options: any) {
  createAvatarUploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', options.file)
    const res = await adminSystem.upload(fd as any)
    if (res.success && res.data?.url) {
      createForm.avatar = res.data.url
      ElMessage.success('上传成功')
    }
  } catch (e) {
    ElMessage.error('上传失败')
  }
  createAvatarUploading.value = false
}

function beforeCreatePhotoUpload(file: File) {
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    return false
  }
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过10MB')
    return false
  }
  return true
}

async function handleCreatePhotoUpload(options: any) {
  createPhotoUploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', options.file)
    const res = await adminSystem.upload(fd as any)
    if (res.success && res.data?.url) {
      createPhotoUrls.value.push(res.data.url)
      ElMessage.success('上传成功')
    }
  } catch (e) {
    ElMessage.error('上传失败')
  }
  createPhotoUploading.value = false
}

function handleReset() {
  Object.assign(filterForm, {
    keyword: '',
    gender: undefined,
    vipLevel: undefined,
    status: undefined,
    minAge: undefined,
    maxAge: undefined,
    minHeight: undefined,
    maxHeight: undefined,
    minWeight: undefined,
    maxWeight: undefined,
    maritalStatus: undefined,
    incomeRange: undefined,
    housingStatus: undefined,
    carStatus: undefined,
    education: undefined,
    occupation: undefined,
    tags: [],
    zodiac: undefined,
    constellation: undefined,
    onlyChild: undefined,
    whenMarry: undefined,
    minMatchCount: undefined,
    maxMatchCount: undefined,
  })
  dateRange.value = []
  pagination.page = 1
  fetchData()
}

function handleSizeChange() {
  pagination.page = 1
  fetchData()
}

function handleCurrentChange() {
  fetchData()
}

function handleSelectionChange(rows: User[]) {
  selectedRows.value = rows
  selectAll.value = rows.length === tableData.value.length
}

function handleSelectAll(val: boolean) {
  if (val) {
    tableData.value.forEach((row) => {
      tableRef.value?.toggleRowSelection(row, true)
    })
  } else {
    tableRef.value?.clearSelection()
  }
}

function handleSortChange({ prop, order }: { prop: string; order: string }) {
  filterForm.sort = prop
  filterForm.order = order === 'ascending' ? 'asc' : 'desc'
  fetchData()
}

function handleView(row: User) {
  router.push(`/user/detail/${row.id}`)
}

async function handleEditUser(row: User) {
  editingUserId.value = row.id

  // 先重置表单
  Object.assign(createForm, {
    avatar: '',
    nickname: '',
    phone: '',
    password: '',
    gender: 1,
    birthYear: undefined,
    height: undefined,
    weight: undefined,
    education: undefined,
    occupation: '',
    incomeRange: undefined,
    housingStatus: undefined,
    carStatus: undefined,
    maritalStatus: undefined,
    hometown: '',
    residence: '',
    onlyChild: undefined,
    whenMarry: undefined,
    zodiac: undefined,
    constellation: undefined,
    personalityTags: '',
    personalityTagsArr: [],
    hopeTaTags: '',
    hopeTaTagsArr: [],
    partnerAgeRange: undefined,
    partnerHeightMin: undefined,
    partnerEducation: undefined,
    partnerIncome: undefined,
    housingRequirement: undefined,
    partnerMaritalStatus: undefined,
    acceptChildren: undefined,
    status: 1,
    isRealName: 0,
  })
  createPhotoUrls.value = []
  hometownProvinceId.value = undefined
  hometownCityId.value = undefined
  hometownDistrictId.value = undefined
  hometownCities.value = []
  hometownDistricts.value = []
  residenceProvinceId.value = undefined
  residenceCityId.value = undefined
  residenceDistrictId.value = undefined
  residenceCities.value = []
  residenceDistricts.value = []

  // 并行加载用户详情和城市数据，两者互不阻塞
  const [userDetail, _] = await Promise.allSettled([
    adminUsers.detail(row.id),
    (async () => {
      try { await loadHometownProvinces() } catch {}
      try { await loadResidenceProvinces() } catch {}
    })(),
  ])

  // 回填表单字段
  let user: any = row
  if (userDetail.status === 'fulfilled' && userDetail.value.success && userDetail.value.data) {
    user = userDetail.value.data
  }
  if (!user) {
    ElMessage.error('未找到用户数据')
    return
  }

  createForm.avatar = user.avatar || ''
  createForm.nickname = user.nickname || ''
  createForm.phone = user.phone || ''
  createForm.password = ''
  createForm.gender = user.gender || 1
  createForm.birthYear = user.birthYear ?? undefined
  createForm.height = user.height ?? undefined
  createForm.weight = user.weight ?? undefined
  createForm.education = user.education ?? undefined
  createForm.occupation = user.occupation ?? ''
  createForm.incomeRange = user.incomeRange ?? undefined
  createForm.housingStatus = user.housingStatus ?? undefined
  createForm.carStatus = user.carStatus ?? undefined
  createForm.maritalStatus = user.maritalStatus ?? undefined
  createForm.onlyChild = user.onlyChild ?? undefined
  createForm.whenMarry = user.whenMarry ?? undefined
  createForm.zodiac = user.zodiac ?? undefined
  createForm.constellation = user.constellation ?? undefined
  createForm.personalityTagsArr = ensureJsonArray(user.personalityTags)
  createForm.personalityTags = ensureJsonArray(user.personalityTags).join(',')
  // 结构化 personalityTags {character:[], hobby:[], loveRule:[]} 拆分回填
  const pt = ensureJsonObject(user.personalityTags)
  createForm.characterTagsArr = Array.isArray(pt.character) ? pt.character : (Array.isArray(pt) ? pt : [])
  createForm.hobbyTagsArr = Array.isArray(pt.hobby) ? pt.hobby : []
  createForm.loveRuleTagsArr = Array.isArray(pt.loveRule) ? pt.loveRule : []
  createForm.hopeTaTagsArr = ensureJsonArray(user.hopeTaTags)
  createForm.hopeTaTags = ensureJsonArray(user.hopeTaTags).join(',')
  createForm.partnerAgeRange = user.partnerAgeRange ?? undefined
  createForm.partnerHeightMin = user.partnerHeightMin ?? undefined
  createForm.partnerEducation = user.partnerEducation ?? undefined
  createForm.partnerIncome = user.partnerIncome ?? undefined
  createForm.housingRequirement = user.housingRequirement ?? undefined
  createForm.partnerMaritalStatus = user.partnerMaritalStatus ?? undefined
  createForm.acceptChildren = user.acceptChildren ?? undefined
  createForm.status = user.status ?? 1
  createForm.isRealName = user.isRealName ?? 0
  createForm.hometown = user.hometown || ''
  createForm.residence = user.residence || ''

  // 回填照片
  if (user.photos && Array.isArray(user.photos)) {
    createPhotoUrls.value = user.photos.map((p: any) => p.photoUrl)
  }

  // 回填家乡/居住地级联选择器（失败不阻塞弹窗）
  if (user.hometown) {
    try { await matchCityLabel(user.hometown, 'hometown') } catch {}
  }
  if (user.residence) {
    try { await matchCityLabel(user.residence, 'residence') } catch {}
  }

  dialogVersion.value++
  createDialogVisible.value = true
}

/**
 * 根据「省/市/区」字符串回填级联选择器
 */
async function matchCityLabel(label: string, type: 'hometown' | 'residence') {
  const parts = label.split('/').map(s => s.trim()).filter(Boolean)
  if (parts.length === 0) return

  const provinces = type === 'hometown' ? hometownProvinces.value : residenceProvinces.value
  const province = provinces.find(p => p.name === parts[0])
  if (!province) return

  // 设置省份
  if (type === 'hometown') {
    hometownProvinceId.value = province.id
    const res = await adminSystem.getRegionChildren(province.id)
    hometownCities.value = res.data || []
  } else {
    residenceProvinceId.value = province.id
    const res = await adminSystem.getRegionChildren(province.id)
    residenceCities.value = res.data || []
  }

  if (parts.length >= 2) {
    const cities = type === 'hometown' ? hometownCities.value : residenceCities.value
    const city = cities.find(c => c.name === parts[1])
    if (city) {
      if (type === 'hometown') {
        hometownCityId.value = city.id
        const res = await adminSystem.getRegionChildren(city.id)
        hometownDistricts.value = res.data || []
      } else {
        residenceCityId.value = city.id
        const res = await adminSystem.getRegionChildren(city.id)
        residenceDistricts.value = res.data || []
      }
    }
  }

  if (parts.length >= 3) {
    const districts = type === 'hometown' ? hometownDistricts.value : residenceDistricts.value
    const district = districts.find(d => d.name === parts[2])
    if (district) {
      if (type === 'hometown') {
        hometownDistrictId.value = district.id
      } else {
        residenceDistrictId.value = district.id
      }
    }
  }
}

async function handleToggleStatus(row: User) {
  const action = row.status === 1 ? '禁用' : '启用'
  try {
    await ElMessageBox.confirm(
      `确定要${action}用户 ${row.nickname} 吗？`,
      `确认${action}`,
      { type: 'warning' }
    )
    const res = await adminUsers.updateStatus(row.id, row.status === 1 ? 0 : 1)
    if (res.success) {
      ElMessage.success(`${action}成功`)
      fetchData()
    } else {
      ElMessage.error(res.message || `${action}失败`)
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error(error)
      ElMessage.error(error.message || `${action}失败`)
    }
  }
}

function handleSetVip(row: User) {
  currentUser.value = row
  vipForm.level = row.vipLevel || 0
  vipForm.days = 30
  vipDialogVisible.value = true
}

async function handleVipSubmit() {
  if (!currentUser.value) return
  try {
    const res = await adminUsers.updateVip(currentUser.value.id, {
      level: vipForm.level,
      days: vipForm.days,
    } as any)
    if (res.success) {
      ElMessage.success('VIP设置成功')
      vipDialogVisible.value = false
      fetchData()
    } else {
      ElMessage.error(res.message || 'VIP设置失败')
    }
  } catch (error: any) {
    console.error(error)
    ElMessage.error(error.message || 'VIP设置失败')
  }
}

function handleSendNotify(row: User) {
  currentUser.value = row
  notifyForm.content = ''
  notifyDialogVisible.value = true
}

async function handleNotifySubmit() {
  if (!notifyForm.content.trim()) {
    ElMessage.warning('请输入通知内容')
    return
  }
  if (!currentUser.value) return
  try {
    await adminUsers.sendNotification(currentUser.value.id, notifyForm.content)
    ElMessage.success('通知已记录，推送服务待接入')
    notifyDialogVisible.value = false
  } catch (error) {
    console.error(error)
    ElMessage.error('发送通知失败')
  }
}

async function handleBatchDisable() {
  if (selectedRows.value.length === 0) return
  try {
    await ElMessageBox.confirm(
      `确定要禁用选中的 ${selectedRows.value.length} 个用户吗？`,
      '批量禁用',
      { type: 'warning' }
    )
    const ids = selectedRows.value.map((r) => r.id)
    await adminUsers.batchUpdateStatus(ids, 0)
    ElMessage.success('批量禁用成功')
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error)
    }
  }
}

async function handleBatchEnable() {
  if (selectedRows.value.length === 0) return
  try {
    await ElMessageBox.confirm(
      `确定要启用选中的 ${selectedRows.value.length} 个用户吗？`,
      '批量启用',
      { type: 'warning' }
    )
    const ids = selectedRows.value.map((r) => r.id)
    await adminUsers.batchUpdateStatus(ids, 1)
    ElMessage.success('批量启用成功')
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error)
    }
  }
}

const handleDelete = async (row: User) => {
  try {
    await ElMessageBox.confirm(
      `确定删除用户 "${row.nickname}"？数据仍保留，仅后台不显示。`,
      '确认删除',
      { type: 'warning' }
    )
    await adminUsers.delete(row.id)
    ElMessage.success('删除成功')
    fetchData()
  } catch (e: any) {
    if (e !== 'cancel') console.error(e)
  }
}

const handleBatchDelete = async () => {
  if (selectedRows.value.length === 0) return
  try {
    await ElMessageBox.confirm(
      `确定删除 ${selectedRows.value.length} 个用户？`,
      '确认批量删除',
      { type: 'warning' }
    )
    await adminUsers.batchDelete(selectedRows.value.map(r => r.id))
    ElMessage.success('批量删除成功')
    selectedRows.value = []
    fetchData()
  } catch (e: any) {
    if (e !== 'cancel') console.error(e)
  }
}

async function handleExport() {
  exportLoading.value = true
  try {
    const params: any = { ...filterForm }
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    if (selectedRows.value.length > 0) {
      params.ids = selectedRows.value.map(r => r.id)
    }
    const res = await adminUsers.export(params)
    if (res.success && res.data) {
      const data = Array.isArray(res.data) ? res.data : []
      const csvContent = generateCsv(data)
      downloadFile(csvContent, '用户列表.csv', 'text/csv;charset=utf-8')
      ElMessage.success('导出成功')
    } else {
      ElMessage.error('导出失败')
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('导出失败')
  } finally {
    exportLoading.value = false
  }
}

function generateCsv(data: any[]): string {
  if (!data.length) return ''
  const headers = Object.keys(data[0])
  const rows = data.map(row => headers.map(h => `"${(row[h] ?? '').toString().replace(/"/g, '""')}"`).join(','))
  return '\uFEFF' + [headers.join(','), ...rows].join('\n')
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Audit status helper functions
function getAuditStatusLabel(status?: string) {
  const map: Record<string, string> = {
    PENDING: '待审核',
    APPROVE: '已通过',
    REJECT: '已拒绝',
    unsubmitted: '未提交',
  }
  return map[status || ''] || '未提交'
}

function getAuditTagType(status?: string) {
  const map: Record<string, string> = {
    PENDING: 'warning',
    APPROVE: 'success',
    REJECT: 'danger',
    unsubmitted: 'info',
  }
  return (map[status || ''] || 'info') as 'warning' | 'success' | 'danger' | 'info'
}

function goAudit(_row: User, auditType: string) {
  router.push({ path: '/audit/list', query: { type: auditType } })
}

function formatVipExpire(dateStr: string) {
  if (!dateStr) return '已过期'
  const expireDate = new Date(dateStr)
  if (isNaN(expireDate.getTime())) return '已过期'
  if (expireDate <= new Date()) return '已过期'
  return `到期: ${expireDate.toLocaleDateString('zh-CN')}`
}

/** 始终返回数组，解析失败返回 [] */
function ensureJsonArray(val: any): any[] {
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      if (Array.isArray(parsed)) return parsed
    } catch { /* ignore */ }
  }
  return []
}

/** 解析为对象（兼容 JSON 字符串），失败返回 {} */
function ensureJsonObject(val: any): Record<string, any> {
  if (val === null || val === undefined) return {}
  if (typeof val === 'object' && !Array.isArray(val)) return val
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      if (typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
    } catch { /* ignore */ }
  }
  return {}
}

function normalizeUser(user: any): any {
  return {
    ...user,
    tags: ensureJsonArray(user.tags),
    personalityTags: user.personalityTags, // Keep as-is (can be object or array)
    hopeTaTags: ensureJsonArray(user.hopeTaTags),
  }
}

/** 组合展示用户标签：后台添加的用户自动打标签 */
function getUserTags(row: any): string[] {
  const tags: string[] = []
  const dbTags = ensureJsonArray(row.tags)
  if (dbTags.length) tags.push(...dbTags)
  // 无 openid 说明是后台手动添加的用户
  if (!row.openid && !tags.includes('后台添加')) {
    tags.push('后台添加')
  }
  // 有 openid 说明是真实注册用户
  if (row.openid && !tags.includes('真实注册')) {
    tags.push('真实注册')
  }
  return tags
}
</script>

<style lang="scss" scoped>
.user-list {
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;

  .page-title {
    font-size: 20px;
    font-weight: bold;
    margin: 0;
  }

  .header-actions {
    display: flex;
    gap: 10px;
  }
}

.card {
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
}

.filter-bar {
  margin-bottom: 20px;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 4px;

  .selected-count {
    color: #666;
    font-size: 14px;
  }
}

.nickname {
  font-weight: 500;
}

.text-info {
  color: #909399;
}

.avatar-preview {
  text-align: center;

  p {
    margin-top: 8px;
    font-weight: 500;
  }
}

.vip-cell {
  display: flex;
  flex-direction: column;
}

.vip-expire {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.ml-10 {
  margin-left: 10px;
}

.range-separator {
  margin: 0 5px;
  color: #999;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;

  &:last-child {
    margin-bottom: 0;
  }
}
</style>
