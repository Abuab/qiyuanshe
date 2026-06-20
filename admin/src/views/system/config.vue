<template>
  <div class="system-config">
    <div class="page-header">
      <h2 class="page-title">系统配置</h2>
    </div>

    <el-tabs v-model="activeTab" class="config-tabs">
      <el-tab-pane label="基础配置" name="basic">
        <el-card class="config-card">
          <el-form :model="basicConfig" label-width="140px">
            <el-form-item label="小程序名称">
              <el-input v-model="basicConfig.appName" placeholder="请输入小程序名称" />
            </el-form-item>

            <el-form-item label="开场提示文字">
              <el-input
                v-model="basicConfig.splashText"
                placeholder="请输入开场提示文字"
              />
            </el-form-item>

            <el-form-item label="客服电话">
              <el-input v-model="basicConfig.servicePhone" placeholder="请输入客服电话" />
            </el-form-item>

            <el-form-item label="客服微信">
              <el-input v-model="basicConfig.serviceWechat" placeholder="请输入客服微信" />
            </el-form-item>

            <el-form-item label="Logo上传">
              <div class="upload-item">
                <el-image
                  v-if="basicConfig.logo && !logoError"
                  :src="basicConfig.logo"
                  class="logo-preview"
                  fit="contain"
                  @error="logoError = true"
                  @load="logoError = false"
                >
                  <template #error>
                    <div class="image-error-slot"></div>
                  </template>
                </el-image>
                <div v-if="logoError" class="logo-broken">
                  <span class="broken-text">图片加载失败，请重新上传</span>
                </div>
                <el-upload
                  action="#"
                  :http-request="uploadLogo"
                  :show-file-list="false"
                  class="logo-upload"
                >
                  <el-button type="primary">上传Logo</el-button>
                </el-upload>
              </div>
            </el-form-item>

            <el-form-item label="关于我们">
              <el-input
                v-model="basicConfig.aboutUs"
                type="textarea"
                :rows="4"
                placeholder="请输入关于我们内容"
              />
            </el-form-item>

            <el-form-item label="红娘按钮文字">
              <div style="display:flex;align-items:center;gap:8px">
                <el-switch v-model="basicConfig.matchmakerShowHi" active-text="显示Hi" inactive-text="隐藏Hi" style="--el-switch-on-color:#FF6B9D" />
                <el-input
                  v-model="basicConfig.matchmakerHiText"
                  placeholder="Hi"
                  style="width:80px"
                  :disabled="!basicConfig.matchmakerShowHi"
                />
                <span style="color:#909399">·</span>
                <el-input
                  v-model="basicConfig.matchmakerButtonText"
                  placeholder="红娘"
                  style="width:120px"
                />
              </div>
              <div class="form-tip">小程序首页右下角悬浮按钮的文字，可控制是否显示 Hi 前缀</div>
            </el-form-item>

            <el-form-item label="首页快捷入口">
              <div v-for="(name, idx) in basicConfig.quickEntryNames" :key="idx" style="margin-bottom:8px">
                <el-input
                  v-model="basicConfig.quickEntryNames[idx]"
                  :placeholder="['红娘评语','最新活动','相亲圈子','我们脱单了'][idx]"
                  style="width:200px;margin-right:8px"
                />
                <span style="color:#909399;font-size:12px">卡片 {{ idx + 1 }}</span>
              </div>
              <div class="form-tip">首页顶部四个卡片的显示名称</div>
            </el-form-item>

            <el-form-item label="关注空状态文案">
              <el-input v-model="basicConfig.followEmptyText" placeholder="我关注的为空时提示" />
              <div class="form-tip">我关注的列表为空时展示的文字</div>
            </el-form-item>
            <el-form-item label="粉丝空状态文案">
              <el-input v-model="basicConfig.followerEmptyText" placeholder="关注我的为空时提示" />
              <div class="form-tip">粉丝列表为空时展示的文字</div>
            </el-form-item>

            <el-form-item label="红线显示名称">
              <el-input v-model="basicConfig.redLineTerm" placeholder="红线" style="width:200px" />
              <div class="form-tip">前台显示的红线名称，可自定义为：钥匙、心动卡、鹊桥令等</div>
            </el-form-item>

            <el-form-item label="会员卡片轮播文案">
              <div v-for="(txt, idx) in basicConfig.vipCardTexts" :key="idx" style="margin-bottom:6px">
                <el-input v-model="basicConfig.vipCardTexts[idx]" :placeholder="['限时特惠，尊享VIP特权','每日签到领金币，解锁更多功能','开通VIP，优先匹配心仪TA'][idx]" style="width:100%">
                  <template #append>{{ idx + 1 }}</template>
                </el-input>
              </div>
              <div class="form-tip">我的页会员卡片栏轮播展示的文字（3条）</div>
            </el-form-item>

            <el-divider content-position="left">AI 红娘安全提示配置</el-divider>

            <el-form-item label="违规提示标签">
              <el-input v-model="basicConfig.matchmakerSafetyLabel" placeholder="内容提示" style="width:200px" />
              <div class="form-tip">用户输入触发敏感词时显示的安全标签文字</div>
            </el-form-item>

            <el-form-item label="边界提示标签">
              <el-input v-model="basicConfig.matchmakerSafetyBoundaryLabel" placeholder="安全提醒" style="width:200px" />
              <div class="form-tip">AI回复触发内容安全边界时显示的安全标签文字</div>
            </el-form-item>

            <el-form-item label="公众号关注提示">
              <el-switch v-model="basicConfig.showOfficialAccountPrompt" active-text="显示" inactive-text="隐藏" />
              <div class="form-tip" style="margin-left:12px">控制"我的"页面底部和系统消息页顶部的公众号关注提示横幅</div>
            </el-form-item>

            <el-form-item label="登录页插画">
              <div class="upload-item">
                <el-image
                  v-if="basicConfig.loginPageIllustration"
                  :src="basicConfig.loginPageIllustration"
                  class="logo-preview"
                  fit="contain"
                  style="max-height:160px"
                />
                <el-upload
                  action="#"
                  :http-request="uploadLoginIllustration"
                  :show-file-list="false"
                >
                  <el-button type="primary">上传插画</el-button>
                </el-upload>
              </div>
              <div class="form-tip">登录页面顶部的插画，建议尺寸 750px x 600px，留空使用默认插画</div>
            </el-form-item>

            <el-divider content-position="left">照片区引导文案</el-divider>

            <el-form-item label="未登录提示文字">
              <el-input v-model="basicConfig.photoGuidanceLoginPrompt" placeholder="登录后即可查看全部照片~" style="max-width:400px" />
            </el-form-item>
            <el-form-item label="登录按钮文字">
              <el-input v-model="basicConfig.photoGuidanceLoginBtn" placeholder="去登录" style="max-width:200px" />
            </el-form-item>
            <el-form-item label="上传引导提示文字">
              <el-input v-model="basicConfig.photoGuidanceUploadPrompt" placeholder="上传你的照片，探索更多可能~" style="max-width:400px" />
            </el-form-item>
            <el-form-item label="上传按钮文字">
              <el-input v-model="basicConfig.photoGuidanceUploadBtn" placeholder="上传照片" style="max-width:200px" />
            </el-form-item>
            <el-form-item label="最少照片张数阈值">
              <el-input-number v-model="basicConfig.photoGuidanceMinCount" :min="0" :max="10" />
              <div class="form-tip" style="margin-left:12px">当前用户照片数 ≤ 此值时查看他人照片触发上传引导</div>
            </el-form-item>

          </el-form>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="分享配置" name="share">
        <el-card class="config-card">
          <el-form :model="shareConfig" label-width="140px">
            <el-form-item label="分享标题">
              <el-input
                v-model="shareConfig.shareTitle"
                placeholder="支持变量：{nickname}"
              />
              <div class="form-tip">支持变量：{nickname}（用户昵称）</div>
            </el-form-item>

            <el-form-item label="分享描述">
              <el-input
                v-model="shareConfig.shareDesc"
                type="textarea"
                :rows="2"
                placeholder="请输入分享描述"
              />
            </el-form-item>

            <el-form-item label="分享图片">
              <div class="upload-item">
                <el-image
                  v-if="shareConfig.shareImage"
                  :src="shareConfig.shareImage"
                  class="share-image-preview"
                  fit="contain"
                />
                <el-upload
                  action="#"
                  :http-request="uploadShareImage"
                  :show-file-list="false"
                >
                  <el-button type="primary">上传分享图片</el-button>
                </el-upload>
              </div>
              <div class="form-tip">建议尺寸：500x400</div>
            </el-form-item>

            <el-form-item label="海报模板配置">
              <el-input
                v-model="shareConfig.posterTemplates"
                type="textarea"
                :rows="6"
                placeholder="JSON格式的海报模板配置"
              />
              <div class="form-tip">
                示例格式：<br />
                [
                  {"id": 1, "bgColor": "#fff", "layout": "portrait"},
                  {"id": 2, "bgColor": "#f5f5f5", "layout": "landscape"}
                ]
              </div>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="支付配置" name="payment">
        <el-card class="config-card">
          <el-form :model="paymentConfig" label-width="160px">
            <el-form-item label="微信支付商户号">
              <el-input
                v-model="paymentConfig.wechatMchId"
                placeholder="请输入微信支付商户号"
              />
            </el-form-item>

            <el-form-item label="API v3密钥">
              <el-input
                v-model="paymentConfig.wechatApiV3Key"
                type="password"
                placeholder="请输入API v3密钥"
                show-password
              />
            </el-form-item>

            <el-form-item label="证书文件">
              <div class="cert-upload">
                <div class="cert-item">
                  <span class="cert-label">apiclient_cert.pem:</span>
                  <el-upload
                    action="#"
                    :http-request="uploadCertFile"
                    :data="{ type: 'cert' }"
                    :show-file-list="false"
                  >
                    <el-button size="small">上传证书</el-button>
                  </el-upload>
                  <span v-if="paymentConfig.certPath" class="cert-status">
                    <el-icon color="#67C23A"><Check /></el-icon> 已上传
                  </span>
                </div>
                <div class="cert-item">
                  <span class="cert-label">apiclient_key.pem:</span>
                  <el-upload
                    action="#"
                    :http-request="uploadCertFile"
                    :data="{ type: 'key' }"
                    :show-file-list="false"
                  >
                    <el-button size="small">上传私钥</el-button>
                  </el-upload>
                  <span v-if="paymentConfig.keyPath" class="cert-status">
                    <el-icon color="#67C23A"><Check /></el-icon> 已上传
                  </span>
                </div>
              </div>
            </el-form-item>

            <el-form-item label="支付回调URL">
              <el-input
                :model-value="paymentConfig.notifyUrl"
                disabled
              />
              <div class="form-tip">自动拼接为：https://api.xxx.com/payment/notify</div>
            </el-form-item>

            <el-form-item label="测试模式">
              <el-switch v-model="paymentConfig.testMode" />
              <div class="form-tip">启用后使用微信支付沙箱环境</div>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="审核配置" name="audit">
        <el-card class="config-card">
          <el-form :model="auditConfig" label-width="160px">
            <el-form-item label="腾讯云SecretId">
              <el-input
                v-model="auditConfig.tencentSecretId"
                placeholder="请输入腾讯云SecretId"
              />
            </el-form-item>

            <el-form-item label="腾讯云SecretKey">
              <el-input
                v-model="auditConfig.tencentSecretKey"
                type="password"
                placeholder="请输入腾讯云SecretKey"
                show-password
              />
            </el-form-item>

            <el-form-item label="AI审核开关">
              <el-switch v-model="auditConfig.aiAuditEnabled" />
              <div class="form-tip">启用后自动调用腾讯云内容审核服务</div>
            </el-form-item>

            <el-form-item label="敏感词库">
              <el-input
                v-model="auditConfig.sensitiveWords"
                type="textarea"
                :rows="8"
                placeholder="每行一个敏感词"
              />
              <div class="form-tip">每行一个敏感词，审核时自动过滤</div>
            </el-form-item>

            <el-form-item label="人工审核开关">
              <el-switch v-model="auditConfig.manualAuditEnabled" />
              <div class="form-tip">启用后AI审核结果需人工确认</div>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="照片审核规则" name="photoAudit">
        <el-card class="config-card">
          <el-form :model="photoAuditConfig" label-width="160px">
            <el-form-item label="审核严格等级">
              <el-radio-group v-model="photoAuditConfig.strictLevel">
                <el-radio value="loose">宽松</el-radio>
                <el-radio value="normal">标准</el-radio>
                <el-radio value="strict">严格</el-radio>
              </el-radio-group>
              <div class="form-tip">宽松：仅过滤明显违规；标准：大部分情况人工复核；严格：所有照片都需人工审核</div>
            </el-form-item>

            <el-form-item label="AI自动审核">
              <el-switch v-model="photoAuditConfig.aiAutoAudit" />
              <div class="form-tip">启用后照片上传时自动调用AI审核</div>
            </el-form-item>

            <el-form-item label="人工复核">
              <el-switch v-model="photoAuditConfig.manualReview" />
              <div class="form-tip">AI审核通过后仍需人工确认</div>
            </el-form-item>

            <el-divider content-position="left">不合格原因标签</el-divider>
            <div class="form-tip" style="margin-bottom:12px">配置照片审核不通过的原因标签，小程序端引导页展示</div>

            <el-form-item label="衣着不当">
              <div style="display:flex;align-items:center;gap:12px">
                <el-switch v-model="photoAuditConfig.rejectTags.clothing.enabled" />
                <el-input v-model="photoAuditConfig.rejectTags.clothing.label" placeholder="衣着不当" style="width:200px" />
                <el-input v-model="photoAuditConfig.rejectTags.clothing.tip" placeholder="如赤膊、过于暴露" style="width:300px" />
              </div>
            </el-form-item>

            <el-form-item label="模糊遮挡">
              <div style="display:flex;align-items:center;gap:12px">
                <el-switch v-model="photoAuditConfig.rejectTags.blurry.enabled" />
                <el-input v-model="photoAuditConfig.rejectTags.blurry.label" placeholder="模糊遮挡" style="width:200px" />
                <el-input v-model="photoAuditConfig.rejectTags.blurry.tip" placeholder="如戴口罩、墨镜、模糊" style="width:300px" />
              </div>
            </el-form-item>

            <el-form-item label="非人物照">
              <div style="display:flex;align-items:center;gap:12px">
                <el-switch v-model="photoAuditConfig.rejectTags.nonHuman.enabled" />
                <el-input v-model="photoAuditConfig.rejectTags.nonHuman.label" placeholder="非人物照" style="width:200px" />
                <el-input v-model="photoAuditConfig.rejectTags.nonHuman.tip" placeholder="如宠物、风景、卡通" style="width:300px" />
              </div>
            </el-form-item>

            <el-form-item label="无正脸">
              <div style="display:flex;align-items:center;gap:12px">
                <el-switch v-model="photoAuditConfig.rejectTags.noFrontFace.enabled" />
                <el-input v-model="photoAuditConfig.rejectTags.noFrontFace.label" placeholder="无正脸" style="width:200px" />
                <el-input v-model="photoAuditConfig.rejectTags.noFrontFace.tip" placeholder="如背影、侧脸过度、仅身体" style="width:300px" />
              </div>
            </el-form-item>

            <el-form-item label="网络照片">
              <div style="display:flex;align-items:center;gap:12px">
                <el-switch v-model="photoAuditConfig.rejectTags.webPic.enabled" />
                <el-input v-model="photoAuditConfig.rejectTags.webPic.label" placeholder="网络照片" style="width:200px" />
                <el-input v-model="photoAuditConfig.rejectTags.webPic.tip" placeholder="如明星照、网图、带水印的下载图" style="width:300px" />
              </div>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="通知通道" name="notify">
        <el-card class="config-card">
          <el-form :model="notifyConfig" label-width="140px">
            <el-form-item label="启用通知">
              <el-switch v-model="notifyConfig.enabled" />
              <span class="form-tip" style="margin-left:12px">启用后，有配置 webhook 的通道均会收到通知</span>
            </el-form-item>
            <el-form-item label="企业微信 Webhook">
              <el-input v-model="notifyConfig.webhookUrls.wecom" placeholder="企业微信机器人Webhook地址" />
              <div v-if="wecomHint" class="webhook-hint">{{ wecomHint }}</div>
            </el-form-item>
            <el-form-item label="飞书 Webhook">
              <el-input v-model="notifyConfig.webhookUrls.feishu" placeholder="飞书机器人Webhook地址" />
              <div v-if="feishuHint" class="webhook-hint">{{ feishuHint }}</div>
            </el-form-item>
            <el-form-item label="钉钉 Webhook">
              <el-input v-model="notifyConfig.webhookUrls.dingtalk" placeholder="钉钉机器人Webhook地址" />
              <div v-if="dingtalkHint" class="webhook-hint">{{ dingtalkHint }}</div>
            </el-form-item>
            <el-form-item label="通知类型">
              <el-checkbox-group v-model="notifyConfig.notifyTypes">
                <el-checkbox label="photo" value="photo">图片审核</el-checkbox>
                <el-checkbox label="user" value="user">用户资料审核</el-checkbox>
                <el-checkbox label="report" value="report">举报通知</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="通知日志" name="notify-log">
        <el-card class="config-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <span>最近 20 条通知记录</span>
            <el-button size="small" @click="loadNotifyLogs" :loading="notifyLogsLoading">刷新</el-button>
          </div>
          <el-table :data="notifyLogs" stripe size="small" max-height="500">
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column label="时间" width="160">
              <template #default="{ row }">
                {{ formatLogTime(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="状态" width="70">
              <template #default="{ row }">
                <el-tag :type="row.success ? 'success' : 'danger'" size="small">
                  {{ row.success ? '成功' : '失败' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="通道" width="70">
              <template #default="{ row }">
                <span v-if="row.channel === 'wecom'">企业微信</span>
                <span v-else-if="row.channel === 'feishu'">飞书</span>
                <span v-else-if="row.channel === 'dingtalk'">钉钉</span>
                <span v-else>{{ row.channel || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="来源" width="100">
              <template #default="{ row }">
                <el-tag size="small" type="info">{{ row.source }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="userId" label="用户ID" width="70" />
            <el-table-column prop="userNickname" label="用户" min-width="80" />
            <el-table-column prop="content" label="消息内容" min-width="150" show-overflow-tooltip />
            <el-table-column label="失败原因" min-width="150" show-overflow-tooltip>
              <template #default="{ row }">
                <span v-if="row.errorMessage" style="color:#F56C6C;font-size:12px">{{ row.errorMessage }}</span>
                <span v-else>-</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="简介模板" name="intro">
        <el-card class="config-card">
          <el-form :model="introConfig" label-width="140px">
            <el-form-item label="模板格式">
              <el-input
                v-model="introConfig.template"
                type="textarea"
                :rows="4"
                placeholder="我是一个{character}的人，我喜欢{hobby}，我{loveRule}，希望你{hopeTa}"
              />
              <div class="form-tip">
                可用变量：<code>{character}</code>（性格）、<code>{hobby}</code>（爱好）、<code>{loveRule}</code>（恋爱准则）、<code>{hopeTa}</code>（希望TA）
              </div>
            </el-form-item>
            <el-form-item label="分隔符">
              <el-input
                v-model="introConfig.separator"
                placeholder="、"
                style="width: 120px"
              />
              <div class="form-tip">多选标签之间的连接符号，默认顿号「、」</div>
            </el-form-item>
            <el-form-item label="预览">
              <el-alert type="info" :closable="false" show-icon>
                <template #title>
                  <span class="preview-text">{{ introPreview }}</span>
                </template>
              </el-alert>
              <div class="form-tip" style="margin-top:4px">以上为完整填写效果，部分缺失时自动跳过空项</div>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="爱情语录" name="loveQuotes">
        <el-card class="config-card">
          <el-alert type="info" :closable="false" show-icon style="margin-bottom:16px">
            <template #title>
              配置6条爱情语录，小程序端随机展示，用户可选择一条提交保存。
            </template>
          </el-alert>
          <el-form :model="loveQuotesConfig" label-width="100px">
            <el-form-item
              v-for="(_, idx) in loveQuotesConfig.quotes"
              :key="idx"
              :label="`语录 ${idx + 1}`"
            >
              <el-input
                v-model="loveQuotesConfig.quotes[idx]"
                type="textarea"
                :rows="2"
                :placeholder="`请输入第${idx + 1}条爱情语录`"
              />
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="图标配置" name="icon">
        <el-card class="config-card">
          <el-alert type="info" :closable="false" show-icon class="icon-tip">
            <template #title>
              上传 PNG 图标后小程序端实时生效；留空则使用本地默认图标。
            </template>
          </el-alert>

          <el-divider content-position="left">底部 TabBar 图标</el-divider>
          <div class="icon-grid">
            <div
              v-for="item in tabbarIconList"
              :key="item.key"
              class="icon-upload-item"
            >
              <div class="icon-label">{{ item.label }}</div>
              <div class="icon-preview-row">
                <div class="icon-preview-box">
                  <el-image
                    v-if="iconConfig.tabbar[item.key].default"
                    :src="iconConfig.tabbar[item.key].default"
                    fit="contain"
                    class="icon-preview-img"
                  />
                  <span v-else class="icon-empty">默认</span>
                  <el-upload
                    action="#"
                    :http-request="(opts: any) => uploadIcon(opts, 'tabbar', item.key, 'default')"
                    :show-file-list="false"
                  >
                    <el-button size="small" link>上传默认</el-button>
                  </el-upload>
                </div>
                <div class="icon-preview-box">
                  <el-image
                    v-if="iconConfig.tabbar[item.key].active"
                    :src="iconConfig.tabbar[item.key].active"
                    fit="contain"
                    class="icon-preview-img"
                  />
                  <span v-else class="icon-empty active">选中</span>
                  <el-upload
                    action="#"
                    :http-request="(opts: any) => uploadIcon(opts, 'tabbar', item.key, 'active')"
                    :show-file-list="false"
                  >
                    <el-button size="small" link>上传选中</el-button>
                  </el-upload>
                </div>
              </div>
            </div>
          </div>

          <el-divider content-position="left">页面内图标</el-divider>
          <div class="icon-grid">
            <div
              v-for="item in pageIconList"
              :key="item.key"
              class="icon-upload-item"
            >
              <div class="icon-label">{{ item.label }}</div>
              <div class="icon-preview-box">
                <el-image
                  v-if="iconConfig.page[item.key]"
                  :src="iconConfig.page[item.key]"
                  fit="contain"
                  class="icon-preview-img"
                />
                <span v-else class="icon-empty">未上传</span>
                <el-upload
                  action="#"
                  :http-request="(opts: any) => uploadIcon(opts, 'page', item.key)"
                  :show-file-list="false"
                >
                  <el-button size="small" link>上传图标</el-button>
                </el-upload>
              </div>
            </div>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <div v-if="activeTab !== 'notify-log'" class="config-footer">
      <el-button type="primary" :loading="saving" @click="handleSave">
        保存配置
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Check } from '@element-plus/icons-vue'
import { system, adminSystem } from '../../api'
import { useSystemStore } from '../../store/system'

const activeTab = ref('basic')
const saving = ref(false)
const systemStore = useSystemStore()
const logoError = ref(false)

const basicConfig = reactive({
  appName: '',
  splashText: '正在为您寻找心仪的对象...',
  servicePhone: '',
  serviceWechat: '',
  logo: '',
  aboutUs: '',
  matchmakerHiText: 'Hi',
  matchmakerShowHi: true,
  matchmakerButtonText: '红娘',
  quickEntryNames: ['红娘评语', '最新活动', '相亲圈子', '我们脱单了'],
  followEmptyText: '您还木有关注任何人~',
  followerEmptyText: '还木有人关注您~',
  redLineTerm: '红线',
  vipCardTexts: ['限时特惠，尊享VIP特权', '每日签到领金币，解锁更多功能', '开通VIP，优先匹配心仪TA'],
  matchmakerSafetyLabel: '内容提示',
  matchmakerSafetyBoundaryLabel: '安全提醒',
  showOfficialAccountPrompt: true,
  loginPageIllustration: '',
  photoGuidanceLoginPrompt: '登录后即可查看全部照片~',
  photoGuidanceLoginBtn: '去登录',
  photoGuidanceUploadPrompt: '上传你的照片，探索更多可能~',
  photoGuidanceUploadBtn: '上传照片',
  photoGuidanceMinCount: 1,
})

const shareConfig = reactive({
  shareTitle: '我在等你，快来认识我吧！',
  shareDesc: '一个真诚的婚恋平台',
  shareImage: '',
  posterTemplates: '[]',
})
const paymentConfig = reactive({
  wechatMchId: '',
  wechatApiV3Key: '',
  certPath: '',
  keyPath: '',
  notifyUrl: 'https://api.xxx.com/payment/notify',
  testMode: false,
})

const notifyConfig = reactive({
  enabled: false,
  webhookUrls: { wecom: '', feishu: '', dingtalk: '' } as Record<string, string>,
  notifyTypes: ['photo'] as string[],
})
// 当前选中通道的真实 webhook 地址（未脱敏）
const _realWebhookByChannel = reactive<Record<string, string>>({ wecom: '', feishu: '', dingtalk: '' })
const wecomHint = computed(() => makeHint('wecom'))
const feishuHint = computed(() => makeHint('feishu'))
const dingtalkHint = computed(() => makeHint('dingtalk'))
function makeHint(ch: string) {
  const real = _realWebhookByChannel[ch]
  if (!real || real.length <= 20) return ''
  return '当前地址: ' + real.slice(0, -20) + '*'.repeat(20)
}

const auditConfig = reactive({
  tencentSecretId: '',
  tencentSecretKey: '',
  aiAuditEnabled: true,
  sensitiveWords: '',
  manualAuditEnabled: true,
})

const photoAuditConfig = reactive({
  strictLevel: 'normal',
  aiAutoAudit: true,
  manualReview: false,
  rejectTags: {
    clothing: { enabled: true, label: '衣着不当', tip: '如赤膊、过于暴露' },
    blurry: { enabled: true, label: '模糊遮挡', tip: '如戴口罩、墨镜、模糊' },
    nonHuman: { enabled: true, label: '非人物照', tip: '如宠物、风景、卡通' },
    noFrontFace: { enabled: true, label: '无正脸', tip: '如背影、侧脸过度、仅身体' },
    webPic: { enabled: true, label: '网络照片', tip: '如明星照、网图、带水印的下载图' },
  },
})

// 通知日志
const notifyLogs = ref<any[]>([])
const notifyLogsLoading = ref(false)
const loadNotifyLogs = async () => {
  notifyLogsLoading.value = true
  try {
    const res = await adminSystem.getNotifyLogs()
    if (res.success && res.data) {
      notifyLogs.value = res.data
    }
  } catch { /* ignore */ }
  finally { notifyLogsLoading.value = false }
}
const formatLogTime = (t: string) => {
  if (!t) return '-'
  const d = new Date(t)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// 切换到通知日志 tab 时自动加载
watch(activeTab, (val) => {
  if (val === 'notify-log') loadNotifyLogs()
})

const introConfig = reactive({
  template: '我是一个{character}的人，我喜欢{hobby}，我{loveRule}，希望你{hopeTa}',
  separator: '、',
})

const loveQuotesConfig = reactive({
  quotes: ['', '', '', '', '', ''] as string[],
})

const tabbarIconList = [
  { key: 'home', label: '首页' },
  { key: 'dynamic', label: '动态' },
  { key: 'vip', label: '会员' },
  { key: 'message', label: '消息' },
  { key: 'my', label: '我的' },
]

const pageIconList = [
  { key: 'dynamicHome', label: '动态页返回首页' },
  { key: 'copy', label: '复制ID图标' },
  { key: 'heartFill', label: '心形填充(通用)' },
  { key: 'qaIcon', label: '我的问答图标' },
  { key: 'matchmakerIcon', label: '专属红娘图标' },
  { key: 'oaHeart', label: '公众号心形图标' },
  { key: 'footerHeart', label: '底部陪伴心形' },
  { key: 'myPhotos', label: '我的相册' },
  { key: 'loveQuotes', label: '爱情语录' },
  { key: 'myGifts', label: '我的礼物' },
  { key: 'privacy', label: '隐私设置' },
  { key: 'feedback', label: '问题反馈' },
  { key: 'userAgreement', label: '用户协议' },
  { key: 'antiFraud', label: '防骗提醒' },
  { key: 'copyIcon', label: '红娘弹窗-复制图标' },
  { key: 'saveIcon', label: '红娘弹窗-保存图标' },
  { key: 'shareFriendIcon', label: '用户详情-分享好友图标' },
  { key: 'posterIcon', label: '用户详情-生成海报图标' },
  { key: 'shareMoreIcon', label: '用户详情-右上角分享图标' },
  { key: 'followIcon', label: '用户详情-关注图标' },
  { key: 'shareBtnIcon', label: '用户详情-分享按钮图标' },
  { key: 'realNameIcon', label: '已实名图标' },
  { key: 'messageNotifyIcon', label: '消息-系统通知图标' },
  { key: 'mmEye', label: '红娘牵线-眼睛图标' },
  { key: 'deletePhotoIcon', label: '编辑资料-删除照片图标' },
  { key: 'followEmptyIcon', label: '关注/粉丝空状态图标' },
  { key: 'blockListIcon', label: '隐私设置-黑名单图标' },
  { key: 'privacyPolicyIcon', label: '隐私设置-隐私政策图标' },
  { key: 'privacySettingIcon', label: '隐私设置图标' },
  { key: 'deactivateIcon', label: '隐私设置-注销账号图标' },
  { key: 'refreshIcon', label: '爱情语录-换一个图标' },
  { key: 'filterResetIcon', label: '筛选面板-重置按钮图标' },
  { key: 'certRealnameIcon', label: '认证页-实名认证图标' },
  { key: 'certSingleIcon', label: '认证页-单身承诺图标' },
  { key: 'certEducationIcon', label: '认证页-学历认证图标' },
  { key: 'certHouseIcon', label: '认证页-房产认证图标' },
  { key: 'certCarIcon', label: '认证页-车产认证图标' },
  { key: 'certStoreIcon', label: '认证页-到店认证图标' },
]

interface TabbarIconItem {
  default: string
  active: string
}

const iconConfig = reactive({
  tabbar: {
    home: { default: '', active: '' },
    dynamic: { default: '', active: '' },
    vip: { default: '', active: '' },
    message: { default: '', active: '' },
    my: { default: '', active: '' },
  } as Record<string, TabbarIconItem>,
  menu: {
    vipCenter: '',
    activities: '',
    answers: '',
    follows: '',
    visitors: '',
    photos: '',
    realnameAuth: '',
    help: '',
    settings: '',
  } as Record<string, string>,
  page: {
    dynamicHome: '',
    copy: '',
    heartFill: '',
    qaIcon: '',
    matchmakerIcon: '',
    oaHeart: '',
    footerHeart: '',
    myPhotos: '',
    loveQuotes: '',
    myGifts: '',
    privacy: '',
    feedback: '',
    userAgreement: '',
    antiFraud: '',
    copyIcon: '',
    saveIcon: '',
    shareFriendIcon: '',
    posterIcon: '',
    shareMoreIcon: '',
    followIcon: '',
    shareBtnIcon: '',
    deletePhotoIcon: '',
    mmEye: '',
    followEmptyIcon: '',
    blockListIcon: '',
    privacyPolicyIcon: '',
    privacySettingIcon: '',
    deactivateIcon: '',
    refreshIcon: '',
    filterResetIcon: '',
  } as Record<string, string>,
})

// 模拟预览：与后端 buildIntroFromUser 同逻辑
const introPreview = computed(() => {
  const demo = {
    character: ['温柔体贴', '开朗积极'],
    hobby: ['旅行', '美食', '看电影'],
    loveRule: ['宁缺也毋滥', '恋爱以结婚为目的'],
    hopeTa: ['成熟稳重', '有责任心'],
  }
  const map: Record<string, string> = {}
  for (const [k, v] of Object.entries(demo)) {
    map[k] = v.length > 0 ? v.join(introConfig.separator) : ''
  }
  let result = introConfig.template
  for (const [key, value] of Object.entries(map)) {
    if (value) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
    } else {
      result = result.replace(new RegExp(`，?[^，]*?\\{${key}\\}[^，]*，?`, 'g'), '')
    }
  }
  return result
    .replace(/，+/g, '，')
    .replace(/^，+/, '')
    .replace(/，+$/, '')
    .trim()
})

onMounted(async () => {
  await fetchConfig()
})

async function fetchConfig() {
  try {
    const res = await system.getConfigs()
    if (res.success && res.data) {
      Object.assign(basicConfig, res.data.basic || {})
      Object.assign(shareConfig, res.data.share || {})
      Object.assign(paymentConfig, res.data.payment || {})
      Object.assign(auditConfig, res.data.audit || {})
      // 通知通道
      if (res.data.notify) {
        const n = res.data.notify as any
        // 兼容旧格式：单个 webhookUrl → 迁移到当前通道
        if (n.webhookUrl && !n.webhookUrls) {
          n.webhookUrls = { wecom: '', feishu: '', dingtalk: '' }
          n.webhookUrls[n.channel || 'wecom'] = n.webhookUrl
          delete n.webhookUrl
        }
        Object.assign(notifyConfig, n)
        // 脱敏各通道 webhook 地址
        const urls = notifyConfig.webhookUrls || {}
        for (const ch of ['wecom', 'feishu', 'dingtalk'] as const) {
          const u = urls[ch]
          if (u && u.length > 20) {
            _realWebhookByChannel[ch] = u
            urls[ch] = u.slice(0, -20) + '*'.repeat(20)
          } else {
            _realWebhookByChannel[ch] = u || ''
          }
        }
      }
      // 简介模板
      if (res.data.intro) {
        Object.assign(introConfig, res.data.intro)
      }
      // 爱情语录
      if (res.data.loveQuotes) {
        loveQuotesConfig.quotes = res.data.loveQuotes.quotes || ['', '', '', '', '', '']
      }
      // 图标配置
      if (res.data.icon) {
        Object.assign(iconConfig.tabbar, res.data.icon.tabbar || {})
        Object.assign(iconConfig.menu, res.data.icon.menu || {})
        Object.assign(iconConfig.page, res.data.icon.page || {})
      }
      // 重新加载配置时重置图片错误状态，让 el-image 重新尝试加载
      logoError.value = false

      // 照片审核规则
      if (res.data.photoAudit) {
        Object.assign(photoAuditConfig, res.data.photoAudit)
        // 深合并 rejectTags（避免嵌套对象被整体替换）
        if (res.data.photoAudit.rejectTags) {
          for (const [key, val] of Object.entries(res.data.photoAudit.rejectTags)) {
            if (photoAuditConfig.rejectTags[key as keyof typeof photoAuditConfig.rejectTags]) {
              Object.assign(photoAuditConfig.rejectTags[key as keyof typeof photoAuditConfig.rejectTags], val)
            }
          }
        }
      }

      // 加载红线索显示名称（独立 key）
      try {
        const termRes = await adminSystem.getConfigByKey('red_line_term')
        if (termRes.success && termRes.data) {
          basicConfig.redLineTerm = termRes.data
        }
      } catch { /* use default */ }
    }
  } catch (error) {
    console.error(error)
  }
}

async function handleSave() {
  saving.value = true
  try {
    // 构建待保存的 webhookUrls：如果某通道地址以 * 结尾（未被修改），则还原真实地址
    const webhookUrlsToSave: Record<string, string> = {}
    for (const ch of ['wecom', 'feishu', 'dingtalk'] as const) {
      const val = notifyConfig.webhookUrls[ch] || ''
      webhookUrlsToSave[ch] = val.endsWith('*') ? (_realWebhookByChannel[ch] || val) : val
    }

    const configs = {
      basic: { ...basicConfig },
      share: { ...shareConfig },
      payment: { ...paymentConfig },
      audit: { ...auditConfig },
      notify: { enabled: notifyConfig.enabled, webhookUrls: webhookUrlsToSave, notifyTypes: notifyConfig.notifyTypes },
      intro: { ...introConfig },
      icon: {
        tabbar: { ...iconConfig.tabbar },
        menu: { ...iconConfig.menu },
        page: { ...iconConfig.page },
      },
      loveQuotes: { quotes: loveQuotesConfig.quotes.filter(q => q && q.trim()) },
      photoAudit: { ...photoAuditConfig, rejectTags: JSON.parse(JSON.stringify(photoAuditConfig.rejectTags)) },
      matchmaker: {
        safetyLabel: basicConfig.matchmakerSafetyLabel,
        safetyBoundaryLabel: basicConfig.matchmakerSafetyBoundaryLabel,
      },
    }
    const res = await adminSystem.saveConfigs(configs)
    if (res.success) {
      // 单独保存红线索显示名称
      try {
        await adminSystem.updateConfig('red_line_term', basicConfig.redLineTerm)
      } catch { /* non-critical */ }
      // 保存后重新脱敏各通道 webhook 地址
      for (const ch of ['wecom', 'feishu', 'dingtalk'] as const) {
        const u = webhookUrlsToSave[ch]
        if (u && u.length > 20) {
          _realWebhookByChannel[ch] = u
          notifyConfig.webhookUrls[ch] = u.slice(0, -20) + '*'.repeat(20)
        } else {
          _realWebhookByChannel[ch] = u || ''
          notifyConfig.webhookUrls[ch] = u || ''
        }
      }
      // 直接写入 store + localStorage，持久化，刷新也不会丢
      systemStore.setAppName(basicConfig.appName)
      ElMessage.success('配置保存成功')
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

async function uploadLogo(options: any) {
  const formData = new FormData()
  formData.append('file', options.file)
  try {
    const res = await adminSystem.upload(formData)
    if (res.success && res.data?.url) {
      basicConfig.logo = res.data.url
      logoError.value = false
      ElMessage.success('上传成功')
    }
  } catch (error) {
    ElMessage.error('上传失败')
  }
}

async function uploadLoginIllustration(options: any) {
  const formData = new FormData()
  formData.append('file', options.file)
  try {
    const res = await adminSystem.upload(formData)
    if (res.success && res.data?.url) {
      basicConfig.loginPageIllustration = res.data.url
      ElMessage.success('上传成功')
    }
  } catch (error) {
    ElMessage.error('上传失败')
  }
}

async function uploadShareImage(options: any) {
  const formData = new FormData()
  formData.append('file', options.file)
  try {
    const res = await adminSystem.upload(formData)
    if (res.success && res.data?.url) {
      shareConfig.shareImage = res.data.url
      ElMessage.success('上传成功')
    }
  } catch (error) {
    ElMessage.error('上传失败')
  }
}

async function uploadCertFile(options: any) {
  const formData = new FormData()
  formData.append('file', options.file)
  formData.append('type', options.data.type)
  try {
    const res = await adminSystem.uploadCert(formData)
    if (res.success && res.data?.path) {
      if (options.data.type === 'cert') {
        paymentConfig.certPath = res.data.path
      } else {
        paymentConfig.keyPath = res.data.path
      }
      ElMessage.success('上传成功')
    }
  } catch (error) {
    ElMessage.error('上传失败')
  }
}

async function uploadIcon(
  options: any,
  group: 'tabbar' | 'menu' | 'page',
  key: string,
  subKey?: 'default' | 'active',
) {
  const formData = new FormData()
  formData.append('file', options.file)
  try {
    const res = await adminSystem.upload(formData)
    if (res.success && res.data?.url) {
      if (group === 'tabbar' && subKey) {
        iconConfig.tabbar[key][subKey] = res.data.url
      } else {
        iconConfig[group][key] = res.data.url
      }
      ElMessage.success('上传成功')
    }
  } catch (error) {
    ElMessage.error('上传失败')
  }
}
</script>

<style scoped lang="scss">
.system-config {
  padding: 20px;

  .page-header {
    margin-bottom: 20px;

    .page-title {
      font-size: 20px;
      font-weight: 600;
      color: #303133;
      margin: 0;
    }
  }

  .config-tabs {
    background: #fff;
    border-radius: 8px;
    padding: 20px;
  }

  .config-card {
    max-width: 800px;
  }

  .form-tip {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
  }

  .webhook-hint {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
    font-family: monospace;
    word-break: break-all;
  }

  .unit {
    margin-left: 8px;
    color: #606266;
  }

  .upload-item {
    display: flex;
    align-items: flex-start;
    gap: 16px;

    .logo-preview {
      width: 80px;
      height: 80px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
    }

    .logo-broken {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 80px;
      height: 80px;
      border: 1px dashed #dcdfe6;
      border-radius: 4px;
      background: #fafafa;

      .broken-text {
        font-size: 11px;
        color: #c0c4cc;
        text-align: center;
        padding: 4px;
        line-height: 1.4;
      }
    }

    .share-image-preview {
      width: 120px;
      height: 96px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
    }
  }

  .cert-upload {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .cert-item {
      display: flex;
      align-items: center;
      gap: 12px;

      .cert-label {
        width: 160px;
        font-size: 14px;
        color: #606266;
      }

      .cert-status {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: #67c23a;
      }
    }
  }

  .config-footer {
    margin-top: 24px;
    padding: 16px;
    background: #fff;
    border-radius: 8px;
    display: flex;
    justify-content: center;
  }
}

:deep(.el-divider__text) {
  color: #409eff;
  font-weight: 600;
}

.preview-text {
  color: #333;
  font-size: 14px;
  line-height: 1.6;
}

code {
  background: #f0f2f5;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 12px;
  color: #e74c3c;
}

.icon-tip {
  margin-bottom: 16px;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}

.icon-upload-item {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 12px;
  background: #fafafa;

  .icon-label {
    font-size: 14px;
    color: #606266;
    margin-bottom: 10px;
    text-align: center;
  }

  .icon-preview-row {
    display: flex;
    gap: 12px;
    justify-content: center;
  }

  .icon-preview-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .icon-preview-img {
    width: 48px;
    height: 48px;
    border: 1px dashed #dcdfe6;
    border-radius: 4px;
    background: #fff;
  }

  .icon-empty {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px dashed #dcdfe6;
    border-radius: 4px;
    background: #fff;
    font-size: 12px;
    color: #c0c4cc;

    &.active {
      color: #ff6b9d;
    }
  }
}
</style>
