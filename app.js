const state = {
  isAdmin: false,
  currentUser: null,
  token: "",
  authMode: "login",
  activeTab: "calendar",
  month: new Date(2026, 3, 1),
  selectedDate: "2026-04-30",
  calendarFilter: "all",
  positionFilter: "全部",
  ratingDraft: {},
  ratings: {},
  ratingDetails: {},
  watched: new Set(),
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
      coverUrl: "",
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
      coverUrl: "",
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
      coverUrl: "",
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
      coverUrl: "",
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
const POSITION_OPTIONS = [
  "运维",
  "后端研发",
  "前端研发",
  "客户端研发",
  "算法",
  "音视频研发",
  "大数据",
  "测试",
  "测试开发",
  "产品",
  "项目管理",
  "设计",
  "数据分析",
  "运营",
  "内容运营",
  "审核风控",
  "推荐策略",
  "增长",
  "商业化",
  "安全",
  "客服",
];

const fmtDate = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const parseDate = (value) => new Date(value);

function getCourseRuntime(course) {
  const now = new Date();
  const start = parseDate(course.startAt);
  const end = parseDate(course.endAt);
  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "live";
  return "ended";
}

function canUploadCourseAssets(course) {
  return course.published && getCourseRuntime(course) !== "upcoming";
}

function statusLabel(status) {
  return { upcoming: "即将开播", live: "直播中", ended: "已结束" }[status];
}

function defaultCover(course) {
  const seed = encodeURIComponent(course.title || "innovation");
  return `https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80&ixid=${seed}`;
}

function coverStyle(course) {
  const url = String(course.coverUrl || defaultCover(course)).replace(/['"()\\]/g, "");
  return `style="background-image: linear-gradient(180deg, rgba(10, 42, 55, 0.08), rgba(10, 42, 55, 0.34)), url('${url}')"`;
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

function closeFullscreenPlayer() {
  const player = $(".fullscreen-player");
  if (!player) return;
  const video = player.querySelector("video");
  video?.pause();
  player.remove();
}

function openDeleteConfirm(course) {
  $("#deleteConfirmModal").dataset.course = course.id;
  $("#deleteConfirmTitle").textContent = "确认删除课程？";
  $("#deleteConfirmText").textContent = `「${course.title}」删除后将从直播日历、课程广场和学习记录中移除。`;
  $("#deleteConfirmModal").classList.add("is-visible");
  $("#deleteConfirmModal").setAttribute("aria-hidden", "false");
}

function closeDeleteConfirm() {
  $("#deleteConfirmModal").classList.remove("is-visible");
  $("#deleteConfirmModal").setAttribute("aria-hidden", "true");
  $("#deleteConfirmModal").removeAttribute("data-course");
  $("#confirmDeleteCourse").disabled = false;
  $("#confirmDeleteCourse").textContent = "删除";
}

function openReplayModal(course) {
  if (!course.replayUrl || !isValidHttpsUrl(course.replayUrl)) {
    showToast("回放链接格式异常，请联系管理员");
    return;
  }
  if (!isVideoUrl(course.replayUrl)) {
    window.open(course.replayUrl, "_blank");
    showToast("第三方回放已在新窗口打开");
    return;
  }

  closeFullscreenPlayer();
  const player = document.createElement("div");
  player.className = "fullscreen-player";
  player.innerHTML = `
    <video class="fullscreen-video" src="${course.replayUrl}" controls autoplay playsinline></video>
    <button class="fullscreen-close" type="button" aria-label="关闭回放">×</button>
  `;
  document.body.appendChild(player);

  const video = player.querySelector("video");
  const closeButton = player.querySelector("button");
  closeButton.addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    closeFullscreenPlayer();
  });
  video.addEventListener("ended", () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  });
  video.addEventListener("webkitendfullscreen", closeFullscreenPlayer);
  const handleFullscreenChange = () => {
    if (!document.fullscreenElement) closeFullscreenPlayer();
  };
  document.addEventListener("fullscreenchange", handleFullscreenChange);

  video.play().catch(() => {
    video.muted = true;
    video.play().catch(() => {});
  });
  if (video.webkitEnterFullscreen) {
    video.webkitEnterFullscreen();
    return;
  }
  const fullscreenTarget = video.requestFullscreen ? video : player;
  fullscreenTarget.requestFullscreen?.().catch(() => {});
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

function safeVideoDownloadName(course) {
  const fallback = `${course.title || "课程回放"}.mp4`;
  return (course.replayFileName || fallback).replace(/[\\/:*?"<>|]+/g, "-");
}

async function downloadBlobFromUrl(url, filename, errorMessage) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(errorMessage);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

async function downloadHandbook(course) {
  await downloadBlobFromUrl(course.handbookUrl, safeDownloadName(course), "手册下载失败，请稍后重试");
}

async function downloadReplayVideo(course) {
  await downloadBlobFromUrl(course.replayUrl, safeVideoDownloadName(course), "视频下载失败，请稍后重试");
}

function markCourseRecorded(courseId, action) {
  if (action === "watch" || action === "download") state.watched.add(courseId);
  renderRecords();
  apiFetch("/api/records", { method: "POST", body: JSON.stringify({ action, courseId }) }).catch((error) => showToast(error.message));
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

function renderReminderBadge() {
  const badge = $("#reminderBadge b");
  if (badge) badge.textContent = state.reminders.size;
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
  renderCalendarFilters();
  const events = state.courses
    .filter((course) => course.published)
    .filter((course) => {
      if (state.calendarFilter === "reserved") return state.reminders.has(course.id);
      if (state.calendarFilter === "unreserved") return !state.reminders.has(course.id);
      return true;
    })
    .sort((a, b) => parseDate(b.startAt) - parseDate(a.startAt));

  $("#calendarListTitle").textContent = "直播日历";
  $("#clearDay").style.display = "none";

  if (!events.length) {
    $("#eventList").innerHTML = `<div class="empty-state">暂无直播安排</div>`;
    return;
  }

  $("#eventList").innerHTML = events.map(renderEventCard).join("");
}

function renderCalendarFilters() {
  $$("#calendarFilters [data-calendar-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.calendarFilter === state.calendarFilter);
  });
}

function renderEventCard(course) {
  const start = parseDate(course.startAt);
  const status = getCourseRuntime(course);
  const reminded = state.reminders.has(course.id);
  return `
    <article class="event-card timeline-course ${status === "ended" ? "is-ended" : ""}" data-course="${course.id}">
      <span class="timeline-dot" aria-hidden="true"></span>
      <span class="course-thumb" ${coverStyle(course)}></span>
      <span class="event-body">
        <p class="meta strong-date">${formatFullTime(course)}</p>
        <h4>${course.title}</h4>
        <p class="course-subtitle">${course.subtitle}</p>
        <span class="tag-row">
          ${course.positions.map((pos) => `<span class="tag">${pos}</span>`).join("")}
          <span class="status ${status}">${statusLabel(status)}</span>
        </span>
        <span class="event-flat">
          ${course.content.map((item) => `<b>${item}</b>`).join("")}
        </span>
        <span class="event-card-actions">
          ${course.liveUrl ? `<a class="inline-link" href="${course.liveUrl}" target="_blank" rel="noreferrer">会议链接</a>` : ""}
          ${reminded ? `<em>提前1天 · 提前1小时提醒</em>` : ""}
        </span>
      </span>
      ${status === "ended" ? "" : `<button class="primary-button reserve-button ${reminded ? "is-reminded" : ""}" type="button" data-action="signup" data-course="${course.id}">${reminded ? "已预约" : "预约"}</button>`}
    </article>
  `;
}

function renderCourses() {
  renderSquarePositionFilter();
  const published = state.courses.filter((course) => course.published && getCourseRuntime(course) === "ended" && courseMatchesPosition(course, state.positionFilter));
  const replayCourses = published.sort((a, b) => parseDate(b.startAt) - parseDate(a.startAt));

  $("#upcomingCount").textContent = `${replayCourses.length} 门`;
  $("#upcomingCourses").innerHTML = replayCourses.length ? replayCourses.map((course, index) => renderCourseCard(course, replayCourses.length - index - 1)).join("") : `<div class="empty-state">暂无课程回放</div>`;
}

function renderSquarePositionFilter() {
  const options = ["全部", "研发", "产品", "运营", "财务", "数据", "HR"];
  $("#squarePositionFilter").innerHTML = options
    .map((position) => `<button class="filter-chip ${state.positionFilter === position ? "is-active" : ""}" type="button" data-position-filter="${position}">${position}</button>`)
    .join("");
}

function courseMatchesPosition(course, position) {
  if (position === "全部") return true;
  if (position === "数据") return course.positions.some((item) => item.includes("数据") || item.includes("算法"));
  if (position === "研发") return course.positions.some((item) => item.includes("研发") || item.includes("算法") || item.includes("测试") || item.includes("运维"));
  return course.positions.some((item) => item.includes(position));
}

function renderCourseCard(course, issueIndex = 0) {
  const headline = course.content[0] || course.subtitle;
  const contentText = course.content.slice(0, 2).join("，");

  return `
    <article class="course-card replay-tile prototype-card" id="course-${course.id}" data-action="courseDetail" data-course="${course.id}">
      <div class="prototype-cover" ${coverStyle(course)}>
        <div class="prototype-cover-copy">
          <span>第${issueIndex}期</span>
          <strong>${headline}</strong>
        </div>
      </div>
      <div class="prototype-card-body">
        <p class="strong-date">${formatFullTime(course)}</p>
        <h4>${course.title}</h4>
        <p class="course-summary">${contentText}</p>
        <div class="tag-row">
          ${course.positions.slice(0, 3).map((pos) => `<span class="tag">${pos}</span>`).join("")}
        </div>
      </div>
    </article>
  `;
}

function renderCourseAction(course, status) {
  return `
    <button class="primary-button" type="button" data-action="replay" data-course="${course.id}" ${course.replayUrl ? "" : 'disabled title="回放上传中"'}>点击回放</button>
    <button class="secondary-button" type="button" data-action="download" data-course="${course.id}" ${course.handbookUrl ? "" : 'disabled title="手册上传中"'}>下载说明书</button>
  `;
}

function openCourseDetail(course) {
  $("#squareListPanel").hidden = true;
  $("#courseDetailPage").hidden = false;
  $("#courseDetailContent").innerHTML = renderCourseDetailPage(course);
  const video = $("#courseDetailContent video");
  video?.addEventListener("play", () => markCourseRecorded(course.id, "watch"), { once: true });
  $("#courseDetailPage").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderCourseDetailPage(course) {
  const reviews = state.ratingDetails[course.id] || [];
  const average = reviews.length ? reviews.reduce((sum, item) => sum + Number(item.score || 0), 0) / reviews.length : 0;
  return `
    <div class="detail-video-shell">
      ${course.replayUrl && isVideoUrl(course.replayUrl)
        ? `<video class="detail-video" src="${course.replayUrl}" controls playsinline poster="${course.coverUrl || ""}"></video>`
        : `<div class="detail-video-placeholder" ${coverStyle(course)}><span>${course.replayUrl ? "第三方回放链接" : "回放上传中"}</span></div>`}
    </div>
    <article class="detail-info-card">
      <h3 id="courseDetailTitle">${course.title}</h3>
      <p class="detail-subtitle">${course.subtitle}</p>
      <p class="detail-time">◷ ${formatFullTime(course)}</p>
      <div class="tag-row">
        ${course.positions.map((pos) => `<span class="tag">${pos}</span>`).join("")}
      </div>
      <div class="detail-section">
        <h4>课程内容</h4>
        <ul class="detail-list">${course.content.map((item) => `<li>${item}</li>`).join("")}</ul>
      </div>
      <div class="detail-section">
        <h4>适用场景</h4>
        <ul class="scenario-list">${course.scenarios.map((item) => `<li>${item}</li>`).join("")}</ul>
      </div>
      <div class="detail-section">
        <h4>授课老师</h4>
        <p class="meta">${course.teacher}</p>
      </div>
      <div class="detail-downloads">
        <button class="detail-download-primary" type="button" data-action="download" data-course="${course.id}" ${course.handbookUrl ? "" : 'disabled title="手册上传中"'}>下载说明书</button>
        <button class="detail-download-secondary" type="button" data-action="downloadVideo" data-course="${course.id}" ${course.replayUrl ? "" : 'disabled title="视频上传中"'}>下载视频</button>
        ${course.replayUrl && !isVideoUrl(course.replayUrl) ? `<button class="detail-link-button" type="button" data-action="replay" data-course="${course.id}">打开回放链接</button>` : ""}
      </div>
    </article>
    <article class="detail-review-card">
      <div class="detail-review-head">
        <h3>课程评价<span>（${reviews.length}条）</span></h3>
        <strong>${average ? average.toFixed(1) : "0.0"} <span>★★★★★</span></strong>
      </div>
      <div class="detail-review-list">
        ${reviews.length ? reviews.map(renderCourseReview).join("") : `<p class="empty-review">暂无评价</p>`}
      </div>
    </article>
  `;
}

function renderCourseReview(review) {
  const initial = (review.username || "学").slice(0, 1).toUpperCase();
  const score = Number(review.score || 0);
  return `
    <section class="review-item">
      <div class="review-author">
        <span class="review-avatar">${initial}</span>
        <strong>${review.username}</strong>
        <span class="review-stars">${"★".repeat(score)}${"☆".repeat(Math.max(0, 5 - score))}</span>
      </div>
      <div class="review-pills">
        ${review.difficulty ? `<span>${review.difficulty}</span>` : ""}
        ${review.completedSetup ? `<span>${review.completedSetup === "是" ? "安装成功" : review.completedSetup}</span>` : ""}
      </div>
      ${review.comment ? `<p class="review-comment">"${review.comment}"</p>` : ""}
    </section>
  `;
}

function closeCourseDetail() {
  const detailPage = $("#courseDetailPage");
  if (!detailPage || detailPage.hidden) return;
  detailPage.hidden = true;
  $("#squareListPanel").hidden = false;
  $("#squareView").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderRecords() {
  const reservations = state.courses
    .filter((course) => state.reminders.has(course.id))
    .sort((a, b) => parseDate(a.startAt) - parseDate(b.startAt));
  const records = state.courses.filter((course) => state.watched.has(course.id));
  const totalMs = records.reduce((sum, course) => sum + (parseDate(course.endAt) - parseDate(course.startAt)), 0);
  $("#learnedCount").textContent = records.length;
  $("#learnedHours").textContent = `${Math.round(totalMs / 36e5)}h`;
  $("#reservationList").innerHTML = reservations.length ? reservations.map(renderReservationCard).join("") : `<div class="empty-state">暂无预约课程</div>`;
  $("#recordList").innerHTML = records.length ? records.map(renderRecordCard).join("") : `<div class="empty-state">暂无学习记录</div>`;
}

function renderReservationCard(course) {
  return `
    <article class="record-card reservation-card">
      <h4>${course.title}</h4>
      <p class="meta">${formatFullTime(course)}</p>
      <p class="meta">提前1天 · 提前1小时提醒</p>
      <div class="record-actions">
        <button class="secondary-button" type="button" data-action="cancelReminder" data-course="${course.id}">取消预约</button>
      </div>
    </article>
  `;
}

function renderRecordCard(course) {
  const rating = state.ratings[course.id] || 0;
  const date = course.startAt.slice(0, 10).replaceAll("-", ".");
  const ratingText = rating ? `已评价 · ${"★".repeat(rating)}${"☆".repeat(5 - rating)}` : "点击评价";
  return `
    <article class="record-card">
      <h4>${course.title}</h4>
      <p class="meta">直播日期 · ${date}</p>
      <div class="record-actions">
        <button class="${rating ? "secondary-button rating-locked" : "primary-button"}" type="button" data-action="openRating" data-course="${course.id}" ${rating ? "disabled" : ""}>${ratingText}</button>
      </div>
    </article>
  `;
}

function renderPositionChecks() {
  const mainPositions = POSITION_OPTIONS.slice(0, 5);
  const morePositions = POSITION_OPTIONS.slice(5);
  $("#positionChecks").innerHTML = mainPositions
    .map((pos, index) => renderPositionChip(pos, index < 2))
    .join("");
  $("#morePositionChecks").innerHTML = morePositions
    .map((pos) => renderPositionMenuItem(pos, false))
    .join("");
}

function renderPositionChip(position, checked) {
  return `<label class="check-chip"><input type="checkbox" value="${position}" ${checked ? "checked" : ""} /><span>${position}</span></label>`;
}

function renderPositionMenuItem(position, checked) {
  return `<label class="position-menu-item ${checked ? "is-selected" : ""}"><input type="checkbox" value="${position}" ${checked ? "checked" : ""} /><span>${position}</span></label>`;
}

function renderRatingStars(fieldId, value = 0) {
  const container = $(`[data-rating-field="${fieldId}"]`);
  if (!container) return;
  container.innerHTML = [1, 2, 3, 4, 5]
    .map((score) => `<button class="rating-star ${score <= value ? "is-on" : ""}" type="button" data-rating-target="${fieldId}" data-score="${score}" aria-label="${score}星">★</button>`)
    .join("");
}

function setRatingValue(fieldId, score) {
  $(`#${fieldId}`).value = score;
  state.ratingDraft[fieldId] = score;
  renderRatingStars(fieldId, score);
}

function resetRatingSheet() {
  state.ratingDraft = {};
  ["ratingOverall", "ratingClarity", "ratingTeacher"].forEach((fieldId) => {
    $(`#${fieldId}`).value = "";
    renderRatingStars(fieldId, 0);
  });
  $("#ratingDifficulty").value = "适中";
  $("#ratingCompleted").value = "是";
  $("#ratingComment").value = "";
}

function openRatingSheet(course) {
  if (state.ratings[course.id]) return;
  resetRatingSheet();
  $("#ratingCourseId").value = course.id;
  $("#ratingCourseIntro").textContent = `${course.title} · ${course.subtitle}`;
  $("#ratingTeacherLabel").textContent = `对本次主讲老师 ${course.teacher.split("-").pop()} 的综合评价`;
  $("#ratingSheet").classList.add("is-visible");
  $("#ratingSheet").setAttribute("aria-hidden", "false");
}

function closeRatingSheet() {
  $("#ratingSheet")?.classList.remove("is-visible");
  $("#ratingSheet")?.setAttribute("aria-hidden", "true");
}

async function submitRatingSheet() {
  const courseId = $("#ratingCourseId").value;
  const score = Number($("#ratingOverall").value);
  if (!score) {
    showToast("请先选择整体评分");
    return;
  }
  const submitButton = $("#ratingForm button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "提交中...";
  try {
    await apiFetch("/api/records", {
      method: "POST",
      body: JSON.stringify({
        action: "rate",
        courseId,
        score,
        clarityScore: Number($("#ratingClarity").value || score),
        teacherScore: Number($("#ratingTeacher").value || score),
        difficulty: $("#ratingDifficulty").value,
        completedSetup: $("#ratingCompleted").value,
        comment: $("#ratingComment").value.trim(),
      }),
    });
    state.ratings[courseId] = score;
    await loadRecords();
    closeRatingSheet();
    renderRecords();
    const detailPage = $("#courseDetailPage");
    if (detailPage && !detailPage.hidden) {
      const course = state.courses.find((item) => item.id === courseId);
      if (course) $("#courseDetailContent").innerHTML = renderCourseDetailPage(course);
    }
    showToast("评价已提交");
  } catch (error) {
    showToast(error.message);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "提交评价";
  }
}

function setMorePositionsVisible(visible) {
  $("#morePositionChecks").hidden = !visible;
  $("#toggleMorePositions").setAttribute("aria-expanded", String(visible));
  updateMorePositionButton();
}

function updateMorePositionButton() {
  syncMorePositionItems();
  const selectedCount = $$("#morePositionChecks input:checked").length;
  const isOpen = $("#toggleMorePositions").getAttribute("aria-expanded") === "true";
  if (isOpen) {
    $("#toggleMorePositions").textContent = selectedCount ? `收起岗位（已选 ${selectedCount}）` : "收起岗位";
    return;
  }
  $("#toggleMorePositions").textContent = selectedCount ? `更多岗位（已选 ${selectedCount}）` : "更多岗位";
}

function syncMorePositionItems() {
  $$("#morePositionChecks .position-menu-item").forEach((item) => {
    item.classList.toggle("is-selected", item.querySelector("input").checked);
  });
}

function renderAssetOptions() {
  const uploadable = state.courses
    .filter(canUploadCourseAssets)
    .sort((a, b) => parseDate(b.startAt) - parseDate(a.startAt));
  $("#assetCourse").innerHTML = uploadable.length ? uploadable
    .map((course) => `<option value="${course.id}">${course.title} · ${statusLabel(getCourseRuntime(course))}</option>`)
    .join("") : `<option value="">暂无可上传课程</option>`;
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
  const course = state.courses.find((item) => item.id === $("#assetCourse").value);
  $("#coverFile").value = "";
  $("#replayFile").value = "";
  $("#handbookFile").value = "";
  const hasCourse = Boolean(course);
  $("#coverFile").disabled = !hasCourse;
  $("#replayFile").disabled = !hasCourse;
  $("#handbookFile").disabled = !hasCourse;
  $("#assetFormPanel button[type='submit']").disabled = !hasCourse;
  if (!course) {
    $("#assetStatus").innerHTML = "未开播课程不会出现在这里；课程到开课时间后可上传回放视频和知识手册。";
    return;
  }
  $("#assetStatus").innerHTML = `当前封面：${course.coverUrl ? course.coverFileName || "已设置封面" : "未上传"}<br />当前回放：${course.replayUrl ? course.replayFileName || "已上传视频" : "未上传"}<br />当前手册：${course.handbookUrl ? course.handbookFileName || "已上传 PDF" : "未上传"}`;
}

async function loadCourses() {
  const data = await apiFetch("/api/courses");
  state.courses = data.courses;
}

async function loadRecords() {
  if (!state.token) return;
  const data = await apiFetch("/api/records");
  state.watched = new Set(data.watched || []);
  state.reminders = new Set(data.reminders || []);
  state.ratings = data.ratings || {};
  state.ratingDetails = data.ratingDetails || {};
  renderReminderBadge();
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
  const positions = $$("#positionChecks input:checked, #morePositionChecks input:checked").map((input) => input.value);
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
    coverUrl: $("#coverUrl").value.trim(),
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
  $("#coverUrl").value = "";
  $$("#positionChecks input").forEach((input, index) => {
    input.checked = index < 2;
  });
  $$("#morePositionChecks input").forEach((input) => {
    input.checked = false;
  });
  setMorePositionsVisible(false);
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
  $("#coverUrl").value = course.coverUrl || "";
  $$("#positionChecks input, #morePositionChecks input").forEach((input) => {
    input.checked = course.positions.includes(input.value);
  });
  setMorePositionsVisible(false);
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

  $("#calendarFilters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-calendar-filter]");
    if (!button) return;
    state.calendarFilter = button.dataset.calendarFilter;
    renderEventList();
  });

  $("#eventList").addEventListener("click", (event) => {
    if (event.target.closest("[data-action]")) return;
    const card = event.target.closest("[data-course]");
    if (!card) return;
    switchTab("square");
    window.setTimeout(() => $(`#course-${card.dataset.course}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  });

  document.body.addEventListener("click", async (event) => {
    const ratingStar = event.target.closest("[data-rating-target]");
    if (ratingStar) {
      setRatingValue(ratingStar.dataset.ratingTarget, Number(ratingStar.dataset.score));
      return;
    }
    const actionButton = event.target.closest("[data-action]");
  if (!actionButton || actionButton.disabled) return;
  const course = state.courses.find((item) => item.id === actionButton.dataset.course);
  const action = actionButton.dataset.action;
    if (action === "courseDetail") {
      openCourseDetail(course);
      return;
    }
    if (action === "remind") showToast("已写入日历提醒");
    if (action === "signup") {
      state.reminders.add(course.id);
      markCourseRecorded(course.id, "remind");
      renderCalendar();
      renderCourses();
      renderReminderBadge();
      showToast("已预约，提前1天和提前1小时提醒");
    }
    if (action === "cancelReminder") {
      state.reminders.delete(course.id);
      renderCalendar();
      renderRecords();
      renderReminderBadge();
      showToast("已取消预约");
      apiFetch("/api/records", { method: "POST", body: JSON.stringify({ action: "cancelReminder", courseId: course.id }) }).catch((error) => showToast(error.message));
    }
    if (action === "live") window.open(course.liveUrl, "_blank");
    if (action === "replay" || action === "recordReplay") {
      showToast("正在打开回放");
      markCourseRecorded(course.id, "watch");
      if (course.replayUrl) openReplayModal(course);
    }
    if (action === "download") {
      if (course.handbookUrl && isValidHttpsUrl(course.handbookUrl)) {
        actionButton.disabled = true;
        const originalText = actionButton.textContent;
        actionButton.textContent = "下载中...";
        try {
          await downloadHandbook(course);
          markCourseRecorded(course.id, "download");
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
    if (action === "downloadVideo") {
      if (course.replayUrl && isValidHttpsUrl(course.replayUrl)) {
        actionButton.disabled = true;
        const originalText = actionButton.textContent;
        actionButton.textContent = "下载中...";
        try {
          await downloadReplayVideo(course);
          markCourseRecorded(course.id, "watch");
          showToast("课程视频已开始下载");
        } catch (error) {
          showToast(error.message);
        } finally {
          actionButton.disabled = false;
          actionButton.textContent = originalText;
        }
      } else {
        showToast(course.replayUrl ? "视频链接格式异常，请联系管理员" : "视频上传中");
      }
    }
    if (action === "openRating") {
      openRatingSheet(course);
    }
  });

  $("#squarePositionFilter").addEventListener("click", (event) => {
    const button = event.target.closest("[data-position-filter]");
    if (!button) return;
    state.positionFilter = button.dataset.positionFilter;
    renderCourses();
  });

  $("#closeRatingSheet").addEventListener("click", closeRatingSheet);
  $("#ratingSheet").addEventListener("click", (event) => {
    if (event.target.id === "ratingSheet") closeRatingSheet();
  });
  $("#backToSquare").addEventListener("click", closeCourseDetail);
  $("#ratingForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    await submitRatingSheet();
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

  $("#toggleMorePositions").addEventListener("click", () => {
    setMorePositionsVisible($("#morePositionChecks").hidden);
  });

  $("#morePositionChecks").addEventListener("change", updateMorePositionButton);

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".position-picker")) setMorePositionsVisible(false);
  });

  $("#assetCourse").addEventListener("change", updateAssetStatus);

  $("#assetFormPanel").addEventListener("submit", async (event) => {
    event.preventDefault();
    const course = state.courses.find((item) => item.id === $("#assetCourse").value);
    if (!course) {
      showToast("暂无可上传课程");
      return;
    }
    const coverFile = $("#coverFile").files[0];
    const replayFile = $("#replayFile").files[0];
    const handbookFile = $("#handbookFile").files[0];
    if (!coverFile && !replayFile && !handbookFile) {
      showToast("请选择要上传的封面、视频或 PDF");
      return;
    }
    if (coverFile && !coverFile.type.startsWith("image/")) {
      showToast("课程封面需为图片格式");
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
      const files = [coverFile, replayFile, handbookFile].filter(Boolean);
      const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
      const loadedByType = { cover: 0, replay: 0, handbook: 0 };
      const updateProgress = (type, loaded) => {
        loadedByType[type] = loaded;
        const loadedBytes = loadedByType.cover + loadedByType.replay + loadedByType.handbook;
        const percent = totalBytes ? (loadedBytes / totalBytes) * 100 : 0;
        setUploadProgress(true, percent, `上传进度 ${Math.round(percent)}%`);
      };
      setUploadProgress(true, 0, "准备上传...");
      const coverAsset = await uploadAssetFile(course, "cover", coverFile, (loaded) => updateProgress("cover", loaded));
      const replayAsset = await uploadAssetFile(course, "replay", replayFile, (loaded) => updateProgress("replay", loaded));
      const handbookAsset = await uploadAssetFile(course, "handbook", handbookFile, (loaded) => updateProgress("handbook", loaded));
      setUploadProgress(true, 100, "上传完成，正在保存...");
      const data = await apiFetch("/api/courses", {
        method: "PUT",
        body: JSON.stringify({ mode: "assets", courseId: course.id, coverAsset, replayAsset, handbookAsset }),
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
      openDeleteConfirm(course);
    }
  });

  $("#cancelEdit").addEventListener("click", resetCourseForm);

  $("#cancelDeleteCourse").addEventListener("click", closeDeleteConfirm);

  $("#confirmDeleteCourse").addEventListener("click", async () => {
    const courseId = $("#deleteConfirmModal").dataset.course;
    const course = state.courses.find((item) => item.id === courseId);
    if (!course) {
      closeDeleteConfirm();
      return;
    }
    const button = $("#confirmDeleteCourse");
    button.disabled = true;
    button.textContent = "删除中...";
    try {
      await apiFetch("/api/courses", { method: "DELETE", body: JSON.stringify({ courseId }) });
      state.courses = state.courses.filter((item) => item.id !== courseId);
      renderCalendar();
      renderCourses();
      renderRecords();
      renderAssetOptions();
      renderAdminCourseList();
      closeDeleteConfirm();
      showToast("课程已删除");
    } catch (error) {
      button.disabled = false;
      button.textContent = "删除";
      showToast(error.message);
    }
  });

  $("#deleteConfirmModal").addEventListener("click", (event) => {
    if (event.target.id === "deleteConfirmModal") closeDeleteConfirm();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeFullscreenPlayer();
    if (event.key === "Escape") closeRatingSheet();
    if (event.key === "Escape") closeCourseDetail();
    if (event.key === "Escape" && $("#deleteConfirmModal").classList.contains("is-visible")) {
      closeDeleteConfirm();
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
  renderReminderBadge();
  renderAssetOptions();
  renderAdminCourseList();
  renderAuthMode();
  renderAuthState();
  bindEvents();
  if (state.currentUser) await loadAppData();
}

init();
