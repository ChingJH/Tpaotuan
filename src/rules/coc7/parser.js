// COC 第七版人物卡解析（public/static/cocv7.xlsx「人物卡」sheet）
//
// 历史实现按固定坐标读单元格（D3 姓名、F10 体力……），坐标本身没错，但空单元格会让
// `sheet['D3'].v` 直接抛错，「导入自带模板 / 只填了一半的卡」全部失败。
// 这里改成：先找标签，取标签合并区右侧第一格作为值格；值格右侧一格是上限/半值。
import {
  cellRaw, cellText, collectCells, buildMergeIndex, findLabel, valuePair, toNumber, isEmpty, numToCol
} from '../sheet'

const USER_PROTO = {
  basic: {},
  props: {},
  skills: {}
}

export function parseCoC7(sheet) {
  const user = JSON.parse(JSON.stringify(USER_PROTO))
  const mergeIndex = buildMergeIndex(sheet)
  const cells = collectCells(sheet)

  const readText = (keyword) => {
    const pair = valuePair(sheet, findLabel(cells, keyword), mergeIndex)
    return isEmpty(pair.value) ? undefined : String(pair.value).trim()
  }

  // 资源池：值是「当前」，右侧一格是「上限」（模板里用公式算），当前没填就退回上限
  const readPool = (keyword) => {
    const pair = valuePair(sheet, findLabel(cells, keyword), mergeIndex)
    const cur = toNumber(pair.value)
    return cur !== undefined ? cur : toNumber(pair.next)
  }

  // ---------- 基本信息 ----------
  user.basic = {
    name: readText('姓名'),
    job: readText('职业'),
    age: readText('年龄'),
    gender: readText('性别'),
    hp: readPool('体力'),
    san: readPool('理智'),
    luck: readPool('幸运'),
    mp: readPool('魔法')
  }

  // ---------- 属性 ----------
  user.props = {
    力量: toNumber(readText('力量')),
    体质: toNumber(readText('体质')),
    体型: toNumber(readText('体型')),
    敏捷: toNumber(readText('敏捷')),
    外貌: toNumber(readText('外貌')),
    智力: toNumber(readText('智力')),
    意志: toNumber(readText('意志')),
    教育: toNumber(readText('教育'))
  }

  // ---------- 技能表 ----------
  // 表头行形如「技能名称 | 初始 | 成长 | 职业 | 兴趣 | 成功率」，表里并排两组
  const headers = cells.filter(cell => cell.text === '技能名称')
  headers.forEach(header => {
    const headerRow = header.r
    const rowCells = cells.filter(cell => cell.r === headerRow && cell.c > header.c)
    const rateHeader = rowCells.find(cell => cell.text === '成功率')
    const initHeader = rowCells.find(cell => cell.text === '初始')
    const growHeader = rowCells.find(cell => cell.text === '成长')
    if (!rateHeader) return
    const nameCol = header.c
    const rateCol = rateHeader.c
    const initCol = initHeader ? initHeader.c : -1
    const growCol = growHeader ? growHeader.c : -1

    for (let r = headerRow + 1; r <= headerRow + 40; r++) {
      const mainName = cellText(sheet, `${numToCol(nameCol)}${r + 1}`)
      const subName = cellText(sheet, `${numToCol(nameCol + 2)}${r + 1}`)
      // 「技艺:」「格斗:」这种是分类，真正的技能名在右侧一格
      const isCategory = /[:：]$/.test(mainName)
      const name = isCategory ? subName : mainName
      if (!name) continue
      if (name === '技能名称') break
      let value = toNumber(cellRaw(sheet, `${numToCol(rateCol)}${r + 1}`))
      if (value === undefined) {
        // 成功率是公式，某些文件没有缓存值，用「初始 + 成长」兜底
        const init = toNumber(cellRaw(sheet, `${numToCol(initCol)}${r + 1}`))
        const grow = toNumber(cellRaw(sheet, `${numToCol(growCol)}${r + 1}`))
        if (init === undefined && grow === undefined) continue
        value = (init || 0) + (grow || 0)
      }
      user.skills[modifyName(name)] = value
    }
  })

  user.rule = 'coc7'
  return user
}

// 处理特殊情况
export function modifyName(name) {
  switch (name) {
    case '计算机使用 Ω':
      return '计算机'
    case '图书馆使用':
      return '图书馆'
    case '电子学 Ω':
      return '电子学'
    case '母语:':
      return '母语'
    case '操作重型机械':
      return '重型机械'
    default:
      return name
  }
}
