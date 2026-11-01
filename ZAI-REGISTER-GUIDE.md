# chat.z.ai (ZCode 桌面 OAuth 路线) 注册实测报告 R1

> 2026-11-01 · CDP E2E · 与 REGISTER-GUIDE.md (bigmodel线) 互补

## 结论

| 项 | 结果 |
|---|---|
| 登录入口 | `https://zchat.z.ai/auth`（`/register` `/auth/login` 全 500 错误，唯一入口是 zchat 子域） |
| 架构 | Open WebUI，**纯手机号+短信码，无图形点选验证** |
| 发码验证 | **阿里云 Captcha 2.0 滑块拼图**（发码前触发，弹「请完成安全验证」） |
| 滑块自动化 | ⚠️ 未完全打通（见下） |
| 短信 | D1 `keyWord=智谱` 卡段可收（短信签名【智谱ai】，¥0.2/条） |

## 已验证步骤

1. **入口**：CDP 导航 `https://zchat.z.ai/auth` → 手机号登录表单（tel input + 验证码 input）
2. **填号**：native value setter + input event ✅
3. **发码触发**：点「发送验证码」→ 弹阿里云滑块（CertifyId 每次随机）
4. **滑块拖动**：`Input.dispatchMouseEvent` 手动拖（手柄 `.slider-move` 40x40，滑轨 300px，ease-out + jitter 轨迹）→ **位置能对准但行为风控拒**（拖完回弹「验证失败」，与 captcha-solver README 描述的 F001 行为评分一致——单调 smoothstep 必被拒）

## 卡点与已知解法（未走完）

- **阿里云滑块有行为风控**：位置对≠过，需 overshoot-and-correct 弹道轨迹
- **现成解法**：`D:/参考项目/captcha-solver/` 有完整 Aliyun Captcha 2.0 solver（YOLOv8n 缺口检测 1.8px 精度 + 弹道拖拽，实测 3/3 通过）：
  - 架构：solver 自托管渲染 widget（只需 `scene_id + prefix`），收割 `{certifyId, deviceToken, data}` token → 调用方注入目标页
  - sidecar 已部署：`D:/apk-analysis/bigmodel-cdp/captcha-solver/`（venv 已建，server :8877 已跑通）
  - **未完成**：z.ai 页面的 `scene_id/prefix` 提取（`window.AliyunCaptchaConfig` 对象存在但读取脚本被进程管理问题反复中断，未拿到值）
- **下一步**（续做）：`ev('JSON.stringify(window.AliyunCaptchaConfig)')` 拿配置 → `POST :8877/solve {type:aliyun, scene_id, prefix, region}` → 拿 token 注入 z.ai 页（`__CloseAliyunCaptcha` / widget callback）→ 收码登录 → OAuth cli/init 拿 zcodejwttoken

## 与 bigmodel 线对比

| | bigmodel.cn | chat.z.ai |
|---|---|---|
| 验证码 | 点选文字（已破 ✅） | 阿里滑块（有现成 solver 未接完） |
| 实名墙 | ❌ 硬墙（API key 401） | 无（Start Plan 服务端自动授予） |
| 额度 | 实名后 500万 tokens | 每日 3M+2M+2M 自动 |
| 批量价值 | 低（身份证墙） | **高（主路线）** |

## 坑清单

1. z.ai 的 `/register`、`/auth/login` 全 500，唯一活口 `zchat.z.ai/auth`
2. 滑块不是位置题是行为题——手拖 dx 对准也 FAIL
3. 页面会静默清空输入框（页面刷新/重渲染），每步操作前先验 `input.value`
4. Node 后台脚本输出文件延迟极大（30s+），一律前台跑+限时
5. `shot.cjs` 用 `t.url.includes('z.ai')` 匹配页面（bigmodel 版本会截错 tab）
