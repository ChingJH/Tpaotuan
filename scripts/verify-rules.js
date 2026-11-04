// 规则解析/结算自检脚本
//   node scripts/verify-rules.js
//
// 做的事情：拿 public/static 下的两张官方模板，在内存里填上当测试数据，
// 跑一遍人物卡解析与检定结算，断言关键数值。改了 src/rules/** 之后跑一次即可。
//
// 说明：src/rules 是 ESM 源码，这里用 @babel/core（项目已有）即时转成 CJS 再执行，
// 不额外引入测试框架。

const fs = require('fs')
const os = require('os')
const path = require('path')
const babel = require('@babel/core')
const XLSX = require('xlsx')

const ROOT = path.resolve(__dirname, '..')

// ---------- 极简 ESM 加载器 ----------
const cache = {}
function loadModule(file) {
  const abs = path.resolve(ROOT, file)
  if (cache[abs]) return cache[abs].exports
  const code = babel.transformFileSync(abs, {
    presets: [['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }]],
    babelrc: false,
    configFile: false
  }).code
  const mod = { exports: {} }
  cache[abs] = mod
  const req = (p) => {
    if (!p.startsWith('.')) return require(p)
    const target = path.resolve(path.dirname(abs), p)
    let withExt = target
    if (fs.existsSync(target)) {
      // 目录要再进一层找 index.js
      if (fs.statSync(target).isDirectory()) withExt = path.join(target, 'index.js')
    } else {
      withExt = `${target}.js`
    }
    return loadModule(path.relative(ROOT, withExt))
  }
  new Function('exports', 'require', 'module', code)(mod.exports, req, mod)
  return mod.exports
}

// ---------- 断言 ----------
let failed = 0
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failed++
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `  期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`}`)
}

// ---------- 造测试卡 ----------
function setCells(sheet, pairs) {
  pairs.forEach(([addr, value]) => {
    sheet[addr] = { t: typeof value === 'number' ? 'n' : 's', v: value }
    delete sheet[addr].w
  })
}

function loadTemplate(file, sheetName, edits) {
  const wb = XLSX.readFile(path.join(ROOT, 'public/static', file))
  const sheet = wb.Sheets[sheetName]
  setCells(sheet, edits)
  // 走一遍序列化，模拟用户真的存过盘
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const wb2 = XLSX.read(buf, { type: 'buffer' })
  return wb2.Sheets[sheetName]
}

// ================= 诡秘之主 D20 =================
const { parseGuimiD20 } = loadModule('src/rules/guimi-d20/parser.js')
const { resolveCheck, formatBonus } = loadModule('src/rules/guimi-d20/resolver.js')

const guimiSheet = loadTemplate('guimi-d20.xlsx', '角色卡', [
  ['E3', '测试角色'],
  ['E4', '测试玩家'],
  ['E5', '记者'],
  ['E6', 25],
  ['M5', '男'],
  ['M6', '占卜家'],
  ['M8', 9],
  // 力量 体质 敏捷 魅力 灵感 意志 教育 幸运
  ['V4', 6], ['V5', 5], ['V6', 5], ['V7', 4],
  ['V8', 4], ['V9', 5], ['V10', 5], ['V11', 4],
  // 攀爬 3 级（进阶 +5）、跳跃 1 级（受训 +2）
  ['I27', 3], ['I28', 1]
])
const guimi = parseGuimiD20(guimiSheet)
console.log('\n=== 诡秘之主 D20 ===')
check('规则标记', guimi.rule, 'guimi-d20')
check('姓名', guimi.basic.name, '测试角色')
check('途径', guimi.basic.path, '占卜家')
check('力量', guimi.props['力量'], 6)
check('攀爬等级', guimi.skills['攀爬'].level, '进阶')
check('攀爬检定加值', guimi.skills['攀爬'].value, 6 + 5)
check('未受训技能补正', guimi.skills['聆听'].levelBonus, -4)
check('闪避默认受训', guimi.skills['闪避'].level, '受训')
check('技能数量 > 40', Object.keys(guimi.skills).length > 40, true)

const nat20 = resolveCheck({ card: guimi, name: '攀爬', nat: 20, difficulty: 18 })
check('d20=20 大成功', nat20.text, '大成功')
const nat15 = resolveCheck({ card: guimi, name: '攀爬', nat: 15, difficulty: 18 })
check('攀爬 15 + 11 ≥ 18', [nat15.total, nat15.text], [26, '≥ 18 成功'])
const nat1 = resolveCheck({ card: guimi, name: '攀爬', nat: 1, difficulty: 1 })
check('d20=1 大失败', nat1.text, '大失败')
const nat10 = resolveCheck({ card: guimi, name: '攀爬', nat: 8, difficulty: 21 })
check('攀爬 8 + 11 < 21', nat10.text, '< 21 失败')
const attr = resolveCheck({ card: guimi, name: '敏捷', nat: 12, difficulty: 15 })
check('属性检定只加属性', [attr.total, attr.text], [17, '≥ 15 成功'])
check('未知技能返回 null', resolveCheck({ card: guimi, name: '不存在的技能', nat: 10 }), null)
console.log(`  加值明细示例：${formatBonus(nat15)}`)

// ================= COC 7 版 =================
const { parseCoC7 } = loadModule('src/rules/coc7/parser.js')
const { resolveCoC7 } = loadModule('src/rules/coc7/resolver.js')

const cocSheet = loadTemplate('cocv7.xlsx', '人物卡', [
  ['D3', '测试调查员'],
  ['D5', '记者'],
  ['D6', 30],
  ['L6', '女'],
  ['F10', 12], // 体力
  ['N10', 60], // 理智
  ['V10', 55], // 幸运
  ['AD10', 10], // 魔法
  ['S3', 50], ['S5', 60], ['S7', 55], // 力量/体质/体型
  ['Y3', 65], ['Y5', 45], ['Y7', 70], // 敏捷/外貌/智力
  ['AE3', 55], ['AE5', 80] // 意志/教育
])
const coc = parseCoC7(cocSheet)
console.log('\n=== COC 七版 ===')
check('规则标记', coc.rule, 'coc7')
check('姓名', coc.basic.name, '测试调查员')
check('性别', coc.basic.gender, '女')
check('体力', coc.basic.hp, 12)
check('理智', coc.basic.san, 60)
check('幸运', coc.basic.luck, 55)
check('魔法', coc.basic.mp, 10)
check('力量', coc.props['力量'], 50)
check('智力', coc.props['智力'], 70)
check('技能数量 > 40', Object.keys(coc.skills).length > 40, true)
check('聆听', coc.skills['聆听'], 20)
check('计算机（名字归一化）', coc.skills['计算机'], 5)

check('聆听 roll=1 大成功', resolveCoC7({ card: coc, skill: '聆听', roll: 1 }), '大成功')
check('聆听 roll=96 大失败', resolveCoC7({ card: coc, skill: '聆听', roll: 96 }), '大失败')
check('聆听 roll=20 成功', resolveCoC7({ card: coc, skill: '聆听', roll: 20 }), '≤ 20 成功')
check('困难聆听 = 半值', resolveCoC7({ card: coc, skill: '困难聆听', roll: 10 }), '≤ 10 成功')
check('极难聆听 = 1/5', resolveCoC7({ card: coc, skill: '极难聆听', roll: 4 }), '≤ 4 成功')
check('理智检定读 san', resolveCoC7({ card: coc, skill: '理智', roll: 70 }), '> 60 失败')

// ---------- 规则选择的优先级（群里切换骰子规则的依据） ----------
const rules = loadModule('src/rules/index.js')
console.log('\n=== 规则选择 ===')
check('自动 + D20 卡', rules.resolveRuleId({ groupRule: 'auto', cardRule: 'guimi-d20' }), 'guimi-d20')
check('自动 + COC 卡', rules.resolveRuleId({ groupRule: 'auto', cardRule: 'coc7' }), 'coc7')
check('自动 + 没卡', rules.resolveRuleId({ groupRule: 'auto' }), 'coc7')
check('固定 D20 覆盖 COC 卡', rules.resolveRuleId({ groupRule: 'guimi-d20', cardRule: 'coc7' }), 'guimi-d20')
check('固定 COC 覆盖 D20 卡', rules.resolveRuleId({ groupRule: 'coc7', cardRule: 'guimi-d20' }), 'coc7')
check('什么都没设置', rules.resolveRuleId({}), 'coc7')
check('auto 是合法设置', rules.isRuleSetting('auto'), true)
check('乱填的规则不合法', rules.isRuleSetting('dnd5e'), false)
check('非法群设置被忽略、退回人物卡', rules.resolveRuleId({ groupRule: 'dnd5e', cardRule: 'guimi-d20' }), 'guimi-d20')

console.log('')
if (failed > 0) {
  console.log(`✗ 有 ${failed} 项断言失败`)
  process.exit(1)
}
console.log('✓ 全部通过')
