# Steam 商店一键进插件管理页

> **想直接装？看仓库根目录的 [`README.md`](../README.md)** —— 下载 Release 里的源码包，
> 解压后「加载已解压的扩展程序」选中本文件夹即可。
> 扩展 ID：`bncagdlajnfonhmjpffbmoiaklnaibki`（manifest 里已写入 key，解压加载的 ID 与 CRX 相同）

在 **Steam 商店页面**上加一个悬浮按钮，**点一下就跳到 `chrome://extensions` 插件管理页**。
Steam 客户端的界面就是 Chromium（CEF 126）内核，所以它也能装 Chrome 扩展，这个扩展就是给那个浏览器用的；
同一个扩展在普通 Chrome / Edge 里打开 Steam 商店时也照样有效。

---

## 一、安装

### A. 装进 Steam 客户端（你的主要用途）

1. 用你原来那套办法进到 Steam 的 `chrome://extensions`（开发者模式你已经开着了）。
2. 点 **「加载已解压的扩展程序」**。
3. 选中本文件夹 **`Steam商店一键进插件页`**（就是这个 README 所在的文件夹）。
4. 回到 Steam 商店主页，右上角就会出现 **「🧩 插件管理」** 按钮。

> 如果第 2 步在 Steam 里点不动（CEF 有时弹不出"选择文件夹"的原生对话框）——
> 我查过你的 CEF 配置，你那 4 个扩展（SteamDB、Steam Revenue Calculator、翻译插件…）
> 都是走 `extensions_crx_cache`（crx 包装）进来的。真是这样的话告诉我，我给你换成 crx/注入方案。

### B. 装进普通 Chrome / Edge（可选，同样能用）

`chrome://extensions` → 打开开发者模式 → 加载已解压的扩展程序 → 选同一个文件夹。

## 二、使用

| 位置 | 操作 | 结果 |
| --- | --- | --- |
| **Steam 商店页面** | 点右上角 **「🧩 插件管理」** | 当前页面直接跳到 `chrome://extensions` |
| 任意页面 | 点工具栏上的扩展图标 | 跳到 `chrome://extensions` |
| 悬浮按钮 | **按住拖动** | 可以挪到你顺手的位置，位置会被记住 |

- 按钮默认在右上角（`top: 96px`，避开 Steam 商店的顶部导航），拖动后会记住位置。
- 按钮出现在所有 `store.steampowered.com` 页面上（主页、搜索、游戏详情…），不只主页。
- 万一浏览器拦了自动跳转，按钮下方会弹出手动提示面板：显示地址 + 一键复制 + 再试一次。

## 三、原理（为什么必须做成扩展）

网页自己是**不允许**跳到 `chrome://` 这类内部地址的（浏览器安全策略）。
所以流程是：内容脚本在商店页画出按钮 → 点击后 `chrome.runtime.sendMessage` 通知后台 →
后台 `chrome.tabs.update(tabId, {url: "chrome://extensions/"})` 完成跳转。
后台是扩展环境，具备导航到内部页的权限——这一点我已经在 Chromium 里实测通过。

## 四、文件

| 文件 | 作用 |
| --- | --- |
| `manifest.json` | MV3 配置；只申请 `storage`（记住按钮位置），不读你的数据 |
| `content.js` | 在商店页注入悬浮按钮 + 拖动 + 失败提示面板 |
| `content.css` | 按钮样式（Steam 深蓝配色，`dshx-` 前缀避免冲突） |
| `background.js` | 收到消息后把当前标签页导航到 `chrome://extensions` |
| `icons/` | 图标 16/32/48/128 |
| `tools/make_icons.py` | 重新生成图标（Pillow） |

## 五、常见问题

**点按钮没反应？**
看看浏览器是否弹出了提示面板；也可以在 `chrome://extensions` 里确认本扩展是「已启用」，
并且它有"在 store.steampowered.com 上"的站点访问权限（MV3 里由 `matches` 决定，默认就有）。

**按钮挡住我操作 Steam 了？**
按住按钮拖走即可，位置会保存。

**Steam 更新后按钮不见了？**
Steam 大版本更新有时会重置 CEF 配置目录，重新加载一次扩展即可（`htmlcache` 被重建的话）。
