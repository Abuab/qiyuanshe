-- =============================================
-- Migration: 新增 personalityTags 字段
-- 在已有数据库上执行: 
--   docker compose exec -T mysql mysql -u root -p"${MYSQL_ROOT_PASSWORD}" lingtong_match < this_file
-- =============================================

ALTER TABLE `users` ADD COLUMN `personalityTags` JSON NULL COMMENT '个性特点标签' AFTER `tags`;
