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
          <el-image :src="avatarCacheSrc" fit="cover" style="width: 100px; height: 100px; border-radius: 50%" :key="avatarCacheSrc">
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
          <!-- 右侧快捷操作：仅管理员可见（readonly角色不可见） -->
          <div class="header-actions" v-if="isAdmin">
            <el-button :type="(user.isVip && (user.vipLevel || 0) > 0) ? 'warning' : 'primary'" @click="handleSetVip">
              {{ (user.isVip && (user.vipLevel || 0) > 0) ? '取消VIP' : '设为VIP' }}
            </el-button>
            <el-button :type="user.status === 1 ? 'danger' : 'success'" @click="handleToggleStatus">
              {{ user.status === 1 ? '禁用' : '启用' }}
            </el-button>
            <el-button @click="handleSendNotify">发送通知</el-button>
            <el-button v-if="canMonitorChat" type="success" @click="handleViewChat">查看聊天</el-button>
            <el-button @click="handleEditProfile">编辑资料</el-button>
          </div>
        </div>
      </el-card>

      <!-- Tab内容 -->
      <el-card class="tab-card">
        <el-tabs v-model="activeTab" @tab-change="handleTabChange">
          <!-- Tab 1: 基本资料（合并基本资料 + 我的特点 + 择偶要求） -->
          <el-tab-pane label="基本资料" name="basic">
            <!-- 运营标签（顶部昵称下方） -->
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:16px">
              <span style="font-size:13px;color:#909399;flex-shrink:0">运营标签：</span>
              <template v-if="currentUserTags.length > 0">
                <el-tag v-for="tag in currentUserTags" :key="tag" :type="getTagType(tag)" size="small" closable @close="handleRemoveTag(tag)">{{ tag }}</el-tag>
              </template>
              <span v-else style="font-size:13px;color:#c0c4cc">暂无标签</span>
              <el-button type="primary" link size="small" @click="openTagDialog">+ 添加标签</el-button>
            </div>
            <!-- 基本信息 -->
            <h4 class="section-title">基本信息</h4>
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
            <!-- 我的特点 -->
            <h4 class="section-title" style="margin-top:20px">我的特点</h4>
            <div v-if="hasPersonalityTags" class="personality-section">
              <div v-if="characterTags.length > 0" class="tag-category">
                <div class="category-title">性格</div>
                <div class="tag-group-inline">
                  <el-tag v-for="tag in characterTags" :key="tag" size="large" effect="plain" round style="margin:4px">{{ tag }}</el-tag>
                </div>
              </div>
              <div v-if="hobbyTags.length > 0" class="tag-category">
                <div class="category-title">爱好</div>
                <div class="tag-group-inline">
                  <el-tag v-for="tag in hobbyTags" :key="tag" size="large" effect="plain" round style="margin:4px">{{ tag }}</el-tag>
                </div>
              </div>
              <div v-if="loveRuleTags.length > 0" class="tag-category">
                <div class="category-title">恋爱准则</div>
                <div class="tag-group-inline">
                  <el-tag v-for="tag in loveRuleTags" :key="tag" size="large" effect="plain" round style="margin:4px">{{ tag }}</el-tag>
                </div>
              </div>
              <div v-if="!isStructuredPersonality && flatPersonalityTags.length > 0" class="tag-group-inline">
                <el-tag v-for="tag in flatPersonalityTags" :key="tag" size="large" effect="plain" round style="margin:4px">{{ tag }}</el-tag>
              </div>
            </div>
            <div v-else class="text-content text-muted">暂无</div>
            <!-- 择偶要求 -->
            <h4 class="section-title" style="margin-top:20px">择偶要求</h4>
            <el-descriptions v-if="hasMateRequirement" :column="2" border>
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
            <!-- 红娘评价（内容极少时放在基本资料底部） -->
            <h4 class="section-title" style="margin-top:20px">红娘评价</h4>
            <div v-loading="tabLoading.reviews">
              <el-table :data="reviewList" stripe v-if="reviewList.length > 0" row-key="id">
                <el-table-column prop="matchmakerName" label="评价红娘" width="120" />
                <el-table-column prop="content" label="评价内容" min-width="200" show-overflow-tooltip />
                <el-table-column prop="createdAt" label="评价时间" width="170">
                  <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
                </el-table-column>
              </el-table>
              <el-empty v-else description="暂无红娘评价" />
            </div>
            <!-- 操作日志（基本资料 Tab 内展示用户关键行为） -->
            <h4 class="section-title" style="margin-top:20px">操作日志</h4>
            <div v-loading="tabLoading.opLogs">
              <el-table :data="operationLogs" stripe v-if="operationLogs.length > 0">
                <el-table-column prop="createdAt" label="时间" width="170">
                  <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
                </el-table-column>
                <el-table-column label="操作类型" width="120">
                  <template #default="{ row }">
                    <el-tag :type="getOpLogTypeColor(row.actionType)" size="small">{{ getOpLogTypeLabel(row.actionType) }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="content" label="操作内容" min-width="200" show-overflow-tooltip />
                <el-table-column prop="ip" label="IP" width="140" />
              </el-table>
              <div v-else class="text-content text-muted" style="text-align:center;padding:40px 0">暂无操作日志数据</div>
            </div>
            <!-- 运营备注（仅管理员可见） -->
            <template v-if="isAdmin">
            <h4 class="section-title" style="margin-top:20px">运营备注</h4>
            <el-card shadow="never" style="margin-bottom:12px">
              <div style="display:flex;gap:8px;align-items:flex-start">
                <el-input
                  v-model="noteForm.content"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入运营备注..."
                  maxlength="500"
                  show-word-limit
                  style="flex:1"
                />
                <el-button type="primary" @click="handleSaveNote" :loading="noteSaving">保存备注</el-button>
              </div>
            </el-card>
            <!-- 备注历史 -->
            <div v-if="noteHistory.length > 0">
              <div v-for="(note, idx) in noteHistory" :key="idx" style="padding:10px 0;border-bottom:1px solid #f0f0f0">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                  <span style="font-size:12px;color:#909399">{{ note.operator }} · {{ formatDate(note.time) }}</span>
                </div>
                <div style="font-size:14px;color:#333;white-space:pre-wrap;line-height:1.6">{{ note.content }}</div>
              </div>
            </div>
            <div v-else style="text-align:center;color:#c0c4cc;font-size:13px;padding:16px 0">暂无备注记录</div>
            </template>
          </el-tab-pane>

          <!-- Tab 2: 照片/相册（含审核操作） -->
          <el-tab-pane label="照片/相册" name="photos">
            <div v-loading="tabLoading.photos">
              <div style="margin-bottom:12px;display:flex;justify-content:flex-end">
                <el-upload :show-file-list="false" :http-request="handlePhotoUpload" :before-upload="beforePhotoUpload" accept="image/*" multiple>
                  <el-button type="primary" size="small" :loading="photoUploading">上传照片</el-button>
                </el-upload>
              </div>
              <div v-if="userPhotos.length > 0" class="photo-grid">
                <div v-for="photo in userPhotos" :key="photo.id" class="photo-card">
                  <el-image :src="photo.photoUrl" :preview-src-list="userPhotos.map(p => p.photoUrl)" :initial-index="userPhotos.indexOf(photo)" fit="cover" class="photo-item">
                    <template #error><div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f5f5f5;border-radius:8px"><el-icon :size="32"><Picture /></el-icon></div></template>
                  </el-image>
                  <div class="photo-actions">
                    <el-tag v-if="photo.isMain" type="success" size="small">主图</el-tag>
                    <el-button v-else type="primary" link size="small" @click="handleSetMainPhoto(photo.id)">设为主图</el-button>
                    <el-button type="danger" link size="small" @click="handleDeletePhoto(photo.id)">删除</el-button>
                    <!-- 照片审核操作 -->
                    <template v-if="photo.auditStatus === 0">
                      <el-button type="success" link size="small" @click="handleAuditPhoto(photo.id, 'approve')">通过</el-button>
                      <el-button type="danger" link size="small" @click="handleAuditPhoto(photo.id, 'reject')">拒绝</el-button>
                    </template>
                  </div>
                </div>
              </div>
              <el-empty v-else description="暂无照片" />
            </div>
          </el-tab-pane>

          <!-- Tab 3: 聊天记录 -->
          <el-tab-pane label="聊天记录" name="chat">
            <div v-loading="tabLoading.chat">
              <div v-if="chatConversations.length > 0">
                <div v-for="conv in chatConversations" :key="conv.userId" class="chat-conv-item"
                  style="display:flex;align-items:center;padding:12px 0;border-bottom:1px solid #ebeef5;cursor:pointer"
                  @click="openUserChat(conv)">
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

          <!-- Tab 4: 互动记录（合并关注 + 喜欢 + 看过谁） -->
          <el-tab-pane label="互动记录" name="interaction">
            <div v-loading="tabLoading.follow">
              <!-- 喜欢统计卡片 -->
              <div class="like-stats-row">
                <div class="like-stat-card" v-for="item in [
                  { label: '我喜欢的', num: likeData.liked.length },
                  { label: '喜欢我的', num: likeData.likedBy.length },
                  { label: '互相喜欢', num: likeData.mutual.length },
                  { label: '我关注的', num: followData.following.length },
                  { label: '关注我的', num: followData.followers.length },
                ]" :key="item.label">
                  <div class="like-stat-num">{{ item.num }}</div>
                  <div class="like-stat-label">{{ item.label }}</div>
                </div>
              </div>
              <!-- 我喜欢的/喜欢我的/互相喜欢/我关注的/关注我的 使用 el-collapse 折叠面板 -->
              <el-collapse v-model="interactionActivePanels" accordion>
                <el-collapse-item name="liked">
                  <template #title>
                    我喜欢的
                    <!-- 管理员添加喜欢按钮 -->
                    <el-button size="small" type="primary" plain @click.stop="openLikeAddDialog('liked')" style="margin-left:12px">添加</el-button>
                  </template>
                  <div v-if="likeData.liked.length === 0" class="like-empty">暂无记录</div>
                  <div v-for="item in likeData.liked" :key="item.id" class="like-item">
                    <el-image :src="item.avatar" fit="cover" class="like-avatar-img" @click="goToUserDetail(item.targetUserId)">
                      <template #error><div class="like-avatar-fallback"><el-icon :size="22"><User /></el-icon></div></template>
                    </el-image>
                    <div class="like-item-info" @click="goToUserDetail(item.targetUserId)"><div class="like-item-name">{{ item.nickname }}</div></div>
                    <span class="like-item-time" @click="goToUserDetail(item.targetUserId)">{{ formatDate(item.createdAt) }}</span>
                    <!-- 移除喜欢按钮 -->
                    <el-button type="danger" link size="small" @click.stop="handleRemoveLike(item.targetUserId, 'liked')" style="margin-left:8px">移除</el-button>
                  </div>
                </el-collapse-item>
                <el-collapse-item name="likedBy">
                  <template #title>
                    喜欢我的
                    <el-button size="small" type="primary" plain @click.stop="openLikeAddDialog('likedBy')" style="margin-left:12px">添加</el-button>
                  </template>
                  <div v-if="likeData.likedBy.length === 0" class="like-empty">暂无记录</div>
                  <div v-for="item in likeData.likedBy" :key="item.id" class="like-item">
                    <el-image :src="item.avatar" fit="cover" class="like-avatar-img" @click="goToUserDetail(item.targetUserId)">
                      <template #error><div class="like-avatar-fallback"><el-icon :size="22"><User /></el-icon></div></template>
                    </el-image>
                    <div class="like-item-info" @click="goToUserDetail(item.targetUserId)"><div class="like-item-name">{{ item.nickname }}</div></div>
                    <span class="like-item-time" @click="goToUserDetail(item.targetUserId)">{{ formatDate(item.createdAt) }}</span>
                    <el-button type="danger" link size="small" @click.stop="handleRemoveLike(item.targetUserId, 'likedBy')" style="margin-left:8px">移除</el-button>
                  </div>
                </el-collapse-item>
                <el-collapse-item title="互相喜欢" name="mutual">
                  <div v-if="likeData.mutual.length === 0" class="like-empty">暂无记录</div>
                  <div v-for="item in likeData.mutual" :key="item.id" class="like-item">
                    <el-image :src="item.avatar" fit="cover" class="like-avatar-img" @click="goToUserDetail(item.targetUserId)">
                      <template #error><div class="like-avatar-fallback"><el-icon :size="22"><User /></el-icon></div></template>
                    </el-image>
                    <div class="like-item-info" @click="goToUserDetail(item.targetUserId)"><div class="like-item-name">{{ item.nickname }}</div></div>
                    <span class="like-item-time" @click="goToUserDetail(item.targetUserId)">{{ formatDate(item.createdAt) }}</span>
                    <el-button type="danger" link size="small" @click.stop="handleRemoveLike(item.targetUserId, 'mutual')" style="margin-left:8px">移除</el-button>
                  </div>
                </el-collapse-item>
                <el-collapse-item name="following">
                  <template #title>
                    我关注的
                    <el-button size="small" type="primary" plain @click.stop="openFollowAddDialog('following')" style="margin-left:12px">添加</el-button>
                  </template>
                  <div v-if="followData.following.length === 0" class="like-empty">暂无记录</div>
                  <div v-for="f in followData.following" :key="f.id" class="like-item">
                    <el-image :src="f.avatar" fit="cover" class="like-avatar-img" @click="goToUserDetail(f.targetUserId)">
                      <template #error><div class="like-avatar-fallback"><el-icon :size="22"><User /></el-icon></div></template>
                    </el-image>
                    <div class="like-item-info" @click="goToUserDetail(f.targetUserId)"><div class="like-item-name">{{ f.nickname }}</div></div>
                    <span class="like-item-time" @click="goToUserDetail(f.targetUserId)">{{ formatDate(f.createdAt) }}</span>
                    <el-button type="danger" link size="small" @click.stop="handleRemoveFollow(f.targetUserId, 'following')" style="margin-left:8px">取消关注</el-button>
                  </div>
                </el-collapse-item>
                <el-collapse-item name="followers">
                  <template #title>
                    关注我的
                    <el-button size="small" type="primary" plain @click.stop="openFollowAddDialog('followers')" style="margin-left:12px">添加</el-button>
                  </template>
                  <div v-if="followData.followers.length === 0" class="like-empty">暂无记录</div>
                  <div v-for="f in followData.followers" :key="f.id" class="like-item">
                    <el-image :src="f.avatar" fit="cover" class="like-avatar-img" @click="goToUserDetail(f.userId)">
                      <template #error><div class="like-avatar-fallback"><el-icon :size="22"><User /></el-icon></div></template>
                    </el-image>
                    <div class="like-item-info" @click="goToUserDetail(f.userId)"><div class="like-item-name">{{ f.nickname }}</div></div>
                    <span class="like-item-time" @click="goToUserDetail(f.userId)">{{ formatDate(f.createdAt) }}</span>
                    <el-button type="danger" link size="small" @click.stop="handleRemoveFollow(f.userId, 'followers')" style="margin-left:8px">取消关注</el-button>
                  </div>
                </el-collapse-item>
              </el-collapse>
              <!-- 浏览记录 -->
              <h4 style="margin:16px 0 8px">浏览记录</h4>
              <div style="display:flex;gap:24px">
                <div style="flex:1">
                  <div style="font-size:13px;color:#909399;margin-bottom:8px">我看过谁 ({{ viewData.views.length }})</div>
                  <div v-if="viewData.views.length === 0" style="color:#999;font-size:13px">暂无记录</div>
                  <div v-for="v in viewData.views" :key="v.targetUserId" style="display:flex;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f0;cursor:pointer" @click="goToUserDetail(v.targetUserId)">
                    <el-image :src="v.avatar || ''" fit="cover" style="width:40px;height:40px;border-radius:50%;flex-shrink:0">
                      <template #error><div style="width:40px;height:40px;border-radius:50%;background:#f5f5f5;display:flex;align-items:center;justify-content:center"><el-icon :size="20"><User /></el-icon></div></template>
                    </el-image>
                    <span style="margin-left:12px;font-size:14px;flex:1">{{ v.nickname }}</span>
                    <span style="font-size:12px;color:#999">第{{ v.viewCount }}次查看</span>
                  </div>
                </div>
                <div style="flex:1">
                  <div style="font-size:13px;color:#909399;margin-bottom:8px">谁看过我 ({{ viewData.visitors.length }})</div>
                  <div v-if="viewData.visitors.length === 0" style="color:#999;font-size:13px">暂无记录</div>
                  <div v-for="v in viewData.visitors" :key="v.visitorUserId" style="display:flex;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f0;cursor:pointer" @click="goToUserDetail(v.visitorUserId)">
                    <el-image :src="v.avatar || ''" fit="cover" style="width:40px;height:40px;border-radius:50%;flex-shrink:0">
                      <template #error><div style="width:40px;height:40px;border-radius:50%;background:#f5f5f5;display:flex;align-items:center;justify-content:center"><el-icon :size="20"><User /></el-icon></div></template>
                    </el-image>
                    <span style="margin-left:12px;font-size:14px;flex:1">{{ v.nickname }}</span>
                    <span style="font-size:12px;color:#999">看过{{ v.viewCount }}次</span>
                  </div>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <!-- Tab 5: 审核记录（合并资料审核 + 照片审核 + 实名认证状态） -->
          <el-tab-pane label="审核记录" name="audit">
            <div v-loading="tabLoading.audit">
              <!-- 当前审核状态 -->
              <h4 class="section-title">当前审核状态</h4>
              <el-descriptions :column="3" border>
                <el-descriptions-item label="资料审核">
                  <el-tag :type="getAuditTagType(user.profileAuditStatus)" size="small">{{ getAuditStatusLabel(user.profileAuditStatus) }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="照片审核">
                  <el-tag :type="getAuditTagType(user.photoAuditStatus)" size="small">{{ getAuditStatusLabel(user.photoAuditStatus) }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="实名认证">
                  <el-tag v-if="user.isRealName" type="success" size="small">已认证</el-tag>
                  <el-tag v-else type="info" size="small">未认证</el-tag>
                </el-descriptions-item>
              </el-descriptions>
              <!-- 审核历史 -->
              <h4 class="section-title" style="margin-top:20px">审核历史</h4>
              <el-table :data="auditHistoryList" stripe v-if="auditHistoryList.length > 0">
                <el-table-column prop="id" label="审核ID" width="80" />
                <el-table-column label="审核类型" width="100">
                  <template #default="{ row }">{{ getAuditTypeLabel(row.targetType) }}</template>
                </el-table-column>
                <el-table-column prop="action" label="处理结果" width="90">
                  <template #default="{ row }">
                    <el-tag :type="row.action === 'APPROVE' ? 'success' : 'danger'" size="small">{{ row.action === 'APPROVE' ? '通过' : '拒绝' }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="reason" label="原因" min-width="150" show-overflow-tooltip />
                <el-table-column prop="createdAt" label="审核时间" width="170">
                  <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
                </el-table-column>
              </el-table>
              <el-empty v-else description="暂无审核记录" />
            </div>
          </el-tab-pane>

          <!-- Tab 6: 举报/拉黑（合并举报记录 + 拉黑记录） -->
          <el-tab-pane label="举报/拉黑" name="reports">
            <!-- 举报记录 -->
            <h4 class="section-title">举报记录</h4>
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
            <!-- 拉黑记录 -->
            <h4 class="section-title" style="margin-top:20px">拉黑记录</h4>
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

          <!-- Tab 7: 财务记录（用户订单数据，来自后端 /admin/users/:id/orders） -->
          <el-tab-pane label="财务记录" name="finance">
            <div v-loading="tabLoading.finance">
              <!-- 统计卡片：累计消费、订单数、已支付数 -->
              <div v-if="financeDataLoaded" class="like-stats-row" style="margin-bottom:16px">
                <div class="like-stat-card">
                  <div class="like-stat-num">¥{{ financeStats.totalPaid.toFixed(2) }}</div>
                  <div class="like-stat-label">累计消费</div>
                </div>
                <div class="like-stat-card">
                  <div class="like-stat-num">{{ financeStats.orderCount }}</div>
                  <div class="like-stat-label">订单总数</div>
                </div>
                <div class="like-stat-card">
                  <div class="like-stat-num">{{ financeStats.paidCount }}</div>
                  <div class="like-stat-label">已支付</div>
                </div>
              </div>
              <!-- 订单明细表格 -->
              <template v-if="!financeDataLoaded">
                <div class="text-content text-muted" style="text-align:center;padding:60px 0">加载中...</div>
              </template>
              <template v-else>
                <el-empty v-if="financeOrders.length === 0" description="暂无订单记录" />
                <el-table v-else :data="financeOrders" stripe>
                  <el-table-column prop="orderNo" label="订单编号" width="180" />
                  <el-table-column label="VIP等级" width="90">
                    <template #default="{ row }">
                      <el-tag v-if="row.vipLevel > 0" type="warning" size="small">{{ ['','普通','黄金','钻石','至尊'][row.vipLevel] || 'VIP' }}</el-tag>
                      <span v-else>-</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="amount" label="金额" width="100">
                    <template #default="{ row }">¥{{ (row.amount || 0).toFixed(2) }}</template>
                  </el-table-column>
                  <el-table-column prop="payType" label="支付方式" width="90">
                    <template #default="{ row }">{{ row.payType || '-' }}</template>
                  </el-table-column>
                  <el-table-column prop="status" label="状态" width="90">
                    <template #default="{ row }">
                      <el-tag :type="orderStatusType(row.status)" size="small">{{ orderStatusLabel(row.status) }}</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="createdAt" label="创建时间" width="170">
                    <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
                  </el-table-column>
                  <el-table-column prop="paidAt" label="支付时间" width="170">
                    <template #default="{ row }">{{ formatDate(row.paidAt) || '-' }}</template>
                  </el-table-column>
                  <el-table-column prop="expireTime" label="VIP到期" width="170">
                    <template #default="{ row }">{{ formatDate(row.expireTime) || '-' }}</template>
                  </el-table-column>
                </el-table>
              </template>
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

    <!-- 编辑资料弹窗：三栏分区 Tab 布局，避免单屏内容过长 -->
    <el-dialog v-model="editDialogVisible" title="编辑用户资料" width="720px" destroy-on-close>
      <el-tabs v-model="editActiveTab" type="border-card">
        <el-tab-pane label="基本信息" name="basic">
          <el-form :model="editForm" label-width="90px" size="default">
            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="昵称"><el-input v-model="editForm.nickname" placeholder="用户昵称" /></el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="手机号"><el-input v-model="editForm.phone" placeholder="手机号" /></el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="密码"><el-input v-model="editForm.password" type="password" placeholder="留空则不修改" show-password /></el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="性别">
                  <el-radio-group v-model="editForm.gender">
                    <el-radio :value="1">男</el-radio>
                    <el-radio :value="2">女</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="12">
              <el-col :span="8">
                <el-form-item label="出生年份"><el-input-number v-model="editForm.birthYear" :min="1950" :max="2010" controls-position="right" style="width:100%" /></el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="身高(cm)"><el-input-number v-model="editForm.height" :min="100" :max="250" controls-position="right" style="width:100%" /></el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="体重(kg)"><el-input-number v-model="editForm.weight" :min="30" :max="200" controls-position="right" style="width:100%" /></el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="学历">
                  <el-select v-model="editForm.education" placeholder="请选择" style="width:100%">
                    <el-option v-for="o in EDU_OPTIONS" :key="o" :label="o" :value="o" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="职业"><el-input v-model="editForm.occupation" /></el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="月收入">
                  <el-select v-model="editForm.incomeRange" placeholder="请选择" style="width:100%">
                    <el-option v-for="o in INCOME_OPTIONS" :key="o" :label="o" :value="o" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="住房">
                  <el-select v-model="editForm.housingStatus" placeholder="请选择" style="width:100%">
                    <el-option v-for="o in HOUSING_OPTIONS" :key="o" :label="o" :value="o" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="车辆">
                  <el-select v-model="editForm.carStatus" placeholder="请选择" style="width:100%">
                    <el-option v-for="o in CAR_OPTIONS" :key="o" :label="o" :value="o" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="12">
              <el-col :span="8">
                <el-form-item label="婚况">
                  <el-select v-model="editForm.maritalStatus" placeholder="请选择" style="width:100%">
                    <el-option v-for="o in MARITAL_OPTIONS" :key="o" :label="o" :value="o" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="独生子女"><el-input v-model="editForm.onlyChild" /></el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="何时结婚"><el-input v-model="editForm.whenMarry" /></el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="12">
              <el-col :span="8"><el-form-item label="属相"><el-input v-model="editForm.zodiac" /></el-form-item></el-col>
              <el-col :span="8"><el-form-item label="星座"><el-input v-model="editForm.constellation" /></el-form-item></el-col>
              <el-col :span="8" />
            </el-row>
            <el-row :gutter="12">
              <el-col :span="12"><el-form-item label="家乡"><el-input v-model="editForm.hometown" placeholder="如 北京-东城" /></el-form-item></el-col>
              <el-col :span="12"><el-form-item label="居住地"><el-input v-model="editForm.residence" placeholder="如 上海-浦东" /></el-form-item></el-col>
            </el-row>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="个性 &amp; 择偶" name="personality">
          <el-form :model="editForm" label-width="100px" size="default">
            <el-form-item label="性格标签">
              <el-input v-model="editForm.personalityTags" placeholder="多个标签用逗号分隔，如：开朗,幽默,细心" />
            </el-form-item>
            <el-form-item label="希望 TA">
              <el-input v-model="editForm.hopeTaTags" placeholder="多个标签用逗号分隔，如：温柔,善良,有责任心" />
            </el-form-item>
            <el-divider content-position="left">择偶要求</el-divider>
            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="年龄范围"><el-input v-model="editForm.partnerAgeRange" placeholder="如 25-35" /></el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="最低身高"><el-input v-model="editForm.partnerHeightMin" placeholder="如 170" /></el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="最低学历">
                  <el-select v-model="editForm.partnerEducation" placeholder="请选择" style="width:100%">
                    <el-option v-for="o in EDU_OPTIONS" :key="o" :label="o" :value="o" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="收入要求">
                  <el-select v-model="editForm.partnerIncome" placeholder="请选择" style="width:100%">
                    <el-option v-for="o in INCOME_OPTIONS" :key="o" :label="o" :value="o" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="12">
              <el-col :span="8">
                <el-form-item label="住房要求"><el-input v-model="editForm.housingRequirement" placeholder="如 已购房" /></el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="婚况要求">
                  <el-select v-model="editForm.partnerMaritalStatus" placeholder="请选择" style="width:100%">
                    <el-option v-for="o in MARITAL_OPTIONS" :key="o" :label="o" :value="o" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="接受小孩"><el-input v-model="editForm.acceptChildren" /></el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="账户状态" name="account">
          <el-form :model="editForm" label-width="100px" size="default">
            <el-form-item label="账号状态">
              <el-radio-group v-model="editForm.status">
                <el-radio :value="1">正常</el-radio>
                <el-radio :value="0">禁用</el-radio>
                <el-radio :value="2">待审核</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="实名认证">
              <el-radio-group v-model="editForm.isRealName">
                <el-radio :value="1">已实名</el-radio>
                <el-radio :value="0">未实名</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="editSaving" @click="handleEditSave">保存</el-button>
      </template>
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

    <!-- 标签管理弹窗 -->
    <el-dialog v-model="tagDialogVisible" title="标签管理" width="580px" destroy-on-close>
      <!-- 自定义标签输入 -->
      <el-form label-width="90px">
        <el-form-item label="自定义标签">
          <div style="display:flex;gap:8px;width:100%">
            <el-input v-model="tagInputValue" placeholder="输入标签名，回车添加" @keyup.enter="handleTagInputConfirm" style="flex:1" />
            <el-button @click="handleTagInputConfirm">添加</el-button>
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
            @click="handleAddPresetTag(pt.label)"
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
        <el-button type="primary" @click="handleSaveTags">保存标签</el-button>
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

    <!-- 添加喜欢对话框 -->
    <el-dialog v-model="likeAddDialogVisible" title="添加喜欢" width="450px" @opened="handleLikeDialogOpened">
      <el-form label-width="80px">
        <el-form-item label="选择用户">
          <el-select
            v-model="likeSelectedUserId"
            placeholder="请选择用户"
            filterable
            :loading="searchUserLoading"
            style="width:100%"
          >
            <el-option
              v-for="u in searchUserOptions"
              :key="u.id"
              :label="u.nickname"
              :value="u.id"
            />
          </el-select>
        </el-form-item>
        <div style="font-size:12px;color:#909399">
          将 {{ likeAddType === 'liked' ? '当前用户' : '所选用户' }} 的喜欢关系添加到 {{ likeAddType === 'liked' ? '所选用户' : '当前用户' }}
        </div>
      </el-form>
      <template #footer>
        <el-button @click="likeAddDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAddLikeSubmit" :disabled="!likeSelectedUserId">确认添加</el-button>
      </template>
    </el-dialog>

    <!-- 添加关注对话框 -->
    <el-dialog v-model="followAddDialogVisible" title="添加关注" width="450px" @opened="handleFollowDialogOpened">
      <el-form label-width="80px">
        <el-form-item label="选择用户">
          <el-select
            v-model="followSelectedUserId"
            placeholder="请选择用户"
            filterable
            :loading="followSearchUserLoading"
            style="width:100%"
          >
            <el-option
              v-for="u in followSearchUserOptions"
              :key="u.id"
              :label="u.nickname"
              :value="u.id"
            />
          </el-select>
        </el-form-item>
        <div style="font-size:12px;color:#909399">
          {{
            followAddType === 'following'
              ? '所选用户将被添加到当前用户的关注列表'
              : '所选用户将关注当前用户（添加到关注我的列表）'
          }}
        </div>
      </el-form>
      <template #footer>
        <el-button @click="followAddDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAddFollowSubmit" :disabled="!followSelectedUserId">确认添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, User, Picture } from '@element-plus/icons-vue'
import { adminUsers } from '../../api'
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
  profileAuditStatus?: number  // 资料审核状态: 0-待审核 1-通过 2-拒绝
  photoAuditStatus?: number    // 照片审核状态: 0-待审核 1-通过 2-拒绝
}

const route = useRoute()
const router = useRouter()
const adminStore = useAdminStore()
// isReadonly: 只读角色，无任何编辑/禁用/VIP等操作权限
const isReadonly = computed(() => adminStore.userInfo?.role === 'readonly')
// isAdmin: 非只读即为可操作管理员（super_admin / operator 均可操作）
const isAdmin = computed(() => !isReadonly.value && (adminStore.userInfo?.role === 'super_admin' || adminStore.userInfo?.role === 'operator'))
const canMonitorChat = computed(() => {
  const role = adminStore.userInfo?.role
  return role === 'super_admin' || role === 'operator'
})

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
const editActiveTab = ref('basic') // 编辑资料弹窗 Tab active

const vipDialogVisible = ref(false)
const notifyDialogVisible = ref(false)
const vipForm = reactive({ level: 0, days: 30 })
const notifyForm = reactive({ title: '', content: '' })

// 编辑资料弹窗
const editDialogVisible = ref(false)
const editSaving = ref(false)
const editForm = reactive({
  nickname: '', phone: '', password: '', gender: 0, birthYear: undefined as number | undefined,
  height: undefined as number | undefined, weight: undefined as number | undefined,
  education: '', occupation: '', incomeRange: '', housingStatus: '', carStatus: '',
  maritalStatus: '', onlyChild: '', whenMarry: '', zodiac: '', constellation: '',
  hometown: '', residence: '',
  personalityTags: '' as string, hopeTaTags: '' as string,
  partnerAgeRange: '', partnerHeightMin: '', partnerEducation: '', partnerIncome: '',
  housingRequirement: '', partnerMaritalStatus: '', acceptChildren: '',
  status: 1, isRealName: 0,
})

// 编辑资料下拉选项常量（与列表页保持一致）
const EDU_OPTIONS = ['初中', '高中', '中专', '大专', '本科', '硕士', '博士']
const INCOME_OPTIONS = ['3千以下', '3-5千', '5-8千', '8千-1万', '1-2万', '2-5万', '5万以上']
const HOUSING_OPTIONS = ['已购房', '未购房', '和父母同住']
const CAR_OPTIONS = ['已购车', '未购车']
const MARITAL_OPTIONS = ['未婚', '离异', '丧偶']

// Tab data
const tabLoading = reactive({ reports: false, blocks: false, notifications: false, answers: false, reviews: false, photos: false, chat: false, follow: false, likes: false, audit: false, finance: false, opLogs: false })
const reportList = ref<any[]>([])
const blockList = ref<any[]>([])
const notificationList = ref<any[]>([])
const userAnswerList = ref<any[]>([])
const answerAuditing = reactive<Record<number, boolean>>({})
const reviewList = ref<any[]>([])
const followData = reactive({ following: [] as any[], followers: [] as any[] })
const likeData = reactive({ liked: [] as any[], likedBy: [] as any[], mutual: [] as any[] })
const likeAddDialogVisible = ref(false)
const likeAddType = ref<'liked' | 'likedBy'>('liked')
const likeSelectedUserId = ref<number | null>(null)
const searchUserOptions = ref<any[]>([])
const searchUserLoading = ref(false)
const followAddDialogVisible = ref(false)
const followAddType = ref<'following' | 'followers'>('following')
const followSelectedUserId = ref<number | null>(null)
const followSearchUserOptions = ref<any[]>([])
const followSearchUserLoading = ref(false)
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

// 互动记录折叠面板 active
const interactionActivePanels = ref('')

// 审核记录
const auditHistoryList = ref<any[]>([])

// 财务记录
const financeDataLoaded = ref(false)
const financeOrders = ref<any[]>([])
const financeStats = reactive({ totalPaid: 0, orderCount: 0, paidCount: 0 })

// ===== 标签管理 =====
// 系统预设标签库（前端硬编码，管理员可输入自定义标签）
const presetTags: { label: string; type: 'danger' | 'warning' | 'success' | '' | 'primary' | 'info' }[] = [
  { label: '高付费意向', type: 'danger' },
  { label: '需跟进', type: 'warning' },
  { label: '资料优质', type: 'success' },
  { label: '照片清晰', type: '' },       // 蓝色 (Element Plus default type)
  { label: '主动活跃', type: 'primary' },  // 紫色在 Element Plus 中用 primary
  { label: '疑似违规', type: 'info' },     // 灰色
  { label: '红娘推荐', type: 'danger' },   // 粉色用 danger 替代
]
// 当前用户标签（从后端 tags 字段初始化，或本地维护）
const currentUserTags = ref<string[]>([])
const tagDialogVisible = ref(false)
const tagInputValue = ref('')
const tagDraftSelected = ref<string[]>([])
// 过滤掉已选中的预设标签
const filteredPresetTags = computed(() =>
  presetTags.filter(pt => !tagDraftSelected.value.includes(pt.label))
)

// ===== 运营备注 =====
const noteForm = reactive({ content: '' })
const noteSaving = ref(false)
const noteHistory = ref<{ operator: string; time: string; content: string }[]>([])

// ===== 操作日志 =====
const operationLogs = ref<any[]>([])

const tabDataLoaded: Record<string, boolean> = {}

onMounted(() => { fetchDetail() })

// 监听路由参数变化（同页面不同用户跳转时重新加载）
watch(() => route.params.id, async (newId) => {
  if (newId) {
    // 重置 Tab 到首页 + 清除缓存数据
    activeTab.value = 'basic'
    Object.keys(tabDataLoaded).forEach(k => delete tabDataLoaded[k])
    // 清除关注/浏览列表旧数据
    followData.following = []
    followData.followers = []
    likeData.liked = []
    likeData.likedBy = []
    likeData.mutual = []
    searchUserOptions.value = []
    viewData.views = []
    viewData.visitors = []
    // 清除标签/备注/日志旧数据
    currentUserTags.value = []
    noteForm.content = ''
    noteHistory.value = []
    operationLogs.value = []
    // 清除财务记录旧数据，避免切换用户时短暂显示上一用户数据
    financeDataLoaded.value = false
    financeOrders.value = []
    financeStats.totalPaid = 0
    financeStats.orderCount = 0
    financeStats.paidCount = 0
    await nextTick()
    fetchDetail()
  }
})

// 头像 URL 加版本参数避免浏览器缓存旧图
const avatarCacheSrc = computed(() => {
  const url = user.value?.avatar
  if (!url) return ''
  const sep = url.includes('?') ? '&' : '?'
  return url + sep + 't=' + (user.value?.updatedAt || Date.now())
})

async function fetchDetail() {
  loading.value = true
  try {
    const id = Number(route.params.id)
    const res = await adminUsers.detail(id)
    if (res.success && res.data) {
      user.value = res.data as UserDetail
      // 初始化运营标签：优先从后端 tags 字段读取
      currentUserTags.value = (user.value.tags && user.value.tags.length > 0) ? [...user.value.tags] : []
      // 初始化备注历史：如果后端已返回 adminRemark，追加到历史记录第一条
      if (user.value.adminRemark && !noteHistory.value.some(n => n.content === user.value!.adminRemark)) {
        noteHistory.value.unshift({
          operator: '系统',
          time: user.value.updatedAt || user.value.createdAt || new Date().toISOString(),
          content: user.value.adminRemark,
        })
      }
    }
  } finally { loading.value = false }
}

function handleTabChange(tabName: string) {
  if (tabDataLoaded[tabName]) return
  tabDataLoaded[tabName] = true
  switch (tabName) {
    case 'reports': loadReports(); loadBlocks(); break  // 举报/拉黑合并到一个 Tab 加载
    case 'photos': loadPhotos(); break
    case 'chat': loadChatConversations(); break
    case 'interaction': loadInteractionData(); break  // 互动记录：合并关注 + 喜欢 + 浏览
    case 'audit': loadAuditHistory(); break  // 审核记录：合并资料审核 + 照片审核
    case 'finance': loadFinanceData(); break  // 财务记录：从后端 /admin/users/:id/orders 加载
    case 'basic': loadReviews(); loadOpLogs(); break  // 基本资料内加载红娘评价 + 操作日志
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

async function loadFollowDetail() {
  if (!user.value) return
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
}

/** 互动记录：一次加载关注 + 喜欢 + 浏览数据 */
async function loadInteractionData() {
  if (!user.value) return
  tabLoading.follow = true
  tabLoading.likes = true
  try {
    await Promise.all([
      loadFollowDetail(),
      loadLikesDetail(),
    ])
  } finally {
    tabLoading.follow = false
    tabLoading.likes = false
  }
}

/** 财务记录：调用后端接口获取用户订单数据 */
async function loadFinanceData() {
  if (!user.value) return
  tabLoading.finance = true
  try {
    const res = await adminUsers.getUserOrders(user.value.id)
    if (res.success && res.data) {
      financeOrders.value = res.data.list || []
      if (res.data.stats) {
        financeStats.totalPaid = res.data.stats.totalPaid || 0
        financeStats.orderCount = res.data.stats.orderCount || 0
        financeStats.paidCount = res.data.stats.paidCount || 0
      }
      financeDataLoaded.value = true
    } else {
      financeOrders.value = []
      financeDataLoaded.value = true
    }
  } catch (e) {
    console.error('财务记录加载失败:', e)
    financeOrders.value = []
    financeDataLoaded.value = true // 接口异常也不阻塞页面
  }
  finally { tabLoading.finance = false }
}

async function loadLikesDetail() {
  if (!user.value) return
  try {
    const [likedRes, likedByRes, mutualRes] = await Promise.all([
      adminUsers.getAdminLikes(user.value.id, 'liked'),
      adminUsers.getAdminLikes(user.value.id, 'likedBy'),
      adminUsers.getAdminLikes(user.value.id, 'mutual'),
    ])
    if (likedRes.success) likeData.liked = likedRes.data?.list || []
    if (likedByRes.success) likeData.likedBy = likedByRes.data?.list || []
    if (mutualRes.success) likeData.mutual = mutualRes.data?.list || []
  } catch (e) { console.error(e) }
}

async function loadLikeUserOptions() {
  if (searchUserOptions.value.length > 0) return
  searchUserLoading.value = true
  try {
    const res = await adminUsers.list({ page: 1, limit: 200 })
    if (res.success && res.data) {
      const curId = user.value?.id
      searchUserOptions.value = res.data.list
        .filter((u: any) => u.id !== curId)
        .map((u: any) => ({
          id: u.id,
          nickname: u.nickname,
          avatar: u.avatar,
        }))
    }
  } catch { searchUserOptions.value = [] }
  finally { searchUserLoading.value = false }
}

/** 打开添加喜欢对话框 */
function openLikeAddDialog(type: 'liked' | 'likedBy') {
  likeAddType.value = type
  likeSelectedUserId.value = null
  searchUserOptions.value = []
  likeAddDialogVisible.value = true
}

/** 打开添加关注对话框 */
function openFollowAddDialog(type: 'following' | 'followers') {
  followAddType.value = type
  followSelectedUserId.value = null
  followSearchUserOptions.value = []
  followAddDialogVisible.value = true
}

async function handleLikeDialogOpened() {
  // 每次打开弹窗强制重新加载，过滤掉当前用户避免自己选自己
  searchUserLoading.value = true
  try {
    const res = await adminUsers.list({ page: 1, limit: 200 })
    if (res.success && res.data) {
      const curId = user.value?.id
      searchUserOptions.value = res.data.list
        .filter((u: any) => u.id !== curId)
        .map((u: any) => ({
          id: u.id,
          nickname: u.nickname,
          avatar: u.avatar,
        }))
    }
  } catch { searchUserOptions.value = [] }
  finally { searchUserLoading.value = false }
}

async function handleFollowDialogOpened() {
  followSearchUserLoading.value = true
  try {
    const res = await adminUsers.list({ page: 1, limit: 200 })
    if (res.success && res.data) {
      const curId = user.value?.id
      followSearchUserOptions.value = res.data.list
        .filter((u: any) => u.id !== curId)
        .map((u: any) => ({
          id: u.id,
          nickname: u.nickname,
          avatar: u.avatar,
        }))
    }
  } catch { followSearchUserOptions.value = [] }
  finally { followSearchUserLoading.value = false }
}

async function handleAddFollowSubmit() {
  if (!user.value || !followSelectedUserId.value) return
  try {
    let res
    if (followAddType.value === 'following') {
      // 当前用户关注 selectedUser
      res = await adminUsers.addFollow(user.value.id, { targetUserId: followSelectedUserId.value })
    } else {
      // selectedUser 关注当前用户
      res = await adminUsers.addFollower(user.value.id, { followerUserId: followSelectedUserId.value })
    }
    if (res.success) {
      ElMessage.success('添加关注成功')
      followAddDialogVisible.value = false
      followSelectedUserId.value = null
      followSearchUserOptions.value = []
      loadFollowDetail()
    } else {
      ElMessage.error(res.message || '添加失败')
    }
  } catch (e: any) { ElMessage.error(e.message || '添加失败') }
}

async function handleRemoveFollow(targetUserId: number, tab: 'following' | 'followers') {
  if (!user.value) return
  try {
    await ElMessageBox.confirm('确定要取消该关注关系吗？', '删除确认', { type: 'warning' })
    const res = tab === 'following'
      ? await adminUsers.removeFollow(user.value.id, targetUserId)
      : await adminUsers.removeFollower(user.value.id, targetUserId)
    if (res.success) {
      ElMessage.success('已取消关注')
      loadFollowDetail()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (e) { if (e !== 'cancel') console.error(e) }
}

async function handleAddLikeSubmit() {
  if (!user.value || !likeSelectedUserId.value) return
  try {
    let res
    if (likeAddType.value === 'liked') {
      res = await adminUsers.addAdminLike(user.value.id, { targetUserId: likeSelectedUserId.value })
    } else {
      // likedBy: 让 selectedUser 喜欢当前用户
      res = await adminUsers.addAdminLike(likeSelectedUserId.value, { targetUserId: user.value.id })
    }
    if (res.success) {
      ElMessage.success('添加喜欢成功')
      likeAddDialogVisible.value = false
      likeSelectedUserId.value = null
      searchUserOptions.value = []
      loadLikesDetail()
    } else {
      ElMessage.error(res.message || '添加失败')
    }
  } catch (e: any) { ElMessage.error(e.message || '添加失败') }
}

async function handleRemoveLike(targetUserId: number, tab: 'liked' | 'likedBy' | 'mutual') {
  if (!user.value) return
  try {
    await ElMessageBox.confirm('确定要取消该喜欢关系吗？', '删除确认', { type: 'warning' })
    // liked: Follow 记录是 当前用户→targetUserId，直接删除
    // likedBy / mutual: Follow 记录是 targetUserId→当前用户，需要反转参数
    const [delUserId, delTargetId] = tab === 'liked'
      ? [user.value.id, targetUserId]
      : [targetUserId, user.value.id]
    const res = await adminUsers.removeAdminLike(delUserId, delTargetId)
    if (res.success) {
      ElMessage.success('已取消喜欢')
      loadLikesDetail()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (e) { if (e !== 'cancel') console.error(e) }
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
  // 已是VIP则取消VIP
  if (user.value.isVip && (user.value.vipLevel || 0) > 0) {
    ElMessageBox.confirm(`确定取消「${user.value.nickname}」的VIP身份？`, '取消VIP', { type: 'warning' })
      .then(async () => {
        const res = await adminUsers.updateVip(user.value!.id, { level: 0, days: 0 } as any)
        if (res.success) { ElMessage.success('已取消VIP'); fetchDetail() }
        else ElMessage.error(res.message || '操作失败')
      }).catch(() => {})
    return
  }
  vipForm.level = user.value.vipLevel || 0; vipForm.days = 30; vipDialogVisible.value = true
}

/** 编辑资料：在当前页打开编辑弹窗，从 user.value 初始化表单 */
function handleEditProfile() {
  if (!user.value) return
  const u = user.value
  editForm.nickname = u.nickname || ''
  editForm.phone = u.phone || ''
  editForm.password = ''
  editForm.gender = u.gender || 0
  editForm.birthYear = u.birthYear
  editForm.height = u.height
  editForm.weight = u.weight
  editForm.education = u.education || ''
  editForm.occupation = u.occupation || ''
  editForm.incomeRange = u.incomeRange || ''
  editForm.housingStatus = u.housingStatus || ''
  editForm.carStatus = u.carStatus || ''
  editForm.maritalStatus = u.maritalStatus || ''
  editForm.onlyChild = u.onlyChild || ''
  editForm.whenMarry = u.whenMarry || ''
  editForm.zodiac = u.zodiac || ''
  editForm.constellation = u.constellation || ''
  editForm.hometown = u.hometown || ''
  editForm.residence = u.residence || ''
  editForm.personalityTags = Array.isArray(u.personalityTags) ? u.personalityTags.join(',') : (u.personalityTags || '')
  editForm.hopeTaTags = Array.isArray(u.hopeTaTags) ? u.hopeTaTags.join(',') : (u.hopeTaTags || '')
  editForm.partnerAgeRange = u.partnerAgeRange || ''
  editForm.partnerHeightMin = u.partnerHeightMin || ''
  editForm.partnerEducation = u.partnerEducation || ''
  editForm.partnerIncome = u.partnerIncome || ''
  editForm.housingRequirement = (u as any).housingRequirement || ''
  editForm.partnerMaritalStatus = u.partnerMaritalStatus || ''
  editForm.acceptChildren = u.acceptChildren || ''
  editForm.status = u.status ?? 1
  editForm.isRealName = (u as any).isRealName || 0
  editDialogVisible.value = true
}

/** 提交编辑资料 */
async function handleEditSave() {
  if (!user.value) return
  editSaving.value = true
  try {
    const data: Record<string, unknown> = {
      nickname: editForm.nickname, phone: editForm.phone,
      gender: editForm.gender, birthYear: editForm.birthYear,
      height: editForm.height, weight: editForm.weight,
      education: editForm.education, occupation: editForm.occupation,
      incomeRange: editForm.incomeRange, housingStatus: editForm.housingStatus,
      carStatus: editForm.carStatus, maritalStatus: editForm.maritalStatus,
      onlyChild: editForm.onlyChild, whenMarry: editForm.whenMarry,
      zodiac: editForm.zodiac, constellation: editForm.constellation,
      hometown: editForm.hometown, residence: editForm.residence,
      personalityTags: editForm.personalityTags.split(',').map(s => s.trim()).filter(Boolean),
      hopeTaTags: editForm.hopeTaTags.split(',').map(s => s.trim()).filter(Boolean),
      partnerAgeRange: editForm.partnerAgeRange, partnerHeightMin: editForm.partnerHeightMin,
      partnerEducation: editForm.partnerEducation, partnerIncome: editForm.partnerIncome,
      housingRequirement: editForm.housingRequirement,
      partnerMaritalStatus: editForm.partnerMaritalStatus, acceptChildren: editForm.acceptChildren,
      status: editForm.status, isRealName: editForm.isRealName,
    }
    // 仅当密码非空时才传入
    if (editForm.password) data.password = editForm.password
    const res = await adminUsers.update(user.value.id, data as any)
    if (res.success) {
      ElMessage.success('保存成功')
      editDialogVisible.value = false
      fetchDetail()
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (e: any) { ElMessage.error(e.message || '保存失败') }
  finally { editSaving.value = false }
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

function handleViewChat() {
  if (!user.value) return
  router.push(`/chat/monitor?userId=${user.value.id}&nickname=${encodeURIComponent(user.value.nickname)}`)
}

async function handleNotifySubmit() {
  if (!notifyForm.content.trim()) { ElMessage.warning('请输入通知内容'); return }
  if (!user.value) return
  try {
    await adminUsers.sendUserNotification(user.value.id, { title: notifyForm.title || '系统通知', content: notifyForm.content })
    ElMessage.success('通知已发送')
    notifyDialogVisible.value = false
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

// ===== 审核记录辅助函数 =====
function getAuditStatusLabel(status?: number) { return { 0: '待审核', 1: '已通过', 2: '已拒绝' }[status ?? 0] || '未知' }
function getAuditTagType(status?: number) { return { 0: 'warning', 1: 'success', 2: 'danger' }[status ?? 0] || 'info' }
function getAuditTypeLabel(targetType: string) {
  const map: Record<string, string> = { profile: '资料审核', photo: '照片审核', realName: '实名认证' }
  return map[targetType] || targetType
}

// ===== 财务记录辅助函数 =====
/** 订单状态文字映射: 0=待支付 1=已支付 2=已退款 3=已取消 */
function orderStatusLabel(status: number) {
  return { 0: '待支付', 1: '已支付', 2: '已退款', 3: '已取消' }[status] || '未知'
}
function orderStatusType(status: number) {
  return { 0: 'info', 1: 'success', 2: 'danger', 3: 'info' }[status] || 'info'
}

async function loadAuditHistory() {
  if (!user.value) return
  tabLoading.audit = true
  try {
    // 审核记录：查询资料审核 + 照片审核的历史记录，仅限当前用户
    // TODO: 后端接口增加 userId 过滤参数，当前先传 userId 并用前端过滤兜底
    const { adminAudit } = await import('../../api/audit')
    const uid = user.value.id
    const [profileRes, photoRes] = await Promise.all([
      adminAudit.list({ type: 'user', userId: uid, limit: 50 } as any),
      adminAudit.list({ type: 'photo', userId: uid, limit: 50 } as any),
    ])
    const items: any[] = []
    if (profileRes.success && profileRes.data) {
      // 资料审核：targetId 即为 userId，前端过滤确保只展示当前用户记录
      const filtered = (profileRes.data.list || []).filter((item: any) => item.userId === uid || item.targetId === uid)
      items.push(...filtered)
    }
    if (photoRes.success && photoRes.data) {
      // 照片审核：按 submitterId 或 targetId 过滤当前用户的照片审核记录
      const filtered = (photoRes.data.list || []).filter((item: any) => item.userId === uid || item.submitterId === uid || item.targetId === uid)
      items.push(...filtered)
    }
    auditHistoryList.value = items
  } catch (e) { console.error(e) }
  finally { tabLoading.audit = false }
}

/** 照片审核操作：通过或拒绝，拒绝时弹窗选择原因 */
async function handleAuditPhoto(photoId: number, action: 'approve' | 'reject') {
  const { adminAudit } = await import('../../api/audit')
  try {
    // 精确查询该照片的待审核记录：优先使用 targetId + status + limit:1 避免全量扫描
    // TODO: 后端接口增加 targetId 精确查询参数，当前先传 targetId 并用前端 find 兜底
    const listRes = await adminAudit.list({ type: 'photo', targetId: photoId, status: 0, limit: 1 } as any)
    const auditItems = (listRes.success && listRes.data) ? (listRes.data as any).list || [] : []
    const auditItem = auditItems.find((a: any) => a.targetId === photoId)
    if (!auditItem) { ElMessage.warning('未找到该照片的待审核记录'); return }
    if (action === 'approve') {
      await adminAudit.approve(auditItem.id)
      ElMessage.success('照片已通过')
    } else {
      const { value: reason } = await ElMessageBox.prompt('请选择或输入拒绝原因', '拒绝照片', {
        type: 'warning',
        inputType: 'textarea',
        inputPlaceholder: '非本人 / 不清晰 / 含联系方式 / 违规 / 其他',
        confirmButtonText: '确定',
        cancelButtonText: '取消',
      })
      // 拒绝原因非空校验：运营人员必须输入原因才能提交
      if (!reason || !reason.trim()) { ElMessage.warning('请输入拒绝原因'); return }
      await adminAudit.reject(auditItem.id, reason)
      ElMessage.success('照片已拒绝')
    }
    loadPhotos()
  } catch (e) {
    if (e !== 'cancel') { console.error(e); ElMessage.error('操作失败') }
  }
}

function getAnswerStatusName(status: number) { return { 0: '待审核', 1: '已通过', 2: '已拒绝' }[status] || '未知' }
function getAnswerStatusType(status: number) { return { 0: 'warning', 1: 'success', 2: 'danger' }[status] || 'info' }

// ===== 标签管理函数 =====

/** 根据标签名返回 Element Plus el-tag 的 type */
function getTagType(tag: string): '' | 'success' | 'warning' | 'danger' | 'info' | 'primary' {
  const found = presetTags.find(pt => pt.label === tag)
  // 使用 ?? 保留空字符串（如"照片清晰"的空 type 表示蓝色），|| 会误将 '' 判为 falsy
  return found ? found.type ?? 'info' : 'info'
}

/** 打开标签管理弹窗，初始化草稿为当前标签 */
function openTagDialog() {
  tagDraftSelected.value = [...currentUserTags.value]
  tagInputValue.value = ''
  tagDialogVisible.value = true
}

/** 自定义标签输入确认（回车或点击） */
function handleTagInputConfirm() {
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
function handleAddPresetTag(label: string) {
  if (tagDraftSelected.value.includes(label)) {
    ElMessage.warning('该标签已存在')
    return
  }
  tagDraftSelected.value.push(label)
}

/** 移除标签（从展示区直接删除） */
function handleRemoveTag(tag: string) {
  currentUserTags.value = currentUserTags.value.filter(t => t !== tag)
}

/** 保存标签：优先调用后端 API，失败则降级为本地保存 */
async function handleSaveTags() {
  currentUserTags.value = [...tagDraftSelected.value]
  tagDialogVisible.value = false
  try {
    // 尝试调用后端标签接口持久化保存
    if (user.value) {
      await (adminUsers as any).updateTags(user.value.id, currentUserTags.value)
    }
    ElMessage.success('标签已保存到服务器')
  } catch {
    // 后端标签接口不存在，降级为本地保存（刷新后丢失）
    ElMessage.warning('标签已本地保存，刷新后可能丢失，请确认后端已提供标签保存接口')
  }
}

// ===== 运营备注函数 =====

/** 保存运营备注：优先调用后端 API，失败则降级为本地保存 */
async function handleSaveNote() {
  const content = noteForm.content.trim()
  if (!content) { ElMessage.warning('请输入备注内容'); return }
  noteSaving.value = true
  try {
    // 尝试调用后端备注接口持久化保存
    if (user.value) {
      await (adminUsers as any).saveRemark(user.value.id, content)
    }
    noteHistory.value.unshift({
      operator: adminStore.userInfo?.nickname || adminStore.userInfo?.username || '管理员',
      time: new Date().toISOString(),
      content,
    })
    noteForm.content = ''
    ElMessage.success('备注已保存到服务器')
  } catch {
    // 后端备注接口不存在，降级为本地保存（刷新后丢失）
    noteHistory.value.unshift({
      operator: adminStore.userInfo?.nickname || adminStore.userInfo?.username || '管理员',
      time: new Date().toISOString(),
      content,
    })
    noteForm.content = ''
    ElMessage.warning('备注已本地保存，刷新后可能丢失，请确认后端已提供备注保存接口')
  }
  finally { noteSaving.value = false }
}

// ===== 操作日志函数 =====

/** 加载操作日志：优先调用后端 API，失败则展示占位文本 */
async function loadOpLogs() {
  if (!user.value) return
  tabLoading.opLogs = true
  try {
    // 尝试调用后端操作日志接口
    const res = await (adminUsers as any).getOpLogs(user.value.id)
    if (res && res.success && res.data) {
      operationLogs.value = Array.isArray(res.data) ? res.data : []
    } else {
      operationLogs.value = []
    }
  } catch {
    // 后端操作日志接口不存在，展示占位文本
    operationLogs.value = []
  }
  finally { tabLoading.opLogs = false }
}

function getOpLogTypeLabel(actionType: string) {
  const map: Record<string, string> = {
    login: '登录', profile_update: '修改资料', recharge: '充值',
    vip_change: 'VIP开通', audit_change: '审核变更', register: '注册',
  }
  return map[actionType] || actionType
}

function getOpLogTypeColor(actionType: string) {
  const map: Record<string, string> = {
    login: 'success', profile_update: '', recharge: 'warning',
    vip_change: 'danger', audit_change: 'primary', register: 'info',
  }
  return map[actionType] || 'info'
}
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
  .tag-group-inline { padding: 8px 16px; display: flex; flex-wrap: wrap; gap: 4px; }
  .personality-section { padding: 16px; .tag-category { margin-bottom: 16px; .category-title { font-size: 14px; font-weight: 600; color: #606266; margin: 0 0 8px; } } }
  .photo-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 16px; .photo-item { width: 100%; aspect-ratio: 3/4; border-radius: 8px; cursor: pointer; } .photo-card { position: relative; .photo-actions { display: flex; align-items: center; gap: 6px; justify-content: center; padding-top: 6px; } } }
  .section-title { font-size: 15px; font-weight: 600; color: #303133; margin: 0 0 12px; padding-bottom: 8px; border-bottom: 2px solid #409eff; }
}
.tab-user-cell { display: flex; align-items: center; gap: 8px; &:hover span { color: #409eff; } }
.link-text { color: #409eff; cursor: pointer; &:hover { text-decoration: underline; } }
.ml-10 { margin-left: 10px; }
.text-muted { color: #909399; font-size: 13px; }

// ===== 喜欢 tab =====
.like-stats-row {
  display: flex; gap: 16px; margin-bottom: 20px;
}
.like-stat-card {
  flex: 1; text-align: center; padding: 16px; border-radius: 8px;
  background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.like-stat-num { font-size: 28px; font-weight: 700; color: #e74c3c; }
.like-stat-label { font-size: 13px; color: #909399; margin-top: 4px; }
.like-sections { display: flex; flex-direction: column; gap: 16px; }
.like-section-card {
  background: #fff; border-radius: 8px; padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.like-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;
  h4 { margin: 0; font-size: 15px; font-weight: 600; }
}
.like-section-title { margin: 0 0 12px; font-size: 15px; font-weight: 600; }
.like-empty { color: #999; font-size: 13px; text-align: center; padding: 32px 0; }
.like-item {
  display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0;
  cursor: pointer; transition: background 0.2s;
  &:hover { background: #fafafa; }
  &:last-child { border-bottom: none; }
}
.like-avatar-img { width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0; object-fit: cover; }
.like-avatar-fallback {
  width: 48px; height: 48px; border-radius: 50%; background: #f5f5f5;
  display: flex; align-items: center; justify-content: center;
}
.like-item-info { flex: 1; margin-left: 12px; min-width: 0; }
.like-item-name { font-size: 14px; font-weight: 600; color: #333; }
.like-item-meta { font-size: 12px; color: #999; margin-top: 2px; }
.like-gender-male { color: #409eff; margin-left: 4px; font-size: 14px; }
.like-gender-female { color: #e74c8a; margin-left: 4px; font-size: 14px; }
.like-item-time { font-size: 12px; color: #999; margin: 0 12px; white-space: nowrap; }
.like-del-btn { flex-shrink: 0; }
</style>
