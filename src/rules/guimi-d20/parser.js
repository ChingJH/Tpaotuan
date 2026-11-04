// 诡秘之主 D20 角色卡（YM_v3.5「角色卡」sheet）解析器
//
// 文本字段按标签 + 合并区定位（见 ../sheet.js），数值区用已核对过的固定锚点：
//   属性   S4..S11 名称，V 基础值，Y 序列增幅，BC 最终值，BF 额外加值
//   资源池 E15/I15 灵性，P15/T15 生命，E20/I20 幸运，P20/T20 理智
//   衍生   W21 污染总值，W23 异化度，AA15 移动力，AH15 灵体强度，AN22 体型基数
//   防御   AD21 物理，AG21 意志，AJ21 体质
// 缺字段一律降级为空/0，不抛异常，避免一张卡导不进来就整页报错
import {
  ATTRS, LEVEL_BONUS, SKILL_ATTR, SKILL_BLOCKS, DEFAULT_LEVEL, levelFromPoints
} from './data'
import {
  buildMergeIndex, collectCells, readLabelText, cellRaw, toNumber
} from '../sheet'

// 取原始值（字符串/数字），空则返回 ''
const raw = (sheet, addr) => {
  const v = cellRaw(sheet, addr)
  return v === undefined || v === null ? '' : (typeof v === 'string' ? v.trim() : v)
}

const num = (sheet, addr) => toNumber(cellRaw(sheet, addr)) || 0

// 属性影响列的内容形如「力量/0」「力量\n6」，只取属性名
const attrName = (sheet, addr) => {
  const value = String(raw(sheet, addr) || '')
  return value.split(/[/\n\r]/)[0].trim()
}

// 技能区里夹着表头与分类行（「技能」「初始」「神秘学语言」……），这些不是技能
const RESERVED_NAMES = ['技能', '初始', '成长', '检定', '等级', '补正', '属性影响', '神秘学语言', '普通语言']
const isReserved = (name) => RESERVED_NAMES.indexOf(name) >= 0 || name.indexOf('技能表') === 0 || name.indexOf('自定义技能表') === 0

export function parseGuimiD20(sheet) {
  const mergeIndex = buildMergeIndex(sheet)
  const cells = collectCells(sheet)
  const text = (keyword) => readLabelText(sheet, cells, mergeIndex, keyword)

  // ---------- 基本信息（按标签读，模板改版也不会串行）----------
  const basic = {
    name: text('姓名') || '',
    player: text('玩家') || '',
    job: text('职业') || '',
    age: text('年龄') || '',
    gender: text('性别') || '',
    heightWeight: text('身高') || '',
    path: text('超凡途径') || '', // 超凡途径
    sequence: text('当前序列数') || '', // 当前序列
    rank: text('层次') || '', // 层次（位格）
    deityBonus: num(sheet, 'G8'), // 当前神性补正
    damageBonus: text('伤害加值') || '', // 伤害加值
    appearance: text('外貌描述') || ''
  }

  // ---------- 8 项属性（基础 / 序列增幅 / 最终值）----------
  const props = {}
  const propBase = {}
  const propSeq = {}
  ATTRS.forEach((name, i) => {
    const row = 4 + i
    const label = String(raw(sheet, `S${row}`) || '')
    const key = label || name // 模板里标签就是属性名，兜底用固定顺序
    const base = num(sheet, `V${row}`)
    const seq = num(sheet, `Y${row}`)
    const extra = num(sheet, `BF${row}`)
    const final = num(sheet, `BC${row}`)
    propBase[key] = base
    propSeq[key] = seq
    props[key] = final || base + seq + extra
  })

  // ---------- 资源池 / 防御 / 其他衍生值 ----------
  const pools = [
    { key: 'hp', label: '生命值', cur: num(sheet, 'P15'), max: num(sheet, 'T15') },
    { key: 'san', label: '理智值', cur: num(sheet, 'P20'), max: num(sheet, 'T20') },
    { key: 'mp', label: '灵性值', cur: num(sheet, 'E15'), max: num(sheet, 'I15') },
    { key: 'luck', label: '幸运值', cur: num(sheet, 'E20'), max: num(sheet, 'I20') }
  ]

  const defense = {
    物理: num(sheet, 'AD21'),
    意志: num(sheet, 'AG21'),
    体质: num(sheet, 'AJ21')
  }

  const extra = {
    移动力: num(sheet, 'AA15'),
    体型基数: num(sheet, 'AN22'),
    灵体强度: num(sheet, 'AH15'),
    污染总值: num(sheet, 'W21'),
    异化度: num(sheet, 'W23'),
    神性补正: basic.deityBonus
  }

  // ---------- 技能表 ----------
  const skills = {}
  const addSkill = (name, attr, level, points, bonus) => {
    if (!name) return
    // 等级优先由「初始 + 成长」的总级数换算（等价于卡里的公式），
    // 没填技能点时采信单元格里的等级，再退回模板默认值（如「闪避默认受训」）
    const lv = points > 0
      ? levelFromPoints(points)
      : (LEVEL_BONUS[level] !== undefined ? level : (DEFAULT_LEVEL[name] || levelFromPoints(points)))
    const lvBonus = LEVEL_BONUS[lv] !== undefined ? LEVEL_BONUS[lv] : -4
    const skillAttr = attr && props[attr] !== undefined ? attr : (SKILL_ATTR[name] || '')
    const attrValue = props[skillAttr] || 0
    const custom = Number(bonus) || 0
    skills[name] = {
      name,
      attr: skillAttr,
      attrValue,
      level: lv,
      levelBonus: lvBonus,
      customBonus: custom,
      // 该技能一次检定的总加值（已含神性补正），即「d20 + value」
      value: attrValue + lvBonus + custom + (basic.deityBonus || 0)
    }
  }

  SKILL_BLOCKS.forEach(block => {
    for (let row = block.rows[0]; row <= block.rows[1]; row++) {
      const name = String(raw(sheet, `${block.name}${row}`) || '')
      if (!name) continue
      // 分区标题（如「力量」「敏捷」）与夹在中间的表格表头都不是技能
      if (ATTRS.includes(name) || isReserved(name)) continue
      const points = num(sheet, `${block.init}${row}`) + num(sheet, `${block.grow}${row}`)
      addSkill(
        name,
        attrName(sheet, `${block.attr}${row}`),
        String(raw(sheet, `${block.level}${row}`) || ''),
        points,
        num(sheet, `${block.bonus}${row}`)
      )
    }
  })

  // 兜底：卡里一个技能都没有时，给出标准技能表，方便 KP 手动补
  if (Object.keys(skills).length === 0) {
    Object.keys(SKILL_ATTR).forEach(name => addSkill(name, SKILL_ATTR[name], '未受训', 0, 0))
  }

  return {
    rule: 'guimi-d20',
    basic,
    props,
    propBase,
    propSeq,
    pools,
    defense,
    extra,
    skills
  }
}
