# dsh-superagent 插件安装操作说明（Windows）

> 适用环境：Windows 10/11 + DeepSeek Harness（`dsh` 0.2.1-rc.5）
> 目标：把 [dsh-superagent-prototype](https://github.com/deepseek-ai/dsh-superagent-prototype) 作为 DSH bundle 插件安装进一个独立的 `superagent` profile，并让它跑起来。
> 本文同时记录了实际安装中踩过的坑和对应的解决办法，供复现或排障时对照。

---

## 0. 结论速览

插件已安装并运行成功：

- 源码/构建产物：`C:\Users\1\Documents\deepseek-harness\default-workspace\dsh-superagent`
- profile 目录：`C:\Users\1\.dsh\profiles\superagent`
- 状态目录：`C:\Users\1\.dsh\state\superagent`（`orchestrator.sqlite` 等）
- 面板：`http://127.0.0.1:3082/?token=...`（侧边栏选 **Superagent**）
- 当前仅有一个预期的 setup 问题：`github / repositoryUnset`（还没配 GitHub 仓库）

---

## 1. 前置条件

| 依赖 | 本机实测 | 说明 |
| --- | --- | --- |
| Node.js | v24.21.0 | 需 `^22.19.0 || >=24.0.0`（`engines`） |
| pnpm | 11.7.0（全局）/ 11.28.5（DSH 自带） | `packageManager` 指定 11.7.0 |
| git | 2.47.1 | 需 ≥ 2.32 |
| Python | 3.12.8 | 插件管理脚本用 Python，但 Windows 下**不可用**，见 §5 |
| `dsh` CLI | 0.2.1-rc.5 | 位于 `...\resources\runtime\cli\bin\dsh.cmd` |
| GitHub CLI | 2.102.0 | 真正接 GitHub 时才需要 |

`DSH_HOME` 默认为 `C:\Users\1\.dsh`（profile 存放位置）。

---

## 2. 安装步骤（标准流程）

### 步骤 1：克隆仓库

```powershell
cd C:\Users\1\Documents\deepseek-harness\default-workspace
git clone https://github.com/deepseek-ai/dsh-superagent-prototype.git dsh-superagent
```

### 步骤 2：安装依赖

```powershell
cd dsh-superagent
pnpm install
```

> ⚠️ 如果这里或下一步报 `Cannot find package 'ansis' imported from ...\node_modules\tsdown\...`，
> 说明 pnpm 的**隔离链接器**在本机沙箱/权限环境下生成的 reparse point 无法被 Node 遍历。
> 改用 **hoisted** 扁平链接器重装：

```powershell
pnpm install --node-linker=hoisted
```

### 步骤 3：构建 bundle

```powershell
pnpm build
```

成功后会生成 `lib/index.js`、`lib/github-watch.js`、`lib/feishu-watch.js`、`lib/client.js`、`lib/*.d.ts`。

### 步骤 4：新建 `superagent` profile（从官方 web 模板复制）

```powershell
dsh superagent --from-default-profile web --dump-config
```

该命令会创建 `~/.dsh/profiles/superagent`，然后打印组合后的 profile 树并退出（exit 0）。

### 步骤 5：把 bundle 安装进 profile

```powershell
dsh plugin --profile superagent add "link:C:/Users/1/Documents/deepseek-harness/default-workspace/dsh-superagent"
```

成功后 `~/.dsh/profiles/superagent/package.json` 的 `dependencies` 与 `dsh.profile.bundles` 都会包含 `dsh-superagent`。

> pnpm 会提示 peerDependencies 不解析的告警（link 协议的正常现象），不影响运行。

### 步骤 6：写入机器配置（`stateDir` + 面板端口）

编辑 `C:\Users\1\.dsh\profiles\superagent\cordis.patch.yml`，**替换**为：

```yaml
- id: webserver
  config:
    host: 127.0.0.1
    port: 3082
- id: dsh-superagent
  config:
    stateDir: /Users/1/.dsh/state/superagent
```

> ⚠️ `stateDir` 必须匹配正则 `^\/`，见 §4.7。

### 步骤 7：启动

```powershell
dsh --profile superagent
```

看到 `dsh web: http://127.0.0.1:3082/?token=...` 即为成功；`C:\Users\1\.dsh\state\superagent\orchestrator.sqlite` 会被创建。

---

## 3. 验证

### 3.1 管理 API（需请求头）

面板根路径 `http://127.0.0.1:3082/` 直接访问会返回 **401**（需要 `token`），这是设计行为。

带请求头调用管理 API：

```powershell
$h = @{ 'x-orchestrator-request' = '1' }
Invoke-RestMethod -Uri 'http://127.0.0.1:3082/orchestrator/api/state' -Headers $h
Invoke-RestMethod -Uri 'http://127.0.0.1:3082/orchestrator/api/settings' -Headers $h
```

预期：`state.health` 中 `runtime`/`github` 为 `paused`（等待配置），其余 `ready`；
`state.setup.problem` 为 `{place: github, code: repositoryUnset, detail: "The GitHub Source names no repository."}`。

### 3.2 确认 bundle 已挂载

```powershell
dsh --profile superagent --dump-config
```

输出中应出现 `dsh-superagent`、`dsh-superagent-github`、`dsh-superagent-worker-preset`、`dsh-superagent-router-preset` 等条目。

### 3.3 面板

浏览器打开日志里打印的带 token 的 URL，在侧边栏选择 **Superagent**。

---

## 4. 踩过的坑（务必先看）

### 4.1 `app.asar\dsh\` 路径不存在
运行时上下文给出的 checkout 是 `...\resources\app.asar\dsh\`，但这是**打包在 asar 里的路径**，磁盘上并不存在。实际文件在 `resources\app.asar.unpacked\dsh\node_modules\...`。查插件源码/配置时要去 `app.asar.unpacked` 或直接看 GitHub 仓库。

### 4.2 `git clone` 报“错误”但实际成功
PowerShell 里 git 的进度输出走 **stderr**，被当成 `NativeCommandError` 抛出（exit code 1）。**判断标准是目录是否生成**，不是退出码。

### 4.3 `pnpm build` 失败：找不到 `ansis`
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'ansis' imported from ...\node_modules\tsdown\dist\...
```
原因：pnpm 隔离链接器把顶层 `node_modules/*` 建成 reparse point（symlink/junction），而 Node 在当前环境下**无法沿这些链接向上解析传递依赖**（`node_modules/tsdown` 里只有 `.bin`，没有 `ansis`）。
**解法：`pnpm install --node-linker=hoisted`**（扁平布局，Node 直接向上找到依赖）。
> 排查命令：`node -e "console.log(require.resolve('ansis/package.json'))"`，或检查 `node_modules/tsdown/node_modules` 内容。

### 4.4 `~/.dsh` 不在工作区沙箱内（EPERM）
`dsh superagent --from-default-profile web` 报：
```
EPERM mkdtemp 'C:\\Users\\1\\.dsh\\profiles\\.superagent.staging-XXXXXX'
```
因为 `C:\Users\1\.dsh` 在 workspace 之外，默认 `workspace-write` 策略写不了。**需要 `danger-full-access`**（本会话已批准）。
> 验证：在 `~/.dsh/profiles` 下 `New-Item` 目录，被拒即属此情况。

### 4.5 profile 创建命令要带 `--dump-config`
`dsh superagent --from-default-profile web --dump-config` —— 不带 `--dump-config` 会直接 boot；带它才会“创建后打印并退出”。

### 4.6 `dsh --profile superagent web` 报 “too many arguments”
```
error: too many arguments. Expected 0 arguments but got 1: web.
```
`superagent` profile 本身已经内嵌 web app，**不要**再传 `web`。正确命令就是：
```powershell
dsh --profile superagent
```

### 4.7 `stateDir` 必须是 POSIX 绝对路径（Windows 关键坑）
插件用 `s.string().pattern(/^\//)` 校验，所以 `C:\Users\...` 会被拒绝：
```
ValidationError: invalid config: $.stateDir expect string to match regexp /^\//
```
在 Windows 上，Node 的路径解析结果如下（实测）：

| 填入值 | `path.resolve` 结果 | 是否正确 |
| --- | --- | --- |
| `/Users/1/.dsh/state/superagent` | `C:\Users\1\.dsh\state\superagent` | ✅ |
| `/C:/Users/1/...` | `C:\C:\Users\1\...` | ❌ |
| `/c/Users/1/...` | `C:\c\Users\1\...` | ❌ |

**解法：用 `/Users/...` 形式**（按当前盘符解析到 C 盘根）。执行设置里的 `directory`（Ticket 工作目录）同样受 `^\/` 约束，配置时也要写成 `/Users/...`。

### 4.8 面板根路径 401、API 需要请求头
- 直接 `GET http://127.0.0.1:3082/` → **401**（需要 token），属正常。
- 管理 API 必须带请求头 `x-orchestrator-request: 1`，否则 403。

### 4.9 `scripts/dsh-superagent` 在 Windows 不可用
仓库里的 `scripts/dsh-superagent`（start/status/restart）import `fcntl` 并依赖 `tmux`，是 **Unix 专用**。Windows 下请直接用 `dsh --profile superagent` 启停，或用任务管理器/`Stop-Process` 结束进程。

### 4.10 PowerShell 里 `node -e` 的引号陷阱
在 PowerShell 里用 here-string 传 `node -e` 容易把 JS 里的 `/.../` 或引号解析坏（报 `SyntaxError: Invalid regular expression flags`）。**解法：把脚本写成 `.mjs` 文件再 `node xxx.mjs`。**

### 4.11 编辑中的文件被运行中的 profile 改写
`cordis.patch.yml` 在 profile 运行/保存时会被自动追加条目（例如 `ui-settings-general`、`agent-preset-registry`）。编辑前要**重新读取**，否则会 `file changed since it was read`。

---

## 5. Windows 特定注意事项

1. **路径一律用 `/Users/...` 形式**（§4.7），不要用 `C:\` 或 `/C:/`。
2. **不要用 `scripts/dsh-superagent`**（§4.9），手动启停。
3. **面板 token 每次重启都会变化**，以日志里打印的 URL 为准。
4. 执行设置里的 `prepare` 命令若是 POSIX shell 脚本，需改成 PowerShell 语法或调用 `pwsh -Command`；dsh-superagent 的 worker 默认用 `pwsh`（win32 下自动禁用 bash 工具）。
5. `dsh plugin add "link:..."` 用正斜杠或反斜杠均可，但建议正斜杠 + 绝对路径。

---

## 6. 后续配置（把插件真正跑起来）

插件本体装好后，还需在面板（或管理 API）依次保存：

1. **GitHub Source**：`owner/name` + Agent 账号的 `gh` 包装脚本（`GH_CONFIG_DIR` 指向独立配置目录）。
2. **Policy**：允许发起工作的 GitHub 账号列表（至少一个，否则不会生成 Ticket）。
3. **Execution**：Ticket 目录（`/Users/...` 形式）+ `prepare` 命令（克隆仓库、建 worktree）。
4. **Prompts**：团队提示词（披露行、评审机器人、提交作者、自动合并条件等）。

保存触发 setup 检查，返回 `restarting: true` 时等待重启后再操作。

验证方式：从允许列表里的账号在 Issue 评论 `@<agent login> <request>`，约一分钟后面板 Overview 应出现 Ticket。

---

## 7. 常用命令速查

```powershell
# 启动 / 停止 / 重启
dsh --profile superagent
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3082).OwningProcess   # 停止
dsh --profile superagent                                              # 重启

# 校验配置组合
dsh --profile superagent --dump-config

# 管理 API
$h = @{ 'x-orchestrator-request' = '1' }
Invoke-RestMethod -Uri 'http://127.0.0.1:3082/orchestrator/api/state' -Headers $h

# 重新构建 bundle
cd C:\Users\1\Documents\deepseek-harness\default-workspace\dsh-superagent
pnpm install --node-linker=hoisted ; pnpm build
```

---

## 8. 关键文件清单

| 文件 | 作用 |
| --- | --- |
| `...\default-workspace\dsh-superagent\package.json` | bundle 清单（`dsh.bundle.patch`、`dsh.client`、`engines`） |
| `...\dsh-superagent\cordis.patch.yml` | bundle 的 patch 层：插入插件与两个 agent preset |
| `...\dsh-superagent\lib\*.js` | 构建产物，插件实际加载的代码 |
| `C:\Users\1\.dsh\profiles\superagent\cordis.patch.yml` | 机器配置（`stateDir`、面板端口） |
| `C:\Users\1\.dsh\state\superagent\orchestrator.sqlite` | 插件状态库 |
