-- =============================================
-- 栖缘社 生产种子数据（仅 INSERT，不建表）
-- =============================================
-- 说明：
--   - 表结构由 01-schema.sql（docker/mysql/schema.sql）在数据库首次初始化时创建
--   - 本文件仅插入生产必需的种子数据：系统配置 + 数据字典
--   - 演示数据（示例红娘/热门问题/举报/默认用户）见 docker/mysql/demo-data.sql，默认不挂载
--   - 由 docker-compose 以 02-seed.sql 的顺序挂载执行，仅在首次初始化时运行
-- =============================================

SET NAMES utf8mb4;
USE `lingtong_match`;

-- =============================================
-- 默认系统配置
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
('payment:notifyUrl', 'https://api.lingtong.com/payment/notify', '支付回调URL'),

-- 审核配置
('audit:tencentSecretId', '', '腾讯云SecretId'),
('audit:tencentSecretKey', '', '腾讯云SecretKey'),
('audit:aiAuditEnabled', 'true', 'AI审核开关'),
('audit:sensitiveWords', '', '敏感词库'),
('audit:manualAuditEnabled', 'true', '人工审核开关');

-- =============================================
-- 数据字典预置数据
-- =============================================
INSERT IGNORE INTO `system_configs` (`configKey`, `configValue`, `description`) VALUES
('dict_education', '["高中","大专","本科","硕士","博士","职中"]', '学历字典'),
('dict_maritalStatus', '["未婚","离异未育","离异带孩","丧偶","已婚"]', '婚况字典'),
('dict_housingStatus', '["已购房（无贷款）","已购房（有贷款）","租房","与父母同住","单位宿舍","其他"]', '住房状态字典'),
('dict_carStatus', '["已购车","未购车","计划购车"]', '车辆状态字典'),
('dict_occupation', '["公务员/事业单位","国企员工","私企员工","外企员工","自主创业","自由职业","学生","其他"]', '职业字典'),
('dict_incomeRange', '["5K以下","5K-10K","10K-15K","15K-20K","20K-30K","30K-50K","50K以上"]', '收入范围字典');
