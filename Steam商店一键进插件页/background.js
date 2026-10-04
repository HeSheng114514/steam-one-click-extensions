/*
 * Steam 商店一键进插件管理页 —— 后台脚本（MV3 Service Worker）
 *
 * 职责：
 *   1) 接收商店页面里那个悬浮按钮的请求，把当前标签页导航到 chrome://extensions
 *      （页面自身不能直接跳 chrome://，必须由扩展后台来做）
 *   2) 点工具栏图标时，同样跳到插件管理页
 *
 * 兼容：Steam 客户端的 CEF(Chromium 126) 与普通 Chrome / Edge 都走同一套 API。
 */

/** 候选地址：Steam 的 CEF 用 chrome://；普通 Edge 会自动把它映射成 edge:// */
const CANDIDATES = ["chrome://extensions/", "edge://extensions/"];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 打开插件管理页。
 * @param {number|undefined} tabId 有值=在当前标签页内跳转（Steam 里推荐），无值=开新标签页
 */
async function openExtensionsPage(tabId) {
  let lastError = "";

  if (typeof tabId === "number") {
    for (const url of CANDIDATES) {
      try {
        await chrome.tabs.update(tabId, { url, active: true });
        return { ok: true, url, mode: "update" };
      } catch (err) {
        lastError = String(err && err.message ? err.message : err);
        await sleep(50);
      }
    }
  }

  for (const url of CANDIDATES) {
    try {
      await chrome.tabs.create({ url, active: true });
      return { ok: true, url, mode: "create" };
    } catch (err) {
      lastError = String(err && err.message ? err.message : err);
      await sleep(50);
    }
  }

  return { ok: false, error: lastError || "未知错误" };
}

/* ---------- 来自商店页面悬浮按钮的消息 ---------- */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== "DSHX_OPEN_EXTENSIONS") return undefined;

  const tabId = sender && sender.tab ? sender.tab.id : undefined;
  openExtensionsPage(tabId).then(sendResponse, (e) =>
    sendResponse({ ok: false, error: String(e) })
  );
  return true; // 异步回复
});

/* ---------- 点工具栏图标也能进 ---------- */
chrome.action.onClicked.addListener(async () => {
  let tabId;
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs.length) tabId = tabs[0].id;
  } catch (e) {
    /* 忽略：拿不到就开新标签页 */
  }
  await openExtensionsPage(tabId);
});
