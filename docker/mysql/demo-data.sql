-- =============================================
-- 栖缘社 演示数据（可选，默认不挂载进生产初始化流程）
-- =============================================
-- 说明：
--   - 本文件仅供开发 / 演示环境使用，用于快速填充示例内容
--   - 生产部署时【不要】挂载本文件到 docker-entrypoint-initdb.d
--   - 使用方式（在已有数据库上手动导入）：
--       docker exec -i qys_mysql mysql -uroot -p qys_match < docker/mysql/demo-data.sql
--   - 包含：示例红娘、示例热门问题、示例举报数据、演示用户
-- =============================================

SET NAMES utf8mb4;
USE `qys_match`;

-- =============================================
-- 示例红娘数据
-- =============================================
INSERT INTO `matchmakers` (`name`, `avatar`, `title`, `wechat`, `phone`, `description`, `isActive`, `sortOrder`) VALUES
('李老师', 'https://example.com/avatar1.jpg', '资深婚恋顾问', 'lilaoshi001', '13800138001', '从事婚恋行业10年，成功促成数百对佳缘', 1, 1),
('王红娘', 'https://example.com/avatar2.jpg', '专业红娘顾问', 'wanghongniang', '13800138002', '擅长高端人群匹配，服务过众多企业家和精英人士', 1, 2),
('张老师', 'https://example.com/avatar3.jpg', '情感分析师', 'zhanglaoshi', '13800138003', '国家二级心理咨询师，从业8年', 1, 3);

-- =============================================
-- 示例热门问题
-- =============================================
INSERT INTO `hot_questions` (`title`, `content`, `isActive`, `sortOrder`) VALUES
('你理想的婚姻生活是什么样的？', '描述你心中理想的婚姻生活状态', 1, 1),
('你觉得婚恋中最重要的品质是什么？', '在寻找另一半时，你最看重对方的哪些品质？', 1, 2),
('你对未来的职业规划是怎样的？', '谈谈你对未来职业发展的规划和目标', 1, 3),
('你如何看待婚后与父母同住的问题？', '对于婚后是否与父母同住，你的想法是？', 1, 4),
('你认为两个人在一起最重要的是什么？', '维系一段关系最重要的是什么？', 1, 5);

-- =============================================
-- 演示用户（非管理员账号；管理员在 admin_users 表由应用启动时自动创建）
-- =============================================
INSERT INTO `users` (`openid`, `nickname`, `avatar`, `phone`, `gender`, `status`, `isVip`, `isRealName`) VALUES
('demo_default_openid', '演示用户', 'https://example.com/demo.png', '13800000000', 1, 1, 0, 1);

-- =============================================
-- 示例举报数据（演示用）
-- =============================================
INSERT INTO `reports` (`reporterId`, `targetId`, `type`, `reason`, `description`, `status`, `createdAt`) VALUES
(2, 3, 'user', 'fake_info', '该用户资料与实际情况严重不符，年龄和照片都有造假嫌疑', 0, NOW() - INTERVAL 2 DAY),
(3, 5, 'content', 'harassment', '该用户多次在私信中发送骚扰信息，内容低俗不堪', 0, NOW() - INTERVAL 3 DAY),
(4, 6, 'photo', 'fraud', '该用户使用的照片为网络图片，涉嫌盗用他人照片进行诈骗', 0, NOW() - INTERVAL 1 DAY),
(5, 2, 'user', 'abuse', '该用户在问答区对我进行人身攻击和辱骂', 0, NOW() - INTERVAL 5 DAY),
(6, 4, 'content', 'other', '发布的动态内容涉嫌传播虚假信息', 1, NOW() - INTERVAL 10 DAY),
(3, 7, 'user', 'fake_info', '职业和收入信息造假，实际身份与描述不符', 1, NOW() - INTERVAL 7 DAY),
(7, 2, 'content', 'harassment', '私聊频繁发送不堪信息，已拉黑仍继续骚扰', 0, NOW() - INTERVAL 12 HOUR),
(2, 8, 'photo', 'other', '头像照片含有违规内容，不符合平台规范', 0, NOW() - INTERVAL 4 DAY),
(4, 3, 'user', 'fraud', '诱导线下见面并要求转账，涉嫌婚恋诈骗', 2, NOW() - INTERVAL 15 DAY),
(8, 5, 'content', 'abuse', '在评论中使用侮辱性语言攻击他人', 2, NOW() - INTERVAL 20 DAY);
