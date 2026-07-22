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
      <!-- 筛选区：首屏仅展示高频筛选，高级筛选通过展开/收起切换 -->
      <div class="filter-bar">
        <el-form :inline="true" :model="filterForm" class="filter-form">
          <!-- 首屏高频筛选（始终可见） -->
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
                :min="18" :max="100"
                placeholder="最小"
                controls-position="right"
                style="width: 120px"
              />
              <span class="range-separator">—</span>
              <el-input-number
                v-model="filterForm.maxAge"
                :min="18" :max="100"
                placeholder="最大"
                controls-position="right"
                style="width: 120px"
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
                <el-option label="待审核" :value="0" />
                <el-option label="未完善" :value="2" />
                <el-option label="已锁定" :value="4" />
                <el-option label="已禁用" :value="3" />
              </el-select>
            </el-form-item>
            <el-form-item label="实名认证">
              <el-select v-model="filterForm.eidCertStatus" placeholder="全部" clearable style="width: 120px">
                <el-option label="全部" :value="undefined" />
                <el-option label="未认证" :value="0" />
                <el-option label="认证中" :value="1" />
                <el-option label="已认证" :value="2" />
                <el-option label="认证失败" :value="3" />
              </el-select>
            </el-form-item>
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
          </div>
          <!-- 搜索和重置按钮固定在首屏 -->
          <div class="filter-row">
            <el-form-item>
              <el-button type="primary" @click="handleSearch" :icon="Search">搜索</el-button>
              <el-button @click="handleReset">重置</el-button>
              <!-- 高级筛选展开/收起按钮 -->
              <el-button text @click="advancedFilterVisible = !advancedFilterVisible">
                <el-icon style="margin-right:4px"><Select /></el-icon>
                高级筛选 {{ advancedFilterVisible ? '收起' : '展开' }}
              </el-button>
            </el-form-item>
          </div>
          <!-- 高级筛选面板（可折叠） -->
          <div v-show="advancedFilterVisible" class="advanced-filters">
            <div class="filter-row">
              <el-form-item label="身高">
                <el-input-number v-model="filterForm.minHeight" :min="100" :max="250" placeholder="最低" controls-position="right" style="width: 110px" />
                <span class="range-separator">—</span>
                <el-input-number v-model="filterForm.maxHeight" :min="100" :max="250" placeholder="最高" controls-position="right" style="width: 110px" />
              </el-form-item>
              <el-form-item label="体重">
                <el-input-number v-model="filterForm.minWeight" :min="20" :max="300" placeholder="最轻" controls-position="right" style="width: 110px" />
                <span class="range-separator">—</span>
                <el-input-number v-model="filterForm.maxWeight" :min="20" :max="300" placeholder="最重" controls-position="right" style="width: 110px" />
              </el-form-item>
              <el-form-item label="婚况">
                <el-select v-model="filterForm.maritalStatus" placeholder="全部" clearable style="width: 120px">
                  <el-option label="全部" :value="undefined" />
                  <el-option v-for="item in createDicts.maritalStatus" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
              <el-form-item label="月收入">
                <el-select v-model="filterForm.incomeRange" placeholder="全部" clearable style="width: 140px">
                  <el-option label="全部" :value="undefined" />
                  <el-option v-for="item in createDicts.incomeRange" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
            </div>
            <div class="filter-row">
              <el-form-item label="住房">
                <el-select v-model="filterForm.housingStatus" placeholder="全部" clearable style="width: 120px">
                  <el-option label="全部" :value="undefined" />
                  <el-option v-for="item in createDicts.housingStatus" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
              <el-form-item label="车辆">
                <el-select v-model="filterForm.carStatus" placeholder="全部" clearable style="width: 120px">
                  <el-option label="全部" :value="undefined" />
                  <el-option v-for="item in createDicts.carStatus" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
              <el-form-item label="学历">
                <el-select v-model="filterForm.education" placeholder="全部" clearable style="width: 120px">
                  <el-option label="全部" :value="undefined" />
                  <el-option v-for="item in createDicts.education" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
              <el-form-item label="职业">
                <el-select v-model="filterForm.occupation" placeholder="全部" clearable style="width: 140px">
                  <el-option label="全部" :value="undefined" />
                  <el-option v-for="item in createDicts.occupation" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
            </div>
            <div class="filter-row">
              <el-form-item label="属相">
                <el-select v-model="filterForm.zodiac" placeholder="全部" clearable style="width: 120px">
                  <el-option label="全部" :value="undefined" />
                  <el-option v-for="item in createDicts.zodiac" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
              <el-form-item label="星座">
                <el-select v-model="filterForm.constellation" placeholder="全部" clearable style="width: 120px">
                  <el-option label="全部" :value="undefined" />
                  <el-option v-for="item in createDicts.constellation" :key="item" :label="item" :value="item" />
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
                  <el-option v-for="item in createDicts.whenMarry" :key="item" :label="item" :value="item" />
                </el-select>
              </el-form-item>
            </div>
            <div class="filter-row">
              <el-form-item label="用户标签">
                <el-select v-model="filterForm.tags" multiple placeholder="选择标签筛选" clearable style="width: 320px">
                  <el-option v-for="pt in presetTags" :key="pt.label" :label="pt.label" :value="pt.label" />
                </el-select>
              </el-form-item>
              <el-form-item label="匹配次数">
                <el-input-number v-model="filterForm.minMatchCount" :min="0" placeholder="最少" controls-position="right" style="width: 110px" />
                <span class="range-separator">—</span>
                <el-input-number v-model="filterForm.maxMatchCount" :min="0" placeholder="最多" controls-position="right" style="width: 110px" />
              </el-form-item>
              <!-- 最近活跃时间筛选 -->
              <el-form-item label="最近活跃">
                <el-select v-model="lastActiveAtRange" placeholder="全部" clearable style="width: 140px" @change="onLastActiveAtRangeChange">
                  <el-option label="全部" :value="undefined" />
                  <el-option label="今天" value="today" />
                  <el-option label="3天内" value="3d" />
                  <el-option label="7天内" value="7d" />
                  <el-option label="30天内" value="30d" />
                  <el-option label="自定义" value="custom" />
                </el-select>
                <el-date-picker
                  v-if="lastActiveAtRange === 'custom'"
                  v-model="lastActiveAtDateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始"
                  end-placeholder="结束"
                  value-format="YYYY-MM-DD"
                  style="width: 230px; margin-left: 8px"
                />
              </el-form-item>
            </div>
          </div>
        </el-form>
      </div>

      <!-- 批量操作栏：选中用户后浮现，含批量通过/禁用/导出/发送通知/打标签 -->
      <div class="batch-actions" v-if="selectedRows.length > 0">
        <span class="selected-count">已选择 {{ selectedRows.length }} 人</span>
        <el-button type="success" size="small" @click="handleBatchApprove">批量审核通过</el-button>
                <el-button type="warning" size="small" @click="handleBatchLock">批量锁定</el-button>
                <el-button type="warning" size="small" @click="handleBatchDisable">批量禁用</el-button>
        <el-button type="success" size="small" @click="handleExport" :loading="exportLoading">批量导出Excel</el-button>
        <el-button type="primary" size="small" @click="handleBatchSendNotify">批量发送通知</el-button>
        <el-button size="small" @click="handleBatchTag">批量打标签</el-button>
        <el-button size="small" @click="clearSelection">取消选择</el-button>
      </div>

      <!-- 自定义列按钮：运营勾选显示/隐藏可选列，偏好保存到 localStorage -->
      <div class="table-toolbar">
        <el-popover placement="bottom-end" :width="220" trigger="click">
          <template #reference>
            <el-button size="small">
              自定义列 <el-icon><ArrowDown /></el-icon>
            </el-button>
          </template>
          <div class="column-checkbox-list">
            <el-checkbox
              v-for="col in columnOptions"
              :key="col.key"
              v-model="col.visible"
              @change="onColumnToggle"
            >{{ col.label }}</el-checkbox>
          </div>
        </el-popover>
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
        <el-table-column prop="userId" label="用户ID" width="110">
          <template #default="{ row }">
            <span>{{ row.userId || '-' }}</span>
          </template>
        </el-table-column>
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
                <p>{{ row.displayName || row.nickname }}</p>
              </div>
            </el-popover>
          </template>
        </el-table-column>
        <el-table-column prop="nickname" label="昵称" min-width="180" sortable="custom">
          <template #default="{ row }">
            <span class="nickname">{{ row.displayName || row.nickname }}</span>
            <!-- 用户生命周期标签：新注册(绿)/活跃(蓝)/沉默(橙)/流失(灰) -->
            <el-tag
              v-if="getLifecycleBadge(row)"
              :type="getLifecycleBadge(row)!.type"
              size="small"
              style="margin-left:6px"
            >{{ getLifecycleBadge(row)!.label }}</el-tag>
            <!-- 运营标签：最多展示3个，多余显示+N 悬浮提示全部 -->
            <template v-if="getUserTags(row).length">
              <el-tag
                v-for="tag in getUserTags(row).slice(0, 3)"
                :key="tag"
                :type="getTagType(tag)"
                size="small"
                style="margin-left:4px"
              >{{ tag }}</el-tag>
              <el-tooltip v-if="getUserTags(row).length > 3" placement="top">
                <template #content>
                  <div v-for="tag in getUserTags(row)" :key="tag" style="margin:2px 0">{{ tag }}</div>
                </template>
                <el-tag size="small" type="info" style="margin-left:4px;cursor:pointer">+{{ getUserTags(row).length - 3 }}</el-tag>
              </el-tooltip>
            </template>
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
        <!-- 手机号列宽度 140px，确保 11 位号码不换行 -->
        <el-table-column prop="phone" label="手机号" width="140">
          <template #default="{ row }">
            {{ row.phone || '-' }}
          </template>
        </el-table-column>
        <el-table-column v-if="isColumnVisible('maritalStatus')" prop="maritalStatus" label="婚况" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.maritalStatus === '未婚'" type="success" size="small">未婚</el-tag>
            <el-tag v-else-if="row.maritalStatus === '离异'" type="warning" size="small">离异</el-tag>
            <el-tag v-else-if="row.maritalStatus === '丧偶'" type="info" size="small">丧偶</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column v-if="isColumnVisible('incomeRange')" prop="incomeRange" label="月收入" width="100">
          <template #default="{ row }">
            <span>{{ row.incomeRange || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column v-if="isColumnVisible('carStatus')" prop="carStatus" label="车辆" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.carStatus === '已购车'" type="success" size="small">有车</el-tag>
            <el-tag v-else-if="row.carStatus === '未购车'" type="info" size="small">无车</el-tag>
            <span v-else>{{ row.carStatus || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column v-if="isColumnVisible('housingStatus')" prop="housingStatus" label="住房" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.housingStatus === '已购房'" type="success" size="small">有房</el-tag>
            <el-tag v-else-if="row.housingStatus === '租房'" type="warning" size="small">租房</el-tag>
            <el-tag v-else-if="row.housingStatus === '与父母同住'" type="info" size="small">与父母同住</el-tag>
            <el-tag v-else-if="row.housingStatus === '其他'" type="info" size="small">其他</el-tag>
            <span v-else>{{ row.housingStatus || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column v-if="isColumnVisible('education')" prop="education" label="学历" width="80">
          <template #default="{ row }">
            <span>{{ row.education || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="vipLevel" label="会员等级" width="160" sortable="custom">
          <template #default="{ row }">
            <div class="vip-cell">
              <el-tag v-if="row.vipLevel === 0 || !row.isVip" type="info" size="small">普通</el-tag>
              <el-tag v-else-if="row.vipLevel === 1" type="warning" size="small">{{ row.vipPackageName || '会员' }}</el-tag>
              <div v-if="row.vipLevel > 0" class="vip-expire">
                <template v-if="row.vipExpireTime">
                  {{ formatVipExpire(row.vipExpireTime) }}
                </template>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column v-if="isColumnVisible('profileScore')" prop="profileScore" label="资料完整度" width="120" sortable="custom">
          <template #default="{ row }">
            <div style="display:flex;align-items:center;gap:6px">
              <el-progress
                :percentage="row.profileScore || 0"
                :stroke-width="6"
                :color="progressColor(row.profileScore)"
                style="flex:1;min-width:50px"
              />
              <span style="font-size:12px;color:#909399;white-space:nowrap">{{ row.profileScore || 0 }}%</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column v-if="isColumnVisible('pinnedStatus')" label="置顶状态" width="90">
          <template #default="{ row }">
            <span v-if="row.pinnedExpireAt && new Date(row.pinnedExpireAt) > new Date()" style="color:#303133">置顶中</span>
            <span v-else style="color:#909399">-</span>
          </template>
        </el-table-column>
        <el-table-column v-if="isColumnVisible('pinnedExpire')" label="置顶截至" width="160">
          <template #default="{ row }">
            <span v-if="row.pinnedExpireAt && new Date(row.pinnedExpireAt) > new Date()" style="color:#303133;font-size:12px">{{ formatDate(row.pinnedExpireAt) }}</span>
            <span v-else style="color:#909399;font-size:12px">-</span>
          </template>
        </el-table-column>
        <el-table-column v-if="isColumnVisible('manualBoostScore')" prop="manualBoostScore" label="运营加权" width="90" sortable="custom">
          <template #default="{ row }">
            <span :style="{ color: row.manualBoostScore > 0 ? '#303133' : '#909399' }">{{ row.manualBoostScore || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column v-if="isColumnVisible('exposurePool')" prop="exposurePool" label="曝光池" width="90">
          <template #default="{ row }">
            <span :style="{ color: row.exposurePool !== 'city' ? '#303133' : '#909399' }">{{ exposurePoolLabel(row.exposurePool) }}</span>
          </template>
        </el-table-column>
        <el-table-column v-if="isColumnVisible('createdAt')" prop="createdAt" label="注册时间" width="160" sortable="custom">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" sortable="custom">
          <template #default="{ row }">
            <el-tag v-if="row.status === 0" type="warning" size="small">待审核</el-tag>
            <el-tag v-else-if="row.status === 1" type="success" size="small">正常</el-tag>
            <el-tag v-else-if="row.status === 2" size="small" type="info">未完善</el-tag>
            <el-tag v-else-if="row.status === 4" size="small" type="danger">已锁定</el-tag>
            <el-tag v-else-if="row.status === 3" type="danger" size="small">已禁用</el-tag>
            <el-tag v-else size="small" type="info">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="实名认证" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.isRealName === 1" type="success" size="small">已认证</el-tag>
            <el-tag v-else type="info" size="small">未认证</el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="isColumnVisible('profileAudit')" label="资料审核" width="110">
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
        <el-table-column v-if="isColumnVisible('photoAudit')" label="照片审核" width="110">
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
        <el-table-column v-if="isColumnVisible('userTags')" label="用户标签" width="200">
          <template #default="{ row }">
            <template v-if="getUserTags(row).length">
              <el-tag v-for="tag in getUserTags(row).slice(0, 3)" :key="tag" :type="getTagType(tag)" size="small" style="margin-right:4px;margin-bottom:2px">{{ tag }}</el-tag>
              <el-tooltip v-if="getUserTags(row).length > 3" placement="top">
                <template #content>
                  <div v-for="tag in getUserTags(row)" :key="tag" style="margin:2px 0">{{ tag }}</div>
                </template>
                <el-tag size="small" type="info">+{{ getUserTags(row).length - 3 }}</el-tag>
              </el-tooltip>
            </template>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column v-if="isColumnVisible('matchCount')" prop="matchCount" label="匹配次数" width="90" sortable="custom">
          <template #default="{ row }">
            <span>{{ row.matchCount ?? 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column v-if="isColumnVisible('followingCount')" prop="followingCount" label="关注数" width="80" sortable="custom">
          <template #default="{ row }">
            <span>{{ row.followingCount ?? 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column v-if="isColumnVisible('followerCount')" prop="followerCount" label="被关注数" width="90" sortable="custom">
          <template #default="{ row }">
            <span>{{ row.followerCount ?? 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column v-if="isColumnVisible('viewCount')" prop="viewCount" label="看过谁" width="80" sortable="custom">
          <template #default="{ row }">
            <el-button v-if="(row.viewCount ?? 0) > 0" link type="primary" size="small" @click="handleViewDetail(row)">
              {{ row.viewCount ?? 0 }}
            </el-button>
            <span v-else>0</span>
          </template>
        </el-table-column>
        <!-- 最近活跃时间列（可选展示）：来自 lastActiveAt 字段，格式化相对时间 -->
        <el-table-column v-if="isColumnVisible('lastActiveAt')" prop="lastActiveAt" label="最近活跃时间" width="150" sortable="custom">
          <template #default="{ row }">
            <span>{{ formatLastActive(row.lastActiveAt) }}</span>
          </template>
        </el-table-column>
        <!-- 累计付费列（可选展示）：从订单数据汇总，格式 ¥0.00 -->
        <el-table-column v-if="isColumnVisible('totalPayment')" label="累计付费" width="110">
          <template #default="{ row }">
            <span>{{ '¥' + (paymentMap[row.id] || 0).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <!-- 操作列：详情 + 锁定/解锁按钮 + 更多(dropdown) + 快捷审核 -->
        <el-table-column v-if="!isReadonly" label="操作" min-width="280" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="handleView(row)">详情</el-button>
            <!-- 账户锁定/解锁：独立按钮，不在更多下拉里 -->
            <el-button
              v-if="row.status !== 4"
              size="small"
              type="warning"
              style="margin-left:8px"
              @click="handleLockUser(row)"
            >锁定</el-button>
            <el-button
              v-else
              size="small"
              type="success"
              style="margin-left:8px"
              @click="handleUnlockUser(row)"
            >解锁</el-button>
            <el-dropdown trigger="click" @command="(cmd: string) => handleDropdownCommand(cmd, row)">
              <el-button size="small" style="margin-left:8px">
                更多 <el-icon><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit">编辑</el-dropdown-item>
                  <el-dropdown-item :command="(row.isVip && row.vipLevel > 0) ? 'unvip' : 'vip'">
                    {{ (row.isVip && row.vipLevel > 0) ? '取消VIP' : '设为VIP' }}
                  </el-dropdown-item>
                  <el-dropdown-item :command="(row.pinnedExpireAt && new Date(row.pinnedExpireAt) > new Date()) ? 'unpin' : 'pin'">
                    {{ (row.pinnedExpireAt && new Date(row.pinnedExpireAt) > new Date()) ? '取消置顶' : '手动置顶' }}
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-if="row.status !== 4"
                    :command="row.status === 1 ? 'disable' : (row.status === 3 ? 'enable' : 'approve')"
                  >
                    {{ row.status === 3 ? '启用账号' : (row.status === 1 ? '禁用账号' : '审核通过') }}
                  </el-dropdown-item>
                  <el-dropdown-item command="notify">发送通知</el-dropdown-item>
                  <!-- 运营操作：打标签 + 查看备注 -->
                  <el-dropdown-item command="tag">打标签</el-dropdown-item>
                  <el-dropdown-item command="viewNotes">查看备注</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <!-- 快捷审核：仅在状态为 PENDING 时显示图标按钮，用 flex gap 统一间距 -->
            <span style="display:inline-flex;align-items:center;gap:4px;margin-left:8px">
            <template v-if="row.profileAuditStatus === 'PENDING'">
              <el-tooltip content="快速通过资料审核" placement="top">
                <el-button size="small" type="success" @click="handleQuickAudit(row, 'user', 'approve')">
                  <el-icon><CheckIcon /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="快速拒绝资料审核" placement="top">
                <el-button size="small" type="danger" @click="handleQuickAudit(row, 'user', 'reject')">
                  <el-icon><CloseIcon /></el-icon>
                </el-button>
              </el-tooltip>
            </template>
            <template v-if="row.photoAuditStatus === 'PENDING'">
              <el-tooltip content="快速通过照片审核" placement="top">
                <el-button size="small" type="success" @click="handleQuickAudit(row, 'photo', 'approve')">
                  <el-icon><CheckIcon /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="快速拒绝照片审核" placement="top">
                <el-button size="small" type="danger" @click="handleQuickAudit(row, 'photo', 'reject')">
                  <el-icon><CloseIcon /></el-icon>
                </el-button>
              </el-tooltip>
            </template>
            </span>
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

    <el-dialog v-model="vipDialogVisible" title="设置VIP" width="480px">
      <el-form :model="vipForm" label-width="100px">
        <el-form-item label="用户">
          <span>{{ currentUser?.nickname }}</span>
        </el-form-item>
        <el-form-item label="选择套餐">
          <el-select v-model="vipForm.packageId" placeholder="选择已有套餐" style="width: 100%" clearable @change="onVipPackageChange">
            <el-option
              v-for="pkg in vipPackageList"
              :key="pkg.id"
              :label="`${pkg.name} (¥${pkg.price}/${pkg.durationDays}天)`"
              :value="pkg.id"
            />
          </el-select>
          <div class="form-tip">选择套餐后自动填充等级和有效期</div>
        </el-form-item>
        <el-form-item label="VIP等级" required>
          <el-select v-model="vipForm.level" style="width: 200px" :disabled="!!vipForm.packageId">
            <el-option label="普通用户" :value="0" />
            <el-option label="会员" :value="1" />
          </el-select>
          <div v-if="vipForm.packageId" class="form-tip">已选择套餐，等级自动锁定为会员</div>
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

    <!-- 批量发送通知弹窗 -->
    <el-dialog v-model="notifyBatchDialogVisible" title="批量发送通知" width="500px">
      <el-form label-width="100px">
        <el-form-item label="已选用户">
          <span>{{ selectedRows.length }} 人</span>
        </el-form-item>
        <el-form-item label="通知内容" required>
          <el-input
            v-model="notifyBatchContent"
            type="textarea"
            :rows="4"
            placeholder="请输入通知内容..."
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="notifyBatchDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleBatchNotifySubmit">发送</el-button>
      </template>
    </el-dialog>

    <!-- 看过谁弹窗 -->
    <el-dialog v-model="viewDetailDialogVisible" title="浏览记录" width="500px">
      <div v-loading="viewDetailLoading">
        <div v-if="viewDetailList.length === 0" style="text-align:center;color:#999;padding:20px">暂无浏览记录</div>
        <div v-for="item in viewDetailList" :key="item.targetUserId" style="display:flex;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f0;cursor:pointer" @click="viewDetailDialogVisible = false; $router.push(`/user/detail/${item.targetUserId}`)">
          <el-image :src="item.avatar || ''" fit="cover" style="width:40px;height:40px;border-radius:50%;flex-shrink:0">
            <template #error><div style="width:40px;height:40px;border-radius:50%;background:#f5f5f5;display:flex;align-items:center;justify-content:center"><el-icon :size="20"><User /></el-icon></div></template>
          </el-image>
          <span style="margin-left:12px;font-size:14px;flex:1">{{ item.nickname }}</span>
          <span style="font-size:12px;color:#999;margin-right:12px">第{{ item.viewCount }}次查看</span>
          <span style="font-size:12px;color:#999">{{ item.lastViewedAt ? item.lastViewedAt.slice(0,16) : '' }}</span>
        </div>
      </div>
    </el-dialog>

    <!-- 手动置顶弹窗 -->
    <el-dialog v-model="pinDialogVisible" title="手动置顶" width="420px">
      <el-form :model="pinForm" label-width="120px">
        <el-form-item label="目标用户">
          <span>{{ pinTargetUser?.nickname }}</span>
        </el-form-item>
        <el-form-item label="置顶时长(小时)" required>
          <el-input-number v-model="pinForm.durationHours" :min="1" :max="720" style="width:200px" />
        </el-form-item>
        <el-form-item label="手动加权分">
          <el-input-number v-model="pinForm.boostScore" :min="0" :max="9999" placeholder="选填" style="width:200px" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pinDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handlePinSubmit" :loading="pinSubmitting">确定置顶</el-button>
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
          <!-- 第一行：出生年月日 -->
          <el-col :span="8">
            <el-form-item label="出生年份">
              <el-select v-model="createForm.birthYear" placeholder="请选择" filterable clearable style="width:100%">
                <el-option v-for="y in birthYearOptions" :key="y" :label="y + '年'" :value="y" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="月">
              <el-select v-model="createForm.birthMonth" placeholder="月" clearable style="width:100%">
                <el-option v-for="m in 12" :key="m" :label="m + '月'" :value="m" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="日">
              <el-select v-model="createForm.birthDay" placeholder="日" clearable style="width:100%">
                <el-option v-for="d in 31" :key="d" :label="d + '日'" :value="d" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <!-- 第二行：身高体重 -->
          <el-col :span="12">
            <el-form-item label="身高(cm)">
              <el-input-number v-model="createForm.height" :min="100" :max="250" placeholder="身高" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
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
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <el-select v-model="hometownProvinceId" placeholder="省" style="width:180px" clearable @change="onHometownProvinceChange">
              <el-option v-for="p in hometownProvinces" :key="p.id" :label="p.name" :value="p.id" />
            </el-select>
            <el-select v-model="hometownCityId" placeholder="市" style="width:180px" clearable :disabled="!hometownProvinceId" @change="onHometownCityChange">
              <el-option v-for="c in hometownCities" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
            <el-select v-model="hometownDistrictId" placeholder="区/县" style="width:180px" clearable :disabled="!hometownCityId" @change="onHometownDistrictChange">
              <el-option v-for="d in hometownDistricts" :key="d.id" :label="d.name" :value="d.id" />
            </el-select>
            <el-select v-model="hometownStreetId" placeholder="街道" style="width:180px" clearable :disabled="!hometownDistrictId">
              <el-option v-for="s in hometownStreets" :key="s.id" :label="s.name" :value="s.id" />
            </el-select>
          </div>
        </el-form-item>

        <!-- 居住地 -->
        <el-form-item label="居住地">
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <el-select v-model="residenceProvinceId" placeholder="省" style="width:180px" clearable @change="onResidenceProvinceChange">
              <el-option v-for="p in residenceProvinces" :key="p.id" :label="p.name" :value="p.id" />
            </el-select>
            <el-select v-model="residenceCityId" placeholder="市" style="width:180px" clearable :disabled="!residenceProvinceId" @change="onResidenceCityChange">
              <el-option v-for="c in residenceCities" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
            <el-select v-model="residenceDistrictId" placeholder="区/县" style="width:180px" clearable :disabled="!residenceCityId" @change="onResidenceDistrictChange">
              <el-option v-for="d in residenceDistricts" :key="d.id" :label="d.name" :value="d.id" />
            </el-select>
            <el-select v-model="residenceStreetId" placeholder="街道" style="width:180px" clearable :disabled="!residenceDistrictId">
              <el-option v-for="s in residenceStreets" :key="s.id" :label="s.name" :value="s.id" />
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

        <template v-if="editingUserId">
          <el-divider content-position="left">关注管理</el-divider>
          <div style="display:flex;gap:24px">
            <!-- 我关注的 -->
            <div style="flex:1">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
                <span style="font-weight:600;font-size:14px">我关注的 ({{ followStats.following }})</span>
              </div>
              <div style="display:flex;gap:8px;margin-bottom:10px">
                <el-select
                  v-model="addFollowingId"
                  filterable
                  placeholder="选择用户"
                  @visible-change="onFollowSelectVisible"
                  clearable
                  style="flex:1"
                >
                  <el-option
                    v-for="u in allUsers"
                    :key="u.id"
                    :label="u.nickname"
                    :value="u.id"
                  />
                </el-select>
                <el-button type="primary" size="small" @click="handleAddFollowing" :disabled="!addFollowingId">添加</el-button>
              </div>
              <div style="max-height:200px;overflow-y:auto">
                <div v-for="f in followingFollows" :key="f.id" style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0">
                  <span style="font-size:13px">{{ f.nickname }}</span>
                  <el-button type="danger" link size="small" @click="handleRemoveFollowing(f.targetUserId)">取消</el-button>
                </div>
                <div v-if="followingFollows.length === 0" style="color:#999;font-size:12px;padding:8px 0">暂无关注</div>
              </div>
            </div>
            <!-- 关注我的 -->
            <div style="flex:1">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
                <span style="font-weight:600;font-size:14px">关注我的 ({{ followStats.followers }})</span>
              </div>
              <div style="display:flex;gap:8px;margin-bottom:10px">
                <el-select
                  v-model="addFollowerId"
                  filterable
                  placeholder="选择用户"
                  @visible-change="onFollowSelectVisible"
                  clearable
                  style="flex:1"
                >
                  <el-option
                    v-for="u in allUsers"
                    :key="u.id"
                    :label="u.nickname"
                    :value="u.id"
                  />
                </el-select>
                <el-button type="primary" size="small" @click="handleAddFollower" :disabled="!addFollowerId">添加</el-button>
              </div>
              <div style="max-height:200px;overflow-y:auto">
                <div v-for="f in followerFollows" :key="f.id" style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0">
                  <span style="font-size:13px">{{ f.nickname }}</span>
                  <el-button type="danger" link size="small" @click="handleRemoveFollower(f.userId)">移除</el-button>
                </div>
                <div v-if="followerFollows.length === 0" style="color:#999;font-size:12px;padding:8px 0">暂无粉丝</div>
              </div>
            </div>
          </div>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreateSubmit" :loading="createLoading || editLoading">{{ editingUserId ? '保存' : '确定' }}</el-button>
      </template>
    </el-dialog>

    <!-- 打标签弹窗（单用户/批量共用） -->
    <el-dialog v-model="tagDialogVisible" :title="tagDialogTitle" width="580px" destroy-on-close>
      <!-- 自定义标签输入 -->
      <el-form label-width="90px">
        <el-form-item label="自定义标签">
          <div style="display:flex;gap:8px;width:100%">
            <el-input v-model="tagInputValue" placeholder="输入标签名，回车添加" @keyup.enter="handleListTagInputConfirm" style="flex:1" />
            <el-button @click="handleListTagInputConfirm">添加</el-button>
          </div>
        </el-form-item>
      </el-form>
      <!-- 系统预设标签库 -->
      <div style="margin-bottom:16px">
        <div style="font-size:13px;color:#909399;margin-bottom:8px">系统标签库（点击添加）</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <el-tag
            v-for="pt in filteredPresetTags"
            :key="pt.label"
            :type="pt.type"
            size="default"
            style="cursor:pointer"
            @click="handleAddListPresetTag(pt.label)"
          >
            + {{ pt.label }}
          </el-tag>
        </div>
      </div>
      <!-- 当前已选标签 -->
      <div style="margin-bottom:8px">
        <div style="font-size:13px;color:#909399;margin-bottom:8px">
          已选标签 ({{ tagDraftSelected.length }})
          <el-button type="danger" link size="small" @click="tagDraftSelected = []" style="margin-left:8px">清空</el-button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;min-height:36px;padding:8px;border:1px solid #e4e7ed;border-radius:6px">
          <el-tag
            v-for="t in tagDraftSelected"
            :key="t"
            :type="getTagType(t)"
            closable
            @close="tagDraftSelected = tagDraftSelected.filter(i => i !== t)"
          >
            {{ t }}
          </el-tag>
          <span v-if="tagDraftSelected.length === 0" style="font-size:13px;color:#c0c4cc">暂无已选标签</span>
        </div>
      </div>
      <template #footer>
        <el-button @click="tagDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleListSaveTags" :loading="tagSaving">保存标签</el-button>
      </template>
    </el-dialog>

    <!-- 查看备注弹窗（只读） -->
    <el-dialog v-model="notesDialogVisible" title="运营备注" width="500px">
      <div v-if="notesLoading" style="text-align:center;padding:40px 0">
        <el-icon class="is-loading"><Loading /></el-icon>
      </div>
      <div v-else-if="notesContent" style="white-space:pre-wrap;line-height:1.8;color:#333;font-size:14px;padding:8px 0">{{ notesContent }}</div>
      <div v-else style="text-align:center;color:#c0c4cc;font-size:13px;padding:40px 0">暂无运营备注</div>
      <template #footer>
        <el-button @click="notesDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="goToDetailForNotes">进入详情编辑</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Download, Plus, User as UserIcon, ArrowDown, Select, Check as CheckIcon, Close as CloseIcon, Loading } from '@element-plus/icons-vue'
import { adminUsers, adminPayment } from '../../api'
import { adminAudit } from '../../api/audit'
import { userPin, vipPackages, VipPackage } from '../../api/vip'
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
  eidCertStatus: undefined,
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

// 高级筛选面板展开/收起
const advancedFilterVisible = ref(false)

// 最近活跃时间筛选
const lastActiveAtRange = ref<string | undefined>(undefined)
const lastActiveAtDateRange = ref<string[]>([])
const selectAll = ref(false)

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
})

// ===== 自定义列功能 =====
// 列选项配置：默认隐藏的列，运营可通过"自定义列"按钮勾选显示
// 列偏好保存到 localStorage key: user-table-columns
const COLUMN_STORAGE_KEY = 'user-table-columns'
const columnOptions = reactive([
  { key: 'maritalStatus', label: '婚况', visible: false },
  { key: 'incomeRange', label: '月收入', visible: false },
  { key: 'carStatus', label: '车辆', visible: false },
  { key: 'housingStatus', label: '住房', visible: false },
  { key: 'education', label: '学历', visible: false },
  { key: 'profileScore', label: '资料完整度', visible: false },
  { key: 'pinnedStatus', label: '置顶状态', visible: false },
  { key: 'pinnedExpire', label: '置顶截至', visible: false },
  { key: 'manualBoostScore', label: '运营加权', visible: false },
  { key: 'exposurePool', label: '曝光池', visible: false },
  { key: 'createdAt', label: '注册时间', visible: false },
  { key: 'profileAudit', label: '资料审核', visible: false },
  { key: 'photoAudit', label: '照片审核', visible: false },
  { key: 'userTags', label: '用户标签', visible: false },
  { key: 'matchCount', label: '匹配次数', visible: false },
  { key: 'followingCount', label: '关注数', visible: false },
  { key: 'followerCount', label: '被关注数', visible: false },
  { key: 'viewCount', label: '看过谁', visible: false },
  { key: 'lastActiveAt', label: '最近活跃时间', visible: false },
  { key: 'totalPayment', label: '累计付费', visible: false },
])

function loadColumnPrefs() {
  try {
    const saved = localStorage.getItem(COLUMN_STORAGE_KEY)
    if (saved) {
      const visibleKeys: string[] = JSON.parse(saved)
      columnOptions.forEach(col => { col.visible = visibleKeys.includes(col.key) })
    }
  } catch { /* ignore */ }
}

function saveColumnPrefs() {
  const visibleKeys = columnOptions.filter(c => c.visible).map(c => c.key)
  localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleKeys))
}

function isColumnVisible(key: string): boolean {
  return columnOptions.find(c => c.key === key)?.visible ?? false
}

function onColumnToggle() {
  saveColumnPrefs()
}

// ===== 用户生命周期标签 =====
// 优先级：新注册 > 活跃 > 沉默 > 流失
// Element Plus el-tag type 合法值
type TagType = 'primary' | 'success' | 'warning' | 'danger' | 'info'

// ===== 运营标签管理 =====
// 系统预设标签库（与详情页保持一致），用于筛选和展示
const presetTags: { label: string; type: TagType | '' }[] = [
  { label: '高付费意向', type: 'danger' },
  { label: '需跟进', type: 'warning' },
  { label: '资料优质', type: 'success' },
  { label: '照片清晰', type: '' },       // Element Plus 默认蓝色
  { label: '主动活跃', type: 'primary' },
  { label: '疑似违规', type: 'info' },
  { label: '红娘推荐', type: 'danger' },  // 粉色用 danger 近似
]

/** 根据标签名返回 Element Plus el-tag 的 type，保留空字符串（默认蓝色） */
function getTagType(tag: string): TagType | '' | 'info' {
  const found = presetTags.find(pt => pt.label === tag)
  // 使用 ?? 保留空字符串（如"照片清晰"的 '' 表示蓝色）；未匹配到默认 info
  return found ? found.type ?? 'info' : 'info'
}

function getLifecycleBadge(row: any): { label: string; type: TagType } | null {
  const now = Date.now()
  const createdAt = row.createdAt ? new Date(row.createdAt).getTime() : 0
  const lastActiveAt = row.lastActiveAt ? new Date(row.lastActiveAt).getTime() : 0
  // 新注册：注册时间 <= 24 小时
  if (createdAt && now - createdAt <= 24 * 60 * 60 * 1000) {
    return { label: '新注册', type: 'success' }
  }
  // 活跃：lastActiveAt <= 7 天
  if (lastActiveAt && now - lastActiveAt <= 7 * 24 * 60 * 60 * 1000) {
    return { label: '活跃', type: 'primary' }
  }
  // 沉默：7 天 < lastActiveAt <= 30 天
  if (lastActiveAt && now - lastActiveAt <= 30 * 24 * 60 * 60 * 1000) {
    return { label: '沉默', type: 'warning' }
  }
  return { label: '流失', type: 'info' }
}

// ===== 最近活跃时间格式化 =====
function formatLastActive(lastActiveAt: string | null): string {
  if (!lastActiveAt) return '-'
  const now = Date.now()
  const time = new Date(lastActiveAt).getTime()
  const diffMs = now - time
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffMinutes < 1) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  return formatDate(lastActiveAt)
}

// ===== 累计付费数据 =====
// 从订单API汇总每个用户的累计付费金额
// paymentMap 用于模板中展示累计付费列，loadingPayment 防止并发重复请求
const paymentMap = ref<Record<number, number>>({})

let loadingPayment = false

async function loadPaymentData() {
  if (loadingPayment) return // 已有请求在进行中，跳过
  loadingPayment = true
  try {
    const res = await adminPayment.orders({ limit: 99999 })
    if (res.success && res.data) {
      const map: Record<number, number> = {}
      for (const order of res.data.list) {
        // 仅统计已支付(order.status===1)的订单，排除待支付/已退款/已取消
        if (order.status !== 1) continue
        map[order.userId] = (map[order.userId] || 0) + (order.amount || 0)
      }
      paymentMap.value = map
    }
  } catch { /* 累计付费加载失败不影响列表展示 */ }
  loadingPayment = false
}

const vipDialogVisible = ref(false)
const notifyDialogVisible = ref(false)
const createDialogVisible = ref(false)

// ===== 标签管理弹窗状态 =====
const tagDialogVisible = ref(false)
const tagDialogTitle = ref('')
const tagInputValue = ref('')
const tagDraftSelected = ref<string[]>([])
const tagSaving = ref(false)
// 过滤掉已选中的预设标签，避免重复添加
const filteredPresetTags = computed(() =>
  presetTags.filter(pt => !tagDraftSelected.value.includes(pt.label))
)
// 记录当前操作目标：单用户为 row 对象，批量为 null
const tagTargetUser = ref<User | null>(null)

// ===== 查看备注弹窗状态 =====
const notesDialogVisible = ref(false)
const notesContent = ref('')
const notesLoading = ref(false)
const notesUserId = ref<number | null>(null)
const dialogVersion = ref(0)
const editingUserId = ref<number | null>(null)
const editLoading = ref(false)

// ===== 关注管理 =====
const followStats = reactive({ following: 0, followers: 0 })
const followingFollows = ref<any[]>([])
const followerFollows = ref<any[]>([])
const addFollowingId = ref<number | null>(null)
const addFollowerId = ref<number | null>(null)
const allUsers = ref<any[]>([])
let allUsersLoaded = false

function onFollowSelectVisible(visible: boolean) {
  if (visible && !allUsersLoaded) {
    loadAllUsers()
  }
}

async function loadAllUsers() {
  try {
    const res = await adminUsers.list({ page: 1, limit: 200 })
    if (res.success) {
      allUsers.value = (res.data?.list || []).map((u: any) => ({ id: u.id, nickname: u.nickname }))
      allUsersLoaded = true
    }
  } catch {}
}

async function loadFollowData(userId: number) {
  try {
    const stats = await adminUsers.getFollowStats(userId)
    if (stats.success) {
      followStats.following = stats.data?.following || 0
      followStats.followers = stats.data?.followers || 0
    }
  } catch {}
  try {
    const res = await adminUsers.getFollowing(userId)
    if (res.success) followingFollows.value = res.data?.list || []
  } catch {}
  try {
    const res = await adminUsers.getFollowers(userId)
    if (res.success) followerFollows.value = res.data?.list || []
  } catch {}
}

async function handleAddFollowing() {
  if (!addFollowingId.value || !editingUserId.value) return
  try {
    await adminUsers.addFollow(editingUserId.value, { targetUserId: addFollowingId.value })
    ElMessage.success('添加关注成功')
    addFollowingId.value = null
    loadFollowData(editingUserId.value)
  } catch { ElMessage.error('添加失败') }
}

async function handleAddFollower() {
  if (!addFollowerId.value || !editingUserId.value) return
  try {
    await adminUsers.addFollower(editingUserId.value, { followerUserId: addFollowerId.value })
    ElMessage.success('添加粉丝成功')
    addFollowerId.value = null
    loadFollowData(editingUserId.value)
  } catch { ElMessage.error('添加失败') }
}

async function handleRemoveFollowing(targetUserId: number) {
  if (!editingUserId.value) return
  try {
    await adminUsers.removeFollow(editingUserId.value, targetUserId)
    ElMessage.success('已取消关注')
    loadFollowData(editingUserId.value)
  } catch { ElMessage.error('操作失败') }
}

async function handleRemoveFollower(followerUserId: number) {
  if (!editingUserId.value) return
  try {
    await adminUsers.removeFollower(editingUserId.value, followerUserId)
    ElMessage.success('已移除粉丝')
    loadFollowData(editingUserId.value)
  } catch { ElMessage.error('操作失败') }
}

// ===== 看过谁弹窗 =====
const viewDetailDialogVisible = ref(false)
const viewDetailLoading = ref(false)
const viewDetailList = ref<any[]>([])

async function handleViewDetail(row: any) {
  viewDetailDialogVisible.value = true
  viewDetailLoading.value = true
  try {
    const res = await adminUsers.getUserViewDetail(row.id)
    if (res.success) viewDetailList.value = res.data || []
  } catch { viewDetailList.value = [] }
  viewDetailLoading.value = false
}

// ===== 手动置顶 =====
const pinDialogVisible = ref(false)
const pinSubmitting = ref(false)
const pinTargetUser = ref<User | null>(null)
const pinForm = reactive({
  durationHours: 24,
  boostScore: 0,
})

function handlePinUser(row: User) {
  pinTargetUser.value = row
  pinForm.durationHours = 24
  pinForm.boostScore = 0
  pinDialogVisible.value = true
}

async function handlePinSubmit() {
  if (!pinTargetUser.value) return
  pinSubmitting.value = true
  try {
    await userPin.pinUser(
      pinTargetUser.value.id,
      pinForm.durationHours,
      pinForm.boostScore || undefined,
    )
    ElMessage.success('置顶设置成功')
    pinDialogVisible.value = false
    fetchData()
  } catch { ElMessage.error('置顶设置失败') }
  pinSubmitting.value = false
}

function exposurePoolLabel(pool: string) {
  const map: Record<string, string> = { city: '同城', province: '同省', national: '全国' }
  return map[pool] || pool || '同城'
}

function progressColor(score: number): string {
  if (score >= 80) return '#67C23A'
  if (score >= 50) return '#E6A23C'
  if (score > 0) return '#F56C6C'
  return '#E4E7ED'
}

const currentUser = ref<User | null>(null)

const vipForm = reactive({
  level: 0,
  days: 30,
  packageId: null as number | null,
  packageName: '',
})

const vipPackageList = ref<VipPackage[]>([])

async function fetchVipPackages() {
  try {
    const res = await vipPackages.list(1, 100)
    if (res.success && res.data) {
      vipPackageList.value = res.data.list || []
    }
  } catch { /* ignore */ }
}

function onVipPackageChange(packageId: number | null) {
  if (!packageId) {
    vipForm.packageName = ''
    return
  }
  const pkg = vipPackageList.value.find(p => p.id === packageId)
  if (pkg) {
    vipForm.level = 1
    vipForm.days = pkg.durationDays
    vipForm.packageName = pkg.name
  }
}

const notifyForm = reactive({
  content: '',
})

const createFormRef = ref()
const createLoading = ref(false)
const createAvatarUploading = ref(false)
const createPhotoUploading = ref(false)
const createPhotoUrls = ref<string[]>([])
const editingOriginalPhotoUrls = ref<string[]>([])
const createForm = reactive({
  avatar: '',
  nickname: '',
  phone: '',
  password: '',
  gender: 1,
  birthYear: undefined as number | undefined,
  birthMonth: undefined as number | undefined,
  birthDay: undefined as number | undefined,
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
const hometownStreetId = ref<number | undefined>()
const hometownProvinces = ref<RegionOption[]>([])
const hometownCities = ref<RegionOption[]>([])
const hometownDistricts = ref<RegionOption[]>([])
const hometownStreets = ref<RegionOption[]>([])

async function loadHometownProvinces() {
  const res = await adminSystem.getRegionChildren(0)
  hometownProvinces.value = res.data || []
}

async function onHometownProvinceChange(pid: number | undefined) {
  hometownCityId.value = undefined
  hometownDistrictId.value = undefined
  hometownStreetId.value = undefined
  hometownCities.value = []
  hometownDistricts.value = []
  hometownStreets.value = []
  await nextTick()
  if (!pid) return
  const res = await adminSystem.getRegionChildren(pid)
  hometownCities.value = res.data || []
}

async function onHometownCityChange(cid: number | undefined) {
  hometownDistrictId.value = undefined
  hometownStreetId.value = undefined
  hometownDistricts.value = []
  hometownStreets.value = []
  await nextTick()
  if (!cid) return
  const res = await adminSystem.getRegionChildren(cid)
  hometownDistricts.value = res.data || []
}

async function onHometownDistrictChange(did: number | undefined) {
  hometownStreetId.value = undefined
  hometownStreets.value = []
  await nextTick()
  if (!did) return
  const res = await adminSystem.getRegionChildren(did)
  hometownStreets.value = res.data || []
}

function buildCityLabel(pId?: number, cId?: number, dId?: number, sId?: number): string {
  const p = hometownProvinces.value.find(x => x.id === pId)
  const c = hometownCities.value.find(x => x.id === cId)
  const d = hometownDistricts.value.find(x => x.id === dId)
  const s = hometownStreets.value.find(x => x.id === sId)
  return [p?.name, c?.name, d?.name, s?.name].filter(Boolean).join(',')
}

// 居住地
const residenceProvinceId = ref<number | undefined>()
const residenceCityId = ref<number | undefined>()
const residenceDistrictId = ref<number | undefined>()
const residenceStreetId = ref<number | undefined>()
const residenceProvinces = ref<RegionOption[]>([])
const residenceCities = ref<RegionOption[]>([])
const residenceDistricts = ref<RegionOption[]>([])
const residenceStreets = ref<RegionOption[]>([])

async function loadResidenceProvinces() {
  const res = await adminSystem.getRegionChildren(0)
  residenceProvinces.value = res.data || []
}

async function onResidenceProvinceChange(pid: number | undefined) {
  residenceCityId.value = undefined
  residenceDistrictId.value = undefined
  residenceStreetId.value = undefined
  residenceCities.value = []
  residenceDistricts.value = []
  residenceStreets.value = []
  await nextTick()
  if (!pid) return
  const res = await adminSystem.getRegionChildren(pid)
  residenceCities.value = res.data || []
}

async function onResidenceCityChange(cid: number | undefined) {
  residenceDistrictId.value = undefined
  residenceStreetId.value = undefined
  residenceDistricts.value = []
  residenceStreets.value = []
  await nextTick()
  if (!cid) return
  const res = await adminSystem.getRegionChildren(cid)
  residenceDistricts.value = res.data || []
}

async function onResidenceDistrictChange(did: number | undefined) {
  residenceStreetId.value = undefined
  residenceStreets.value = []
  await nextTick()
  if (!did) return
  const res = await adminSystem.getRegionChildren(did)
  residenceStreets.value = res.data || []
}

function buildResidenceLabel(pId?: number, cId?: number, dId?: number, sId?: number): string {
  const p = residenceProvinces.value.find(x => x.id === pId)
  const c = residenceCities.value.find(x => x.id === cId)
  const d = residenceDistricts.value.find(x => x.id === dId)
  const s = residenceStreets.value.find(x => x.id === sId)
  return [p?.name, c?.name, d?.name, s?.name].filter(Boolean).join(',')
}

onMounted(() => {
  loadColumnPrefs() // 从 localStorage 恢复列偏好
  fetchData()
  loadDicts()
  loadHometownProvinces()
  loadResidenceProvinces()
  fetchVipPackages()
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

    // 最近活跃时间筛选 — 后端暂不支持 lastActiveAt 查询参数，UI 保留等待后端跟进
    // 后端需在 user.service.ts list() 中增加对 lastActiveAtStartDate/lastActiveAtEndDate 的处理
    // if (lastActiveAtDateRange.value && lastActiveAtDateRange.value.length === 2) {
    //   (params as any).lastActiveAtStartDate = lastActiveAtDateRange.value[0]
    //   ;(params as any).lastActiveAtEndDate = lastActiveAtDateRange.value[1]
    // }

    const res = await adminUsers.list(params)
    if (res.success && res.data) {
      tableData.value = (res.data.list || []).map(normalizeUser)
      pagination.total = res.data.total || 0
    }
    // 累计付费数据异步加载，不阻塞列表展示
    loadPaymentData()
  } catch (error) {
    console.error('Fetch data error:', error)
  } finally {
    loading.value = false
  }
}

// 最近活跃时间筛选变化时将预设周期转为起止日期
function onLastActiveAtRangeChange() {
  if (!lastActiveAtRange.value || lastActiveAtRange.value === 'custom') {
    lastActiveAtDateRange.value = []
    return
  }
  const end = new Date()
  const start = new Date()
  const days: Record<string, number> = { today: 0, '3d': 3, '7d': 7, '30d': 30 }
  start.setDate(start.getDate() - (days[lastActiveAtRange.value] || 0))
  lastActiveAtDateRange.value = [
    start.toISOString().slice(0, 10),
    end.toISOString().slice(0, 10),
  ]
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
    birthMonth: undefined,
    birthDay: undefined,
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
  editingOriginalPhotoUrls.value = []
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
    hometown: buildCityLabel(hometownProvinceId.value, hometownCityId.value, hometownDistrictId.value, hometownStreetId.value),
    residence: buildResidenceLabel(residenceProvinceId.value, residenceCityId.value, residenceDistrictId.value, residenceStreetId.value),
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

      // 新增的照片通过 addUserPhoto 上传
      const newUrls = createPhotoUrls.value.filter(
        (url) => !editingOriginalPhotoUrls.value.includes(url)
      )
      for (const url of newUrls) {
        try {
          await adminUsers.addUserPhoto(editingUserId.value!, url)
        } catch (e) {
          console.error('上传照片失败:', url, e)
        }
      }

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
    eidCertStatus: undefined,
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
  lastActiveAtRange.value = undefined
  lastActiveAtDateRange.value = []
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
  createForm.birthMonth = user.birthMonth ?? undefined
  createForm.birthDay = user.birthDay ?? undefined
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
    editingOriginalPhotoUrls.value = [...createPhotoUrls.value]
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
  loadFollowData(editingUserId.value!)
}

/**
 * 根据「省,市,区,街道」字符串回填级联选择器
 * 兼容历史斜杠格式和当前逗号格式
 */
async function matchCityLabel(label: string, type: 'hometown' | 'residence') {
  const sep = label.includes(',') ? ',' : '/'
  const parts = label.split(sep).map(s => s.trim()).filter(Boolean)
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
        const res = await adminSystem.getRegionChildren(district.id)
        hometownStreets.value = res.data || []
      } else {
        residenceDistrictId.value = district.id
        const res = await adminSystem.getRegionChildren(district.id)
        residenceStreets.value = res.data || []
      }
    }
  }

  if (parts.length >= 4) {
    const streets = type === 'hometown' ? hometownStreets.value : residenceStreets.value
    const street = streets.find(s => s.name === parts[3])
    if (street) {
      if (type === 'hometown') {
        hometownStreetId.value = street.id
      } else {
        residenceStreetId.value = street.id
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
    // 禁用 → status=3，启用 → status=1
    const res = await adminUsers.updateStatus(row.id, row.status === 1 ? 3 : 1)
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
  vipForm.packageId = null
  vipForm.packageName = ''
  vipDialogVisible.value = true
}

async function handleVipSubmit() {
  if (!currentUser.value) return
  try {
    const res = await adminUsers.updateVip(currentUser.value.id, {
      level: vipForm.level,
      days: vipForm.days,
      packageName: vipForm.packageName || undefined,
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

async function handleBatchApprove() {
  if (selectedRows.value.length === 0) return
  try {
    await ElMessageBox.confirm(
      `确定要审核通过选中的 ${selectedRows.value.length} 个用户吗？审核通过后用户将转为正常状态。`,
      '批量审核通过',
      { type: 'warning' }
    )
    const ids = selectedRows.value.map((r) => r.id)
    await adminUsers.batchUpdateStatus(ids, 1)
    ElMessage.success('批量审核通过成功')
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error)
    }
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
    // 禁用 → status=3（已禁用）
    await adminUsers.batchUpdateStatus(ids, 3)
    ElMessage.success('批量禁用成功')
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error)
    }
  }
}

async function handleBatchLock() {
  if (selectedRows.value.length === 0) return
  try {
    await ElMessageBox.confirm(
      `确定要锁定选中的 ${selectedRows.value.length} 个用户吗？锁定后用户需确认脱单意向才能使用。`,
      '批量锁定',
      { type: 'warning' }
    )
    const ids = selectedRows.value.map((r) => r.id)
    await adminUsers.batchUpdateStatus(ids, 4)
    ElMessage.success('批量锁定成功')
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error)
    }
  }
}

async function handleLockUser(row: User) {
  try {
    await ElMessageBox.confirm(
      `确定要锁定用户 ${row.nickname} 吗？锁定后用户需确认脱单意向才能使用。`,
      '锁定账号',
      { type: 'warning' }
    )
    await adminUsers.updateStatus(row.id, 4)
    ElMessage.success('已锁定')
    fetchData()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error(error)
      ElMessage.error(error.message || '操作失败')
    }
  }
}

async function handleUnlockUser(row: User) {
  try {
    await ElMessageBox.confirm(
      `确定要解锁用户 ${row.nickname} 吗？`,
      '解锁账号',
      { type: 'warning' }
    )
    await adminUsers.updateStatus(row.id, 1)
    ElMessage.success('已解锁')
    fetchData()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error(error)
      ElMessage.error(error.message || '操作失败')
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

// 取消所有选中
function clearSelection() {
  tableRef.value?.clearSelection()
  selectedRows.value = []
  selectAll.value = false
}

// 批量发送通知
const notifyBatchDialogVisible = ref(false)
const notifyBatchContent = ref('')

function handleBatchSendNotify() {
  if (selectedRows.value.length === 0) return
  notifyBatchContent.value = ''
  notifyBatchDialogVisible.value = true
}

async function handleBatchNotifySubmit() {
  if (!notifyBatchContent.value.trim()) {
    ElMessage.warning('请输入通知内容')
    return
  }
  const ids = selectedRows.value.map(r => r.id)
  let successCount = 0
  let failCount = 0
  for (const id of ids) {
    try {
      await adminUsers.sendNotification(id, notifyBatchContent.value)
      successCount++
    } catch { failCount++ }
  }
  if (successCount > 0) {
    ElMessage.success(`通知已发送：${successCount} 人成功${failCount > 0 ? '，' + failCount + ' 人失败' : ''}`)
  } else {
    ElMessage.error('批量发送通知失败')
  }
  notifyBatchDialogVisible.value = false
  clearSelection()
}

// 操作列下拉菜单命令分发
async function handleDropdownCommand(cmd: string, row: User) {
  switch (cmd) {
    case 'edit': handleEditUser(row); break
    case 'vip': handleSetVip(row); break
    case 'unvip':
      // 取消VIP：设为普通用户级别0
      try {
        const res = await adminUsers.updateVip(row.id, { level: 0, days: 0 } as any)
        if (res.success) { ElMessage.success('已取消VIP'); fetchData() }
        else ElMessage.error(res.message || '取消VIP失败')
      } catch { ElMessage.error('取消VIP失败') }
      break
    case 'pin': handlePinUser(row); break
    case 'unpin':
      // 取消置顶：调用置顶接口传 durationHours=0 立即过期
      try {
        const res = await userPin.pinUser(row.id, 0)
        if (res.success) { ElMessage.success('已取消置顶'); fetchData() }
        else ElMessage.error(res.message || '取消置顶失败')
      } catch { ElMessage.error('取消置顶失败') }
      break
    case 'disable': handleToggleStatus(row); break
    case 'enable': handleToggleStatus(row); break
    case 'approve':
      // 审核通过：将待审核(0)/未完善(2)用户设为正常(1)
      try {
        await ElMessageBox.confirm(
          `确定要审核通过用户 ${row.nickname} 吗？`,
          '审核通过',
          { type: 'warning' }
        )
        await adminUsers.updateStatus(row.id, 1)
        ElMessage.success('审核通过')
        fetchData()
      } catch (error: any) {
        if (error !== 'cancel') {
          console.error(error)
          ElMessage.error(error.message || '操作失败')
        }
      }
      break
    case 'notify': handleSendNotify(row); break
    case 'tag': handleOpenTagDialog(row); break
    case 'viewNotes': handleViewNotes(row); break
  }
}

// 快捷审核：从审计列表找到PENDING记录并审批/拒绝
async function handleQuickAudit(row: User, auditType: 'user' | 'photo', action: 'approve' | 'reject') {
  const typeLabel = auditType === 'user' ? '资料' : '照片'
  const actionLabel = action === 'approve' ? '通过' : '拒绝'
  try {
    await ElMessageBox.confirm(
      `确定${actionLabel}用户「${row.nickname}」的${typeLabel}审核？`,
      `快捷${actionLabel}审核`,
      { type: 'warning', confirmButtonText: actionLabel, cancelButtonText: '取消' }
    )
  } catch { return /* 用户取消 */ }

  try {
    // 查询该用户的待审核审计记录（limit 设为极大值以确保不漏查）
    const res = await adminAudit.list({ type: auditType, status: 0, limit: 99999 })
    if (res.success && res.data) {
      const auditItem = res.data.list.find((item: any) => item.targetId === row.id)
      if (!auditItem) {
        // 无审计记录，尝试直接调用审批接口（如支持）
        ElMessage.warning(`未找到「${row.nickname}」的${typeLabel}待审核记录，请前往审核管理处理`)
        return
      }
      if (action === 'approve') {
        await adminAudit.approve(auditItem.id)
      } else {
        await adminAudit.reject(auditItem.id, '快捷拒绝')
      }
      ElMessage.success(`${typeLabel}审核已${actionLabel}`)
      fetchData()
    }
  } catch { ElMessage.error(`${actionLabel}审核失败`) }
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

// ===== 标签管理操作函数 =====

/** 打开打标签弹窗（单用户/批量共用） */
function handleOpenTagDialog(row: User) {
  tagTargetUser.value = row
  tagDialogTitle.value = `为「${row.nickname}」打标签`
  // 初始化草稿为当前用户标签
  tagDraftSelected.value = [...getUserTags(row)]
  tagInputValue.value = ''
  tagDialogVisible.value = true
}

/** 批量打标签（使用选中用户） */
function handleBatchTag() {
  if (selectedRows.value.length === 0) return
  tagTargetUser.value = null // 批量模式
  tagDialogTitle.value = `批量打标签（已选 ${selectedRows.value.length} 人）`
  tagDraftSelected.value = []
  tagInputValue.value = ''
  tagDialogVisible.value = true
}

/** 自定义标签输入确认（回车或点击） */
function handleListTagInputConfirm() {
  const val = tagInputValue.value.trim()
  if (!val) return
  if (tagDraftSelected.value.includes(val)) {
    ElMessage.warning('该标签已存在')
    return
  }
  tagDraftSelected.value.push(val)
  tagInputValue.value = ''
}

/** 点击预设标签添加到已选 */
function handleAddListPresetTag(label: string) {
  if (tagDraftSelected.value.includes(label)) {
    ElMessage.warning('该标签已存在')
    return
  }
  tagDraftSelected.value.push(label)
}

/** 保存标签：调用后端 API 持久化保存 */
async function handleListSaveTags() {
  tagSaving.value = true
  try {
    if (tagTargetUser.value) {
      // 单用户打标签
      await adminUsers.updateTags(tagTargetUser.value.id, tagDraftSelected.value)
      ElMessage.success('标签保存成功')
    } else {
      // 批量打标签：为每个选中用户追加标签
      await adminUsers.batchUpdateTags(
        selectedRows.value.map(r => r.id),
        tagDraftSelected.value,
      )
      ElMessage.success(`已为 ${selectedRows.value.length} 人打标签`)
    }
    tagDialogVisible.value = false
    fetchData() // 刷新列表以更新标签显示
  } catch (err: any) {
    ElMessage.error('标签保存失败：' + (err?.message || err))
  } finally { tagSaving.value = false }
}

// ===== 查看备注操作函数 =====

/** 打开查看备注弹窗（只读） */
async function handleViewNotes(row: User) {
  notesUserId.value = row.id
  notesDialogVisible.value = true
  notesLoading.value = true
  notesContent.value = ''
  try {
    // TODO: 接入后端备注查询接口 - adminUsers.getRemark(userId)
    // 当前从用户详情的 adminRemark 字段读取（如有）
    const detail = await adminUsers.detail(row.id)
    if (detail.success && detail.data) {
      notesContent.value = (detail.data as any).adminRemark || ''
    }
  } catch {
    // 后端接口缺失时静默，展示空状态
    notesContent.value = ''
  }
  finally { notesLoading.value = false }
}

/** 从查看备注弹窗跳转到详情页编辑备注 */
function goToDetailForNotes() {
  if (notesUserId.value) {
    notesDialogVisible.value = false
    router.push(`/user/detail/${notesUserId.value}`)
  }
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

.table-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}

.column-checkbox-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
  padding: 4px 0;
}

.advanced-filters {
  border-top: 1px dashed #dcdfe6;
  padding-top: 12px;
}
</style>
