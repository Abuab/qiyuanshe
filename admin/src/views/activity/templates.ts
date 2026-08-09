export interface ActivityTemplate {
  key: string
  name: string
  description: string
  emoji: string
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
]
