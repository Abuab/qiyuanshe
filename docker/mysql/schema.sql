-- =============================================
-- 栖缘社完整建表结构（从生产库 lingtong_match 导出）
-- 生成时间: 2026-08-21 02:37:54
-- 从零部署时由 docker-entrypoint-initdb.d/01-schema.sql 执行
-- =============================================

SET NAMES utf8mb4;
USE `lingtong_match`;


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activities` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subtitle` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `coverImage` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `activityType` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'latest',
  `headerType` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'poster',
  `compressedCover` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `headerConfig` json DEFAULT NULL,
  `signUpEndTime` datetime DEFAULT NULL,
  `startTime` datetime NOT NULL,
  `endTime` datetime NOT NULL,
  `location` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `maxParticipants` int NOT NULL DEFAULT '0',
  `currentParticipants` int NOT NULL DEFAULT '0',
  `status` tinyint NOT NULL DEFAULT '0',
  `isActive` tinyint NOT NULL DEFAULT '1',
  `sortOrder` int NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `creatorId` int DEFAULT NULL,
  `detailBlocks` json DEFAULT NULL,
  `sceneBlocks` json DEFAULT NULL,
  `deletedAt` datetime DEFAULT NULL,
  `showDetailTab` tinyint NOT NULL DEFAULT '1' COMMENT '是否显示活动详情Tab',
  `showSceneTab` tinyint NOT NULL DEFAULT '1' COMMENT '是否显示活动现场Tab',
  PRIMARY KEY (`id`),
  KEY `IDX_activities_status` (`status`),
  KEY `IDX_activities_signUpEndTime` (`signUpEndTime`),
  KEY `idx_activities_list` (`isActive`,`sortOrder`,`createdAt` DESC)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `activity_signups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activity_signups` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `activityId` bigint NOT NULL,
  `userId` bigint NOT NULL,
  `realName` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_activity_signups_activityId` (`activityId`),
  KEY `IDX_activity_signups_userId` (`userId`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `address_region`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `address_region` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `parentId` bigint NOT NULL DEFAULT '0',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `level` tinyint NOT NULL COMMENT '1=省 2=市 3=区 4=街道',
  `code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '行政区划代码',
  PRIMARY KEY (`id`),
  KEY `IDX_7348d319f9da504d9cbbec4790` (`parentId`),
  KEY `IDX_bd51759d6677710235e8a2b3b4` (`level`)
) ENGINE=InnoDB AUTO_INCREMENT=659012506 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `admin_audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `adminId` int NOT NULL,
  `adminUsername` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `module` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `method` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `detail` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_adminId` (`adminId`),
  KEY `idx_action` (`action`),
  KEY `idx_module` (`module`),
  KEY `idx_createdAt` (`createdAt`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `admin_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nickname` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `role` enum('super_admin','matchmaker','operator','readonly') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'readonly',
  `status` tinyint NOT NULL DEFAULT '1',
  `mfaSecret` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isMfaEnabled` tinyint NOT NULL DEFAULT '0',
  `tokenVersion` int NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `avatar` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_2873882c38e8c07d98cb64f962` (`username`),
  KEY `IDX_8be478f8216a77102a26be3fc1` (`role`),
  KEY `IDX_a1e06a11f636b590dddad3eb48` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `agreement_log_storage_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `agreement_log_storage_configs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `configKey` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `configValue` text COLLATE utf8mb4_unicode_ci,
  `description` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_eeaeef2221216a5cc0b9bc88fb` (`configKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `agreements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `agreements` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `isActive` tinyint NOT NULL DEFAULT '1',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_call_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_call_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `userId` bigint DEFAULT NULL,
  `callType` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `consumeCount` int NOT NULL DEFAULT '1',
  `ipAddress` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `userAgent` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `deviceFingerprint` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `requestSummary` text COLLATE utf8mb4_unicode_ci,
  `responseStatus` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'success',
  `responseMs` int NOT NULL DEFAULT '0',
  `safetyFlag` tinyint NOT NULL DEFAULT '0',
  `isDeleted` tinyint NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_70215e0c4ea1084288227fac50` (`userId`),
  KEY `IDX_7a0bfa9fe913764cf60da72b7a` (`callType`),
  KEY `IDX_6016295cabb50ffd348f30f98e` (`deviceFingerprint`,`createdAt`),
  KEY `IDX_01e11df037e0afd4f9cba68da1` (`ipAddress`,`createdAt`),
  KEY `IDX_7e51484ad3bce112366e2f31db` (`callType`,`createdAt`),
  KEY `IDX_d9bdc0c2b0337acfebbab9b3df` (`userId`,`callType`),
  CONSTRAINT `FK_70215e0c4ea1084288227fac506` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=186 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_feature_switch_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_feature_switch_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `featureKey` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `oldValue` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `newValue` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `operatorId` int DEFAULT NULL,
  `ipAddress` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_57c48013624074c0b6f4e7b10a` (`operatorId`),
  KEY `IDX_c2f2f779a0513a96459f269de9` (`operatorId`,`createdAt`),
  KEY `IDX_e075c8d016daee528ac6b2b68f` (`featureKey`,`createdAt`),
  CONSTRAINT `FK_57c48013624074c0b6f4e7b10a7` FOREIGN KEY (`operatorId`) REFERENCES `admin_users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_fun_quiz_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_fun_quiz_reports` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `userId` bigint NOT NULL,
  `userBirthDay` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `taBirthDay` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userBirthHour` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `taBirthHour` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `userZodiac` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `taZodiac` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userConstellation` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `taConstellation` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `personalityAnalysis` varchar(800) COLLATE utf8mb4_unicode_ci NOT NULL,
  `relationshipAdvice` varchar(800) COLLATE utf8mb4_unicode_ci NOT NULL,
  `timeNodes` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `keywords` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `generationMs` int NOT NULL DEFAULT '0',
  `aiCallLogId` bigint DEFAULT NULL,
  `isDeleted` tinyint NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_4c580d1611c502fb00b8bb5144` (`userId`),
  KEY `IDX_ff6cb68134e2f37968f8d4492e` (`userBirthDay`),
  KEY `IDX_bab4e0d85be3dca06769a23a2a` (`taBirthDay`),
  KEY `IDX_5b4a31a6ba0f9bb15c561d0c26` (`userBirthDay`,`taBirthDay`,`createdAt`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_match_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_match_reports` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `userId` bigint NOT NULL,
  `targetUserId` bigint NOT NULL,
  `overallScore` tinyint NOT NULL,
  `valuesScore` tinyint NOT NULL,
  `lifestyleScore` tinyint NOT NULL,
  `futurePlanScore` tinyint NOT NULL,
  `analysisText` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `adviceList` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `userTagCount` int NOT NULL DEFAULT '0',
  `targetTagCount` int NOT NULL DEFAULT '0',
  `overlapTagCount` int NOT NULL DEFAULT '0',
  `userAnswerCount` int NOT NULL DEFAULT '0',
  `targetAnswerCount` int NOT NULL DEFAULT '0',
  `generationMs` int NOT NULL DEFAULT '0',
  `aiCallLogId` bigint DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_053bc64f01d807e00316d84fb6` (`userId`,`targetUserId`),
  KEY `IDX_4e025997a53e70998587a29ce2` (`targetUserId`),
  KEY `IDX_5596b54d3c0a4e3f5151fe8663` (`userId`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_provider_balances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_provider_balances` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `providerId` bigint NOT NULL,
  `currentBalance` decimal(18,6) NOT NULL DEFAULT '0.000000',
  `lastQueryAt` datetime DEFAULT NULL,
  `alertThreshold` decimal(18,6) NOT NULL DEFAULT '0.000000',
  `alertStatus` enum('normal','alerting','notified') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal',
  `alertCount` int NOT NULL DEFAULT '0',
  `lastAlertAt` datetime DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_81d175ea5b341ac51445fa0aee` (`providerId`),
  CONSTRAINT `FK_81d175ea5b341ac51445fa0aeeb` FOREIGN KEY (`providerId`) REFERENCES `ai_provider_configs` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_provider_call_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_provider_call_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `providerId` bigint NOT NULL,
  `callType` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` bigint DEFAULT NULL,
  `requestSummary` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `responseSummary` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `inputTokens` int NOT NULL DEFAULT '0',
  `outputTokens` int NOT NULL DEFAULT '0',
  `durationMs` int NOT NULL DEFAULT '0',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'success',
  `errorMessage` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ipAddress` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_51b0c63ee5a358ebfbebc5f707` (`status`,`createdAt`),
  KEY `IDX_bdd553d4bfd9e057688473877b` (`userId`),
  KEY `IDX_535acdc7c287f15fab91a9cba7` (`callType`,`createdAt`),
  KEY `IDX_6e1dc00c088f082898d085305a` (`providerId`,`createdAt`),
  CONSTRAINT `FK_99737f506a6af59125a36bbf952` FOREIGN KEY (`providerId`) REFERENCES `ai_provider_configs` (`id`),
  CONSTRAINT `FK_bdd553d4bfd9e057688473877bc` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=242 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_provider_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_provider_configs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `providerKey` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `displayName` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apiKeyEncrypted` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `apiBase` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modelName` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `isEnabled` tinyint NOT NULL DEFAULT '1',
  `isDefault` tinyint NOT NULL DEFAULT '0',
  `weight` int NOT NULL DEFAULT '10',
  `priority` int NOT NULL DEFAULT '100',
  `balanceQueryUrl` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isDeleted` tinyint NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_0c2addc405add2e0f735187de4` (`providerKey`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ai_user_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_user_profiles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `userId` bigint NOT NULL,
  `summary` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `answerCount` int NOT NULL DEFAULT '0',
  `tagCount` int NOT NULL DEFAULT '0',
  `version` int NOT NULL DEFAULT '1',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal',
  `removeReason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `removedBy` bigint DEFAULT NULL,
  `removedAt` datetime DEFAULT NULL,
  `generationMs` int DEFAULT NULL,
  `isDeleted` tinyint NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_b2cb60c5faba406fda064cd0eb` (`userId`),
  KEY `IDX_4a788d84fbca8ddeb92c117dc7` (`status`),
  KEY `IDX_ce7a4f7bf8b07208e25829914b` (`userId`,`status`),
  CONSTRAINT `FK_b2cb60c5faba406fda064cd0eb0` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `answer_likes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `answer_likes` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `answerId` bigint NOT NULL,
  `userId` bigint NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_answer_likes_user_answer` (`userId`,`answerId`),
  KEY `IDX_bf86068d436c5cf83064866de9` (`answerId`),
  KEY `IDX_e69ede58d9f4e7ca535d1545b7` (`userId`),
  CONSTRAINT `FK_bf86068d436c5cf83064866de9c` FOREIGN KEY (`answerId`) REFERENCES `question_answers` (`id`),
  CONSTRAINT `FK_e69ede58d9f4e7ca535d1545b7a` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `targetType` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `targetId` int NOT NULL,
  `action` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `adminId` int DEFAULT NULL,
  `adminNote` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `submitterId` bigint DEFAULT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `aiResult` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `aiScore` decimal(3,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_430af08094aa1487c0a2a84026` (`targetType`),
  KEY `IDX_fcfb9137823075fb3162b82f73` (`targetId`),
  KEY `IDX_audit_logs_submitterId` (`submitterId`),
  CONSTRAINT `FK_34beea391071bcc113862236d9f` FOREIGN KEY (`submitterId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=251 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `broadcast_notification_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `broadcast_notification_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `senderId` int DEFAULT NULL COMMENT '发送管理员ID',
  `title` varchar(200) NOT NULL COMMENT '消息标题',
  `content` text NOT NULL COMMENT '消息内容',
  `totalSent` int DEFAULT '0' COMMENT '发送用户数',
  `targetUserIds` json DEFAULT NULL COMMENT '目标用户ID列表(null=全部用户)',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='群发通知日志';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `chat_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_messages` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `fromUserId` bigint NOT NULL,
  `toUserId` bigint NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'text',
  `isRead` tinyint NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `isProxy` tinyint NOT NULL DEFAULT '0',
  `proxyBy` int DEFAULT NULL,
  `proxyName` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `proxyTime` datetime DEFAULT NULL,
  `deletedBySender` tinyint NOT NULL DEFAULT '0',
  `deletedByReceiver` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `IDX_9ee145fd616227448de5364687` (`fromUserId`),
  KEY `IDX_fbfdf0b8ee76855843441cc755` (`toUserId`),
  KEY `idx_chat_from_created` (`fromUserId`,`createdAt` DESC),
  KEY `idx_chat_to_created` (`toUserId`,`createdAt` DESC),
  KEY `IDX_chat_messages_conversation` (`fromUserId`,`toUserId`,`createdAt`),
  KEY `idx_chat_unread_group` (`toUserId`,`isRead`,`fromUserId`),
  KEY `idx_chat_pair_latest` ((least(`fromUserId`,`toUserId`)),(greatest(`fromUserId`,`toUserId`)),`id` DESC),
  CONSTRAINT `FK_9ee145fd616227448de53646872` FOREIGN KEY (`fromUserId`) REFERENCES `users` (`id`),
  CONSTRAINT `FK_fbfdf0b8ee76855843441cc7551` FOREIGN KEY (`toUserId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=314 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `chat_monitor_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_monitor_sessions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `operatorId` int NOT NULL,
  `targetUserId` bigint NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `endedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_monitor_op` (`operatorId`),
  KEY `idx_monitor_target_user` (`targetUserId`),
  KEY `idx_monitor_op_status` (`operatorId`,`status`),
  KEY `idx_monitor_target` (`targetUserId`),
  KEY `idx_monitor_op_created` (`operatorId`,`createdAt` DESC),
  CONSTRAINT `FK_0f886700ff2c12c0648ca54e8c9` FOREIGN KEY (`targetUserId`) REFERENCES `users` (`id`),
  CONSTRAINT `FK_48a951499cb99e58e6cb0d2c224` FOREIGN KEY (`operatorId`) REFERENCES `admin_users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `chat_operation_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_operation_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `operatorId` int NOT NULL,
  `action` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `targetUserId` bigint DEFAULT NULL,
  `peerUserId` bigint DEFAULT NULL,
  `content` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_oplog_op` (`operatorId`),
  KEY `idx_oplog_target` (`targetUserId`),
  KEY `idx_oplog_target_time` (`targetUserId`,`createdAt`),
  KEY `idx_oplog_op_time` (`operatorId`,`createdAt`),
  KEY `idx_oplog_created` (`createdAt` DESC),
  CONSTRAINT `FK_4646aac39331af3e104aa7e5116` FOREIGN KEY (`operatorId`) REFERENCES `admin_users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=102 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `circle_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `circle_members` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `circleId` bigint NOT NULL,
  `userId` bigint NOT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `sort_order` int NOT NULL DEFAULT '0',
  `sortOrder` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_circle_user` (`circleId`,`userId`),
  KEY `idx_circle_members_sort` (`circleId`,`sortOrder`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `circle_posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `circle_posts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `circleId` bigint NOT NULL,
  `userId` bigint NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `images` json DEFAULT NULL,
  `likes` int NOT NULL DEFAULT '0',
  `comments` int NOT NULL DEFAULT '0',
  `status` tinyint NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_f5ffc22fabedbc23ac54d552e3` (`circleId`),
  KEY `IDX_8428435fb102ca62f79e76fb5b` (`userId`),
  KEY `idx_circle_posts_list` (`circleId`,`status`,`createdAt` DESC),
  CONSTRAINT `FK_f5ffc22fabedbc23ac54d552e36` FOREIGN KEY (`circleId`) REFERENCES `circles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `circles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `circles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `sort` int NOT NULL DEFAULT '0',
  `status` tinyint NOT NULL DEFAULT '1',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `bannerImage` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Banner',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `content_safety_audits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `content_safety_audits` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `aiCallLogId` bigint NOT NULL,
  `originalContent` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `hitWords` text COLLATE utf8mb4_unicode_ci,
  `result` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pass',
  `blockReason` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `detail` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reviewedBy` int DEFAULT NULL,
  `reviewedAt` datetime DEFAULT NULL,
  `isDeleted` tinyint NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_e3957180f767064bba1cc329bd` (`aiCallLogId`),
  KEY `IDX_b2c45cde35db7e1bd326617b8d` (`result`),
  KEY `IDX_144247c062b86b1e61542a1db8` (`blockReason`),
  KEY `IDX_9265e7a2311286ed5c2bbce073` (`blockReason`,`createdAt`),
  KEY `IDX_ff6e0cf3d84498feed61bfc12c` (`result`,`createdAt`),
  CONSTRAINT `FK_e3957180f767064bba1cc329bdd` FOREIGN KEY (`aiCallLogId`) REFERENCES `ai_call_logs` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=157 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `copy_exposure_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `copy_exposure_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `slotId` int NOT NULL,
  `itemId` int NOT NULL,
  `userKey` varchar(80) NOT NULL,
  `statDate` date NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_copy_exposure_slot_user_date` (`slotId`,`userKey`,`statDate`),
  KEY `IDX_copy_exposure_userKey` (`userKey`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `copy_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `copy_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `slotId` int NOT NULL,
  `mainText` varchar(255) NOT NULL,
  `subText` varchar(255) DEFAULT NULL,
  `weight` int NOT NULL DEFAULT '50',
  `targetLoginState` varchar(10) DEFAULT NULL,
  `targetGender` tinyint DEFAULT NULL,
  `targetTested` tinyint DEFAULT NULL,
  `isEnabled` tinyint NOT NULL DEFAULT '1',
  `sort` int NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_copy_items_slot_enabled` (`slotId`,`isEnabled`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `copy_slots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `copy_slots` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `pageLocation` varchar(100) DEFAULT NULL,
  `remark` varchar(255) DEFAULT NULL,
  `displayMode` varchar(20) NOT NULL DEFAULT 'carousel',
  `isSystem` tinyint NOT NULL DEFAULT '0',
  `isEnabled` tinyint NOT NULL DEFAULT '1',
  `sort` int NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_copy_slots_code` (`code`),
  KEY `IDX_copy_slots_enabled_sort` (`isEnabled`,`sort`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `copy_stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `copy_stats` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `slotId` int NOT NULL,
  `itemId` int NOT NULL,
  `statDate` date NOT NULL,
  `impressions` int NOT NULL DEFAULT '0',
  `clicks` int NOT NULL DEFAULT '0',
  `loginConversions` int NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_copy_stats_item_date` (`itemId`,`statDate`),
  KEY `IDX_copy_stats_slot` (`slotId`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `dynamic_likes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dynamic_likes` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `dynamicId` bigint NOT NULL,
  `userId` bigint NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_dynamic_likes_user_dynamic` (`userId`,`dynamicId`),
  KEY `IDX_c4c394244312688377c1116386` (`dynamicId`),
  KEY `IDX_5bcb3e40004af4a6d88f114492` (`userId`),
  CONSTRAINT `FK_5bcb3e40004af4a6d88f1144922` FOREIGN KEY (`userId`) REFERENCES `users` (`id`),
  CONSTRAINT `FK_c4c394244312688377c11163862` FOREIGN KEY (`dynamicId`) REFERENCES `dynamics` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `dynamics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dynamics` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `userId` bigint NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `images` json DEFAULT NULL,
  `totalImages` int NOT NULL DEFAULT '0',
  `likeCount` int NOT NULL DEFAULT '0',
  `commentCount` int NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `status` tinyint NOT NULL DEFAULT '1',
  `type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'text',
  `referenceId` bigint DEFAULT NULL,
  `questionId` bigint DEFAULT NULL,
  `questionTitle` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_85f0625eb0a30261960bb5095c` (`userId`),
  KEY `idx_dynamic_user_time` (`userId`,`createdAt` DESC),
  KEY `idx_dynamic_type_time` (`type`,`createdAt` DESC),
  CONSTRAINT `FK_85f0625eb0a30261960bb5095c6` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=97 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `feedbacks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feedbacks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` bigint NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `images` json DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '0',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `IDX_feedbacks_userId` (`userId`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `follows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `follows` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `target_user_id` bigint NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_5e9a4c82388720fb3cd71c1ba7` (`user_id`,`target_user_id`),
  KEY `idx_follows_user_created` (`user_id`,`created_at` DESC),
  KEY `idx_follows_target_created` (`target_user_id`,`created_at` DESC),
  CONSTRAINT `FK_941d172275662c2b9d8b9f4270c` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FK_c710db92699ebd0c5a5d91bfd19` FOREIGN KEY (`target_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=84 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `hot_questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hot_questions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `isActive` tinyint NOT NULL DEFAULT '1',
  `sortOrder` int NOT NULL DEFAULT '0',
  `answerCount` int NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `status` tinyint NOT NULL DEFAULT '1',
  `creatorId` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `match_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `match_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` bigint NOT NULL,
  `matchedUserId` bigint NOT NULL,
  `matchmakerId` bigint DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending' COMMENT 'pending/in_progress/success/failed',
  `remark` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_fea96cf83f878e7fcf3e201266` (`userId`),
  KEY `FK_ef349592fabb59d11b7097b4bd6` (`matchedUserId`),
  KEY `FK_6f9e4e756b2c4c386f671c5a4dc` (`matchmakerId`),
  CONSTRAINT `FK_6f9e4e756b2c4c386f671c5a4dc` FOREIGN KEY (`matchmakerId`) REFERENCES `matchmakers` (`id`),
  CONSTRAINT `FK_ef349592fabb59d11b7097b4bd6` FOREIGN KEY (`matchedUserId`) REFERENCES `users` (`id`),
  CONSTRAINT `FK_fea96cf83f878e7fcf3e201266f` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `matchmaker_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `matchmaker_comments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `matchmakerId` bigint NOT NULL,
  `userId` bigint NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `rating` tinyint NOT NULL DEFAULT '5',
  `status` tinyint NOT NULL DEFAULT '1',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_comments_user_matchmaker` (`userId`,`matchmakerId`),
  KEY `IDX_c34cb713c20c25b57df7c81c71` (`matchmakerId`),
  KEY `IDX_0286b82e8a372d518c8409d0b8` (`userId`),
  KEY `idx_mm_comments_user` (`userId`,`status`,`createdAt` DESC),
  CONSTRAINT `FK_c34cb713c20c25b57df7c81c710` FOREIGN KEY (`matchmakerId`) REFERENCES `matchmakers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `matchmaker_reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `matchmaker_reviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` bigint NOT NULL,
  `matchmakerId` bigint NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `difficulty` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '好搞定/不好搞定/一般',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_reviews_user_matchmaker` (`userId`,`matchmakerId`),
  KEY `IDX_5e73d658a9d23e3e3df63d5c49` (`userId`),
  KEY `IDX_9cea9051ab1cb59b2b54d5d6c1` (`matchmakerId`),
  CONSTRAINT `FK_5e73d658a9d23e3e3df63d5c49a` FOREIGN KEY (`userId`) REFERENCES `users` (`id`),
  CONSTRAINT `FK_9cea9051ab1cb59b2b54d5d6c1c` FOREIGN KEY (`matchmakerId`) REFERENCES `matchmakers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `matchmakers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `matchmakers` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wechat` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `qrCode` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `isActive` tinyint NOT NULL DEFAULT '1',
  `sortOrder` int NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `message_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `message_templates` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '模板ID',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '模板名称',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '默认消息标题',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '模板内容',
  `category` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT 'notification' COMMENT '分类',
  `placeholders` json DEFAULT NULL COMMENT '支持的占位符列表',
  `useCount` int NOT NULL DEFAULT '0' COMMENT '使用次数',
  `lastUsedAt` datetime DEFAULT NULL COMMENT '最近一次使用时间',
  `isDeleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除',
  `sortOrder` int NOT NULL DEFAULT '0' COMMENT '排序',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`),
  KEY `idx_isDeleted` (`isDeleted`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消息模板表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `timestamp` bigint NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `notices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('popup','list') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'list',
  `status` tinyint NOT NULL DEFAULT '1',
  `sortOrder` int NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_notices_type` (`type`),
  KEY `IDX_notices_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `notify_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notify_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `channel` varchar(30) NOT NULL,
  `success` tinyint NOT NULL DEFAULT '1',
  `source` varchar(50) NOT NULL,
  `content` varchar(500) DEFAULT NULL,
  `notifyType` varchar(30) NOT NULL,
  `errorMessage` text,
  `userId` int DEFAULT NULL,
  `userNickname` varchar(100) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `auditStatus` tinyint DEFAULT NULL,
  `adminName` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_d10478cf4b211c4db381a0b720` (`notifyType`),
  KEY `IDX_2e63a2e10855c2b961e66a1e41` (`userId`),
  KEY `idx_notify_channel` (`channel`,`createdAt` DESC),
  KEY `idx_notify_source` (`source`,`createdAt` DESC)
) ENGINE=InnoDB AUTO_INCREMENT=280 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `operation_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `operation_tags` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '标签ID',
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '标签名称',
  `color` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT '#409EFF' COMMENT '标签颜色',
  `isEnabled` tinyint NOT NULL DEFAULT '1' COMMENT '启用状态',
  `sortOrder` int NOT NULL DEFAULT '0' COMMENT '排序',
  `isDeleted` tinyint NOT NULL DEFAULT '0' COMMENT '软删除',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_isEnabled` (`isEnabled`),
  KEY `idx_isDeleted` (`isDeleted`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='运营标签表';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `personality_answer_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personality_answer_records` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `userId` bigint NOT NULL,
  `questionId` int NOT NULL,
  `optionId` int NOT NULL,
  `resultId` bigint DEFAULT NULL,
  `isDeleted` tinyint NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_par_user_deleted` (`userId`,`isDeleted`),
  KEY `IDX_par_user` (`userId`),
  KEY `IDX_par_result` (`resultId`),
  KEY `IDX_par_deleted_q_o` (`isDeleted`,`questionId`,`optionId`)
) ENGINE=InnoDB AUTO_INCREMENT=121 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `personality_dimensions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personality_dimensions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `name` varchar(30) NOT NULL,
  `directionAKey` varchar(20) NOT NULL,
  `directionALabel` varchar(30) NOT NULL,
  `directionBKey` varchar(20) NOT NULL,
  `directionBLabel` varchar(30) NOT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `sort` int NOT NULL DEFAULT '0',
  `isEnabled` tinyint NOT NULL DEFAULT '1',
  `isDeleted` tinyint NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_pd_code` (`code`),
  KEY `IDX_pd_enabled_sort` (`isEnabled`,`sort`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `personality_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personality_options` (
  `id` int NOT NULL AUTO_INCREMENT,
  `questionId` int NOT NULL,
  `optionLabel` varchar(10) NOT NULL,
  `content` varchar(500) NOT NULL,
  `directionKey` varchar(20) NOT NULL,
  `score` int NOT NULL DEFAULT '1',
  `sort` int NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_po_question` (`questionId`)
) ENGINE=InnoDB AUTO_INCREMENT=65 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `personality_questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personality_questions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `content` varchar(500) NOT NULL,
  `dimensionId` int NOT NULL,
  `sort` int NOT NULL DEFAULT '0',
  `isEnabled` tinyint NOT NULL DEFAULT '1',
  `isDeleted` tinyint NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_pq_enabled_sort` (`isEnabled`,`sort`),
  KEY `IDX_pq_dim_enabled` (`dimensionId`,`isEnabled`),
  KEY `IDX_pq_dim` (`dimensionId`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `personality_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personality_results` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `userId` bigint NOT NULL,
  `typeId` int DEFAULT NULL,
  `typeCode` varchar(10) DEFAULT NULL,
  `dimensionScores` text,
  `testedAt` datetime DEFAULT NULL,
  `isDeleted` tinyint NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `aiInterpretation` text,
  `aiInterpretationAt` datetime DEFAULT NULL,
  `durationSeconds` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_pr_user` (`userId`),
  KEY `IDX_pr_testedAt` (`testedAt`),
  KEY `IDX_pr_typeCode_deleted` (`typeCode`,`isDeleted`),
  KEY `IDX_pr_type_deleted_tested` (`typeCode`,`isDeleted`,`testedAt`),
  KEY `IDX_pr_deleted_tested` (`isDeleted`,`testedAt`),
  KEY `IDX_pr_deleted_duration` (`isDeleted`,`durationSeconds`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `personality_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personality_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(10) NOT NULL,
  `name` varchar(50) NOT NULL,
  `nickname` varchar(50) DEFAULT NULL,
  `summary` varchar(255) DEFAULT NULL,
  `description` text,
  `radarEnergy` int NOT NULL DEFAULT '50',
  `radarInfo` int NOT NULL DEFAULT '50',
  `radarDecision` int NOT NULL DEFAULT '50',
  `radarLifestyle` int NOT NULL DEFAULT '50',
  `matchTypes` text,
  `sort` int NOT NULL DEFAULT '0',
  `isEnabled` tinyint NOT NULL DEFAULT '1',
  `isDeleted` tinyint NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_pt_code` (`code`),
  KEY `IDX_pt_enabled_sort` (`isEnabled`,`sort`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `profile_visits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `profile_visits` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `visitor_user_id` bigint NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_78203abf010d4ffadc14c4a64d` (`user_id`,`visitor_user_id`,`created_at`),
  KEY `IDX_profile_visits_visitorUserId` (`visitor_user_id`),
  KEY `idx_visits_visitor_created` (`visitor_user_id`,`created_at` DESC),
  CONSTRAINT `FK_32e5e2de0085d7d59876875621a` FOREIGN KEY (`visitor_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FK_ee6dd19889d41f3411a5539cfaa` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=870 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `question_answers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `question_answers` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `questionId` bigint NOT NULL,
  `userId` bigint NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `photos` json DEFAULT NULL,
  `likeCount` int NOT NULL DEFAULT '0',
  `status` tinyint NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_cc2642c5e8deced1208e60ce95` (`questionId`),
  KEY `IDX_6bafb4f8e7545b457323b05cfa` (`userId`),
  KEY `idx_qa_question_status_time` (`questionId`,`status`,`createdAt` DESC),
  KEY `idx_qa_user_created` (`userId`,`createdAt` DESC),
  CONSTRAINT `FK_6bafb4f8e7545b457323b05cfac` FOREIGN KEY (`userId`) REFERENCES `users` (`id`),
  CONSTRAINT `FK_cc2642c5e8deced1208e60ce950` FOREIGN KEY (`questionId`) REFERENCES `hot_questions` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `quick_question_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quick_question_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort` int NOT NULL DEFAULT '0',
  `isEnabled` tinyint NOT NULL DEFAULT '1',
  `isDeleted` tinyint NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_c974b19cef26f5feaaab42d665` (`isEnabled`),
  KEY `IDX_32c036ceab5de9a3b896ea009b` (`sort`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `quick_questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quick_questions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `content` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoryId` int DEFAULT NULL,
  `sort` int NOT NULL DEFAULT '0',
  `isEnabled` tinyint NOT NULL DEFAULT '1',
  `clickCount` int NOT NULL DEFAULT '0',
  `isDeleted` tinyint NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_b4ae8fad4ef3436a1bab1aa943` (`categoryId`),
  KEY `IDX_46827d1282d7c92534f2d4465c` (`sort`),
  KEY `IDX_7404666a0c97dbc5b8b3faa438` (`categoryId`,`isEnabled`),
  KEY `IDX_6a2b0a5fceaf52514afb164c6a` (`isEnabled`,`sort`),
  CONSTRAINT `FK_b4ae8fad4ef3436a1bab1aa943c` FOREIGN KEY (`categoryId`) REFERENCES `quick_question_categories` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `real_name_identities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `real_name_identities` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `userId` bigint NOT NULL,
  `realName` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `idCard` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `idCardHash` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `eidBizSeqNo` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `verifiedAt` datetime DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `userId` (`userId`),
  KEY `idx_userId` (`userId`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `red_line_usages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `red_line_usages` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `userId` bigint NOT NULL,
  `targetUserId` bigint NOT NULL,
  `unlockedContact` varchar(100) DEFAULT NULL,
  `quotaId` bigint DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_e2a67dacbc39cb33f5374e47c7` (`userId`),
  KEY `IDX_db80b27c5e2bdf81d7f1622e59` (`userId`,`targetUserId`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reporterId` bigint NOT NULL,
  `targetId` bigint NOT NULL,
  `type` enum('user','content','photo') COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` enum('harassment','fraud','fake_info','abuse','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `evidence` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '0',
  `result` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `handlerId` int DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_dab4d78b3be05c1ca4a626f57f` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `single_promises`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `single_promises` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `userId` bigint unsigned NOT NULL,
  `realName` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `signatureUrl` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '0-, 1-, 2-',
  `rejectReason` text COLLATE utf8mb4_unicode_ci,
  `auditedBy` bigint unsigned DEFAULT NULL,
  `auditTime` datetime DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_single_promises_userId` (`userId`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `success_cases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `success_cases` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cover` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `senderUserId` bigint DEFAULT NULL,
  `displayNickname` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `senderAvatar` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `storyContent` text COLLATE utf8mb4_unicode_ci,
  `photos` json DEFAULT NULL,
  `publishDate` date DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `sort` int NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_success_cases_senderUserId` (`senderUserId`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `system_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_configs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `configKey` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `configValue` text COLLATE utf8mb4_unicode_ci,
  `description` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_629779e823a9cc065bf964a241` (`configKey`)
) ENGINE=InnoDB AUTO_INCREMENT=124 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_agreement_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_agreement_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `userId` bigint NOT NULL,
  `agreementType` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `version` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '1.0',
  `action` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ipAddress` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `userAgent` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `storageSource` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'local',
  `slsLogId` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_dde659a3612b40ee889c87fb35` (`userId`),
  KEY `IDX_a7421a854de311cf69bf029e58` (`agreementType`,`createdAt`),
  KEY `IDX_249accb08f92a999b266418891` (`userId`,`createdAt`),
  KEY `IDX_35e0bf09e51061f4c71ee1e158` (`userId`,`agreementType`)
) ENGINE=InnoDB AUTO_INCREMENT=114 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_agreements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_agreements` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `userId` bigint NOT NULL,
  `agreementType` varchar(50) NOT NULL,
  `version` varchar(20) NOT NULL,
  `action` varchar(20) NOT NULL,
  `ipAddress` varchar(50) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_userId` (`userId`),
  KEY `IDX_userId_agreementType` (`userId`,`agreementType`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_auths`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_auths` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `userId` bigint NOT NULL,
  `authType` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `authData` json DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '0',
  `rejectReason` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_cfa0eb5c2e790fb0ca94527656` (`userId`),
  CONSTRAINT `FK_cfa0eb5c2e790fb0ca945276569` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_blocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_blocks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `blockerId` bigint NOT NULL,
  `blockedUserId` bigint NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_user_blocks_blocker_blocked` (`blockerId`,`blockedUserId`),
  KEY `IDX_eae09d4f95afa5ae30c2838460` (`blockerId`),
  KEY `IDX_91f00e71d2c6caa9e15bca2b1f` (`blockedUserId`),
  CONSTRAINT `FK_91f00e71d2c6caa9e15bca2b1fe` FOREIGN KEY (`blockedUserId`) REFERENCES `users` (`id`),
  CONSTRAINT `FK_eae09d4f95afa5ae30c28384607` FOREIGN KEY (`blockerId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` bigint NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `senderType` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'admin',
  `senderId` int DEFAULT NULL,
  `isRead` tinyint NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_cb22b968fe41a9f8b219327fde` (`userId`),
  KEY `idx_notif_user_created` (`userId`,`createdAt` DESC),
  KEY `idx_notif_user_read` (`userId`,`isRead`),
  CONSTRAINT `FK_cb22b968fe41a9f8b219327fde8` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=140 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_photos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_photos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `userId` bigint NOT NULL,
  `photoUrl` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `isMain` tinyint NOT NULL DEFAULT '0',
  `sortOrder` int NOT NULL DEFAULT '0',
  `auditStatus` tinyint NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_5d177a33da4748e791a3bf1a7f` (`userId`),
  KEY `idx_user_photos_user_sort` (`userId`,`sortOrder`),
  CONSTRAINT `FK_5d177a33da4748e791a3bf1a7f7` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=156 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_red_line_quotas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_red_line_quotas` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `userId` bigint NOT NULL,
  `totalQuota` int NOT NULL DEFAULT '0',
  `usedCount` int NOT NULL DEFAULT '0',
  `vipPackageId` bigint DEFAULT NULL,
  `isDeleted` tinyint NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_d1d3cf27428cdf9da4a12f27f8` (`userId`),
  KEY `IDX_4ddf82933886cc0d70cf075be9` (`userId`,`isDeleted`),
  CONSTRAINT `FK_d1d3cf27428cdf9da4a12f27f8f` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_red_line_usage_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_red_line_usage_records` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `userId` bigint NOT NULL,
  `targetUserId` bigint NOT NULL,
  `consumedCount` int NOT NULL DEFAULT '1',
  `unlockedContact` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unlockSource` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'vip_gift',
  `quotaId` bigint DEFAULT NULL,
  `isDeleted` tinyint NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_19ed3ae72e03dc9accd69d2b89` (`userId`),
  KEY `IDX_34fc517f7c4aa650c6ddf22773` (`targetUserId`),
  KEY `IDX_e6e3bc3029380d0b4272c11d7e` (`unlockSource`,`createdAt`),
  KEY `IDX_312d7e2ca74e886e05154abac5` (`userId`,`createdAt`),
  KEY `IDX_ca60acbf3780a66b8f01bd3283` (`userId`,`targetUserId`),
  CONSTRAINT `FK_19ed3ae72e03dc9accd69d2b89a` FOREIGN KEY (`userId`) REFERENCES `users` (`id`),
  CONSTRAINT `FK_34fc517f7c4aa650c6ddf22773d` FOREIGN KEY (`targetUserId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_system_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_system_tags` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `iconUrl` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `sortOrder` int NOT NULL DEFAULT '0',
  `isEnabled` tinyint NOT NULL DEFAULT '1',
  `isDeleted` tinyint NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_13f67e021e5b252ffc87a87f1c` (`category`),
  KEY `IDX_26dc56258ea93eb330f349b829` (`category`,`sortOrder`),
  KEY `IDX_d2aa14c0e3a16df8375b834d79` (`category`,`isEnabled`),
  KEY `IDX_user_system_tags_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_tag_selections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_tag_selections` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `userId` bigint NOT NULL,
  `tagId` bigint NOT NULL,
  `isSelected` tinyint NOT NULL DEFAULT '1',
  `isDeleted` tinyint NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_8531004c2e29c91a133eeee220` (`userId`,`tagId`),
  KEY `IDX_d54708527c061fe41587fbf1fd` (`userId`),
  KEY `IDX_a2fa8acd64e7a914430d3ec31a` (`tagId`),
  KEY `IDX_870da6aef0513c332465952386` (`tagId`,`isDeleted`),
  CONSTRAINT `FK_a2fa8acd64e7a914430d3ec31ae` FOREIGN KEY (`tagId`) REFERENCES `user_system_tags` (`id`),
  CONSTRAINT `FK_d54708527c061fe41587fbf1fdf` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_top_card_quotas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_top_card_quotas` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `userId` bigint NOT NULL,
  `date` date NOT NULL,
  `totalQuota` int NOT NULL DEFAULT '0',
  `usedCount` int NOT NULL DEFAULT '0',
  `vipPackageId` bigint DEFAULT NULL,
  `isDeleted` tinyint NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_88b1c6a60a9a362c2fd153dc5c` (`userId`),
  KEY `IDX_d9de098a381457849332a353b7` (`date`),
  KEY `IDX_b75952ca6457bd53b084a21516` (`userId`,`date`,`isDeleted`),
  CONSTRAINT `FK_88b1c6a60a9a362c2fd153dc5c6` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_top_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_top_records` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `userId` bigint NOT NULL,
  `topStartTime` datetime NOT NULL,
  `topEndTime` datetime NOT NULL,
  `source` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'purchase',
  `status` tinyint NOT NULL DEFAULT '1',
  `isDeleted` tinyint NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_abeac094ac89869e50efed4ce4` (`userId`),
  KEY `IDX_4b74f859b379b7f9094559c450` (`topEndTime`),
  KEY `IDX_68c89086cdd1c3537d9e2ba3d0` (`source`),
  KEY `IDX_b6e240c3aed96345e70d7f10e3` (`status`),
  KEY `IDX_0179ee99e0048a235f542b84c5` (`topStartTime`,`topEndTime`),
  KEY `IDX_4a958389f297ae3b08ee132834` (`source`,`createdAt`),
  KEY `IDX_f8ce48d28f029242a03cf302d5` (`userId`,`status`),
  CONSTRAINT `FK_abeac094ac89869e50efed4ce49` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `unionId` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `openid` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nickname` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `avatar` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `wechat` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gender` tinyint NOT NULL DEFAULT '0',
  `birthYear` int DEFAULT NULL,
  `height` int DEFAULT NULL,
  `weight` int DEFAULT NULL,
  `education` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `occupation` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `incomeRange` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `housingStatus` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `maritalStatus` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hometown` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `residence` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mateRequirement` text COLLATE utf8mb4_unicode_ci,
  `isRealName` tinyint NOT NULL DEFAULT '0',
  `store_certified` tinyint DEFAULT '0',
  `isVip` tinyint NOT NULL DEFAULT '0',
  `vipLevel` tinyint NOT NULL DEFAULT '0',
  `vipExpireTime` datetime DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '2',
  `password` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lastLoginAt` datetime DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `carStatus` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mfaSecret` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isMfaEnabled` tinyint NOT NULL DEFAULT '0',
  `mfaType` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none',
  `isDeleted` tinyint NOT NULL DEFAULT '0',
  `tags` text COLLATE utf8mb4_unicode_ci,
  `adminRemark` text COLLATE utf8mb4_unicode_ci,
  `deleteReason` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tokenVersion` int NOT NULL DEFAULT '0',
  `onlyChild` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `whenMarry` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `zodiac` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `constellation` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `partnerHeightMin` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `partnerEducation` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `partnerIncome` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `housingRequirement` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `partnerMaritalStatus` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `acceptChildren` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `personalityTags` text COLLATE utf8mb4_unicode_ci,
  `hopeTaTags` text COLLATE utf8mb4_unicode_ci,
  `partnerAgeRange` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `manualBoostScore` int NOT NULL DEFAULT '0',
  `pinnedExpireAt` datetime DEFAULT NULL,
  `exposurePool` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'city',
  `lastActiveAt` datetime DEFAULT NULL,
  `profileScore` tinyint NOT NULL DEFAULT '0',
  `vipPackageName` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatarReviewStatus` tinyint DEFAULT NULL,
  `protocolAgreedAt` datetime DEFAULT NULL,
  `protocolVersion` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `showBasicProfile` tinyint NOT NULL DEFAULT '1',
  `delegateToPlatform` tinyint NOT NULL DEFAULT '0',
  `voiceUrl` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `voiceAuditStatus` tinyint DEFAULT NULL,
  `birthMonth` tinyint DEFAULT NULL,
  `birthDay` tinyint DEFAULT NULL,
  `voiceDuration` int DEFAULT NULL,
  `loveQuote` text COLLATE utf8mb4_unicode_ci,
  `userId` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `eid_cert_status` tinyint NOT NULL DEFAULT '0',
  `eid_cert_time` datetime DEFAULT NULL,
  `eid_biz_seq_no` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_9c98f005249412c8333a3b2c59` (`openid`),
  UNIQUE KEY `IDX_2e7f72570180c49893f123b14b` (`unionId`),
  UNIQUE KEY `IDX_a000cca60bcf04454e72769949` (`phone`),
  UNIQUE KEY `idx_userId` (`userId`),
  KEY `IDX_523c5c5567df6de44b8dbe2ce1` (`pinnedExpireAt`),
  KEY `IDX_39fb0de6211a3cc3f76f603150` (`exposurePool`),
  KEY `IDX_bf3621536b5b398309347a53a1` (`lastActiveAt`),
  KEY `idx_users_status_created` (`status`,`createdAt` DESC),
  KEY `idx_users_gender_status` (`gender`,`status`),
  KEY `idx_users_is_deleted` (`isDeleted`,`status`),
  KEY `IDX_users_gender_status_deleted` (`gender`,`status`,`isDeleted`),
  KEY `IDX_users_isVip` (`isVip`),
  KEY `IDX_users_vipLevel` (`vipLevel`),
  KEY `IDX_users_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `vip_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vip_orders` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `userId` bigint NOT NULL,
  `orderNo` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `vipLevel` tinyint NOT NULL DEFAULT '0',
  `amount` decimal(10,2) NOT NULL,
  `payType` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '0',
  `paidAt` datetime DEFAULT NULL,
  `expireTime` datetime DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `packageId` bigint DEFAULT NULL,
  `transactionId` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `refundAmount` decimal(10,2) DEFAULT NULL,
  `isDeleted` tinyint NOT NULL DEFAULT '0',
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_19d97804e93e98e5048f2c56e1` (`orderNo`),
  KEY `IDX_c5630e241d83672e4f028b1baa` (`userId`),
  KEY `IDX_b1ab98f1d46a1755acc9bace49` (`packageId`),
  KEY `IDX_a0d02a6701936e18735e52e879` (`status`),
  KEY `IDX_fd90cd3304b8fb5bb529137b26` (`userId`,`status`),
  KEY `IDX_vip_orders_payType` (`payType`),
  KEY `IDX_vip_orders_paidAt` (`paidAt`),
  CONSTRAINT `FK_b1ab98f1d46a1755acc9bace492` FOREIGN KEY (`packageId`) REFERENCES `vip_packages` (`id`),
  CONSTRAINT `FK_c5630e241d83672e4f028b1baaf` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=65 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `vip_packages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vip_packages` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `durationDays` int NOT NULL DEFAULT '30',
  `dailyTopCards` int NOT NULL DEFAULT '0',
  `topCardValidHours` int NOT NULL DEFAULT '24',
  `redLineCount` int NOT NULL DEFAULT '0',
  `description` text COLLATE utf8mb4_unicode_ci,
  `features` text COLLATE utf8mb4_unicode_ci,
  `status` tinyint NOT NULL DEFAULT '1',
  `sortOrder` int NOT NULL DEFAULT '0',
  `isDeleted` tinyint NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_301e2a6b02935eba1d0f071913` (`status`),
  KEY `IDX_d356bcfdfe418ecb84a338fb8e` (`status`,`sortOrder`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

