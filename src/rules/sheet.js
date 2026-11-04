// 人物卡 xlsx 通用读取工具
//
// 两张模板都用了大量合并单元格：标签占一块、值占一块。直接按固定坐标读会在
// 「空单元格 / 模板改版」时炸掉，所以统一用「找标签 → 取标签合并区右侧第一格」。

export const colToNum = (col) => {
  let n = 0
  for (let i = 0; i < col.length; i++) n = n * 26 + (col.charCodeAt(i) - 64)
  return n - 1
}

export const numToCol = (n) => {
  let s = ''
  n += 1
  while (n > 0) {
    const rem = (n - 1) % 26
    s = String.fromCharCode(65 + rem) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

export const parseAddr = (addr) => {
  const m = String(addr).match(/^([A-Z]+)(\d+)$/)
  if (!m) return null
  return { c: colToNum(m[1]), r: Number(m[2]) - 1 }
}

export const isEmpty = (v) => v === undefined || v === null || v === ''

export const cellText = (sheet, addr) => {
  const cell = sheet[addr]
  if (!cell || isEmpty(cell.v)) return ''
  return String(cell.v).replace(/\s+/g, ' ').trim()
}

export const cellRaw = (sheet, addr) => {
  const cell = sheet[addr]
  return cell ? cell.v : undefined
}

export const toNumber = (v) => {
  if (isEmpty(v)) return undefined
  const n = Number(String(v).replace(/[^\d.-]/g, ''))
  return isNaN(n) ? undefined : n
}

// 合并区索引：'r,c' -> 该合并区最右列
export const buildMergeIndex = (sheet) => {
  const index = {}
  ;(sheet['!merges'] || []).forEach(m => {
    if (!m || !m.s || !m.e) return
    for (let r = m.s.r; r <= m.e.r; r++) {
      for (let c = m.s.c; c <= m.e.c; c++) index[`${r},${c}`] = m.e.c
    }
  })
  return index
}

// 一次性收集所有非空单元格，之后既找标签也找表头
export const collectCells = (sheet) => {
  const list = []
  const ref = sheet['!ref']
  if (!ref) return list
  const parts = ref.split(':')
  const start = parseAddr(parts[0].replace(/\$/g, ''))
  const end = parseAddr((parts[1] || parts[0]).replace(/\$/g, ''))
  if (!start || !end) return list
  for (let r = start.r; r <= end.r; r++) {
    for (let c = start.c; c <= end.c; c++) {
      const addr = `${numToCol(c)}${r + 1}`
      const text = cellText(sheet, addr)
      if (text) list.push({ addr, r, c, text })
    }
  }
  return list
}

// 关键词匹配：先精确，再前缀（模板里常写成「力量\nSTR」「层次(位格)」）
export const matchKeyword = (text, keyword) => {
  if (text === keyword) return true
  if (!text.startsWith(keyword)) return false
  // 避免「职业」命中「职业序号：」这类说明文字
  return !/[:：]/.test(text.slice(keyword.length, keyword.length + 1))
}

export const findLabel = (cells, keyword) => {
  let hit = cells.find(cell => cell.text === keyword)
  if (!hit) hit = cells.find(cell => matchKeyword(cell.text, keyword))
  return hit || null
}

// 标签对应的值格：标签合并区右侧第一格
export const valueAddr = (labelCell, mergeIndex) => {
  const endCol = mergeIndex[`${labelCell.r},${labelCell.c}`]
  const col = endCol !== undefined ? endCol + 1 : labelCell.c + 1
  return `${numToCol(col)}${labelCell.r + 1}`
}

// 值格自身可能也合并（值 + 上限/半值），顺便给出它右侧一格
export const valuePair = (sheet, labelCell, mergeIndex) => {
  if (!labelCell) return { value: undefined, next: undefined, addr: null }
  const addr = valueAddr(labelCell, mergeIndex)
  const pos = parseAddr(addr)
  const endCol = mergeIndex[`${pos.r},${pos.c}`]
  const nextAddr = `${numToCol((endCol !== undefined ? endCol : pos.c) + 1)}${pos.r + 1}`
  return { value: cellRaw(sheet, addr), next: cellRaw(sheet, nextAddr), addr, nextAddr }
}

// 按标签读文本
export const readLabelText = (sheet, cells, mergeIndex, keyword) => {
  const pair = valuePair(sheet, findLabel(cells, keyword), mergeIndex)
  return isEmpty(pair.value) ? undefined : String(pair.value).trim()
}

// 按标签读数字
export const readLabelNumber = (sheet, cells, mergeIndex, keyword) => {
  const pair = valuePair(sheet, findLabel(cells, keyword), mergeIndex)
  return toNumber(pair.value)
}
