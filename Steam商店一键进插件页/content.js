/* eslint-disable no-undef */
/*
 * 内容脚本：在 Steam 商店页面注入一个悬浮按钮 —— 点一下就跳插件管理页
 * 页面自己不能跳 chrome://，所以真正干活的是 background.js（扩展环境有权限）
 */
(() => {
  "use strict";

  if (window.__dshxInjected) return;
  window.__dshxInjected = true;

  const ID = "dshx-open-ext";
  const PANEL_ID = "dshx-open-ext-panel";
  const TARGET = "chrome://extensions/";
  const POS_KEY = "dshx_btn_pos_v1";

  if (document.getElementById(ID)) return;

  /* ---------------- 按钮 ---------------- */
  const el = document.createElement("div");
  el.id = ID;
  el.setAttribute("role", "button");
  el.setAttribute("tabindex", "0");
  el.title = "点一下直达插件管理页 chrome://extensions（按住可以拖动位置）";

  const ico = document.createElement("span");
  ico.className = "dshx-ico";
  ico.textContent = "\u{1F9E9}"; // 🧩

  const label = document.createElement("span");
  label.className = "dshx-label";
  label.textContent = "插件管理";

  el.appendChild(ico);
  el.appendChild(label);

  /* ---------------- 位置记忆 + 拖动 ---------------- */
  let dragging = false;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  }

  function applyPos(left, top) {
    const w = el.offsetWidth || 110;
    const h = el.offsetHeight || 36;
    const maxLeft = Math.max(0, window.innerWidth - w - 2);
    const maxTop = Math.max(0, window.innerHeight - h - 2);
    const l = clamp(left, 2, maxLeft);
    const t = clamp(top, 2, maxTop);
    el.style.left = l + "px";
    el.style.top = t + "px";
    el.style.right = "auto";
    el.style.bottom = "auto";
    return { left: l, top: t };
  }

  function defaultPos() {
    return {
      left: Math.max(12, window.innerWidth - (el.offsetWidth || 116) - 20),
      // 120px 是为了避开 Steam 商店顶部那条约 104px 高的导航栏
      top: 120
    };
  }

  function savePos(pos) {
    try {
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [POS_KEY]: pos });
      }
    } catch (e) {
      /* 忽略 */
    }
  }

  function restorePos() {
    let done = false;
    try {
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([POS_KEY], (res) => {
          const p = res && res[POS_KEY];
          if (p && typeof p.left === "number") applyPos(p.left, p.top);
          else applyPos(defaultPos().left, defaultPos().top);
        });
        done = true;
      }
    } catch (e) {
      /* 忽略 */
    }
    if (!done) {
      const d = defaultPos();
      applyPos(d.left, d.top);
    }
  }

  el.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    dragging = true;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    const r = el.getBoundingClientRect();
    startLeft = r.left;
    startTop = r.top;
    el.classList.add("dshx-dragging");
    try {
      el.setPointerCapture(e.pointerId);
    } catch (err) {
      /* 忽略 */
    }
  });

  el.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!moved && Math.abs(dx) + Math.abs(dy) < 5) return;
    moved = true;
    applyPos(startLeft + dx, startTop + dy);
  });

  el.addEventListener("pointerup", (e) => {
    if (!dragging) return;
    dragging = false;
    el.classList.remove("dshx-dragging");
    try {
      el.releasePointerCapture(e.pointerId);
    } catch (err) {
      /* 忽略 */
    }
    if (moved) {
      const r = el.getBoundingClientRect();
      savePos({ left: Math.round(r.left), top: Math.round(r.top) });
    }
  });

  window.addEventListener("resize", () => {
    const r = el.getBoundingClientRect();
    applyPos(r.left, r.top);
  });

  /* ---------------- 点击 → 跳转 ---------------- */
  let busy = false;

  function setLabel(text) {
    label.textContent = text;
  }

  function showPanel(errorText) {
    if (document.getElementById(PANEL_ID)) return;
    const r = el.getBoundingClientRect();
    const panel = document.createElement("div");
    panel.id = PANEL_ID;

    const title = document.createElement("div");
    title.className = "dshx-panel-title";
    title.textContent = "没能自动跳转";

    const desc = document.createElement("div");
    desc.className = "dshx-panel-desc";
    desc.textContent = "手动在地址栏输入下面的地址（按 Ctrl+L 选中地址栏）：";

    const code = document.createElement("div");
    code.className = "dshx-panel-code";
    code.textContent = "chrome://extensions";

    const row = document.createElement("div");
    row.className = "dshx-panel-row";

    const copyBtn = document.createElement("button");
    copyBtn.className = "dshx-panel-btn";
    copyBtn.textContent = "复制地址";
    copyBtn.addEventListener("click", () => {
      const ta = document.createElement("textarea");
      ta.value = "chrome://extensions";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        copyBtn.textContent = "已复制 ✓";
      } catch (e) {
        copyBtn.textContent = "请手动复制";
      }
      ta.remove();
    });

    const retryBtn = document.createElement("button");
    retryBtn.className = "dshx-panel-btn dshx-panel-btn-primary";
    retryBtn.textContent = "再试一次";
    retryBtn.addEventListener("click", () => {
      panel.remove();
      setLabel("插件管理");
      openExtensions();
    });

    row.appendChild(copyBtn);
    row.appendChild(retryBtn);
    panel.appendChild(title);
    panel.appendChild(desc);
    panel.appendChild(code);
    if (errorText) {
      const err = document.createElement("div");
      err.className = "dshx-panel-err";
      err.textContent = String(errorText).slice(0, 160);
      panel.appendChild(err);
    }
    panel.appendChild(row);

    panel.style.top = Math.max(8, r.bottom + 8) + "px";
    panel.style.left =
      Math.min(Math.max(8, r.left - 180), Math.max(8, window.innerWidth - 300)) + "px";
    document.body.appendChild(panel);
  }

  function fallbackNavigate() {
    // 页面自身跳 chrome:// 通常会被拦，但个别环境允许，试一下没坏处
    try {
      window.location.href = TARGET;
    } catch (e) {
      /* 忽略 */
    }
  }

  function openExtensions() {
    if (busy) return;
    busy = true;
    setLabel("跳转中…");

    let answered = false;
    const finish = (ok, err) => {
      if (answered) return;
      answered = true;
      busy = false;
      if (ok) return; // 页面马上就会跳走
      setLabel("插件管理");
      showPanel(err);
      fallbackNavigate();
    };

    try {
      chrome.runtime.sendMessage({ type: "DSHX_OPEN_EXTENSIONS" }, (resp) => {
        if (chrome.runtime.lastError) {
          finish(false, chrome.runtime.lastError.message);
          return;
        }
        finish(!!(resp && resp.ok), resp && resp.error);
      });
    } catch (e) {
      finish(false, String(e));
    }

    // 后台没回话也不能一直卡着
    setTimeout(() => finish(false, "扩展后台没有响应"), 2000);
  }

  el.addEventListener("click", (e) => {
    if (moved) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    openExtensions();
  });

  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openExtensions();
    }
  });

  /* ---------------- 挂载 ---------------- */
  function mount() {
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", mount, { once: true });
      return;
    }
    document.body.appendChild(el);
    applyPos(defaultPos().left, defaultPos().top);
    restorePos();
  }

  mount();
})();
