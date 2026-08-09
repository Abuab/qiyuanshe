-- 活动表新增：Tab 显示控制 + 软删除字段
-- 执行日期: 2026-08-10
-- 相关 commit: 337e94b (feat: 后台积木编辑器升级)

ALTER TABLE activities
  ADD COLUMN showDetailTab TINYINT NOT NULL DEFAULT 1 COMMENT '是否显示活动详情Tab',
  ADD COLUMN showSceneTab TINYINT NOT NULL DEFAULT 1 COMMENT '是否显示活动现场Tab',
  ADD COLUMN deletedAt DATETIME NULL COMMENT '软删除时间';
