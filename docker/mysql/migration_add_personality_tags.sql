-- =============================================
-- Migration: 新增 personalityTags + hopeTaTags 字段
-- 在已有数据库上执行: 
--   docker compose exec -T mysql mysql -u root -p"${MYSQL_ROOT_PASSWORD}" lingtong_match < this_file
-- =============================================

ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `personalityTags` JSON NULL COMMENT '个性特点标签' AFTER `tags`;
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `hopeTaTags` JSON NULL COMMENT '希望TA标签' AFTER `personalityTags`;
