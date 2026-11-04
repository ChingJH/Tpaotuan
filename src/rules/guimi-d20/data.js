// 《诡秘之主》D20 共创规则 3.5 的静态数据
// 规则书依据：第二章 判定 / 第三章 属性 / 第四章 技能等级
// 角色卡依据：26年9月｜D20诡秘规则空白角色卡YM_v3.5.9.24.xlsx（角色卡 sheet）

// 8 项基础属性（角色卡 S4:S11 的顺序）
export const ATTRS = ['力量', '体质', '敏捷', '魅力', '灵感', '意志', '教育', '幸运']

// 技能等级 → 检定加值（规则书《不同技能等级提供的判定加减值》）
export const LEVEL_BONUS = {
  未受训: -4,
  受训: 2,
  熟练: 4,
  进阶: 5,
  精通: 6,
  博学: 7,
  大师: 8
}

// 等级由低到高，用于排序与「最高可达等级」判断
export const LEVEL_ORDER = ['未受训', '受训', '熟练', '进阶', '精通', '博学', '大师']

// 技能等级由「初始 + 成长」的总级数换算（角色卡 P 列公式）
export const levelFromPoints = (points) => {
  if (points >= 6) return '大师'
  return LEVEL_ORDER[Math.max(0, points)] || '未受训'
}

// 有些技能模板给了默认等级（规则书：闪避默认受训）
export const DEFAULT_LEVEL = {
  闪避: '受训'
}

// 技能 → 关联属性。角色卡里的「属性影响」列会覆盖这份兜底表
export const SKILL_ATTR = {
  攀爬: '力量',
  跳跃: '力量',
  投掷: '力量',
  格斗: '力量',
  肉搏: '力量',
  刀剑: '力量',
  长柄武器: '力量',
  巨型武器: '力量',
  特种武器: '力量',
  恐吓: '力量',
  驯兽: '力量',
  潜行: '敏捷',
  妙手: '敏捷',
  游泳: '敏捷',
  射击: '敏捷',
  手枪: '敏捷',
  步枪: '敏捷',
  猎枪: '敏捷',
  机枪: '敏捷',
  弩: '敏捷',
  弓箭: '敏捷',
  炮术: '敏捷',
  锁匠: '敏捷',
  驾驶: '敏捷',
  骑乘: '敏捷',
  驾驶马车: '敏捷',
  自行车: '敏捷',
  操纵重型机械: '敏捷',
  闪避: '敏捷',
  取悦: '魅力',
  表演: '魅力',
  信誉: '魅力',
  心理引导: '魅力',
  欺骗: '魅力',
  说服: '魅力',
  乔装: '魅力',
  挑衅: '魅力',
  图书馆使用: '教育',
  领航: '教育',
  生存: '教育',
  医学: '教育',
  写作: '教育',
  爆破: '教育',
  法律: '教育',
  学识: '教育',
  聆听: '灵感',
  侦查: '灵感',
  心理学: '灵感',
  追踪: '灵感',
  读唇: '灵感',
  机械维修: '灵感',
  贸易: '灵感',
  艺术: '灵感',
  厨艺: '灵感',
  乐理: '灵感',
  工艺制造: '灵感',
  占卜: '灵感',
  通灵: '灵感',
  宗教: '灵感',
  神秘学: '灵感'
}

// 搜索用的拼音首字母（由 pinyingen.js + cnchar 生成）
export const ATTR_PINYIN = {
  力量: 'll',
  体质: 'tz',
  敏捷: 'mj',
  魅力: 'ml',
  灵感: 'lg',
  意志: 'yz',
  教育: 'jy',
  幸运: 'xy'
}

export const SKILL_PINYIN = {
  攀爬: 'pp',
  跳跃: 'ty',
  投掷: 'tz',
  格斗: 'gd',
  肉搏: 'rb',
  刀剑: 'dj',
  长柄武器: 'cbwq',
  巨型武器: 'jxwq',
  特种武器: 'tzwq',
  恐吓: 'kx',
  驯兽: 'xs',
  潜行: 'qx',
  妙手: 'ms',
  游泳: 'yy',
  射击: 'sj',
  手枪: 'sq',
  步枪: 'bq',
  猎枪: 'lq',
  机枪: 'jq',
  弩: 'n',
  弓箭: 'gj',
  炮术: 'ps',
  锁匠: 'sj',
  驾驶: 'js',
  骑乘: 'qs',
  驾驶马车: 'jsmc',
  自行车: 'zxc',
  操纵重型机械: 'czzxjx',
  闪避: 'sb',
  取悦: 'qy',
  表演: 'by',
  信誉: 'xy',
  心理引导: 'xlyd',
  欺骗: 'qp',
  说服: 'sf',
  乔装: 'qz',
  挑衅: 'tx',
  图书馆使用: 'tsgsy',
  领航: 'lh',
  生存: 'sc',
  医学: 'yx',
  写作: 'xz',
  爆破: 'bp',
  法律: 'fl',
  学识: 'xs',
  聆听: 'lt',
  侦查: 'zc',
  心理学: 'xlx',
  追踪: 'zz',
  读唇: 'dc',
  机械维修: 'jxwx',
  贸易: 'my',
  艺术: 'ys',
  厨艺: 'cy',
  乐理: 'll',
  工艺制造: 'gyzz',
  占卜: 'zb',
  通灵: 'tl',
  宗教: 'zj',
  神秘学: 'sbx',
  星象学: 'xxx',
  仪式魔法: 'ysmf',
  非凡之物学: 'ffzwx',
  神秘历史学: 'sblsx',
  非凡学识: 'ffxs',
  鲁恩语: 'ley',
  因蒂斯语: 'ydsy',
  弗萨克语: 'fsky',
  高原语: 'gyy',
  伦堡语: 'lby',
  都坦语: 'dty',
  高地语: 'gdy',
  旧日语言: 'jryy',
  赫密斯语: 'hmsy',
  古赫密斯语: 'ghmsy',
  古弗萨克语: 'gfsky',
  巨人语: 'jry',
  巨龙语: 'jly',
  精灵语: 'jly'
}

// 角色卡「技能表」里的分区定义：header 行 + 各列字母
// 列含义：attr 属性影响 / name 技能名 / init 初始 / grow 成长 / level 等级 / bonus 补正
export const SKILL_BLOCKS = [
  // 力量分区（第 27 行起）、敏捷分区（第 36 行起）共用表头
  { headerRow: 26, rows: [27, 47], attr: 'B', name: 'E', init: 'I', grow: 'K', level: 'P', bonus: 'S' },
  { headerRow: 26, rows: [27, 47], attr: 'V', name: 'Y', init: 'AC', grow: 'AE', level: 'AJ', bonus: 'AM' },
  { headerRow: 26, rows: [27, 47], attr: 'AP', name: 'AS', init: 'AW', grow: 'AY', level: 'BD', bonus: 'BG' },
  // 「艺术」的细分技能（厨艺 / 乐理 / 工艺制造 / 占卜 / 通灵 / 宗教）在 AU 列
  { headerRow: 26, rows: [34, 39], attr: 'AP', name: 'AU', init: 'AW', grow: 'AY', level: 'BD', bonus: 'BG' },
  // 自定义技能表
  { headerRow: 53, rows: [54, 63], attr: 'B', name: 'E', init: 'I', grow: 'K', level: 'P', bonus: 'S' },
  { headerRow: 53, rows: [54, 63], attr: 'U', name: 'X', init: 'AB', grow: 'AD', level: 'AI', bonus: 'AL' },
  { headerRow: 53, rows: [54, 63], attr: 'AN', name: 'AQ', init: 'AU', grow: 'AW', level: 'BB', bonus: 'BE' }
]
