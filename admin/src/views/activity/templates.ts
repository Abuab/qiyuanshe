export interface ActivityTemplate {
  key: string
  name: string
  description: string
  emoji: string
  category: '线下派对' | '主题专场' | '活动回顾' | '线上活动' | '极简快速'
  recommended?: boolean
  preset: {
    activityType?: 'latest' | 'online' | 'cp'
    headerType?: 'poster' | 'info'
    showDetailTab?: boolean
    showSceneTab?: boolean
    maxParticipants?: number
    titlePlaceholder?: string
  }
  detailBlocks: any[]
  sceneBlocks: any[]
}

/** 重新生成 blocks 数组中所有积木的 id，避免多次套用模板后 id 重复 */
export function regenerateIds(blocks: any[]): any[] {
  return blocks.map((b) => ({
    ...b,
    id: 'b_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
  }))
}

export const ACTIVITY_TEMPLATES: ActivityTemplate[] = [
  // ============================================================
  // 模板 0：空白活动
  // ============================================================
  {
    key: 'blank',
    name: '空白活动',
    description: '不套用任何模板，从零开始创建',
    emoji: '📝',
    category: '极简快速',
    preset: {
      activityType: 'latest',
      headerType: 'poster',
      showDetailTab: true,
      showSceneTab: false,
      maxParticipants: 0,
      titlePlaceholder: '请输入活动标题',
    },
    detailBlocks: [],
    sceneBlocks: [],
  },

  // ============================================================
  // 模板 1：线下相亲派对（推荐）
  // ============================================================
  {
    key: 'party',
    name: '线下相亲派对',
    description: '标准活动详情：亮点→流程→要求→须知→联系方式',
    emoji: '🎉',
    category: '线下派对',
    recommended: true,
    preset: {
      activityType: 'latest',
      headerType: 'poster',
      showDetailTab: true,
      showSceneTab: false,
      maxParticipants: 50,
      titlePlaceholder: '【活动主题，如：走心周末·浪漫赴约】',
    },
    detailBlocks: [
      { id: '__P01__', type: 'title', mainTitle: '【活动主题，如：走心周末·浪漫赴约】', subTitle: '【日期+一句话卖点】', bgColor: 'pink', textColor: '#FFFFFF' },
      { id: '__P02__', type: 'bubble', text: '【开场钩子，如：2025年已过半，你还是一个人吗？】', color: '#FFB74D', arrow: 'down', align: 'center' },
      { id: '__P03__', type: 'text', content: '【活动亮点/主办方介绍 2-4 行】\n品质交友 · 严格审核 · 真实靠谱\n只为你遇见对的人', align: 'center', color: '#666666' },
      { id: '__P04__', type: 'numbered_title', number: '01', title: '活动流程' },
      { id: '__P05__', type: 'text', content: '签到入场 → 破冰游戏 → 心动互选\n自由交流 → 心动表白 → 合影留念', align: 'center', color: '#555555' },
      { id: '__P06__', type: 'numbered_title', number: '02', title: '报名要求' },
      { id: '__P07__', type: 'highlight_tag', text: '【如：男女比例 1:1】', inline: true },
      { id: '__P08__', type: 'text', content: '【年龄/学历/收入等要求】\n22-38周岁 · 单身 · 有稳定工作', align: 'left', color: '#666666' },
      { id: '__P09__', type: 'numbered_title', number: '03', title: '温馨提示' },
      { id: '__P10__', type: 'text', content: '✔ 活动前一晚不要熬夜，保持最佳状态\n✔ 建议提前10分钟到场，便于签到与交流\n✔ 着装得体，给彼此留下好的第一印象\n✔ 如有任何疑问，随时联系红娘老师', align: 'left', color: '#666666' },
      { id: '__P11__', type: 'numbered_title', number: '04', title: '活动声明' },
      { id: '__P12__', type: 'text', content: '【活动声明占位】\n报名即视为同意本活动声明；\n现场照片仅用于活动回顾，人像将做打码处理；\n活动最终解释权归栖缘社所有。', align: 'left', color: '#999999' },
      { id: '__P13__', type: 'divider', style: 'default' },
      { id: '__P14__', type: 'contact', phone: '【红娘电话】', qrCode: '', source: '【如：扫码添加红娘微信报名】' },
    ],
    sceneBlocks: [],
  },

  // ============================================================
  // 模板 2：活动现场回顾
  // ============================================================
  {
    key: 'recap',
    name: '活动现场回顾',
    description: '编号章节+图文交错，适合活动后复盘展示',
    emoji: '📸',
    category: '活动回顾',
    preset: {
      activityType: 'latest',
      headerType: 'poster',
      showDetailTab: false,
      showSceneTab: true,
      maxParticipants: 0,
      titlePlaceholder: '【活动回顾标题，如：走心周末·浪漫赴约回顾】',
    },
    detailBlocks: [
      { id: '__R01__', type: 'text', content: '本活动已结束，欢迎查看下方「活动现场」回顾精彩瞬间~', align: 'center', color: '#999999' },
      { id: '__R02__', type: 'contact', phone: '', qrCode: '', source: '【关注我们，获取最新活动信息】' },
    ],
    sceneBlocks: [
      { id: '__RS01__', type: 'bubble', text: '【如：2025年不知不觉来到尾声啦】', color: '#FFB74D', arrow: 'down', align: 'center' },
      { id: '__RS02__', type: 'bubble', text: '【如：不知道屏幕前的你是否还在单身呢】', color: '#FF8A80', arrow: 'up', align: 'center' },
      { id: '__RS03__', type: 'text', content: '【导语：时间+地点+一句话回顾，如：12月28日午后，20位单身青年相聚南山茶舍，共度了一段温暖时光】', align: 'center', color: '#999999', fontSize: 'small' },
      { id: '__RS04__', type: 'numbered_title', number: '01', title: '签到环节' },
      { id: '__RS05__', type: 'image_text_row', imageUrl: '', text: '【签到现场描述 2-3 行，如：下午两点，嘉宾陆续到场。签到台前，每位嘉宾领取专属号码牌和缘分卡片，在工作人员的引导下入座等候】', alignment: 'right' },
      { id: '__RS06__', type: 'numbered_title', number: '02', title: '破冰游戏' },
      { id: '__RS07__', type: 'gallery', images: [], columns: 2, textOverlay: '【如：好感度直线上升~】', gap: 16 },
      { id: '__RS08__', type: 'numbered_title', number: '03', title: '心动交流' },
      { id: '__RS09__', type: 'image_overlay', url: '', text: '【如：主动权自己掌握】', position: 'bottom', textColor: '#FFFFFF', bgOverlay: 'rgba(0,0,0,0.35)' },
      { id: '__RS10__', type: 'quote', content: '【现场金句，如：明天周末可以约你去下一站吗？】', alignment: 'left' },
      { id: '__RS11__', type: 'divider', style: 'colorful' },
      { id: '__RS12__', type: 'contact', phone: '', qrCode: '', source: '【错过本场？扫码关注下期活动】' },
    ],
  },

  // ============================================================
  // 模板 3：父母牵线 / 亲家交流会（推荐）
  // ============================================================
  {
    key: 'parents',
    name: '父母牵线交流会',
    description: '父母代相亲专场，信息卡片模式展示',
    emoji: '👨‍👩‍👧',
    category: '主题专场',
    recommended: true,
    preset: {
      activityType: 'latest',
      headerType: 'info',
      showDetailTab: true,
      showSceneTab: false,
      maxParticipants: 40,
      titlePlaceholder: '【如：首届亲家交流会】',
    },
    detailBlocks: [
      { id: '__PA01__', type: 'title', mainTitle: '【如：首届亲家交流会】', subTitle: '【如：为您的子女谋一段好姻缘】', bgColor: 'pink', textColor: '#FFFFFF' },
      { id: '__PA02__', type: 'text', content: '【儿女的婚事，父母的心事——如今工作忙、圈子小，年轻人的婚恋成了全家最挂心的事。栖缘社为父母搭建一个面对面交流的平台。】', align: 'center', color: '#555555' },
      { id: '__PA03__', type: 'highlight_tag', text: '【父母先筛选，儿女再约会】', inline: false },
      { id: '__PA04__', type: 'image_text_row', imageUrl: '', text: '【父母阅历介绍：为什么父母代相亲更靠谱？父母阅人无数，对家庭背景、人品性格有更准的判断。先由父母把关筛选，再安排子女见面，成功率更高。】', alignment: 'right' },
      { id: '__PA05__', type: 'numbered_title', number: '01', title: '活动流程' },
      { id: '__PA06__', type: 'text', content: '14:00-14:30  活动签到，领取子女信息表\n14:30-15:30  子女介绍环节（父母轮流介绍自家孩子情况）\n15:30-16:30  自由交流，互相了解\n16:30-17:00  咨询环节，红娘一对一答疑', align: 'left', color: '#555555' },
      { id: '__PA07__', type: 'numbered_title', number: '02', title: '报名方式' },
      { id: '__PA08__', type: 'contact', phone: '【联系电话】', qrCode: '', source: '【扫码添加红娘老师微信报名】' },
      { id: '__PA09__', type: 'divider', style: 'default' },
      { id: '__PA10__', type: 'gallery', images: [], columns: 3, textOverlay: '【往期活动精彩瞬间】', gap: 16 },
    ],
    sceneBlocks: [
      { id: '__PAS01__', type: 'numbered_title', number: '01', title: '签到入场' },
      { id: '__PAS02__', type: 'text', content: '【签到现场照片与简述】', align: 'center', color: '#999999' },
      { id: '__PAS03__', type: 'numbered_title', number: '02', title: '交流盛况' },
      { id: '__PAS04__', type: 'gallery', images: [], columns: 2, textOverlay: '【热烈交流，好不热闹】', gap: 16 },
    ],
  },

  // ============================================================
  // 模板 4：餐厅/场地合作派对
  // ============================================================
  {
    key: 'venue',
    name: '场地合作派对',
    description: '强调场地氛围+流程时间轴，适合酒店/餐厅合作场次',
    emoji: '🍷',
    category: '线下派对',
    preset: {
      activityType: 'latest',
      headerType: 'poster',
      showDetailTab: true,
      showSceneTab: false,
      maxParticipants: 30,
      titlePlaceholder: '【如：微醺之夜·红酒品鉴单身派对】',
    },
    detailBlocks: [
      { id: '__V01__', type: 'title', mainTitle: '【主题名，如：微醺之夜·红酒品鉴派对】', subTitle: '【日期+场地名】', bgColor: 'purple', textColor: '#FFFFFF' },
      { id: '__V02__', type: 'text', content: '【场地介绍，一行一句，诗性短句】\n位于XX酒店3楼观景露台\n270度城市天际线尽收眼底\n烛光摇曳 · 爵士轻吟 · 微风拂面\n罗曼蒂克的不二之选', align: 'center', color: '#666666', fontSize: 'medium' },
      { id: '__V03__', type: 'gallery', images: [], columns: 2, textOverlay: '【场地照片】', gap: 16 },
      { id: '__V04__', type: 'numbered_title', number: '01', title: '派对流程' },
      { id: '__V05__', type: 'text', content: '14:00-14:30  嘉宾签到，领取专属名牌\n14:30-15:00  开场致辞 & 破冰游戏\n15:00-16:00  主题品鉴环节（红酒/咖啡/茶艺）\n16:00-17:00  自由交流 & 心动互选\n17:00-17:30  心动表白 & 合影留念', align: 'left', color: '#555555' },
      { id: '__V06__', type: 'numbered_title', number: '02', title: '费用说明' },
      { id: '__V07__', type: 'highlight_tag', text: '【会员免费】', inline: true },
      { id: '__V08__', type: 'highlight_tag', text: '【早鸟优惠】', inline: true },
      { id: '__V09__', type: 'text', content: '非会员：XX 元/人（含茶点+品鉴体验）\n早鸟价：XX 元/人（活动前 3 天报名）\n费用包含场地布置、茶歇饮品、组织服务', align: 'left', color: '#666666' },
      { id: '__V10__', type: 'numbered_title', number: '03', title: '温馨提示' },
      { id: '__V11__', type: 'text', content: '✔ 建议提前15分钟到场签到\n✔ 着装建议：business casual\n✔ 如有忌口或特殊需求请提前告知\n✔ 停车指引：【停车场位置说明】', align: 'left', color: '#666666' },
      { id: '__V12__', type: 'divider', style: 'default' },
      { id: '__V13__', type: 'contact', phone: '【预约电话】', qrCode: '', source: '【扫码预约·名额有限】' },
    ],
    sceneBlocks: [],
  },

  // ============================================================
  // 模板 5：主题狂欢夜（暗黑风）
  // ============================================================
  {
    key: 'nightparty',
    name: '脱单狂欢夜',
    description: '暗色主题+气泡对话+游戏说明，适合夜场/派对',
    emoji: '🌙',
    category: '线下派对',
    preset: {
      activityType: 'latest',
      headerType: 'poster',
      showDetailTab: true,
      showSceneTab: false,
      maxParticipants: 60,
      titlePlaceholder: '【如：脱单狂欢夜 · 假面舞会】',
    },
    detailBlocks: [
      { id: '__N01__', type: 'title', mainTitle: '【脱单狂欢夜】', subTitle: '【日期+场地，如：10.28 周六晚 拾光酒吧】', bgColor: '#1a1a2e', textColor: '#FFFFFF' },
      { id: '__N02__', type: 'bubble', text: '【邀约话术，如：周五晚上别一个人刷手机了，来认识新朋友吧！】', color: '#FFB74D', arrow: 'down', align: 'left' },
      { id: '__N03__', type: 'bubble', text: '【应答话术，如：好的呀！在哪里？几点？有什么好玩的？】', color: '#81C784', arrow: 'up', align: 'right' },
      { id: '__N04__', type: 'numbered_title', number: '01', title: '派对游戏' },
      { id: '__N05__', type: 'image', url: '', caption: '【游戏说明图】', labelPosition: 'bottom' },
      { id: '__N06__', type: 'text', content: '【游戏一：心动三分钟】\n围坐一圈，每隔三分钟铃声响起，顺时针换位，用最短时间给对方留下印象。\n\n【游戏二：真心话扭蛋机】\n每个扭蛋里都有一个问题纸条——"你心中的理想周末是怎样的？"', align: 'left', color: '#CCCCCC' },
      { id: '__N07__', type: 'highlight_tag', text: '好玩的游戏', inline: true },
      { id: '__N08__', type: 'highlight_tag', text: '惊喜的社交', inline: true },
      { id: '__N09__', type: 'highlight_tag', text: '难忘的体验', inline: true },
      { id: '__N10__', type: 'divider', style: 'colorful' },
      { id: '__N11__', type: 'contact', phone: '【预约电话】', qrCode: '', source: '【扫码报名·狂欢夜等你】' },
    ],
    sceneBlocks: [],
  },

  // ============================================================
  // 模板 6：线上互选 / 一周 CP
  // ============================================================
  {
    key: 'online',
    name: '线上互选 / 一周CP',
    description: '线上活动专属：玩法说明+互选规则+报名入口',
    emoji: '💻',
    category: '线上活动',
    preset: {
      activityType: 'online',
      headerType: 'info',
      showDetailTab: true,
      showSceneTab: false,
      maxParticipants: 100,
      titlePlaceholder: '【如：一周CP·线上互选第8期】',
    },
    detailBlocks: [
      { id: '__O01__', type: 'title', mainTitle: '【如：一周CP·线上互选】', subTitle: '【如：足不出户也能遇见TA】', bgColor: 'blue', textColor: '#FFFFFF' },
      { id: '__O02__', type: 'text', content: '【玩法说明 2-3 行】\n红娘为你精选 5 位匹配度最高的异性\n72 小时内互选成功即可交换联系方式\n全程线上操作，安全高效', align: 'center', color: '#555555' },
      { id: '__O03__', type: 'numbered_title', number: '01', title: '参与流程' },
      { id: '__O04__', type: 'text', content: '① 填写报名资料 → 上传个人照片\n② 红娘审核 → 匹配推荐 5 位异性\n③ 进入互选页面 → 选择心仪对象\n④ 互选成功 → 交换联系方式\n⑤ 互选失败 → 可参与下一期（免费）', align: 'left', color: '#555555' },
      { id: '__O05__', type: 'numbered_title', number: '02', title: '互选规则' },
      { id: '__O06__', type: 'text', content: '每位用户可看到 5 位推荐异性资料\n选择 1-3 位心仪对象提交\n双方互相选择即为互选成功\n互选成功后 12 小时内可查看对方联系方式\n报名截止后不可修改选择', align: 'left', color: '#666666' },
      { id: '__O07__', type: 'highlight_tag', text: '【会员免费参与】', inline: false },
      { id: '__O08__', type: 'divider', style: 'default' },
      { id: '__O09__', type: 'contact', phone: '【客服电话】', qrCode: '', source: '【扫码添加红娘微信报名】' },
    ],
    sceneBlocks: [],
  },

  // ============================================================
  // 模板 7：运动主题局
  // ============================================================
  {
    key: 'frisbee',
    name: '运动主题局',
    description: '飞盘/羽毛球/徒步等运动交友通用：诗行开场→信息→时间轴流程→报名',
    emoji: '🥏',
    category: '线下派对',
    preset: {
      activityType: 'latest',
      headerType: 'poster',
      showDetailTab: true,
      showSceneTab: false,
      maxParticipants: 20,
      titlePlaceholder: '【如：飞盘单身局·一起流汗一起心动】',
    },
    detailBlocks: [
      { id: '__F01__', type: 'title', mainTitle: '【如：飞盘单身局】', subTitle: '【日期+一句话口号，如：8月27日·不High不归】', bgColor: 'blue', textColor: '#FFFFFF' },
      { id: '__F02__', type: 'text', content: '【一行一句，如：\n一片飞盘，一双跑鞋\n一身运动服，一片空地\n畅快地跑、跳，不High不归！】', align: 'center', color: '#555555' },
      { id: '__F03__', type: 'full_bleed_image', imageUrl: '' },
      { id: '__F04__', type: 'highlight_tag', text: '【如：运城首届飞盘单身局终于提上日程！】', inline: false },
      { id: '__F05__', type: 'text', content: '🕐 活动时间：【X月X日 17:00-19:30】\n📍 活动地点：【XX运动公园】\n👥 活动人数：【14人（男女各7人）】\n💴 活动费用：【会员免费/XX元】', align: 'left', color: '#555555' },
      { id: '__F06__', type: 'numbered_title', number: '01', title: '活动流程' },
      { id: '__F07__', type: 'timeline', theme: 'light', items: [
        { badge: '01', time: '17:00-17:10', text: '破冰热身：上肢 核心 下肢' },
        { badge: '02', time: '17:10-17:30', text: '互动游戏&自我介绍' },
        { badge: '03', time: '17:30-18:30', text: '分队 训练 讲规则' },
        { badge: '04', time: '18:30-19:10', text: '正式比赛&合影' },
      ] },
      { id: '__F08__', type: 'numbered_title', number: '02', title: '报名方式' },
      { id: '__F09__', type: 'contact', phone: '【红娘电话】', qrCode: '', source: '【扫码添加红娘微信报名】' },
      { id: '__F10__', type: 'divider', style: 'default' },
      { id: '__F11__', type: 'text', content: '✔ 请穿运动装和运动鞋\n✔ 场地提供饮用水和运动器材\n✔ 如遇雨天活动顺延，将提前通知', align: 'left', color: '#666666' },
    ],
    sceneBlocks: [],
  },

  // ============================================================
  // 模板 8：露营交友派对
  // ============================================================
  {
    key: 'camping',
    name: '露营交友派对',
    description: '露营/户外场景：卖点标签→环境图→须知清单→需求与流程时间轴→报名',
    emoji: '⛺',
    category: '线下派对',
    preset: {
      activityType: 'latest',
      headerType: 'poster',
      showDetailTab: true,
      showSceneTab: true,
      maxParticipants: 50,
      titlePlaceholder: '【如：降暑拾光·露营脱单派对】',
    },
    detailBlocks: [
      { id: '__C01__', type: 'title', mainTitle: '【如：降暑拾光露营派对】', subTitle: '【日期+基地名】', bgColor: '#1a1a2e', textColor: '#FFFFFF' },
      { id: '__C02__', type: 'text', content: '【如：\n脱单新玩法\n今年的露营在哪儿都是爆点\n人生不妨大胆一点\n去攀一座山，追一个梦，爱一个人】', align: 'center', color: '#555555' },
      { id: '__C03__', type: 'highlight_tag', text: '【打卡露营大片】', inline: true },
      { id: '__C04__', type: 'highlight_tag', text: '【看日落赏星空】', inline: true },
      { id: '__C05__', type: 'highlight_tag', text: '【诚信交友】', inline: true },
      { id: '__C06__', type: 'gallery', images: [], columns: 2, textOverlay: '【派对环境】', gap: 16 },
      { id: '__C07__', type: 'numbered_title', number: '01', title: '派对须知' },
      { id: '__C08__', type: 'text', content: '✔ 导航【XX露营基地】，市区驾车约20分钟\n✔ 主题派对、篝火、露天电影，在郊区体验浪漫气息\n✔ 精致下午茶，气泡水和手冲咖啡可选\n✔ 特色烤肉火锅，不出城市体验户外野奢大餐', align: 'left', color: '#555555' },
      { id: '__C09__', type: 'numbered_title', number: '02', title: '报名需求' },
      { id: '__C10__', type: 'timeline', theme: 'dark', items: [
        { badge: '1', time: '', text: '【20-35周岁，工作稳定】' },
        { badge: '2', time: '', text: '【人数：50人，男女各25名】' },
        { badge: '3', time: '', text: '【会员限时免费】' },
      ] },
      { id: '__C11__', type: 'numbered_title', number: '03', title: '派对流程' },
      { id: '__C12__', type: 'timeline', theme: 'dark', items: [
        { badge: 'TOP1', time: '18:00-19:00', text: '现场签到' },
        { badge: 'TOP2', time: '19:10-20:30', text: '自我介绍 互动游戏' },
        { badge: 'TOP3', time: '20:30-21:00', text: '心动交流' },
      ] },
      { id: '__C13__', type: 'divider', style: 'colorful' },
      { id: '__C14__', type: 'contact', phone: '【红娘电话】', qrCode: '', source: '【扫码直接报名】' },
    ],
    sceneBlocks: [
      { id: '__CS01__', type: 'circle_title', text: '精彩瞬间', palette: 'mint' },
      { id: '__CS02__', type: 'gallery', images: [], columns: 2, textOverlay: '【现场照片】', gap: 16 },
      { id: '__CS03__', type: 'circle_title', text: '特别鸣谢', palette: 'mint' },
      { id: '__CS04__', type: 'image', url: '', caption: '【合作场地横幅图】', labelPosition: 'bottom' },
      { id: '__CS05__', type: 'text', content: '【鸣谢文案，如：本次活动由XX露营基地提供相亲场地】', align: 'center', color: '#555555' },
      { id: '__CS06__', type: 'contact', phone: '', qrCode: '', source: '【下期精彩活动报名中~扫码咨询】' },
    ],
  },

  // ============================================================
  // 模板 9：商场/商家联名专场
  // ============================================================
  {
    key: 'mall',
    name: '商场/商家联名专场',
    description: '与商场/品牌联名：海报头图→详情→多码报名→商家鸣谢',
    emoji: '🏬',
    category: '主题专场',
    preset: {
      activityType: 'latest',
      headerType: 'poster',
      showDetailTab: true,
      showSceneTab: false,
      maxParticipants: 40,
      titlePlaceholder: '【如：怦然的你·心动的我——XX广场联名专场】',
    },
    detailBlocks: [
      { id: '__M01__', type: 'full_bleed_image', imageUrl: '' },
      { id: '__M02__', type: 'text', content: '活动时间：【X月X日下午3点】\n活动地点：【XX广场6楼】\n报名需求：【20-35周岁单身青年，工作收入稳定】', align: 'center', color: '#555555' },
      { id: '__M03__', type: 'numbered_title', number: '01', title: '报名方式' },
      { id: '__M04__', type: 'contact', phone: '', qrCode: '', source: '【扫码开启脱单之旅】' },
      { id: '__M05__', type: 'contact', phone: '【红娘电话】', qrCode: '', source: '【扫码添加红娘老师】' },
      { id: '__M06__', type: 'divider', style: 'default' },
      { id: '__M07__', type: 'numbered_title', number: '02', title: '特别鸣谢' },
      { id: '__M08__', type: 'image', url: '', caption: '【联名商家海报/门头照】', labelPosition: 'bottom' },
      { id: '__M09__', type: 'text', content: '【鸣谢文案，如：感谢XX广场对本次活动的大力支持！】', align: 'center', color: '#555555' },
    ],
    sceneBlocks: [],
  },

  // ============================================================
  // 模板 10：节日主题专场
  // ============================================================
  {
    key: 'festival',
    name: '节日主题专场',
    description: '七夕/情人节/教师节等节日场次：海报→情书式文案→详情→报名→声明',
    emoji: '🎋',
    category: '主题专场',
    preset: {
      activityType: 'latest',
      headerType: 'poster',
      showDetailTab: true,
      showSceneTab: false,
      maxParticipants: 30,
      titlePlaceholder: '【如：七夕灵感派对·教师节专场】',
    },
    detailBlocks: [
      { id: '__FE01__', type: 'full_bleed_image', imageUrl: '' },
      { id: '__FE02__', type: 'text', content: '【如：\n虽然我不能把一个活生生的TA送到你的身边\n但我可以送你一场浪漫派对，让你遇见爱情】', align: 'center', color: '#555555' },
      { id: '__FE03__', type: 'highlight_tag', text: '【如：风靡全城的七夕专场，报名开启！】', inline: false },
      { id: '__FE04__', type: 'text', content: '活动时间：【X月X日】\n活动地址：【保密（报名审核通过后一对一通知）】\n报名需求：【22-38岁单身男女青年】\n活动人数：【30人（男女各15）】', align: 'center', color: '#555555' },
      { id: '__FE05__', type: 'numbered_title', number: '01', title: '活动流程' },
      { id: '__FE06__', type: 'timeline', theme: 'dark', items: [
        { badge: 'TOP1', time: '18:00-19:00', text: '现场签到' },
        { badge: 'TOP2', time: '19:10-20:30', text: '自我介绍 互动游戏' },
        { badge: 'TOP3', time: '20:30-21:00', text: '心动交流' },
      ] },
      { id: '__FE07__', type: 'numbered_title', number: '02', title: '报名方式' },
      { id: '__FE08__', type: 'contact', phone: '【红娘电话】', qrCode: '', source: '【扫码报名】' },
      { id: '__FE09__', type: 'divider', style: 'default' },
      { id: '__FE10__', type: 'text', content: '【如：栖缘社坚持"真实有效实名靠谱，服务贴心不强求"，每月定期举办1-2场线上/线下交友活动。】\n报名即视为同意活动声明；现场照片仅用于活动回顾，人像将做打码处理。', align: 'left', color: '#999999' },
    ],
    sceneBlocks: [],
  },

  // ============================================================
  // 模板 11：纯海报极简版
  // ============================================================
  {
    key: 'poster',
    name: '纯海报极简版',
    description: '运营已有整套设计稿时最快上线：1-3张整页海报+联系方式，5分钟发一场活动',
    emoji: '🖼️',
    category: '极简快速',
    preset: {
      activityType: 'latest',
      headerType: 'poster',
      showDetailTab: true,
      showSceneTab: false,
      maxParticipants: 0,
      titlePlaceholder: '【活动标题】',
    },
    detailBlocks: [
      { id: '__PO01__', type: 'text', content: '【以下为整页海报区，按顺序上传设计稿即可，建议宽度750px】', align: 'center', color: '#999999', fontSize: 'small' },
      { id: '__PO02__', type: 'full_bleed_image', imageUrl: '' },
      { id: '__PO03__', type: 'full_bleed_image', imageUrl: '' },
      { id: '__PO04__', type: 'contact', phone: '【咨询电话】', qrCode: '', source: '【扫码咨询/报名】' },
    ],
    sceneBlocks: [],
  },

  // ============================================================
  // 模板 12：精彩回顾·鸣谢版
  // ============================================================
  {
    key: 'recap2',
    name: '精彩回顾·鸣谢版',
    description: '回顾页升级版：圆字章节标题+图文混排+特别鸣谢，适合有合作方的活动复盘',
    emoji: '🎞️',
    category: '活动回顾',
    preset: {
      activityType: 'latest',
      headerType: 'poster',
      showDetailTab: false,
      showSceneTab: true,
      maxParticipants: 0,
      titlePlaceholder: '【如：逃离城市计划·露营派对精彩回顾】',
    },
    detailBlocks: [
      { id: '__RA01__', type: 'text', content: '本活动已结束，欢迎查看下方「活动现场」回顾精彩瞬间~', align: 'center', color: '#999999' },
      { id: '__RA02__', type: 'contact', phone: '', qrCode: '', source: '【关注我们，获取最新活动信息】' },
    ],
    sceneBlocks: [
      { id: '__RS01__', type: 'circle_title', text: '活动回顾', palette: 'candy' },
      { id: '__RS02__', type: 'text', content: '【如：\n上周！栖缘社&XX基地举办的\n「逃离城市计划」派对圆满结束\n又一次超员，场面气氛一燃再燃\n快来跟小编一起回顾精彩现场吧】', align: 'center', color: '#666666' },
      { id: '__RS03__', type: 'text', content: '【如：\n落霞与你，我都不想错过\n今夜星空浩瀚，今夜篝火灿烂\n恋恋夏日，我们尽情投入大自然的怀抱】', align: 'center', color: '#999999' },
      { id: '__RS04__', type: 'full_bleed_image', imageUrl: '' },
      { id: '__RS05__', type: 'image_text_row', imageUrl: '', text: '【环节一描述，如：担心社恐？担心氛围？小编提前准备了桌游道具带大家一起互动熟悉】', alignment: 'right' },
      { id: '__RS06__', type: 'gallery', images: [], columns: 2, textOverlay: '【游戏互动，好感度直线上升~】', gap: 16 },
      { id: '__RS07__', type: 'circle_title', text: '精彩瞬间', palette: 'mint' },
      { id: '__RS08__', type: 'gallery', images: [], columns: 3, textOverlay: '', gap: 12 },
      { id: '__RS09__', type: 'quote', content: '【现场金句或嘉宾反馈】', alignment: 'left' },
      { id: '__RS10__', type: 'circle_title', text: '特别鸣谢', palette: 'mint' },
      { id: '__RS11__', type: 'image', url: '', caption: '【合作方横幅图】', labelPosition: 'bottom' },
      { id: '__RS12__', type: 'text', content: '【鸣谢文案，如：本次活动由XX提供相亲场地\n公司团建/生日派对/求婚结婚\n朋友聚会露营/下午茶/特色火锅】', align: 'center', color: '#555555' },
      { id: '__RS13__', type: 'divider', style: 'colorful' },
      { id: '__RS14__', type: 'contact', phone: '【预约/咨询电话】', qrCode: '', source: '【好啦本次活动暂且告一段落啦，下期精彩活动报名中~】' },
    ],
  },
]
