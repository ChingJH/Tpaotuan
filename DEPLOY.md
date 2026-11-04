# 部署到 GitHub Pages

本项目是**纯前端**应用，没有后端、没有数据库，构建产物是静态文件，直接扔到 GitHub Pages 就能用。

---

## 0. 前置

- Node.js 18 或更高（本地验证用的是 Node 20/24）
- 一个 GitHub 账号
- 一个腾讯云 IM 应用的 **SDKAppID / SecretKey**（登录用，见文末「关于登录」）

---

## 1. 本地跑起来

```bash
npm ci                 # 首次；已经装过就用 npm install
npm run serve          # 开发服务器，默认 http://localhost:8080
npm run build          # 生产构建，输出到 dist/
npm run test:rules     # 人物卡解析 / 骰娘结算自检
```

> 如果你在 Node 17+ 上构建报 `ERR_OSSL_EVP_UNSUPPORTED`，是因为 webpack 4 用的 md4 被 OpenSSL 3 禁了：
> PowerShell 里执行 `$env:NODE_OPTIONS="--openssl-legacy-provider"`，或 `export NODE_OPTIONS=--openssl-legacy-provider`。
> CI 里已经在 workflow 中设好了，本地手动构建才需要。

---

## 2. 建仓库并推上去

```bash
cd paotuan-master
git init
git add .
git commit -m "feat: 支持诡秘之主 D20 角色卡与骰娘结算，修复若干 bug"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

`.gitignore` 已经排除了 `node_modules/`、`dist/`、规则书 PDF 和原始卡表，
推上去的只有源码、`public/`（含模板与本地依赖）和文档。

---

## 3. 打开 Pages

1. 打开仓库 → **Settings** → 左侧 **Pages**
2. **Build and deployment** → **Source** 选 **GitHub Actions**（不要选 “Deploy from a branch”）
3. 回到 **Actions** 标签，能看到 `deploy-pages` 工作流在跑；首次大约 1-3 分钟
4. 跑完后在 Pages 页面会显示站点地址：

```
https://<你的用户名>.github.io/<仓库名>/
```

之后每次 `git push` 到 `main`（或 `master`）都会自动重新构建发布，也可以在 Actions 里手动
`Run workflow`。

---

## 4. 关于子路径

`vue.config.js` 里是 `publicPath: './'`，所有资源都是相对路径，
所以部署在 `https://<用户名>.github.io/<仓库名>/` 这种**子路径**下也能正常加载，
不需要改 `publicPath`，也不需要给仓库改名。

---

## 5. 自定义域名（可选）

1. 仓库 **Settings → Pages → Custom domain** 填域名，会生成一个 `CNAME` 文件；
2. 到域名商加 CNAME 解析指向 `<用户名>.github.io`；
3. 勾选 **Enforce HTTPS**（证书签发要等几分钟）。

---

## 6. 关于登录（重要）

本项目没有后端，登录信息全部由使用者自己提供：

- **方式一（推荐）**：登录页填腾讯云 IM 的 `平台 ID`（SDKAppID）和 `Secret`；
- **方式二**：用邀请链接进入，链接里带的 `sig` 参数会自动填充（`sig` 是 appid/secret 的 base64）。

所以：

- **不要把 SecretKey 写进仓库**，也不要把带 `sig` 的邀请链接公开贴出去；
- 每个团（或每个使用者）应该用**自己的**腾讯云 IM 应用；
- 别人打开你的 Pages 站点时看到的是登录页，需要他自己有邀请链接或密钥才能进。

拿到 SDKAppID / SecretKey 的方式见腾讯云即时通信 IM 官方文档（创建应用 → 基本信息里可查）。

---

## 7. 常见问题

| 现象 | 原因 / 处理 |
| --- | --- |
| Pages 页面 404 | Source 没选 **GitHub Actions**；或 workflow 失败，去 Actions 看日志 |
| 打开是白屏 | 检查 `dist/vendor/` 是否随站点发布（`public/vendor/` 必须提交进仓库）；再按 F12 看是哪个 js 404 |
| 构建报 `ERR_OSSL_EVP_UNSUPPORTED` | workflow 已设置 `NODE_OPTIONS=--openssl-legacy-provider`；本地手动构建也要设 |
| `npm ci` 失败 | 确认 `package-lock.json` 已一起提交（仓库里必须有） |
| 人物卡导入后数值是 0 | 诡秘模板里的生命/防御是公式，需要用 Excel/WPS 保存一次再导入 |
| 骰娘不回复 | 群里要先在「骰娘」面板开启机器人；且需要在**当前浏览器**里保持页面打开（bot 跑在浏览器里） |
| 骰娘用 d100 结算 D20 团 | 群设置 →「启用机器人」下面的 **骰子规则** 选成「诡秘 D20」；或者直接导入一张诡秘角色卡，会自动切换 |
