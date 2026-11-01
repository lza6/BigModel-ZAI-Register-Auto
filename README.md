# BigModel / Z.AI 自动注册自动化（CDP E2E 实测）

> 2026-11-01 实测交付。两条注册线的全流程脚本 + 实测报告 + 踩坑清单。

## 仓库内容

| 路径 | 内容 |
|---|---|
| [`REGISTER-GUIDE.md`](REGISTER-GUIDE.md) | **bigmodel.cn 线**（已全通 ✅）：反调试绕过 / 点选验证码像素聚类自动化 / D1 接码 / 一次性 API key 抓取 / 额度真相（实名墙） |
| [`ZAI-REGISTER-GUIDE.md`](ZAI-REGISTER-GUIDE.md) | **chat.z.ai 线**（主路线，滑块卡点+现成解法）：zchat.z.ai/auth 入口 / 阿里滑块行为风控 / captcha-solver sidecar 方案 |
| `scripts/` | 17 个可直接运行的 CDP 脚本 |

## 实测核心成果

1. **bigmodel.cn 注册+登录+拿key 全自动打通**（验证码点选 100% 可过）：
   - CDP 白屏反调试 → Vue router `push('/login')` 绕过
   - 点选验证码 → pngjs 橙色像素聚类（45px 半径）+ CDP 真实点击
   - D1 接码（`api.d1jiema.com`，`keyWord=智谱` 专属卡段 ¥0.2/条）
   - API Key 一次性展示弹窗流程自动化（`{32hex}.{16char}` 正则抓取）
2. **⚠️ 两条线的额度真相**：
   - bigmodel：**实名是硬墙**——未实名 API key 一律 401，实名需身份证+7 工作日审核（实名后解锁 500 万 tokens）
   - chat.z.ai：**无实名墙**（Start Plan 每日 3M+2M+2M 服务端自动授予）——批量号池主路线
3. **z.ai 卡点**：阿里云 Captcha 2.0 滑块是**行为风控**（位置对准也 FAIL，F001），解法=参考项目 `captcha-solver` 的 Aliyun solver（YOLO 缺口检测+overshoot 弹道，实测 3/3），sidecar 已部署 :8877，差 `scene_id/prefix` 提取一步

## 脚本清单（scripts/）

| 脚本 | 用途 |
|---|---|
| `lib.cjs` | CDP WebSocket 连接封装（connect/send/ev） |
| `cdp-route.cjs` | 绕白屏：Vue router push('/login') |
| `step1-phone.cjs` | native setter 填手机号 |
| `auto3.cjs` | 点选验证码像素聚类检测（橙黄字两套阈值） |
| `click-plan.cjs` | 按字符顺序点击+确定 |
| `fill-code.cjs` | 填短信码+勾协议 |
| `login-btn.cjs` | 点登录按钮 |
| `newkey2/3/4.cjs` | 新建 API Key 弹窗三步（拿一次性完整 key） |
| `net-cap.cjs` | Network 层抓 Authorization JWT |
| `slider7.cjs` | 滑块拖动（.slider-move 定位+ease-out 轨迹，**行为风控未过**） |
| `zai-full.cjs` | z.ai 填号+发码+hook 抓请求 |
| `shot.cjs` | 即时截图（改 url 匹配串可切 z.ai/bigmodel） |

## 环境依赖

- Chrome + `--remote-debugging-port=9222`
- Node + `ws`、`pngjs`
- D1 接码 token（¥0.2/号）
- （z.ai 线续做）Python venv：`captcha-solver/` sidecar（fastapi/uvicorn/onnxruntime/opencv）

## 成本

- bigmodel 号：¥0.2 短信（但实名墙使其无批量价值）
- z.ai 号：¥0.2 短信 → Start Plan 每日 ~7M tokens 免费额度（无需实名）

## 免责

仅用于安全研究与自动化学习。注册行为违反目标平台 ToS，账号随时可能被批量封禁。
