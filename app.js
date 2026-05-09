const state = {
  isAdmin: false,
  currentUser: null,
  token: "",
  authMode: "login",
  activeTab: "calendar",
  month: new Date(2026, 3, 1),
  selectedDate: "2026-04-30",
  ratings: {},
  watched: new Set(["c1", "c2"]),
  reminders: new Set(),
  courses: [
    {
      id: "c1",
      title: "运维多功能机器人 & DNS检测平台",
      subtitle: "带领大家在线安装和使用",
      positions: ["运维", "研发"],
      startAt: "2026-04-30T21:00:00+08:00",
      endAt: "2026-04-30T22:00:00+08:00",
      content: ["环境准备与机器人部署", "DNS 检测任务配置", "告警通知与结果复盘"],
      scenarios: ["内部域名巡检", "自动化排障", "跨团队故障同步", "值班告警降噪", "平台能力评估"],
      teacher: "创新学院-Ben",
      liveUrl: "https://example.com/live/dns",
      replayUrl: "",
      handbookUrl: "",
      form: "在线安装实操",
      published: true,
    },
    {
      id: "c2",
      title: "内网穿透与反代架构实战",
      subtitle: "从访问路径到安全边界",
      positions: ["研发"],
      startAt: "2026-04-23T21:00:00+08:00",
      endAt: "2026-04-23T22:00:00+08:00",
      content: ["反代链路拆解", "内网穿透安全策略", "常见异常定位"],
      scenarios: ["远程联调", "灰度验证", "私有服务暴露", "权限边界梳理", "临时演示环境"],
      teacher: "创新学院-Ada",
      liveUrl: "https://example.com/live/proxy",
      replayUrl: "https://example.feishu.cn/minutes/proxy-review",
      handbookUrl: "proxy-handbook.pdf",
      form: "讲解",
      published: true,
    },
    {
      id: "c3",
      title: "容器网络排障与流量观测",
      subtitle: "用观测数据定位服务调用问题",
      positions: ["运维", "研发"],
      startAt: "2026-04-16T20:30:00+08:00",
      endAt: "2026-04-16T21:30:00+08:00",
      content: ["Pod 网络路径", "流量采样与链路分析", "故障案例拆解"],
      scenarios: ["接口超时", "跨集群访问异常", "发布后错误率上升", "网络策略验证", "容量压测"],
      teacher: "平台团队-Cora",
      liveUrl: "https://example.com/live/network",
      replayUrl: "https://example.feishu.cn/minutes/network",
      handbookUrl: "",
      form: "实战演示",
      published: true,
    },
    {
      id: "c4",
      title: "自动化巡检脚本与值班效率提升",
      subtitle: "从巡检清单到可复用脚本",
      positions: ["运维"],
      startAt: "2026-05-12T20:00:00+08:00",
      endAt: "2026-05-12T21:00:00+08:00",
      content: ["巡检任务建模", "脚本模板设计", "异常输出标准化"],
      scenarios: ["日常值班", "节前保障", "变更前检查", "新人交接", "重复问题收敛"],
      teacher: "创新学院-Lin",
      liveUrl: "https://example.com/live/ops-script",
      replayUrl: "",
      handbookUrl: "",
      form: "在线安装实操",
      published: true,
    },
  ],
};

const tabs = [
  ["calendar", "直播日历"],
  ["square", "课程广场"],
  ["records", "学习记录"],
  ["manage", "管理"],
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const AUTH_SESSION_KEY = "innovation-academy-session";

const fmtDate = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const parseDate = (value) => new Date(value);

function getCourseRuntime(course) {
  const now = new Date("2026-04-30T20:50:00+08:00");
  const start = parseDate(course.startAt);
  const end = parseDate(course.endAt);
  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "live";
  return "ended";
}

function statusLabel(status) {
  return { upcoming: "即将开播", live: "直播中", ended: "已结束" }[status];
}

function weekday(date) {
  return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][date.getDay()];
}

function formatTimeRange(course) {
  const start = parseDate(course.startAt);
  const end = parseDate(course.endAt);
  const pad = (num) => String(num).padStart(2, "0");
  return `${weekday(start)} · ${pad(start.getHours())}:${pad(start.getMinutes())}-${pad(end.getHours())}:${pad(end.getMinutes())}`;
}

function formatFullTime(course) {
  const start = parseDate(course.startAt);
  const end = parseDate(course.endAt);
  const pad = (num) => String(num).padStart(2, "0");
  return `${start.getFullYear()}.${pad(start.getMonth() + 1)}.${pad(start.getDate())}（${weekday(start)}）${pad(start.getHours())}:${pad(start.getMinutes())}-${pad(end.getHours())}:${pad(end.getMinutes())}`;
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthEvents() {
  const key = monthKey(state.month);
  return state.courses.filter((course) => course.published && course.startAt.slice(0, 7) === key);
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function isValidHttpsUrl(value) {
  if (!value) return true;
  if (value.startsWith("/api/assets")) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isVideoUrl(value) {
  try {
    const { pathname, searchParams } = new URL(value, window.location.origin);
    if (pathname === "/api/assets" && searchParams.get("type") === "replay") return true;
    return /\.(mp4|webm|ogg|mov|m4v)$/i.test(pathname);
  } catch {
    return false;
  }
}

function closeReplayModal() {
  $("#replayModal").classList.remove("is-visible");
  $("#replayModal").setAttribute("aria-hidden", "true");
  $("#replayFrame").innerHTML = "";
  $("#openReplayExternal").removeAttribute("data-url");
}

function openReplayModal(course) {
  if (!course.replayUrl || !isValidHttpsUrl(course.replayUrl)) {
    showToast("回放链接格式异常，请联系管理员");
    return;
  }
  $("#replayTitle").textContent = course.title;
  $("#openReplayExternal").dataset.url = course.replayUrl;
  $("#replayFrame").innerHTML = isVideoUrl(course.replayUrl)
    ? `<video class="replay-video" src="${course.replayUrl}" controls autoplay playsinline></video>`
    : `<iframe class="replay-iframe" src="${course.replayUrl}" title="${course.title}" allow="fullscreen; autoplay; clipboard-read; clipboard-write" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  $("#replayModal").classList.add("is-visible");
  $("#replayModal").setAttribute("aria-hidden", "false");
}

async function apiFetch(path, options = {}) {
  const headers = { "content-type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.authorization = `Bearer ${state.token}`;
  let response;
  try {
    response = await fetch(path, { ...options, headers });
  } catch {
    throw new Error("网络请求失败，请刷新后重试");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "请求失败，请重试");
  return data;
}

function uploadFileWithProgress(url, file, contentType, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", contentType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(file.size);
        resolve();
        return;
      }
      reject(new Error("上传对象存储失败，请检查存储桶 CORS 或稍后重试"));
    };
    xhr.onerror = () => reject(new Error("网络上传失败，请稍后重试"));
    xhr.send(file);
  });
}

async function uploadAssetFile(course, type, file, onProgress = () => {}) {
  if (!file) return null;
  const contentType = file.type || "application/octet-stream";
  const data = await apiFetch("/api/upload-url", {
    method: "POST",
    body: JSON.stringify({
      courseId: course.id,
      type,
      fileName: file.name,
      contentType,
      size: file.size,
    }),
  });
  await uploadFileWithProgress(data.uploadUrl, file, contentType, onProgress);
  return data.asset;
}

function setUploadProgress(visible, percent = 0, text = "") {
  const wrap = $("#uploadProgress");
  const bar = $("#uploadProgressBar");
  const label = $("#uploadProgressText");
  wrap.classList.toggle("is-visible", visible);
  bar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  label.textContent = text || `上传进度 ${Math.round(percent)}%`;
}

function safeDownloadName(course) {
  const fallback = `${course.title || "知识手册"}.pdf`;
  return (course.handbookFileName || fallback).replace(/[\\/:*?"<>|]+/g, "-");
}

async function downloadHandbook(course) {
  const response = await fetch(course.handbookUrl);
  if (!response.ok) throw new Error("手册下载失败，请稍后重试");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = safeDownloadName(course);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function setCurrentUser(user, token) {
  state.currentUser = { username: user.username, role: user.role };
  state.token = token;
  state.isAdmin = user.role === "admin";
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ user: state.currentUser, token }));
  renderAuthState();
}

function clearCurrentUser() {
  state.currentUser = null;
  state.isAdmin = false;
  state.token = "";
  state.authMode = "login";
  localStorage.removeItem(AUTH_SESSION_KEY);
  if (state.activeTab === "manage") state.activeTab = "calendar";
  $("#authForm").reset();
  renderAuthMode();
  renderAuthState();
}

function restoreSession() {
  try {
    const session = JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || "null");
    if (!session?.user?.username || !session?.token) return;
    state.currentUser = session.user;
    state.token = session.token;
    state.isAdmin = session.user.role === "admin";
  } catch {
    localStorage.removeItem(AUTH_SESSION_KEY);
  }
}

function renderAuthState() {
  const isLoggedIn = Boolean(state.currentUser);
  $("#authScreen").classList.toggle("is-hidden", isLoggedIn);
  $(".app-shell").classList.toggle("is-locked", !isLoggedIn);
  $("#userBadge").textContent = isLoggedIn ? `${state.currentUser.username} · ${state.isAdmin ? "管理员" : "成员"}` : "未登录";
  renderTabs();
  $$(".view").forEach((view) => view.classList.remove("is-active"));
  $(`#${state.activeTab}View`).classList.add("is-active");
  if (state.activeTab === "records") renderRecords();
  if (state.activeTab === "manage") renderAssetOptions();
}

function renderAuthMode() {
  const isRegister = state.authMode === "register";
  $$(".auth-tabs .subtab").forEach((button) => button.classList.toggle("is-active", button.dataset.authMode === state.authMode));
  $(".auth-register-field").classList.toggle("is-visible", isRegister);
  $("#authSubmit").textContent = isRegister ? "注册并登录" : "登录";
  $("#authPassword").autocomplete = isRegister ? "new-password" : "current-password";
  $("#authTip").textContent = isRegister ? "注册成功后将以普通成员身份进入课堂" : "管理员初始账号：kete2026，密码：999999";
}

async function handleAuthSubmit() {
  const username = $("#authUsername").value.trim();
  const password = $("#authPassword").value;
  const confirmPassword = $("#authConfirmPassword").value;

  if (!username || !password) {
    showToast("请输入账号和密码");
    return;
  }

  try {
    const data = await apiFetch("/api/auth", {
      method: "POST",
      body: JSON.stringify({ mode: state.authMode, username, password, confirmPassword }),
    });
    setCurrentUser(data.user, data.token);
    showToast(state.authMode === "register" ? "注册成功，已登录" : data.user.role === "admin" ? "管理员登录成功" : "登录成功");
    loadAppData();
  } catch (error) {
    showToast(error.message);
  }
}

function renderTabs() {
  const visibleTabs = tabs.filter(([id]) => id !== "manage" || state.isAdmin);
  $("#mainTabs").style.setProperty("--tab-count", visibleTabs.length);
  $("#mainTabs").innerHTML = visibleTabs
    .map(([id, label]) => `<button class="tab ${state.activeTab === id ? "is-active" : ""}" id="tab-${id}" data-tab="${id}" type="button">${label}</button>`)
    .join("");
}

function switchTab(tab) {
  state.activeTab = tab;
  $$(".view").forEach((view) => view.classList.remove("is-active"));
  $(`#${tab}View`).classList.add("is-active");
  renderTabs();
  if (tab === "square") renderCourses();
  if (tab === "records") renderRecords();
  if (tab === "manage") renderAssetOptions();
}

function renderCalendar() {
  const year = state.month.getFullYear();
  const month = state.month.getMonth();
  $("#monthTitle").textContent = `${year}年${month + 1}月`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const eventDates = new Set(monthEvents().map((course) => course.startAt.slice(0, 10)));
  const today = "2026-04-30";
  const cells = [];

  for (let i = 0; i < firstDay; i += 1) cells.push(`<button class="day is-empty" type="button" aria-hidden="true"></button>`);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = fmtDate(new Date(year, month, day));
    cells.push(`
      <button class="day ${eventDates.has(date) ? "has-event" : ""} ${state.selectedDate === date ? "is-selected" : ""} ${today === date ? "is-today" : ""}" type="button" data-date="${date}" aria-label="${date}">
        <span>${day}</span>
      </button>
    `);
  }

  $("#calendarGrid").innerHTML = cells.join("");
  renderEventList();
}

function renderEventList() {
  const events = monthEvents()
    .filter((course) => !state.selectedDate || course.startAt.startsWith(state.selectedDate))
    .sort((a, b) => parseDate(a.startAt) - parseDate(b.startAt));

  const monthName = state.month.toLocaleDateString("zh-CN", { month: "long" });
  $("#calendarListTitle").textContent = state.selectedDate ? `${Number(state.selectedDate.slice(8, 10))}日直播安排` : `${monthName}直播安排`;
  $("#clearDay").style.visibility = state.selectedDate ? "visible" : "hidden";

  if (!events.length) {
    $("#eventList").innerHTML = `<div class="empty-state">${state.selectedDate ? "当天暂无直播安排" : "本月暂无直播安排"}</div>`;
    return;
  }

  $("#eventList").innerHTML = events.map(renderEventCard).join("");
}

function renderEventCard(course) {
  const start = parseDate(course.startAt);
  const day = String(start.getDate()).padStart(2, "0");
  const mon = start.toLocaleString("en", { month: "short" }).toUpperCase();
  const status = getCourseRuntime(course);
  return `
    <button class="event-card" type="button" data-course="${course.id}">
      <span class="date-block"><span><strong>${day}</strong><br />${mon}</span></span>
      <span class="event-body">
        <h4>${course.title}</h4>
        <p class="meta">${formatTimeRange(course)} · ${course.teacher}</p>
        <span class="tag-row">
          ${course.positions.map((pos) => `<span class="tag">${pos}</span>`).join("")}
          <span class="tag form">${course.form}</span>
          <span class="status ${status}">${statusLabel(status)}</span>
        </span>
      </span>
    </button>
  `;
}

function renderCourses() {
  const published = state.courses.filter((course) => course.published);
  const upcoming = published.filter((course) => getCourseRuntime(course) !== "ended").sort((a, b) => parseDate(a.startAt) - parseDate(b.startAt));
  const past = published.filter((course) => getCourseRuntime(course) === "ended").sort((a, b) => parseDate(b.startAt) - parseDate(a.startAt));

  $("#upcomingCount").textContent = `${upcoming.length} 门`;
  $("#upcomingCourses").innerHTML = upcoming.length ? upcoming.map(renderCourseCard).join("") : `<div class="empty-state">暂无本期课程</div>`;
  $("#pastCourses").innerHTML = past.length ? past.map(renderCourseCard).join("") : `<div class="empty-state">暂无往期课程</div>`;
}

function renderCourseCard(course) {
  const status = getCourseRuntime(course);
  const initial = course.teacher.split("-").pop().slice(0, 1).toUpperCase();
  const actionHtml = renderCourseAction(course, status);

  return `
    <article class="course-card ${status === "ended" ? "is-past" : ""}" id="course-${course.id}">
      <div class="course-head">
        <div>
          <h4>${course.title}</h4>
          <p class="meta">${course.subtitle}</p>
          <p class="meta">${formatFullTime(course)}</p>
        </div>
        <span class="avatar">${initial}</span>
      </div>
      <div class="tag-row">
        ${course.positions.map((pos) => `<span class="tag">${pos}</span>`).join("")}
        <span class="status ${status}">${statusLabel(status)}</span>
      </div>
      <div class="content-grid">
        <div class="mini-panel">
          <b>课程内容</b>
          <ol>${course.content.map((item) => `<li>${item}</li>`).join("")}</ol>
        </div>
        <div class="mini-panel">
          <b>适用场景</b>
          <ul>${course.scenarios.map((item) => `<li>${item}</li>`).join("")}</ul>
        </div>
      </div>
      <div class="teacher-row">
        <span class="meta">授课老师 · ${course.teacher}</span>
      </div>
      <div class="record-actions">
        ${actionHtml}
      </div>
    </article>
  `;
}

function renderCourseAction(course, status) {
  if (status === "upcoming") {
    const reminded = state.reminders.has(course.id);
    return `<button class="secondary-button ${reminded ? "is-reminded" : ""}" type="button" data-action="signup" data-course="${course.id}">${reminded ? "已加入开播提醒" : "提醒我"}</button>`;
  }
  if (status === "live") {
    return `<button class="primary-button" type="button" data-action="live" data-course="${course.id}">进入直播间</button>`;
  }
  return `<button class="primary-button" type="button" data-action="replay" data-course="${course.id}">观看回放</button>`;
}

function renderRecords() {
  const records = state.courses.filter((course) => state.watched.has(course.id) || getCourseRuntime(course) === "ended");
  const totalMs = records.reduce((sum, course) => sum + (parseDate(course.endAt) - parseDate(course.startAt)), 0);
  $("#learnedCount").textContent = records.length;
  $("#learnedHours").textContent = `${Math.round(totalMs / 36e5)}h`;
  $("#recordList").innerHTML = records.length ? records.map(renderRecordCard).join("") : `<div class="empty-state">暂无学习记录</div>`;
}

function renderRecordCard(course) {
  const rating = state.ratings[course.id] || 0;
  const date = course.startAt.slice(0, 10).replaceAll("-", ".");
  return `
    <article class="record-card">
      <h4>${course.title}</h4>
      <p class="meta">直播日期 · ${date}</p>
      <div class="record-actions">
        <button class="primary-button" type="button" data-action="recordReplay" data-course="${course.id}" ${course.replayUrl ? "" : 'disabled title="回放上传中"'}>回看视频</button>
        <button class="secondary-button" type="button" data-action="download" data-course="${course.id}" ${course.handbookUrl ? "" : 'disabled title="手册上传中"'}>下载知识手册</button>
      </div>
      <div class="rating-line">
        <span>${course.teacher}</span>
        <span class="stars" data-course="${course.id}">
          ${[1, 2, 3, 4, 5].map((score) => `<button class="star ${score <= rating ? "is-on" : ""}" type="button" data-score="${score}" aria-label="${score}星">★</button>`).join("")}
        </span>
        <span class="${rating ? "rated" : ""}">${rating ? "已评价" : "点击评分"}</span>
      </div>
    </article>
  `;
}

function renderPositionChecks() {
  $("#positionChecks").innerHTML = ["运维", "研发", "测试", "产品"]
    .map((pos, index) => `<label class="check-chip"><input type="checkbox" value="${pos}" ${index < 2 ? "checked" : ""} />${pos}</label>`)
    .join("");
}

function renderAssetOptions() {
  $("#assetCourse").innerHTML = state.courses
    .map((course) => `<option value="${course.id}">${course.title} · ${statusLabel(getCourseRuntime(course))}</option>`)
    .join("");
  updateAssetStatus();
}

function renderAdminCourseList() {
  const published = state.courses
    .filter((course) => course.published)
    .sort((a, b) => parseDate(b.startAt) - parseDate(a.startAt));
  $("#publishedManageCount").textContent = `${published.length} 门`;
  $("#adminCourseList").innerHTML = published.length
    ? published.map(renderAdminCourseItem).join("")
    : `<div class="empty-state">暂无已发布课程</div>`;
}

function renderAdminCourseItem(course) {
  return `
    <article class="admin-course-card">
      <div>
        <h4>${course.title}</h4>
        <p class="meta">${formatFullTime(course)} · ${course.teacher}</p>
        <div class="tag-row">
          ${course.positions.map((pos) => `<span class="tag">${pos}</span>`).join("")}
          <span class="status ${getCourseRuntime(course)}">${statusLabel(getCourseRuntime(course))}</span>
        </div>
      </div>
      <div class="admin-actions">
        <button class="secondary-button" type="button" data-admin-action="edit" data-course="${course.id}">编辑</button>
        <button class="danger-button" type="button" data-admin-action="delete" data-course="${course.id}">删除</button>
      </div>
    </article>
  `;
}

function updateAssetStatus() {
  const course = state.courses.find((item) => item.id === $("#assetCourse").value) || state.courses[0];
  if (!course) return;
  $("#replayFile").value = "";
  $("#handbookFile").value = "";
  $("#assetStatus").innerHTML = `当前回放：${course.replayUrl ? course.replayFileName || "已上传视频" : "未上传"}<br />当前手册：${course.handbookUrl ? course.handbookFileName || "已上传 PDF" : "未上传"}`;
}

async function loadCourses() {
  const data = await apiFetch("/api/courses");
  state.courses = data.courses;
}

async function loadRecords() {
  if (!state.token) return;
  const data = await apiFetch("/api/records");
  state.watched = new Set(data.watched || []);
  state.ratings = data.ratings || {};
}

async function loadAppData() {
  try {
    await loadCourses();
    await loadRecords();
    renderCalendar();
    renderCourses();
    renderRecords();
    renderAssetOptions();
    renderAdminCourseList();
  } catch (error) {
    showToast(error.message || "加载失败，请重试");
  }
}

function getCoursePayload(published) {
  const startAt = $("#startAt").value;
  const endAt = $("#endAt").value;
  if (new Date(endAt) <= new Date(startAt)) {
    showToast("结束时间需晚于开课时间");
    return null;
  }
  const positions = $$("#positionChecks input:checked").map((input) => input.value);
  if (!positions.length) {
    showToast("请选择至少一个适用岗位");
    return null;
  }
  const lines = (id) => $(id).value.split("\n").map((line) => line.trim()).filter(Boolean);
  return {
    title: $("#courseTitle").value.trim(),
    subtitle: $("#courseSubtitle").value.trim(),
    positions,
    startAt: `${startAt}:00+08:00`,
    endAt: `${endAt}:00+08:00`,
    content: lines("#contentLines").slice(0, 5),
    scenarios: lines("#scenarioLines").slice(0, 8),
    teacher: $("#teacherName").value.trim(),
    liveUrl: $("#liveUrl").value.trim(),
    form: "在线实操",
    published,
  };
}

function setCourseFormSubmitting(isSubmitting) {
  $("#publishButton").disabled = isSubmitting;
  $("#saveDraft").disabled = isSubmitting;
  $("#publishButton").textContent = isSubmitting ? "发布中..." : $("#editingCourseId").value ? "保存修改" : "发布";
}

function resetCourseForm() {
  $("#courseFormPanel").reset();
  $("#editingCourseId").value = "";
  $("#courseTitle").value = "";
  $("#courseSubtitle").value = "";
  $$("#positionChecks input").forEach((input, index) => {
    input.checked = index < 2;
  });
  $("#startAt").value = "2026-05-18T20:00";
  $("#endAt").value = "2026-05-18T21:30";
  $("#contentLines").value = "";
  $("#scenarioLines").value = "";
  $("#teacherName").value = "";
  $("#liveUrl").value = "";
  $("#publishButton").textContent = "发布";
  $("#cancelEdit").classList.remove("is-visible");
}

function fillCourseForm(course) {
  $("#editingCourseId").value = course.id;
  $("#courseTitle").value = course.title;
  $("#courseSubtitle").value = course.subtitle;
  $$("#positionChecks input").forEach((input) => {
    input.checked = course.positions.includes(input.value);
  });
  $("#startAt").value = course.startAt.slice(0, 16);
  $("#endAt").value = course.endAt.slice(0, 16);
  $("#contentLines").value = course.content.join("\n");
  $("#scenarioLines").value = course.scenarios.join("\n");
  $("#teacherName").value = course.teacher;
  $("#liveUrl").value = course.liveUrl || "";
  $("#publishButton").textContent = "保存修改";
  $("#cancelEdit").classList.add("is-visible");
}

async function addCourse(published) {
  const payload = getCoursePayload(published);
  if (!payload) return;
  const editingCourseId = $("#editingCourseId").value;
  setCourseFormSubmitting(true);
  try {
    const data = await apiFetch("/api/courses", {
      method: editingCourseId ? "PUT" : "POST",
      body: JSON.stringify(editingCourseId ? { ...payload, courseId: editingCourseId } : payload),
    });
    if (editingCourseId) {
      const index = state.courses.findIndex((item) => item.id === editingCourseId);
      state.courses[index] = data.course;
    } else {
      state.courses.push(data.course);
    }
    renderCalendar();
    renderCourses();
    renderAssetOptions();
    renderAdminCourseList();
    resetCourseForm();
    showToast(editingCourseId ? "课程已更新" : published ? "已发布，学员端实时可见" : "草稿已保存");
  } catch (error) {
    showToast(error.message);
  } finally {
    setCourseFormSubmitting(false);
  }
}

function bindEvents() {
  $("#authForm").addEventListener("submit", (event) => {
    event.preventDefault();
    handleAuthSubmit();
  });

  $$(".auth-tabs .subtab").forEach((button) => {
    button.addEventListener("click", () => {
      state.authMode = button.dataset.authMode;
      $("#authForm").reset();
      renderAuthMode();
    });
  });

  $("#mainTabs").addEventListener("click", (event) => {
    const tab = event.target.closest("[data-tab]");
    if (tab) switchTab(tab.dataset.tab);
  });

  $("#logoutButton").addEventListener("click", () => {
    clearCurrentUser();
    showToast("已退出登录");
  });

  $("#prevMonth").addEventListener("click", () => {
    state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1);
    state.selectedDate = "";
    renderCalendar();
  });

  $("#nextMonth").addEventListener("click", () => {
    state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1);
    state.selectedDate = "";
    renderCalendar();
  });

  $("#calendarGrid").addEventListener("click", (event) => {
    const day = event.target.closest("[data-date]");
    if (!day) return;
    state.selectedDate = state.selectedDate === day.dataset.date ? "" : day.dataset.date;
    renderCalendar();
  });

  $("#clearDay").addEventListener("click", () => {
    state.selectedDate = "";
    renderCalendar();
  });

  $("#eventList").addEventListener("click", (event) => {
    const card = event.target.closest("[data-course]");
    if (!card) return;
    switchTab("square");
    window.setTimeout(() => $(`#course-${card.dataset.course}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  });

  document.body.addEventListener("click", async (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton || actionButton.disabled) return;
    const course = state.courses.find((item) => item.id === actionButton.dataset.course);
    const action = actionButton.dataset.action;
    if (action === "remind") showToast("已写入日历提醒");
    if (action === "signup") {
      state.reminders.add(course.id);
      renderCourses();
      showToast("已加入开播提醒");
    }
    if (action === "live") window.open(course.liveUrl, "_blank");
    if (action === "replay" || action === "recordReplay") {
      state.watched.add(course.id);
      showToast("正在打开回放");
      apiFetch("/api/records", { method: "POST", body: JSON.stringify({ action: "watch", courseId: course.id }) }).catch((error) => showToast(error.message));
      if (course.replayUrl) openReplayModal(course);
      renderRecords();
    }
    if (action === "download") {
      if (course.handbookUrl && isValidHttpsUrl(course.handbookUrl)) {
        actionButton.disabled = true;
        const originalText = actionButton.textContent;
        actionButton.textContent = "下载中...";
        try {
          await downloadHandbook(course);
          showToast("知识手册已开始下载");
        } catch (error) {
          showToast(error.message);
        } finally {
          actionButton.disabled = false;
          actionButton.textContent = originalText;
        }
      } else {
        showToast(course.handbookUrl ? "手册链接格式异常，请联系管理员" : "手册上传中");
      }
    }
  });

  $("#recordList").addEventListener("click", (event) => {
    const star = event.target.closest(".star");
    if (!star) return;
    const courseId = star.closest(".stars").dataset.course;
    const score = Number(star.dataset.score);
    state.ratings[courseId] = score;
    renderRecords();
    showToast("评分已提交");
    apiFetch("/api/records", { method: "POST", body: JSON.stringify({ action: "rate", courseId, score }) }).catch((error) => showToast(error.message));
  });

  $$("#manageView .subtab").forEach((button) => {
    button.addEventListener("click", () => {
      const panel = $(`#${button.dataset.panel}`);
      if (!panel) return;
      $$("#manageView .subtab, .manage-panel").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      panel.classList.add("is-active");
      renderAssetOptions();
    });
  });

  $("#courseFormPanel").addEventListener("submit", (event) => {
    event.preventDefault();
    addCourse(true);
  });

  $("#saveDraft").addEventListener("click", () => addCourse(false));

  $("#assetCourse").addEventListener("change", updateAssetStatus);

  $("#assetFormPanel").addEventListener("submit", async (event) => {
    event.preventDefault();
    const course = state.courses.find((item) => item.id === $("#assetCourse").value);
    const replayFile = $("#replayFile").files[0];
    const handbookFile = $("#handbookFile").files[0];
    if (!replayFile && !handbookFile) {
      showToast("请选择要上传的视频或 PDF");
      return;
    }
    if (replayFile && !replayFile.type.startsWith("video/")) {
      showToast("回放文件需为视频格式");
      return;
    }
    if (handbookFile && handbookFile.type !== "application/pdf") {
      showToast("知识手册仅支持 PDF");
      return;
    }
    try {
      const submitButton = $("#assetFormPanel button[type='submit']");
      submitButton.disabled = true;
      submitButton.textContent = "上传中...";
      const files = [replayFile, handbookFile].filter(Boolean);
      const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
      const loadedByType = { replay: 0, handbook: 0 };
      const updateProgress = (type, loaded) => {
        loadedByType[type] = loaded;
        const loadedBytes = loadedByType.replay + loadedByType.handbook;
        const percent = totalBytes ? (loadedBytes / totalBytes) * 100 : 0;
        setUploadProgress(true, percent, `上传进度 ${Math.round(percent)}%`);
      };
      setUploadProgress(true, 0, "准备上传...");
      const replayAsset = await uploadAssetFile(course, "replay", replayFile, (loaded) => updateProgress("replay", loaded));
      const handbookAsset = await uploadAssetFile(course, "handbook", handbookFile, (loaded) => updateProgress("handbook", loaded));
      setUploadProgress(true, 100, "上传完成，正在保存...");
      const data = await apiFetch("/api/courses", {
        method: "PUT",
        body: JSON.stringify({ mode: "assets", courseId: course.id, replayAsset, handbookAsset }),
      });
      const index = state.courses.findIndex((item) => item.id === course.id);
      state.courses[index] = data.course;
      updateAssetStatus();
      renderCourses();
      renderRecords();
      renderAdminCourseList();
      showToast("已更新，学员端实时生效");
      window.setTimeout(() => setUploadProgress(false), 900);
    } catch (error) {
      setUploadProgress(true, 0, "上传失败");
      showToast(error.message);
    } finally {
      const submitButton = $("#assetFormPanel button[type='submit']");
      submitButton.disabled = false;
      submitButton.textContent = "保存";
    }
  });

  $("#adminCourseList").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-admin-action]");
    if (!button) return;
    const course = state.courses.find((item) => item.id === button.dataset.course);
    if (!course) return;
    if (button.dataset.adminAction === "edit") {
      fillCourseForm(course);
      $$("#manageView .subtab, .manage-panel").forEach((item) => item.classList.remove("is-active"));
      $('[data-panel="courseFormPanel"]').classList.add("is-active");
      $("#courseFormPanel").classList.add("is-active");
      $("#courseFormPanel").scrollIntoView({ behavior: "smooth", block: "start" });
      showToast("已载入课程，可直接修改");
      return;
    }
    if (button.dataset.adminAction === "delete") {
      if (!window.confirm(`确认删除「${course.title}」吗？`)) return;
      button.disabled = true;
      try {
        await apiFetch("/api/courses", { method: "DELETE", body: JSON.stringify({ courseId: course.id }) });
        state.courses = state.courses.filter((item) => item.id !== course.id);
        renderCalendar();
        renderCourses();
        renderRecords();
        renderAssetOptions();
        renderAdminCourseList();
        showToast("课程已删除");
      } catch (error) {
        button.disabled = false;
        showToast(error.message);
      }
    }
  });

  $("#cancelEdit").addEventListener("click", resetCourseForm);

  $("#closeReplay").addEventListener("click", closeReplayModal);
  $("#replayModal").addEventListener("click", (event) => {
    if (event.target.id === "replayModal") closeReplayModal();
  });
  $("#openReplayExternal").addEventListener("click", () => {
    const url = $("#openReplayExternal").dataset.url;
    if (url) window.open(url, "_blank");
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && $("#replayModal").classList.contains("is-visible")) {
      closeReplayModal();
    }
  });
}

async function init() {
  restoreSession();
  renderTabs();
  renderCalendar();
  renderCourses();
  renderRecords();
  renderPositionChecks();
  renderAssetOptions();
  renderAdminCourseList();
  renderAuthMode();
  renderAuthState();
  bindEvents();
  if (state.currentUser) await loadAppData();
}

init();
