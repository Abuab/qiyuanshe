-- =============================================
-- 栖缘社数据库初始化脚本
-- 创建时间: 2024-01-01
-- 版本: 1.0.0
-- =============================================

-- 设置字符集和排序规则
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET SESSION sort_packet_size = 65536;

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS `lingtong_match`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

-- 创建数据库用户（使用环境变量设置密码）
SET @user_password = IFNULL('${MYSQL_PASSWORD}', 'lingtong_pass_2024');
SET @create_user_sql = CONCAT('CREATE USER IF NOT EXISTS ''lingtong''@''%'' IDENTIFIED BY ''', @user_password, '''');
PREPARE stmt FROM @create_user_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 授权用户访问数据库
GRANT ALL PRIVILEGES ON `lingtong_match`.* TO 'lingtong'@'%';

-- 刷新权限
FLUSH PRIVILEGES;

USE `lingtong_match`;

-- =============================================
-- 用户表
-- =============================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `unionId` VARCHAR(128) NULL COMMENT '微信UnionID',
  `openid` VARCHAR(128) NOT NULL COMMENT '微信OpenID',
  `nickname` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '昵称',
  `avatar` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '头像URL',
  `phone` VARCHAR(20) NULL COMMENT '手机号',
  `gender` TINYINT NOT NULL DEFAULT 0 COMMENT '性别: 0-未知, 1-男, 2-女',
  `birthYear` INT NULL COMMENT '出生年份',
  `height` INT NULL COMMENT '身高(cm)',
  `weight` INT NULL COMMENT '体重(kg)',
  `education` VARCHAR(20) NULL COMMENT '学历',
  `occupation` VARCHAR(50) NULL COMMENT '职业',
  `incomeRange` VARCHAR(50) NULL COMMENT '收入范围',
  `housingStatus` VARCHAR(20) NULL COMMENT '住房情况',
  `maritalStatus` VARCHAR(20) NULL COMMENT '婚姻状况',
  `hometown` VARCHAR(100) NULL COMMENT '籍贯',
  `residence` VARCHAR(100) NULL COMMENT '居住地',
  `selfIntro` TEXT NULL COMMENT '自我介绍',
  `mateRequirement` TEXT NULL COMMENT '择偶要求',
  `isRealName` TINYINT NOT NULL DEFAULT 0 COMMENT '是否实名认证: 0-否, 1-是',
  `isVip` TINYINT NOT NULL DEFAULT 0 COMMENT '是否VIP: 0-否, 1-是',
  `vipLevel` TINYINT NOT NULL DEFAULT 0 COMMENT 'VIP等级: 0-无, 1-黄金, 2-钻石, 3-至尊',
  `vipExpireTime` DATETIME NULL COMMENT 'VIP过期时间',
  `status` TINYINT NOT NULL DEFAULT 2 COMMENT '状态: 0-禁用, 1-正常, 2-待审核',
  `lastLoginAt` DATETIME NULL COMMENT '最后登录时间',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_unionId` (`unionId`),
  UNIQUE KEY `uk_openid` (`openid`),
  UNIQUE KEY `uk_phone` (`phone`),
  KEY `idx_status` (`status`),
  KEY `idx_isVip` (`isVip`),
  KEY `idx_createdAt` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- =============================================
-- 用户照片表
-- =============================================
CREATE TABLE IF NOT EXISTS `user_photos` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '照片ID',
  `userId` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `photoUrl` VARCHAR(500) NOT NULL COMMENT '照片URL',
  `isMain` TINYINT NOT NULL DEFAULT 0 COMMENT '是否主图: 0-否, 1-是',
  `sortOrder` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `auditStatus` TINYINT NOT NULL DEFAULT 0 COMMENT '审核状态: 0-待审核, 1-通过, 2-拒绝',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_userId` (`userId`),
  KEY `idx_auditStatus` (`auditStatus`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户照片表';

-- =============================================
-- 用户认证表
-- =============================================
CREATE TABLE IF NOT EXISTS `user_auths` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '认证ID',
  `userId` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `identityType` VARCHAR(20) NOT NULL COMMENT '认证类型',
  `identityNo` VARCHAR(100) NULL COMMENT '认证编号',
  `realName` VARCHAR(50) NULL COMMENT '真实姓名',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '状态: 0-待审核, 1-通过, 2-拒绝',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户认证表';

-- =============================================
-- 红娘表
-- =============================================
CREATE TABLE IF NOT EXISTS `matchmakers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '红娘ID',
  `name` VARCHAR(50) NOT NULL COMMENT '姓名',
  `avatar` VARCHAR(500) NOT NULL COMMENT '头像URL',
  `title` VARCHAR(100) NOT NULL COMMENT '头衔',
  `wechat` VARCHAR(50) NULL COMMENT '微信号',
  `phone` VARCHAR(20) NULL COMMENT '电话',
  `qrCode` VARCHAR(500) NULL COMMENT '二维码URL',
  `description` TEXT NULL COMMENT '描述',
  `isActive` TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用: 0-禁用, 1-启用',
  `sortOrder` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_isActive` (`isActive`),
  KEY `idx_sortOrder` (`sortOrder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='红娘表';

-- =============================================
-- 热门问题表
-- =============================================
CREATE TABLE IF NOT EXISTS `hot_questions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '问题ID',
  `title` VARCHAR(200) NOT NULL COMMENT '问题标题',
  `content` TEXT NULL COMMENT '问题描述',
  `isActive` TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用: 0-禁用, 1-启用',
  `sortOrder` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `answerCount` INT NOT NULL DEFAULT 0 COMMENT '回答数',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_isActive` (`isActive`),
  KEY `idx_sortOrder` (`sortOrder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='热门问题表';

-- =============================================
-- 问答回答表
-- =============================================
CREATE TABLE IF NOT EXISTS `question_answers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '回答ID',
  `questionId` BIGINT UNSIGNED NOT NULL COMMENT '问题ID',
  `userId` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `content` TEXT NOT NULL COMMENT '回答内容',
  `photos` JSON NULL COMMENT '照片',
  `likeCount` INT NOT NULL DEFAULT 0 COMMENT '点赞数',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '状态: 0-待审核, 1-通过, 2-拒绝',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_questionId` (`questionId`),
  KEY `idx_userId` (`userId`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='问答回答表';

-- =============================================
-- VIP订单表
-- =============================================
CREATE TABLE IF NOT EXISTS `vip_orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '订单ID',
  `userId` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `orderNo` VARCHAR(64) NOT NULL COMMENT '订单号',
  `vipLevel` TINYINT NOT NULL DEFAULT 0 COMMENT 'VIP等级',
  `amount` DECIMAL(10,2) NOT NULL COMMENT '金额',
  `payType` VARCHAR(20) NULL COMMENT '支付方式',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '状态: 0-未支付, 1-已支付, 2-已退款',
  `paidAt` DATETIME NULL COMMENT '支付时间',
  `expireTime` DATETIME NULL COMMENT '过期时间',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_orderNo` (`orderNo`),
  KEY `idx_userId` (`userId`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='VIP订单表';

-- =============================================
-- 聊天消息表
-- =============================================
CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '消息ID',
  `fromUserId` BIGINT UNSIGNED NOT NULL COMMENT '发送者ID',
  `toUserId` BIGINT UNSIGNED NOT NULL COMMENT '接收者ID',
  `content` TEXT NOT NULL COMMENT '消息内容',
  `type` TINYINT NOT NULL DEFAULT 1 COMMENT '类型: 1-文本, 2-图片, 3-语音',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '状态: 0-未读, 1-已读',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_fromUserId` (`fromUserId`),
  KEY `idx_toUserId` (`toUserId`),
  KEY `idx_createdAt` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='聊天消息表';

-- =============================================
-- 审核日志表
-- =============================================
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `targetType` VARCHAR(50) NOT NULL COMMENT '目标类型: user, photo, answer',
  `targetId` BIGINT NOT NULL COMMENT '目标ID',
  `action` VARCHAR(20) NOT NULL COMMENT '操作: pending, approve, reject',
  `reason` TEXT NULL COMMENT '原因',
  `adminId` BIGINT NULL COMMENT '管理员ID',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_targetType_targetId` (`targetType`, `targetId`),
  KEY `idx_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审核日志表';

-- =============================================
-- 系统配置表
-- =============================================
CREATE TABLE IF NOT EXISTS `system_configs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '配置ID',
  `configKey` VARCHAR(100) NOT NULL COMMENT '配置键',
  `configValue` TEXT NULL COMMENT '配置值',
  `description` VARCHAR(200) NULL COMMENT '描述',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_configKey` (`configKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- =============================================
-- 关注表
-- =============================================
CREATE TABLE IF NOT EXISTS `follows` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `fromUserId` BIGINT UNSIGNED NOT NULL COMMENT '关注者ID',
  `toUserId` BIGINT UNSIGNED NOT NULL COMMENT '被关注者ID',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_from_to` (`fromUserId`, `toUserId`),
  KEY `idx_toUserId` (`toUserId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='关注表';

-- =============================================
-- 回答点赞表
-- =============================================
CREATE TABLE IF NOT EXISTS `answer_likes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `answerId` BIGINT UNSIGNED NOT NULL COMMENT '回答ID',
  `userId` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_answer_user` (`answerId`, `userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='回答点赞表';

-- =============================================
-- 插入默认系统配置
-- =============================================
INSERT INTO `system_configs` (`configKey`, `configValue`, `description`) VALUES
-- 基础配置
('basic:appName', '栖缘社', '小程序名称'),
('basic:splashText', '正在为您寻找心仪的对象...', '开场提示文字'),
('basic:servicePhone', '', '客服电话'),
('basic:serviceWechat', '', '客服微信'),
('basic:logo', '', 'Logo URL'),
('basic:aboutUs', '', '关于我们'),
('basic:userAgreement', '', '用户协议'),
('basic:privacyPolicy', '', '隐私政策'),
('basic:vipAgreement', '', '会员服务协议'),

-- 分享配置
('share:shareTitle', '我在栖缘社等你，快来认识我吧！', '分享标题'),
('share:shareDesc', '一个真诚的婚恋平台', '分享描述'),
('share:shareImage', '', '分享图片'),
('share:posterTemplates', '[]', '海报模板配置'),

-- VIP配置
('vip:goldPrice', '99', '黄金会员价格'),
('vip:goldDays', '30', '黄金会员时长（天）'),
('vip:diamondPrice', '249', '钻石会员价格'),
('vip:diamondDays', '90', '钻石会员时长（天）'),
('vip:supremePrice', '799', '至尊VIP价格'),
('vip:supremeDays', '365', '至尊VIP时长（天）'),
('vip:freeChatLimit', '3', '非VIP每日聊天限制'),
('vip:vipBenefits', '', 'VIP权益说明'),

-- 支付配置
('payment:wechatMchId', '', '微信支付商户号'),
('payment:wechatApiV3Key', '', 'API v3密钥'),
('payment:certPath', '', '证书路径'),
('payment:keyPath', '', '私钥路径'),
('payment:notifyUrl', 'https://api.lingtong.com/payment/notify', '支付回调URL'),
('payment:testMode', 'false', '测试模式'),

-- 审核配置
('audit:tencentSecretId', '', '腾讯云SecretId'),
('audit:tencentSecretKey', '', '腾讯云SecretKey'),
('audit:aiAuditEnabled', 'true', 'AI审核开关'),
('audit:sensitiveWords', '', '敏感词库'),
('audit:manualAuditEnabled', 'true', '人工审核开关');

-- =============================================
-- 插入示例红娘数据
-- =============================================
INSERT INTO `matchmakers` (`name`, `avatar`, `title`, `wechat`, `phone`, `description`, `isActive`, `sortOrder`) VALUES
('李老师', 'https://example.com/avatar1.jpg', '资深婚恋顾问', 'lilaoshi001', '13800138001', '从事婚恋行业10年，成功促成数百对佳缘', 1, 1),
('王红娘', 'https://example.com/avatar2.jpg', '专业红娘顾问', 'wanghongniang', '13800138002', '擅长高端人群匹配，服务过众多企业家和精英人士', 1, 2),
('张老师', 'https://example.com/avatar3.jpg', '情感分析师', 'zhanglaoshi', '13800138003', '国家二级心理咨询师，从业8年', 1, 3);

-- =============================================
-- 插入示例热门问题
-- =============================================
INSERT INTO `hot_questions` (`title`, `content`, `isActive`, `sortOrder`) VALUES
('你理想的婚姻生活是什么样的？', '描述你心中理想的婚姻生活状态', 1, 1),
('你觉得婚恋中最重要的品质是什么？', '在寻找另一半时，你最看重对方的哪些品质？', 1, 2),
('你对未来的职业规划是怎样的？', '谈谈你对未来职业发展的规划和目标', 1, 3),
('你如何看待婚后与父母同住的问题？', '对于婚后是否与父母同住，你的想法是？', 1, 4),
('你认为两个人在一起最重要的是什么？', '维系一段关系最重要的是什么？', 1, 5);

-- =============================================
-- 创建管理员账号
-- 用户名: admin
-- 密码: admin123 (SHA256加密)
-- =============================================
INSERT INTO `users` (`openid`, `nickname`, `avatar`, `phone`, `gender`, `status`, `isVip`, `isRealName`, `createdAt`) VALUES
('admin_default_openid', '系统管理员', 'https://example.com/admin.png', '13800000000', 1, 1, 0, 1, NOW());

-- 注意：管理员密码需要在后台设置或通过加密方式存储
