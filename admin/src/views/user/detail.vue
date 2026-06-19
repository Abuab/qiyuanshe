<template>
  <div class="user-detail" v-loading="loading">
    <div class="page-header">
      <el-button link @click="$router.back()">
        <el-icon><ArrowLeft /></el-icon> 返回列表
      </el-button>
    </div>

    <div v-if="user" class="detail-content">
      <!-- 顶部信息卡片 -->
      <el-card class="header-card">
        <div class="user-header">
          <el-image :src="user.avatar" fit="cover" style="width: 100px; height: 100px; border-radius: 50%" :key="user.avatar">
            <template #error>
              <div style="width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; background: #f5f5f5; border-radius: 50%">
                <el-icon :size="48"><User /></el-icon>
              </div>
            </template>
          </el-image>
          <div class="header-info">
            <h2 class="user-name">{{ user.nickname }}</h2>
            <div class="user-tags">
              <el-tag v-if="user.gender === 1" type="primary">男</el-tag>
              <el-tag v-else-if="user.gender === 2" type="danger">女</el-tag>
              <span class="tag-label">ID: {{ user.id }}</span>
              <span class="tag-label">{{ user.phone || '未绑定手机' }}</span>
              <el-tag v-if="user.isVip && (user.vipLevel || 0) > 0" type="warning" effect="dark">
                会员
              </el-tag>
              <el-tag v-if="user.status === 1" type="success">正常</el-tag>
              <el-tag v-else-if="user.status === 2" type="warning">待审核</el-tag>
              <el-tag v-else type="danger">禁用</el-tag>
            </div>
          </div>
          <div class="header-actions">
            <el-button type="warning" @click="handleSetVip">设为VIP</el-button>
            <el-button :type="user.status === 1 ? 'danger' : 'success'" @click="handleToggleStatus">
              {{ user.status === 1 ? '禁用' : '启用' }}
            </el-button>
            <el-button @click="handleSendNotify">发送通知</el-button>
          </div>
        </div>
      </el-card>

      <!-- Tab内容 -->
      <el-card class="tab-card">
        <el-tabs v-model="activeTab" @tab-change="handleTabChange">
          <el-tab-pane label="基本资料" name="basic">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="性别">{{ user.gender === 1 ? '男' : user.gender === 2 ? '女' : '未知' }}</el-descriptions-item>
              <el-descriptions-item label="年龄">{{ user.age || '-' }} 岁</el-descriptions-item>
              <el-descriptions-item label="身高">{{ user.height ? user.height + ' cm' : '-' }}</el-descriptions-item>
              <el-descriptions-item label="体重">{{ user.weight ? user.weight + ' kg' : '-' }}</el-descriptions-item>
              <el-descriptions-item label="学历">{{ user.education || '-' }}</el-descriptions-item>
              <el-descriptions-item label="职业">{{ user.occupation || '-' }}</el-descriptions-item>
              <el-descriptions-item label="月收入">{{ user.incomeRange || '-' }}</el-descriptions-item>
              <el-descriptions-item label="住房">{{ user.housingStatus || '-' }}</el-descriptions-item>
              <el-descriptions-item label="车辆">{{ user.carStatus || '-' }}</el-descriptions-item>
              <el-descriptions-item label="婚况">{{ user.maritalStatus || '-' }}</el-descriptions-item>
              <el-descriptions-item label="家乡">{{ user.hometown || '-' }}</el-descriptions-item>
              <el-descriptions-item label="居住地">{{ user.residence || '-' }}</el-descriptions-item>
              <el-descriptions-item label="独生子女">{{ user.onlyChild || '-' }}</el-descriptions-item>
              <el-descriptions-item label="何时结婚">{{ user.whenMarry || '-' }}</el-descriptions-item>
              <el-descriptions-item label="属相">{{ user.zodiac || '-' }}</el-descriptions-item>
              <el-descriptions-item label="星座">{{ user.constellation || '-' }}</el-descriptions-item>
              <el-descriptions-item label="实名认证">
                <el-tag v-if="user.isRealName" type="success" size="small">已认证</el-tag>
                <el-tag v-else type="info" size="small">未认证</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="注册时间">{{ formatDate(user.createdAt) }}</el-descriptions-item>
              <el-descriptions-item label="最后登录">{{ formatDate(user.lastLoginAt) }}</el-descriptions-item>
              <el-descriptions-item label="VIP到期">
                <span v-if="user.vipExpireTime">{{ formatDate(user.vipExpireTime) }}</span>
                <span v-else>未开通</span>
              </el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>

          <el-tab-pane label="聊天记录" name="chat">
            <div v-loading="tabLoading.chat">
              <div v-if="chatConversations.length > 0">
                <div
                  v-for="conv in chatConversations"
                  :key="conv.userId"
                  class="chat-conv-item"
                  style="display:flex;align-items:center;padding:12px 0;border-bottom:1px solid #ebeef5;cursor:pointer"
                  @click="openUserChat(conv)"
                >
                  <el-image :src="conv.avatar" fit="cover" style="width:44px;height:44px;border-radius:50%">
                    <template #error><div style="width:44px;height:44px;border-radius:50%;background:#f5f5f5;display:flex;align-items:center;justify-content:center"><el-icon :size="22"><User /></el-icon></div></template>
                  </el-image>
                  <div style="flex:1;margin-left:12px;overflow:hidden">
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                      <span style="font-weight:500">{{ conv.nickname }}</span>
                      <span style="font-size:12px;color:#999">{{ formatDate(conv.lastTime) }}</span>
                    </div>
                    <div style="color:#666;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ conv.messageType === 'image' ? '[图片]' : conv.lastMessage }}</div>
                  </div>
                </div>
              </div>
              <el-empty v-else description="暂无聊天记录" />
            </div>
          </el-tab-pane>

          <el-tab-pane label="我的特点" name="personality">
            <div v-if="hasPersonalityTags" class="personality-section">
              <div v-if="characterTags.length > 0" class="tag-category">
                <h4 class="category-title">性格</h4>
                <div class="tag-group">
                  <el-tag v-for="tag in characterTags" :key="tag" size="large" effect="plain" round style="margin:4px">{{ tag }}</el-tag>
                </div>
              </div>
              <div v-if="hobbyTags.length > 0" class="tag-category">
                <h4 class="category-title">爱好</h4>
                <div class="tag-group">
                  <el-tag v-for="tag in hobbyTags" :key="tag" size="large" effect="plain" round style="margin:4px">{{ tag }}</el-tag>
                </div>
              </div>
              <div v-if="loveRuleTags.length > 0" class="tag-category">
                <h4 class="category-title">恋爱准则</h4>
                <div class="tag-group">
                  <el-tag v-for="tag in loveRuleTags" :key="tag" size="large" effect="plain" round style="margin:4px">{{ tag }}</el-tag>
                </div>
              </div>
              <!-- 兼容旧数据: 非结构化数组 -->
              <div v-if="!isStructuredPersonality && flatPersonalityTags.length > 0" class="tag-group">
                <el-tag v-for="tag in flatPersonalityTags" :key="tag" size="large" effect="plain" round style="margin:4px">{{ tag }}</el-tag>
              </div>
            </div>
            <div v-else class="text-content text-muted">暂无</div>
          </el-tab-pane>

          <el-tab-pane label="择偶要求" name="mate">
            <el-descriptions v-if="hasMateRequirement" :column="2" border style="margin-bottom:16px">
              <el-descriptions-item label="希望TA">{{ (user.hopeTaTags || []).join('、') || '-' }}</el-descriptions-item>
              <el-descriptions-item label="年龄要求">{{ user.partnerAgeRange || '-' }}</el-descriptions-item>
              <el-descriptions-item label="身高要求">{{ user.partnerHeightMin || '-' }}</el-descriptions-item>
              <el-descriptions-item label="学历要求">{{ user.partnerEducation || '-' }}</el-descriptions-item>
              <el-descriptions-item label="收入要求">{{ user.partnerIncome || '-' }}</el-descriptions-item>
              <el-descriptions-item label="住房要求">{{ user.housingRequirement || '-' }}</el-descriptions-item>
              <el-descriptions-item label="婚况要求">{{ user.partnerMaritalStatus || '-' }}</el-descriptions-item>
              <el-descriptions-item label="接受小孩">{{ user.acceptChildren || '-' }}</el-descriptions-item>
            </el-descriptions>
            <div v-if="user.mateRequirement" class="text-content">{{ user.mateRequirement }}</div>
            <div v-if="!hasMateRequirement && !user.mateRequirement" class="text-content text-muted">暂无择偶要求</div>
          </el-tab-pane>

          <el-tab-pane label="照片墙" name="photos">
            <div v-loading="tabLoading.photos">
              <div style="margin-bottom:12px;display:flex;justify-content:flex-end">
                <el-upload
                  :show-file-list="false"
                  :http-request="handlePhotoUpload"
                  :before-upload="beforePhotoUpload"
                  accept="image/*"
                  multiple
                >
                  <el-button type="primary" size="small" :loading="photoUploading">上传照片</el-button>
                </el-upload>
              </div>
              <div v-if="userPhotos.length > 0" class="photo-grid">
                <div v-for="photo in userPhotos" :key="photo.id" class="photo-card">
                  <el-image :src="photo.photoUrl"
                    :preview-src-list="userPhotos.map(p => p.photoUrl)" :initial-index="userPhotos.indexOf(photo)" fit="cover" class="photo-item">
                    <template #error><div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f5f5f5;border-radius:8px"><el-icon :size="32"><Picture /></el-icon></div></template>
                  </el-image>
                  <div class="photo-actions">
                    <el-tag v-if="photo.isMain" type="success" size="small">主图</el-tag>
                    <el-button v-else type="primary" link size="small" @click="handleSetMainPhoto(photo.id)">设为主图</el-button>
                    <el-button type="danger" link size="small" @click="handleDeletePhoto(photo.id)">删除</el-button>
                  </div>
                </div>
              </div>
              <el-empty v-else description="暂无照片" />
            </div>
          </el-tab-pane>

          <!-- ===== 新增标签页 ===== -->

          <el-tab-pane label="举报记录" name="reports">
            <div v-loading="tabLoading.reports">
              <el-table :data="reportList" stripe v-if="reportList.length > 0">
                <el-table-column prop="id" label="举报ID" width="80" />
                <el-table-column prop="reporterId" label="举报人ID" width="100" />
                <el-table-column prop="type" label="举报类型" width="110">
                  <template #default="{ row }">{{ getReportTypeName(row.type) }}</template>
                </el-table-column>
                <el-table-column prop="reason" label="举报原因" width="110">
                  <template #default="{ row }">{{ getReportReasonName(row.reason) }}</template>
                </el-table-column>
                <el-table-column prop="description" label="举报描述" min-width="200" show-overflow-tooltip />
                <el-table-column prop="createdAt" label="举报时间" width="170">
                  <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
                </el-table-column>
                <el-table-column prop="status" label="处理状态" width="100">
                  <template #default="{ row }">
                    <el-tag :type="getReportStatusType(row.status)" size="small">{{ getReportStatusName(row.status) }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="result" label="处理结果" width="100">
                  <template #default="{ row }">{{ row.result || '-' }}</template>
                </el-table-column>
              </el-table>
              <el-empty v-else description="暂无举报记录" />
            </div>
          </el-tab-pane>

          <el-tab-pane label="拉黑记录" name="blocks">
            <div v-loading="tabLoading.blocks">
              <el-table :data="blockList" stripe v-if="blockList.length > 0">
                <el-table-column prop="id" label="拉黑ID" width="80" />
                <el-table-column label="拉黑者" width="180">
                  <template #default="{ row }">
                    <div class="tab-user-cell" @click="$router.push(`/user/detail/${row.blockerId}`)" style="cursor:pointer">
                      <el-image :src="row.blockerAvatar" fit="cover" style="width:28px;height:28px;border-radius:50%">
                        <template #error><div style="width:28px;height:28px;background:#f5f5f5;border-radius:50%;display:flex;align-items:center;justify-content:center"><el-icon :size="14"><User /></el-icon></div></template>
                      </el-image>
                      <span>{{ row.blockerNickname }}</span>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column prop="createdAt" label="拉黑时间" width="170">
                  <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
                </el-table-column>
              </el-table>
              <el-empty v-else description="暂未被拉黑" />
            </div>
          </el-tab-pane>

          <el-tab-pane label="系统通知" name="notifications">
            <div v-loading="tabLoading.notifications">
              <div style="margin-bottom:12px;display:flex;justify-content:flex-end">
                <el-button type="primary" size="small" @click="handleSendNotify">发送新通知</el-button>
              </div>
              <el-table :data="notificationList" stripe v-if="notificationList.length > 0">
                <el-table-column prop="id" label="通知ID" width="80" />
                <el-table-column prop="title" label="标题" min-width="150" />
                <el-table-column prop="content" label="内容" min-width="200" show-overflow-tooltip />
                <el-table-column prop="createdAt" label="发送时间" width="170">
                  <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
                </el-table-column>
                <el-table-column prop="senderType" label="发送人" width="100">
                  <template #default="{ row }">{{ row.senderType === 'admin' ? '管理员' : '系统' }}</template>
                </el-table-column>
                <el-table-column prop="isRead" label="阅读状态" width="100">
                  <template #default="{ row }">
                    <el-tag :type="row.isRead ? 'success' : 'info'" size="small">{{ row.isRead ? '已读' : '未读' }}</el-tag>
                  </template>
                </el-table-column>
              </el-table>
              <el-empty v-else description="暂无通知记录" />
            </div>
          </el-tab-pane>

          <el-tab-pane label="回答记录" name="answers">
            <div v-loading="tabLoading.answers">
              <div style="margin-bottom:12px;display:flex;justify-content:flex-end">
                <el-button type="primary" size="small" @click="handleAddAnswer">添加回答</el-button>
              </div>
              <el-table :data="userAnswerList" stripe v-if="userAnswerList.length > 0">
                <el-table-column prop="id" label="回答ID" width="80" />
                <el-table-column label="问题标题" min-width="180">
                  <template #default="{ row }">
                    <span class="link-text" @click="$router.push(`/question/detail/${row.questionId}`)">{{ row.questionTitle }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="content" label="回答内容" min-width="200" show-overflow-tooltip />
                <el-table-column prop="createdAt" label="回答时间" width="170">
                  <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
                </el-table-column>
                <el-table-column prop="likeCount" label="点赞数" width="80" align="center" />
                <el-table-column prop="status" label="审核状态" width="100">
                  <template #default="{ row }">
                    <el-tag :type="getAnswerStatusType(row.status)" size="small">{{ getAnswerStatusName(row.status) }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column v-if="!isReadonly" label="操作" width="180" fixed="right">
                  <template #default="{ row }">
                    <el-button
                      v-if="row.status === 0"
                      type="success"
                      link
                      size="small"
                      :loading="answerAuditing[row.id]"
                      @click="handleApproveAnswer(row)"
                    >通过</el-button>
                    <el-button
                      v-if="row.status === 0"
                      type="danger"
                      link
                      size="small"
                      :loading="answerAuditing[row.id]"
                      @click="handleRejectAnswer(row)"
                    >拒绝</el-button>
                    <span v-if="row.status !== 0" class="text-muted">-</span>
                  </template>
                </el-table-column>
              </el-table>
              <el-empty v-else description="暂无回答记录" />
            </div>
          </el-tab-pane>

          <el-tab-pane label="红娘评价" name="matchmaker-reviews">
            <div v-loading="tabLoading.reviews">
              <div style="margin-bottom:12px;display:flex;justify-content:flex-end">
                <el-button type="primary" size="small" @click="handleAddReview">新增评价</el-button>
              </div>
              <el-table :data="reviewList" stripe v-if="reviewList.length > 0" row-key="id">
                <el-table-column prop="id" label="评价ID" width="80" />
                <el-table-column prop="matchmakerName" label="评价红娘" width="120" />
                <el-table-column prop="content" label="评价内容" min-width="200" show-overflow-tooltip />
                <el-table-column prop="createdAt" label="评价时间" width="170">
                  <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
                </el-table-column>
                <el-table-column prop="difficulty" label="是否好牵线" width="120" />
                <el-table-column v-if="!isReadonly" label="操作" width="80">
                  <template #default="{ row }">
                    <el-button type="danger" link size="small" @click="handleDeleteReview(row)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
              <el-empty v-else description="暂无评价记录" />
            </div>
          </el-tab-pane>

          <el-tab-pane label="关注" name="follow">
            <div v-loading="tabLoading.follow">
              <div style="display:flex;gap:24px">
                <!-- 我关注的 -->
                <div style="flex:1">
                  <h4 style="margin:0 0 12px 0">我关注的 ({{ followData.following.length }})</h4>
                  <div v-if="followData.following.length === 0" style="color:#999;font-size:13px">暂无关注</div>
                  <div v-for="f in followData.following" :key="f.id" style="display:flex;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f0;cursor:pointer" @click="goToUserDetail(f.targetUserId)">
                    <el-image :src="f.avatar" fit="cover" style="width:40px;height:40px;border-radius:50%;flex-shrink:0">
                      <template #error><div style="width:40px;height:40px;border-radius:50%;background:#f5f5f5;display:flex;align-items:center;justify-content:center"><el-icon :size="20"><User /></el-icon></div></template>
                    </el-image>
                    <span style="margin-left:12px;font-size:14px;flex:1">{{ f.nickname }}</span>
                    <span style="font-size:12px;color:#999">{{ formatDate(f.createdAt) }}</span>
                  </div>
                </div>
                <!-- 关注我的 -->
                <div style="flex:1">
                  <h4 style="margin:0 0 12px 0">关注我的 ({{ followData.followers.length }})</h4>
                  <div v-if="followData.followers.length === 0" style="color:#999;font-size:13px">暂无粉丝</div>
                  <div v-for="f in followData.followers" :key="f.id" style="display:flex;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f0;cursor:pointer" @click="goToUserDetail(f.userId)">
                    <el-image :src="f.avatar" fit="cover" style="width:40px;height:40px;border-radius:50%;flex-shrink:0">
                      <template #error><div style="width:40px;height:40px;border-radius:50%;background:#f5f5f5;display:flex;align-items:center;justify-content:center"><el-icon :size="20"><User /></el-icon></div></template>
                    </el-image>
                    <span style="margin-left:12px;font-size:14px;flex:1">{{ f.nickname }}</span>
                    <span style="font-size:12px;color:#999">{{ formatDate(f.createdAt) }}</span>
                  </div>
                </div>
              </div>
              <el-divider />
              <div style="display:flex;gap:24px">
                <!-- 我看过谁 -->
                <div style="flex:1">
                  <h4 style="margin:0 0 12px 0">我看过谁 ({{ viewData.views.length }})</h4>
                  <div v-if="viewData.views.length === 0" style="color:#999;font-size:13px">暂无记录</div>
                  <div v-for="v in viewData.views" :key="v.targetUserId" style="display:flex;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f0;cursor:pointer" @click="goToUserDetail(v.targetUserId)">
                    <el-image :src="v.avatar || ''" fit="cover" style="width:40px;height:40px;border-radius:50%;flex-shrink:0">
                      <template #error><div style="width:40px;height:40px;border-radius:50%;background:#f5f5f5;display:flex;align-items:center;justify-content:center"><el-icon :size="20"><User /></el-icon></div></template>
                    </el-image>
                    <span style="margin-left:12px;font-size:14px;flex:1">{{ v.nickname }}</span>
                    <span style="font-size:12px;color:#999;margin-right:8px">第{{ v.viewCount }}次查看</span>
                  </div>
                </div>
                <!-- 谁看过我 -->
                <div style="flex:1">
                  <h4 style="margin:0 0 12px 0">谁看过我 ({{ viewData.visitors.length }})</h4>
                  <div v-if="viewData.visitors.length === 0" style="color:#999;font-size:13px">暂无记录</div>
                  <div v-for="v in viewData.visitors" :key="v.visitorUserId" style="display:flex;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f0;cursor:pointer" @click="goToUserDetail(v.visitorUserId)">
                    <el-image :src="v.avatar || ''" fit="cover" style="width:40px;height:40px;border-radius:50%;flex-shrink:0">
                      <template #error><div style="width:40px;height:40px;border-radius:50%;background:#f5f5f5;display:flex;align-items:center;justify-content:center"><el-icon :size="20"><User /></el-icon></div></template>
                    </el-image>
                    <span style="margin-left:12px;font-size:14px;flex:1">{{ v.nickname }}</span>
                    <span style="font-size:12px;color:#999;margin-right:8px">看过{{ v.viewCount }}次</span>
                  </div>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </div>

    <el-empty v-else description="用户不存在" />

    <!-- VIP弹窗 -->
    <el-dialog v-model="vipDialogVisible" title="调整VIP等级" width="400px">
      <el-form :model="vipForm" label-width="100px">
        <el-form-item label="用户">{{ user?.nickname }}</el-form-item>
        <el-form-item label="VIP等级" required>
          <el-select v-model="vipForm.level" style="width:200px">
            <el-option label="普通用户" :value="0" /><el-option label="会员" :value="1" />
          </el-select>
        </el-form-item>
        <el-form-item label="有效期"><el-input-number v-model="vipForm.days" :min="1" :max="3650" /><span class="ml-10">天</span></el-form-item>
      </el-form>
      <template #footer><el-button @click="vipDialogVisible = false">取消</el-button><el-button type="primary" @click="handleVipSubmit">确定</el-button></template>
    </el-dialog>

    <!-- 通知弹窗 -->
    <el-dialog v-model="notifyDialogVisible" title="发送通知" width="500px">
      <el-form :model="notifyForm" label-width="80px">
        <el-form-item label="用户">{{ user?.nickname }}</el-form-item>
        <el-form-item label="通知标题"><el-input v-model="notifyForm.title" placeholder="可选" /></el-form-item>
        <el-form-item label="通知内容" required>
          <el-input v-model="notifyForm.content" type="textarea" :rows="4" placeholder="请输入通知内容..." maxlength="200" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer><el-button @click="notifyDialogVisible = false">取消</el-button><el-button type="primary" @click="handleNotifySubmit">发送</el-button></template>
    </el-dialog>

    <!-- 红娘评价弹窗 -->
    <el-dialog v-model="reviewDialogVisible" title="新增评价" width="520px">
      <el-form :model="reviewForm" label-width="80px">
        <el-form-item label="选择红娘" required>
          <el-select v-model="reviewForm.matchmakerId" placeholder="请选择红娘" filterable style="width:100%">
            <el-option v-for="m in matchmakerOptions" :key="m.id" :label="m.name" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="评价文字" required>
          <el-input
            v-model="reviewForm.content"
            type="textarea"
            :rows="5"
            placeholder="请输入对用户的评价内容"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleReviewSubmit" :disabled="!reviewForm.matchmakerId || !reviewForm.content.trim()">
          确认添加
        </el-button>
      </template>
    </el-dialog>

    <!-- 添加回答弹窗 -->
    <el-dialog v-model="answerDialogVisible" title="手动添加回答" width="520px">
      <el-form :model="answerForm" label-width="80px">
        <el-form-item label="选择问题" required>
          <el-select v-model="answerForm.questionId" placeholder="请选择要回答的问题" filterable style="width:100%">
            <el-option v-for="q in questionOptions" :key="q.id" :label="q.title" :value="q.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="回答内容" required>
          <el-input
            v-model="answerForm.content"
            type="textarea"
            :rows="5"
            placeholder="请输入回答内容"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="answerDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAnswerSubmit" :disabled="!answerForm.questionId || !answerForm.content.trim()" :loading="answerSubmitting">
          确认添加
        </el-button>
      </template>
    </el-dialog>

    <!-- 聊天记录弹窗 -->
    <el-dialog v-model="userChatDialogVisible" :title="`与 ${userChatPeerName} 的聊天记录`" width="700px" top="5vh" destroy-on-close>
      <div v-loading="userChatMsgLoading" style="max-height:60vh;overflow-y:auto;padding:8px 0">
        <div v-if="userChatMessages.length === 0 && !userChatMsgLoading" style="text-align:center;color:#999;padding:60px 0">
          暂无聊天记录
        </div>
        <div
          v-for="msg in userChatMessages"
          :key="msg.id"
          style="margin-bottom:16px;padding:0 12px"
          :style="{ textAlign: msg.fromUserId === user?.id ? 'right' : 'left' }"
        >
          <div style="margin-bottom:4px;display:flex;align-items:center;gap:8px" :style="{ justifyContent: msg.fromUserId === user?.id ? 'flex-end' : 'flex-start' }">
            <span style="font-size:12px;color:#909399;font-weight:500">
              {{ msg.fromUserId === user?.id ? user?.nickname : userChatPeerName }}
            </span>
            <span style="font-size:11px;color:#c0c4cc">{{ formatDate(msg.createdAt) }}</span>
          </div>
          <div style="display:inline-block;max-width:70%;padding:10px 14px;border-radius:12px;font-size:14px;line-height:1.6;word-break:break-all"
            :style="{ background: msg.fromUserId === user?.id ? '#95ec69' : '#f0f2f5', color: '#333' }"
          >
            <el-image v-if="msg.type === 'image'" :src="msg.content" style="max-width:200px;max-height:200px;border-radius:8px" fit="contain" :preview-src-list="[msg.content]" />
            <template v-else>{{ msg.content }}</template>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, User, Picture } from '@element-plus/icons-vue'
import { adminUsers, adminMatchmaker } from '../../api'
import { adminChat, type ChatMessageItem } from '../../api/chat'
import { formatDate } from '../../utils/date'
import { useAdminStore } from '../../store/admin'

interface UserDetail {
  id: number
  nickname: string
  avatar?: string
  gender: number
  birthYear?: number
  age?: number
  education?: string
  occupation?: string
  height?: number
  weight?: number
  phone?: string
  incomeRange?: string
  housingStatus?: string
  carStatus?: string
  maritalStatus?: string
  hometown?: string
  residence?: string
  mateRequirement?: string
  isRealName: number
  isVip: number
  vipLevel?: number
  vipExpireTime?: string
  status: number
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
  tags?: string[]
  onlyChild?: string
  whenMarry?: string
  zodiac?: string
  constellation?: string
  personalityTags?: string[]
  hopeTaTags?: string[]
  partnerAgeRange?: string
  partnerHeightMin?: string
  partnerEducation?: string
  partnerIncome?: string
  housingRequirement?: string
  partnerMaritalStatus?: string
  acceptChildren?: string
  adminRemark?: string
  photos?: { id: number; userId: number; photoUrl: string; isMain: number; sortOrder: number; auditStatus: number; createdAt: string }[]
}

const route = useRoute()
const router = useRouter()
const adminStore = useAdminStore()
const isReadonly = computed(() => adminStore.userInfo?.role === 'readonly')

function goToUserDetail(userId: number) {
  router.push(`/user/detail/${userId}`)
}

const hasMateRequirement = computed(() => {
  const u = user.value
  if (!u) return false
  return !!(u.hopeTaTags?.length || u.partnerAgeRange || u.partnerHeightMin ||
    u.partnerEducation || u.partnerIncome || u.housingRequirement ||
    u.partnerMaritalStatus || u.acceptChildren)
})

// 解析 personalityTags: 兼容结构化对象 {character:[], hobby:[], loveRule:[]} 和数组
const personalityData = computed(() => {
  const pt = user.value?.personalityTags as any
  if (!pt) return { character: [] as string[], hobby: [] as string[], loveRule: [] as string[] }
  if (Array.isArray(pt)) return { character: [] as string[], hobby: [] as string[], loveRule: [] as string[], _flat: pt as string[] }
  if (typeof pt === 'object') return { character: (pt.character || []) as string[], hobby: (pt.hobby || []) as string[], loveRule: (pt.loveRule || []) as string[] }
  return { character: [] as string[], hobby: [] as string[], loveRule: [] as string[] }
})
const characterTags = computed(() => personalityData.value.character)
const hobbyTags = computed(() => personalityData.value.hobby)
const loveRuleTags = computed(() => personalityData.value.loveRule)
const flatPersonalityTags = computed(() => personalityData.value._flat || [])
const isStructuredPersonality = computed(() => {
  const pt = user.value?.personalityTags
  return pt && typeof pt === 'object' && !Array.isArray(pt)
})
const hasPersonalityTags = computed(() => {
  return characterTags.value.length > 0 || hobbyTags.value.length > 0 || loveRuleTags.value.length > 0 || flatPersonalityTags.value.length > 0
})

const loading = ref(false)
const user = ref<UserDetail | null>(null)
const activeTab = ref('basic')

const vipDialogVisible = ref(false)
const notifyDialogVisible = ref(false)
const vipForm = reactive({ level: 0, days: 30 })
const notifyForm = reactive({ title: '', content: '' })

// Tab data
const tabLoading = reactive({ reports: false, blocks: false, notifications: false, answers: false, reviews: false, photos: false, chat: false, follow: false })
const reportList = ref<any[]>([])
const blockList = ref<any[]>([])
const notificationList = ref<any[]>([])
const userAnswerList = ref<any[]>([])
const answerAuditing = reactive<Record<number, boolean>>({})
const reviewList = ref<any[]>([])
const followData = reactive({ following: [] as any[], followers: [] as any[] })
const viewData = reactive({ views: [] as any[], visitors: [] as any[] })
const userPhotos = ref<any[]>([])
const photoUploading = ref(false)

// Review dialog
const reviewDialogVisible = ref(false)
const reviewForm = reactive({ matchmakerId: null as number | null, content: '' })
const matchmakerOptions = ref<any[]>([])

// Answer dialog
const answerDialogVisible = ref(false)
const answerSubmitting = ref(false)
const answerForm = reactive({ questionId: null as number | null, content: '' })
const questionOptions = ref<any[]>([])

// Chat
const chatConversations = ref<any[]>([])
const userChatDialogVisible = ref(false)
const userChatPeerId = ref(0)
const userChatPeerName = ref('')
const userChatMessages = ref<ChatMessageItem[]>([])
const userChatMsgLoading = ref(false)

const tabDataLoaded: Record<string, boolean> = {}

onMounted(() => { fetchDetail() })

async function fetchDetail() {
  loading.value = true
  try {
    const id = Number(route.params.id)
    const res = await adminUsers.detail(id)
    if (res.success && res.data) {
      user.value = res.data as UserDetail
    }
  } finally { loading.value = false }
}

function handleTabChange(tabName: string) {
  if (tabDataLoaded[tabName]) return
  tabDataLoaded[tabName] = true
  switch (tabName) {
    case 'reports': loadReports(); break
    case 'blocks': loadBlocks(); break
    case 'notifications': loadNotifications(); break
    case 'answers': loadUserAnswers(); break
    case 'matchmaker-reviews': loadReviews(); loadMatchmakers(); break
    case 'follow': loadFollowDetail(); break
    case 'photos': loadPhotos(); break
    case 'chat': loadChatConversations(); break
  }
}

async function loadReports() {
  if (!user.value) return
  tabLoading.reports = true
  try {
    const res = await adminUsers.getReports(user.value.id)
    if (res.success) reportList.value = res.data || []
  } catch (e) { console.error(e) }
  finally { tabLoading.reports = false }
}

async function loadBlocks() {
  if (!user.value) return
  tabLoading.blocks = true
  try {
    const res = await adminUsers.getBlocks(user.value.id)
    if (res.success) blockList.value = res.data?.list || []
  } catch (e) { console.error(e) }
  finally { tabLoading.blocks = false }
}

async function loadNotifications() {
  if (!user.value) return
  tabLoading.notifications = true
  try {
    const res = await adminUsers.getNotifications(user.value.id)
    if (res.success) notificationList.value = res.data?.list || []
  } catch (e) { console.error(e) }
  finally { tabLoading.notifications = false }
}

async function loadUserAnswers() {
  if (!user.value) return
  tabLoading.answers = true
  try {
    const res = await adminUsers.getUserAnswers(user.value.id)
    if (res.success) userAnswerList.value = res.data?.list || []
  } catch (e) { console.error(e) }
  finally { tabLoading.answers = false }
}

async function handleApproveAnswer(row: any) {
  try {
    await ElMessageBox.confirm('确定要通过该回答吗？', '确认通过', { type: 'success' })
    answerAuditing[row.id] = true
    await adminUsers.approveAnswer(row.id)
    ElMessage.success('回答审核已通过')
    row.status = 1
  } catch (e) {
    if (e !== 'cancel') { console.error(e); ElMessage.error('操作失败') }
  } finally {
    answerAuditing[row.id] = false
  }
}

async function handleRejectAnswer(row: any) {
  try {
    const { value: reason } = await ElMessageBox.prompt('请输入拒绝原因', '拒绝回答', {
      type: 'warning',
      inputType: 'textarea',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })
    answerAuditing[row.id] = true
    await adminUsers.rejectAnswer(row.id, reason || '')
    ElMessage.success('回答已拒绝')
    row.status = 2
  } catch (e) {
    if (e !== 'cancel') { console.error(e); ElMessage.error('操作失败') }
  } finally {
    answerAuditing[row.id] = false
  }
}


async function loadReviews() {
  if (!user.value) return
  tabLoading.reviews = true
  try {
    const res = await adminUsers.getReviews(user.value.id)
    if (res.success) reviewList.value = res.data || []
  } catch (e) { console.error(e) }
  finally { tabLoading.reviews = false }
}

async function loadMatchmakers() {
  try {
    const res = await adminMatchmaker.list({ page: 1, limit: 100, status: 1 })
    if (res.success) matchmakerOptions.value = res.data?.list || []
  } catch (e) { console.error(e) }
}

async function loadFollowDetail() {
  if (!user.value) return
  tabLoading.follow = true
  try {
    const [followingRes, followersRes, viewsRes, visitorsRes] = await Promise.all([
      adminUsers.getFollowing(user.value.id),
      adminUsers.getFollowers(user.value.id),
      adminUsers.getUserViewDetail(user.value.id),
      adminUsers.getUserVisitorDetail(user.value.id),
    ])
    if (followingRes.success) followData.following = followingRes.data?.list || []
    if (followersRes.success) followData.followers = followersRes.data?.list || []
    if (viewsRes.success) viewData.views = viewsRes.data || []
    if (visitorsRes.success) viewData.visitors = visitorsRes.data || []
  } catch (e) { console.error(e) }
  finally { tabLoading.follow = false }
}

async function handleToggleStatus() {
  if (!user.value) return
  const action = user.value.status === 1 ? '禁用' : '启用'
  try {
    await ElMessageBox.confirm(`确定要${action}用户 ${user.value.nickname} 吗？`, `确认${action}`, { type: 'warning' })
    const res = await adminUsers.updateStatus(user.value.id, user.value.status === 1 ? 0 : 1)
    if (res.success) { ElMessage.success(`${action}成功`); fetchDetail() }
    else ElMessage.error(res.message || `${action}失败`)
  } catch (e: any) { if (e !== 'cancel') console.error(e) }
}

function handleSetVip() {
  if (!user.value) return
  vipForm.level = user.value.vipLevel || 0; vipForm.days = 30; vipDialogVisible.value = true
}

async function handleVipSubmit() {
  if (!user.value) return
  try {
    const res = await adminUsers.updateVip(user.value.id, { level: vipForm.level, days: vipForm.days } as any)
    if (res.success) { ElMessage.success('VIP设置成功'); vipDialogVisible.value = false; fetchDetail() }
    else ElMessage.error(res.message || 'VIP设置失败')
  } catch (e: any) { ElMessage.error(e.message || 'VIP设置失败') }
}

function handleSendNotify() {
  notifyForm.title = ''; notifyForm.content = ''; notifyDialogVisible.value = true
}

async function handleNotifySubmit() {
  if (!notifyForm.content.trim()) { ElMessage.warning('请输入通知内容'); return }
  if (!user.value) return
  try {
    await adminUsers.sendUserNotification(user.value.id, { title: notifyForm.title || '系统通知', content: notifyForm.content })
    ElMessage.success('通知已发送')
    notifyDialogVisible.value = false
    // Reload notifications if tab is visible
    if (activeTab.value === 'notifications') loadNotifications()
  } catch (e: any) { ElMessage.error(e.message || '发送失败') }
}

function handleAddReview() { reviewForm.matchmakerId = null; reviewForm.content = ''; reviewDialogVisible.value = true }

async function handleReviewSubmit() {
  if (!reviewForm.matchmakerId) { ElMessage.warning('请选择红娘'); return }
  if (!user.value) return
  try {
    await adminUsers.createReview(user.value.id, { matchmakerId: reviewForm.matchmakerId, content: reviewForm.content })
    ElMessage.success('评价添加成功')
    reviewDialogVisible.value = false
    loadReviews()
  } catch (e: any) { ElMessage.error(e.message || '操作失败') }
}

async function handleDeleteReview(row: any) {
  try {
    await ElMessageBox.confirm('确定要删除该评价吗？', '删除确认', { type: 'warning' })
    await adminUsers.deleteReview(row.id)
    reviewList.value = reviewList.value.filter((r: any) => r.id !== row.id)
    ElMessage.success('删除成功')
  } catch (e) { if (e !== 'cancel') console.error(e) }
}

// Answer CRUD
async function handleAddAnswer() {
  answerForm.questionId = null
  answerForm.content = ''
  // Load questions for dropdown
  if (questionOptions.value.length === 0) {
    try {
      const { adminQuestion } = await import('../../api/question')
      const res = await adminQuestion.list({ limit: 200 })
      if (res.success && res.data) {
        questionOptions.value = (res.data as any).list || []
      }
    } catch (e) { console.error(e) }
  }
  answerDialogVisible.value = true
}

async function handleAnswerSubmit() {
  if (!answerForm.questionId) { ElMessage.warning('请选择问题'); return }
  if (!answerForm.content.trim()) { ElMessage.warning('请输入回答内容'); return }
  if (!user.value) return
  answerSubmitting.value = true
  try {
    await adminUsers.createUserAnswer(user.value.id, {
      questionId: answerForm.questionId,
      content: answerForm.content,
    })
    ElMessage.success('回答添加成功')
    answerDialogVisible.value = false
    loadUserAnswers()
  } catch (e: any) { ElMessage.error(e.message || '操作失败') }
  finally { answerSubmitting.value = false }
}

// Photo management
async function loadPhotos() {
  if (!user.value) return
  tabLoading.photos = true
  try {
    const res = await adminUsers.getPhotos(user.value.id)
    if (res.success) userPhotos.value = res.data || []
  } catch (e) { console.error(e) }
  finally { tabLoading.photos = false }
}

async function loadChatConversations() {
  if (!user.value) return
  tabLoading.chat = true
  try {
    const res = await adminChat.getUserConversations(user.value.id)
    if (res.success && res.data) {
      chatConversations.value = res.data.list || []
    }
  } catch (e) { console.error(e) }
  finally { tabLoading.chat = false }
}

function openUserChat(conv: any) {
  userChatPeerId.value = conv.userId
  userChatPeerName.value = conv.nickname
  userChatDialogVisible.value = true
  loadUserChatMessages()
}

async function loadUserChatMessages() {
  if (!user.value) return
  userChatMsgLoading.value = true
  userChatMessages.value = []
  try {
    const res = await adminChat.getMessages(user.value.id, userChatPeerId.value)
    if (res.success && res.data) {
      userChatMessages.value = res.data.list || []
    }
  } catch (e) { console.error(e) }
  finally { userChatMsgLoading.value = false }
}

function beforePhotoUpload(file: File) {
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

async function handlePhotoUpload(options: any) {
  if (!user.value) return
  photoUploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', options.file)
    const { adminSystem } = await import('../../api/system')
    const uploadRes = await adminSystem.upload(fd as any)
    if (uploadRes.success && uploadRes.data?.url) {
      const res = await adminUsers.addUserPhoto(user.value.id, uploadRes.data.url)
      if (res.success) {
        ElMessage.success('照片上传成功')
        loadPhotos()
      }
    }
  } catch (e) {
    console.error(e)
    ElMessage.error('上传失败')
  }
  photoUploading.value = false
}

async function handleSetMainPhoto(photoId: number) {
  try {
    const res = await adminUsers.setMainPhoto(photoId)
    if (res.success) {
      ElMessage.success('已设为主图')
      loadPhotos()
    }
  } catch (e) { console.error(e) }
}

async function handleDeletePhoto(photoId: number) {
  try {
    await ElMessageBox.confirm('确定要删除该照片吗？', '删除确认', { type: 'warning' })
    await adminUsers.deletePhoto(photoId)
    ElMessage.success('删除成功')
    loadPhotos()
  } catch (e) { if (e !== 'cancel') console.error(e) }
}

function getReportTypeName(type: string) {
  const map: Record<string, string> = { user: '用户举报', content: '内容举报', photo: '照片举报' }
  return map[type] || type
}
function getReportReasonName(reason: string) {
  const map: Record<string, string> = { harassment: '骚扰', fraud: '诈骗', fake_info: '虚假信息', abuse: '不当内容', other: '其他' }
  return map[reason] || reason
}
function getReportStatusName(status: number) { return { 0: '待处理', 1: '已处理', 2: '已驳回' }[status] || '未知' }
function getReportStatusType(status: number) { return { 0: 'warning', 1: 'success', 2: 'danger' }[status] || 'info' }

function getAnswerStatusName(status: number) { return { 0: '待审核', 1: '已通过', 2: '已拒绝' }[status] || '未知' }
function getAnswerStatusType(status: number) { return { 0: 'warning', 1: 'success', 2: 'danger' }[status] || 'info' }
</script>

<style lang="scss" scoped>
.user-detail { padding: 20px; }
.page-header { margin-bottom: 16px; }
.header-card {
  margin-bottom: 16px;
  .user-header { display: flex; align-items: center; gap: 24px; }
  .header-info {
    flex: 1;
    .user-name { margin: 0 0 12px; font-size: 24px; }
    .user-tags { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; .tag-label { color: #999; font-size: 13px; } }
  }
  .header-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start; }
}
.tab-card {
  .text-content { padding: 16px; min-height: 200px; white-space: pre-wrap; line-height: 1.8; color: #333; }
  .tag-group { padding: 16px; }
  .personality-section { padding: 16px; .tag-category { margin-bottom: 16px; .category-title { font-size: 14px; font-weight: 600; color: #606266; margin: 0 0 8px; } } }
  .photo-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 16px; .photo-item { width: 100%; aspect-ratio: 3/4; border-radius: 8px; cursor: pointer; } .photo-card { position: relative; .photo-actions { display: flex; align-items: center; gap: 6px; justify-content: center; padding-top: 6px; } } }
}
.tab-user-cell { display: flex; align-items: center; gap: 8px; &:hover span { color: #409eff; } }
.link-text { color: #409eff; cursor: pointer; &:hover { text-decoration: underline; } }
.ml-10 { margin-left: 10px; }
.text-muted { color: #909399; font-size: 13px; }
</style>
