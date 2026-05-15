const state = {
  isAdmin: false,
  currentUser: null,
  token: "",
  authMode: "login",
  activeTab: "calendar",
  month: new Date(2026, 4, 1),
  selectedDate: "",
  calendarFilter: "all",
  positionFilter: "全部",
  mainPositionFilters: new Set(),
  extraPositionFilters: new Set(),
  squareMorePositionsVisible: false,
  recordMode: "reservations",
  ratingDraft: {},
  ratings: {},
  ratingDetails: {},
  watched: new Set(),
  reminders: new Set(),
  messagesRead: false,
  notifications: [],
  telegramConfig: { botConfigured: false, botSource: "", groups: [] },
  telegramTargetCourseId: "",
  telegramSelectedGroups: new Set(),
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
const COURSE_CACHE_KEY = "innovation-academy-courses-cache";
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
  "HR",
  "行政",
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
  return { upcoming: "未开播", live: "开播", ended: "已完成" }[status];
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

function setCurrentUser(user, token, renderOptions) {
  state.currentUser = { username: user.username, role: user.role };
  state.token = token;
  state.isAdmin = user.role === "admin";
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ user: state.currentUser, token }));
  renderAuthState(renderOptions);
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

function renderAuthState(options = {}) {
  const isLoggedIn = Boolean(state.currentUser);
  $("#authScreen").classList.toggle("is-hidden", isLoggedIn);
  $(".app-shell").classList.toggle("is-locked", !isLoggedIn);
  $("#userBadge").textContent = isLoggedIn ? `${state.currentUser.username} · ${state.isAdmin ? "管理员" : "成员"}` : "未登录";
  renderTabs();
  $$(".view").forEach((view) => view.classList.remove("is-active"));
  $(`#${state.activeTab}View`).classList.add("is-active");
  if (options.skipActiveRender) return;
  if (state.activeTab === "records") renderRecords();
  if (state.activeTab === "manage") renderAssetOptions();
}

function renderAuthMode() {
  const isRegister = state.authMode === "register";
  $$(".auth-tabs .subtab").forEach((button) => button.classList.toggle("is-active", button.dataset.authMode === state.authMode));
  $(".auth-register-field").classList.toggle("is-visible", isRegister);
  $("#authSubmit").textContent = isRegister ? "注册并登录" : "登录";
  $("#authPassword").autocomplete = isRegister ? "new-password" : "current-password";
  $("#authTip").textContent = isRegister ? "注册成功后将以普通成员身份进入课堂" : "";
}

async function handleAuthSubmit() {
  const username = $("#authUsername").value.trim();
  const password = $("#authPassword").value;
  const confirmPassword = $("#authConfirmPassword").value;
  const submitButton = $("#authSubmit");

  if (!username || !password) {
    showToast("请输入账号和密码");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = state.authMode === "register" ? "注册中..." : "登录中...";
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
  } finally {
    submitButton.disabled = false;
    renderAuthMode();
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
  if (tab !== "records") closeRatingPage();
  renderTabs();
  if (tab === "square") renderCourses();
  if (tab === "records") renderRecords();
  if (tab === "manage") {
    showAdminPanel("adminListPanel", false);
    renderAdminCourseList();
    renderAssetOptions();
  }
}

function openProfileModal() {
  if (!state.currentUser) return;
  const username = state.currentUser.username;
  $("#profileUsername").textContent = username;
  $("#profileRole").textContent = state.isAdmin ? "管理员" : "成员";
  $("#profileAvatar").textContent = username.slice(0, 1).toUpperCase();
  $("#profilePasswordForm").reset();
  $("#profileModal").classList.add("is-visible");
  $("#profileModal").setAttribute("aria-hidden", "false");
}

function closeProfileModal() {
  $("#profileModal").classList.remove("is-visible");
  $("#profileModal").setAttribute("aria-hidden", "true");
  $("#profilePasswordForm").reset();
  $("#profilePasswordSubmit").disabled = false;
  $("#profilePasswordSubmit").textContent = "确认修改密码";
}

async function submitProfilePassword() {
  const currentPassword = $("#currentPassword").value;
  const newPassword = $("#newPassword").value;
  const confirmPassword = $("#confirmNewPassword").value;
  const submitButton = $("#profilePasswordSubmit");

  if (!currentPassword || !newPassword || !confirmPassword) {
    showToast("请完整填写密码信息");
    return;
  }
  if (newPassword !== confirmPassword) {
    showToast("两次新密码不一致");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "修改中...";
  try {
    await apiFetch("/api/profile", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });
    closeProfileModal();
    showToast("密码已修改，请牢记新密码");
  } catch (error) {
    showToast(error.message);
    submitButton.disabled = false;
    submitButton.textContent = "确认修改密码";
  }
}

function renderReminderBadge() {
  const badge = $("#reminderBadge b");
  if (badge) badge.textContent = state.messagesRead ? "0" : buildMessages().length;
}

function buildMessages() {
  const adminMessages = state.notifications.map((notification, index) => {
    const course = state.courses.find((item) => item.id === notification.courseId);
    return {
      tone: "alarm",
      icon: "!",
      title: notification.title,
      body: course ? `课程将于 ${formatFullTime(course)} 准时发车，麻烦大家帮忙转发，十分感谢！` : notification.body,
      time: formatNotificationTime(notification.createdAt, index),
    };
  });
  const published = state.courses.filter((course) => course.published);
  const upcoming = published
    .filter((course) => getCourseRuntime(course) === "upcoming")
    .sort((a, b) => parseDate(a.startAt) - parseDate(b.startAt));
  const ended = published
    .filter((course) => getCourseRuntime(course) === "ended")
    .sort((a, b) => parseDate(b.startAt) - parseDate(a.startAt));
  const messages = [];

  upcoming.slice(0, 2).forEach((course, index) => {
    messages.push({
      tone: "alarm",
      icon: "!",
      title: `${course.title} — 开播提醒`,
      body: `课程将于 ${formatFullTime(course)} 准时发车，麻烦大家帮忙转发，十分感谢！`,
      time: index === 0 ? "1小时前" : "提前1天通知",
    });
  });

  ended.filter((course) => course.replayUrl).slice(0, 1).forEach((course) => {
    messages.push({
      tone: "play",
      icon: ">",
      title: `${course.title}回放已上传`,
      body: "课程回放已可观看，可前往课程广场查看",
      time: "昨天18:30",
    });
  });

  upcoming.slice(0, 1).forEach((course) => {
    messages.push({
      tone: "spark",
      icon: "+",
      title: `新课程已发布：${course.title}`,
      body: "新课程已发布，现可预约报名，名额有限",
      time: "2天前",
    });
  });

  ended.slice(0, 1).forEach((course) => {
    messages.push({
      tone: "star",
      icon: "*",
      title: "评分表已开放 — 请完成评价",
      body: `${course.title}课程评分表已开放，请对讲师进行评价`,
      time: "3天前",
    });
  });

  return [...adminMessages, ...messages];
}

function formatNotificationTime(value, fallbackIndex = 0) {
  if (!value) return fallbackIndex ? "刚刚" : "刚刚";
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff) || diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}小时前`;
  return `${Math.floor(diff / 86_400_000)}天前`;
}

function renderMessages() {
  const messages = buildMessages();
  $("#messageList").innerHTML = messages.length
    ? messages.map((message) => `
      <article class="message-item">
        <span class="message-icon ${message.tone}">${message.icon}</span>
        <div>
          <h4>${message.title}</h4>
          <p>${message.body}</p>
          <small>${message.time}</small>
        </div>
        <i></i>
      </article>
    `).join("")
    : `<div class="empty-state">暂无消息通知</div>`;
  renderReminderBadge();
}

function openMessageDrawer() {
  renderMessages();
  $("#messageDrawer").classList.add("is-visible");
  $("#messageDrawer").setAttribute("aria-hidden", "false");
}

function closeMessageDrawer() {
  $("#messageDrawer").classList.remove("is-visible");
  $("#messageDrawer").setAttribute("aria-hidden", "true");
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
    .filter((course) => course.startAt.slice(0, 7) === monthKey(state.month))
    .filter((course) => {
      if (state.calendarFilter === "reserved") return state.reminders.has(course.id);
      if (state.calendarFilter === "unreserved") return !state.reminders.has(course.id);
      return true;
    })
    .sort((a, b) => parseDate(b.startAt) - parseDate(a.startAt));

  $("#calendarListTitle").textContent = `${state.month.getFullYear()}年 ${state.month.getMonth() + 1}月`;
  $("#clearDay").style.display = "none";

  if (!events.length) {
    $("#eventList").innerHTML = `<div class="empty-state">暂无直播安排</div>`;
    return;
  }

  $("#eventList").innerHTML = events.map(renderEventCard).join("");
}

function renderCalendarFilters() {
  const monthCourses = state.courses.filter((course) => course.published && course.startAt.slice(0, 7) === monthKey(state.month));
  const reservedCount = monthCourses.filter((course) => state.reminders.has(course.id)).length;
  const unreservedCount = monthCourses.length - reservedCount;
  const labels = {
    all: `全部 (${monthCourses.length})`,
    reserved: `已预约 (${reservedCount})`,
    unreserved: `未预约 (${unreservedCount})`,
  };
  $$("#calendarFilters [data-calendar-filter]").forEach((button) => {
    button.textContent = labels[button.dataset.calendarFilter];
    button.classList.toggle("is-active", button.dataset.calendarFilter === state.calendarFilter);
  });
}

function renderEventCard(course) {
  const start = parseDate(course.startAt);
  const status = getCourseRuntime(course);
  const reminded = state.reminders.has(course.id);
  const dateText = `${start.getMonth() + 1} 月 ${start.getDate()} 日（${weekday(start)}） ${course.startAt.slice(11, 16)}-${course.endAt.slice(11, 16)}`;
  return `
    <article class="event-card timeline-course" data-course="${course.id}">
      <span class="timeline-dot" aria-hidden="true"></span>
      <span class="event-body">
        <h4>${course.title}</h4>
        <p class="meta strong-date">${dateText}</p>
        <div class="tag-row">${course.positions.slice(0, 3).map((pos) => `<span class="tag">${pos}</span>`).join("")}</div>
        <div class="calendar-detail-block">
          <strong>课程内容</strong>
          <ul>${course.content.map((item) => `<li>${item}</li>`).join("")}</ul>
        </div>
        <div class="calendar-detail-block">
          <strong>适用场景</strong>
          <ul class="scenario-list">${course.scenarios.map((item) => `<li>${item}</li>`).join("")}</ul>
        </div>
        <div class="event-card-actions">
          ${course.liveUrl ? `<a class="inline-link calendar-live-link" href="${course.liveUrl}" target="_blank" rel="noreferrer">加入会议</a>` : `<span></span>`}
          <button class="calendar-reserve-button ${reminded ? "is-reminded" : ""}" type="button" data-action="signup" data-course="${course.id}">${reminded ? "已预约" : "预约"}</button>
        </div>
      </span>
    </article>
  `;
}

function renderCourses() {
  renderSquarePositionFilter();
  const published = state.courses.filter((course) => course.published && getCourseRuntime(course) === "ended" && courseMatchesPosition(course));
  const replayCourses = published.sort((a, b) => parseDate(b.startAt) - parseDate(a.startAt));

  $("#upcomingCount").textContent = `${replayCourses.length} 门`;
  $("#upcomingCourses").innerHTML = replayCourses.length ? replayCourses.map((course, index) => renderCourseCard(course, replayCourses.length - index - 1)).join("") : `<div class="empty-state">暂无课程回放</div>`;
}

function renderSquarePositionFilter() {
  const mainPositions = ["运维", "研发", "测试", "产品"];
  const morePositions = POSITION_OPTIONS.filter((position) => !mainPositions.includes(position));
  const extraCount = state.extraPositionFilters.size;
  const hasSelectedPositions = state.mainPositionFilters.size > 0 || extraCount > 0;
  $("#squarePositionFilter").innerHTML = `
    <button class="filter-chip ${!hasSelectedPositions ? "is-active" : ""}" type="button" data-position-filter="全部">全部</button>
    ${mainPositions.map((position) => `<button class="filter-chip ${state.mainPositionFilters.has(position) ? "is-active" : ""}" type="button" data-position-filter="${position}">${position}</button>`).join("")}
    <span class="square-more-wrap">
      <button class="filter-chip more-positions ${state.squareMorePositionsVisible ? "is-open" : ""}" id="toggleSquareMorePositions" type="button" aria-expanded="${state.squareMorePositionsVisible}">
        ${extraCount ? `更多岗位（${extraCount}）` : "更多岗位"}
      </button>
      <span class="more-position-menu square-more-position-menu" id="squareMorePositionChecks" ${state.squareMorePositionsVisible ? "" : "hidden"}>
        ${morePositions.map((position) => `
          <label class="position-menu-item ${state.extraPositionFilters.has(position) ? "is-selected" : ""}">
            <input type="checkbox" value="${position}" ${state.extraPositionFilters.has(position) ? "checked" : ""} data-square-extra-position />
            <span>${position}</span>
          </label>
        `).join("")}
      </span>
    </span>
  `;
}

function courseMatchesPosition(course, position) {
  const selected = [
    ...state.mainPositionFilters,
    ...state.extraPositionFilters,
  ];
  if (!selected.length && position && position !== "全部") selected.push(position);
  if (!selected.length) return true;
  return selected.some((target) => course.positions.some((item) => item === target || item.includes(target) || target.includes(item)));
}

function renderCourseCard(course, issueIndex = 0) {
  const headline = course.content[0] || course.subtitle || course.title;
  const coverThemes = ["#25385f", "#4a2507", "#233f12", "#3b1225", "#102f37", "#442d11"];

  return `
    <article class="course-card replay-tile prototype-card" id="course-${course.id}" data-action="courseDetail" data-course="${course.id}" style="--course-cover-bg: ${coverThemes[issueIndex % coverThemes.length]}">
      <div class="prototype-cover">
        <div class="prototype-cover-copy">
          <strong>${headline}</strong>
        </div>
      </div>
      <div class="prototype-card-body">
        <h4>${course.title}</h4>
        <div class="tag-row">
          ${course.positions.slice(0, 2).map((pos) => `<span class="tag">${pos}</span>`).join("")}
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
  $("#learnedHours").textContent = formatLearningDuration(totalMs);
  $$(".learning-tab").forEach((button) => button.classList.toggle("is-active", button.dataset.recordMode === state.recordMode));
  $("#learningStats").hidden = state.recordMode !== "learning";
  $("#reservationList").hidden = state.recordMode !== "reservations";
  $("#recordList").hidden = state.recordMode !== "learning";
  $("#reservationList").innerHTML = reservations.length
    ? reservations.map((course, index) => renderLearningCourseCard(course, { type: "reservation", issueIndex: reservations.length - index })).join("")
    : `<div class="empty-state">暂无预约课程</div>`;
  $("#recordList").innerHTML = records.length
    ? records.map((course, index) => renderLearningCourseCard(course, { type: "learning", issueIndex: records.length - index })).join("")
    : `<div class="empty-state">暂无学习记录</div>`;
}

function formatLearningDuration(totalMs) {
  const totalMinutes = Math.max(0, Math.round(totalMs / 60000));
  if (totalMinutes < 60) return `${totalMinutes}分钟`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}小时${minutes}分钟` : `${hours}小时`;
}

function renderLearningCourseCard(course, { type, issueIndex }) {
  const rating = state.ratings[course.id] || 0;
  const coverThemes = ["#25385f", "#4a2507", "#233f12", "#3b1225", "#102f37", "#442d11"];
  const action = type === "reservation"
    ? `<button class="learning-card-action" type="button" data-action="cancelReminder" data-course="${course.id}">取消预约</button>`
    : `<button class="learning-card-action ${rating ? "is-rated" : ""}" type="button" data-action="openRating" data-course="${course.id}">${rating ? "查看评价" : "点评"}</button>`;
  return `
    <article class="learning-course-card" style="--course-cover-bg: ${coverThemes[issueIndex % coverThemes.length]}">
      <div class="prototype-cover">
        <div class="prototype-cover-copy">
          <strong>${course.content[0] || course.subtitle}</strong>
        </div>
      </div>
      <div class="learning-course-body">
        <h4>${course.title}</h4>
        <div class="tag-row">
          ${course.positions.slice(0, 2).map((pos) => `<span class="tag">${pos}</span>`).join("")}
        </div>
      </div>
      <div class="learning-course-footer">${action}</div>
    </article>
  `;
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
  const mainPositions = ["运维", "研发", "测试", "产品"];
  const morePositions = POSITION_OPTIONS.filter((position) => !mainPositions.includes(position));
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

function myRatingDetail(courseId) {
  const details = state.ratingDetails[courseId] || [];
  return details.find((item) => item.username === state.currentUser?.username) || null;
}

function openRatingPage(course) {
  $("#learningListPanel").hidden = true;
  $("#ratingPage").hidden = false;
  $("#ratingPageContent").innerHTML = renderRatingPage(course);
  if (!state.ratings[course.id]) {
    resetRatingSheet();
    $("#pageRatingCourseId").value = course.id;
    renderRatingStars("pageRatingOverall", 0);
    renderRatingStars("pageRatingClarity", 0);
    renderRatingStars("pageRatingTeacher", 0);
  }
  $("#ratingPage").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderRatingPage(course) {
  const detail = myRatingDetail(course.id);
  const readonly = Boolean(state.ratings[course.id]);
  const intro = renderRatingCourseIntro(course);
  if (readonly) {
    return `
      <article class="rating-page-card">
        <h3>${course.title}</h3>
        ${intro}
        ${renderReadonlyRatingField("对 AI 直播课堂的整体打分", detail?.score || state.ratings[course.id])}
        ${renderReadonlyRatingField("你认为本堂课老师讲解是否清晰完整，对你的工作有帮助？", detail?.clarityScore || detail?.score || state.ratings[course.id])}
        ${renderReadonlyChoiceField("本次课程内容难度如何？", detail?.difficulty || "未填写")}
        ${renderReadonlyChoiceField("跟随老师演示，你是否成功完成了安装和基础配置？", detail?.completedSetup || "未填写")}
        ${renderReadonlyRatingField("对本次主讲老师的综合评价", detail?.teacherScore || detail?.score || state.ratings[course.id])}
        <div class="rating-readonly-comment">
          <b>你希望下次课程改进或新增哪些内容？（选填）</b>
          <p>${detail?.comment || "未填写"}</p>
        </div>
      </article>
    `;
  }
  return `
    <article class="rating-page-card">
      <h3>${course.title}</h3>
      ${intro}
      <form id="pageRatingForm" class="rating-form">
        <input id="pageRatingCourseId" type="hidden" />
        ${renderEditableRatingField("对 AI 直播课堂的整体打分", "pageRatingOverall", true)}
        ${renderEditableRatingField("你认为本堂课老师讲解是否清晰完整，对你的工作有帮助？", "pageRatingClarity")}
        <label class="rating-field">
          <span>本次课程内容难度如何？</span>
          <span class="choice-row">
            ${["简单", "适中", "较难"].map((item) => `<button class="choice-button ${item === "适中" ? "is-active" : ""}" type="button" data-choice-target="pageRatingDifficulty" data-choice-value="${item}">${item}</button>`).join("")}
          </span>
          <input id="pageRatingDifficulty" type="hidden" value="适中" />
        </label>
        <label class="rating-field">
          <span>跟随老师演示，你是否成功完成了安装和基础配置？</span>
          <span class="choice-row">
            ${["是", "否"].map((item) => `<button class="choice-button ${item === "是" ? "is-active" : ""}" type="button" data-choice-target="pageRatingCompleted" data-choice-value="${item}">${item}</button>`).join("")}
          </span>
          <input id="pageRatingCompleted" type="hidden" value="是" />
        </label>
        ${renderEditableRatingField("对本次主讲老师的综合评价", "pageRatingTeacher")}
        <label class="rating-field no-panel">
          <span>你希望下次课程改进或新增哪些内容？（选填）</span>
          <textarea id="pageRatingComment" rows="4" placeholder="请输入你的建议..."></textarea>
        </label>
        <button class="rating-submit-button" type="submit">✈ 提交评价</button>
      </form>
    </article>
  `;
}

function renderRatingCourseIntro(course) {
  return `
    <section class="rating-course">
      <h4>${course.subtitle || course.content[0] || ""}</h4>
      <p class="rating-time">◷ ${formatFullTime(course)}</p>
      <div class="tag-row">${course.positions.map((pos) => `<span class="tag">${pos}</span>`).join("")}</div>
      <hr />
      <strong>课程内容</strong>
      <ul>${course.content.map((item) => `<li>${item}</li>`).join("")}</ul>
    </section>
  `;
}

function renderEditableRatingField(label, fieldId, required = false) {
  return `
    <label class="rating-field">
      <span>${label}</span>
      <span class="rating-scale">${[1, 2, 3, 4, 5].map((score) => `<em>${score}</em>`).join("")}</span>
      <span class="rating-stars numbered" data-rating-field="${fieldId}"></span>
      <input id="${fieldId}" type="hidden" ${required ? "required" : ""} />
    </label>
  `;
}

function renderReadonlyRatingField(label, score) {
  const value = Number(score || 0);
  return `
    <section class="rating-field readonly">
      <span>${label}</span>
      <span class="readonly-stars">${"★".repeat(value)}${"☆".repeat(Math.max(0, 5 - value))}</span>
    </section>
  `;
}

function renderReadonlyChoiceField(label, value) {
  return `
    <section class="rating-field readonly">
      <span>${label}</span>
      <span class="choice-row"><span class="choice-button is-active">${value}</span></span>
    </section>
  `;
}

function closeRatingPage() {
  const page = $("#ratingPage");
  if (!page || page.hidden) return;
  page.hidden = true;
  $("#learningListPanel").hidden = false;
  $("#recordsView").scrollIntoView({ behavior: "smooth", block: "start" });
}

function openRatingSheet(course) {
  openRatingPage(course);
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

async function submitPageRating() {
  const courseId = $("#pageRatingCourseId").value;
  const score = Number($("#pageRatingOverall").value);
  if (!score) {
    showToast("请先选择整体评分");
    return;
  }
  const submitButton = $("#pageRatingForm button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "提交中...";
  try {
    await apiFetch("/api/records", {
      method: "POST",
      body: JSON.stringify({
        action: "rate",
        courseId,
        score,
        clarityScore: Number($("#pageRatingClarity").value || score),
        teacherScore: Number($("#pageRatingTeacher").value || score),
        difficulty: $("#pageRatingDifficulty").value,
        completedSetup: $("#pageRatingCompleted").value,
        comment: $("#pageRatingComment").value.trim(),
      }),
    });
    state.ratings[courseId] = score;
    await loadRecords();
    renderRecords();
    const course = state.courses.find((item) => item.id === courseId);
    if (course) $("#ratingPageContent").innerHTML = renderRatingPage(course);
    showToast("评价已提交");
  } catch (error) {
    showToast(error.message);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "✈ 提交评价";
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
    ? `
      <div class="admin-table">
        <div class="admin-table-head">
          <span>课程</span>
          <span>日期</span>
          <span>状态</span>
          <span>回放</span>
          <span>说明书</span>
          <span>操作</span>
        </div>
        ${published.map(renderAdminCourseItem).join("")}
      </div>
    `
    : `<div class="empty-state">暂无已发布课程</div>`;
  renderReminderBadge();
}

function renderAdminCourseItem(course) {
  const runtime = getCourseRuntime(course);
  const date = course.startAt.slice(0, 10);
  const replayMark = course.replayUrl ? "✓" : "—";
  const handbookMark = course.handbookUrl ? "✓" : "—";
  return `
    <article class="admin-course-row">
      <div class="admin-course-main" data-label="课程">
        <h4>${course.title}</h4>
        <p>${course.teacher}</p>
        <div class="admin-mobile-assets">封面 ${course.coverUrl ? "✓" : "—"} · 回放 ${replayMark} · 说明书 ${handbookMark}</div>
      </div>
      <div class="admin-cell" data-label="日期">${date}</div>
      <div class="admin-cell" data-label="状态"><span class="status ${runtime}">${statusLabel(runtime)}</span></div>
      <div class="admin-cell asset-mark" data-label="回放">${replayMark}</div>
      <div class="admin-cell asset-mark" data-label="说明书">${handbookMark}</div>
      <div class="admin-actions" data-label="操作">
        <button class="admin-action-button" type="button" data-admin-action="upload" data-course="${course.id}">上传</button>
        <button class="admin-action-button is-accent" type="button" data-admin-action="message" data-course="${course.id}">站内提醒</button>
        <button class="admin-action-button is-telegram" type="button" data-admin-action="telegram" data-course="${course.id}">TG通知</button>
        <button class="admin-action-button" type="button" data-admin-action="reviews" data-course="${course.id}">评价</button>
        <button class="admin-icon-action" type="button" data-admin-action="edit" data-course="${course.id}" aria-label="编辑">编辑</button>
        <button class="admin-icon-action is-danger" type="button" data-admin-action="delete" data-course="${course.id}" aria-label="删除">删除</button>
      </div>
      <div class="admin-mobile-tags">${course.positions.map((pos) => `<span class="tag">${pos}</span>`).join("")}</div>
    </article>
  `;
}

function showAdminPanel(panelId, shouldScroll = true) {
  ["adminListPanel", "courseFormPanel", "assetFormPanel", "adminReviewPanel", "telegramConfigPanel", "telegramSendPanel"].forEach((id) => {
    const panel = $(`#${id}`);
    if (panel) panel.hidden = id !== panelId;
  });
  if (shouldScroll) $("#manageView").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderAdminReviewPanel(course) {
  const reviews = state.ratingDetails[course.id] || [];
  const average = reviews.length ? (reviews.reduce((sum, item) => sum + Number(item.score || 0), 0) / reviews.length).toFixed(1) : "暂无";
  $("#adminReviewContent").innerHTML = `
    <article class="admin-review-summary">
      <h4>${course.title}</h4>
      <p>${reviews.length} 条评价 · 平均分 ${average}</p>
    </article>
    <div class="admin-review-list">
      ${reviews.length ? reviews.map((review) => `
        <article class="admin-review-item">
          <div>
            <strong>${review.username || "学员"}</strong>
            <span>${"★".repeat(Number(review.score || 0))}${"☆".repeat(5 - Number(review.score || 0))}</span>
          </div>
          <p>讲解清晰：${review.clarityScore || "-"} 分 · 老师评价：${review.teacherScore || "-"} 分</p>
          <p>难度：${review.difficulty || "-"} · 完成安装：${review.completedSetup || "-"}</p>
          ${review.comment ? `<blockquote>${review.comment}</blockquote>` : ""}
        </article>
      `).join("") : `<div class="empty-state">暂无学员评价</div>`}
    </div>
  `;
}

function renderTelegramConfig() {
  const { botConfigured, botSource, groups } = state.telegramConfig;
  $("#telegramBotStatus").textContent = botConfigured
    ? `Bot 已配置${botSource === "env" ? "（环境变量）" : ""}`
    : "未配置 Bot";
  $("#telegramBotStatus").classList.toggle("is-ready", botConfigured);
  $("#telegramGroupList").innerHTML = groups.length
    ? groups.map((group) => `
      <article class="telegram-group-card ${group.enabled ? "" : "is-disabled"}">
        <div>
          <h4>${group.name}</h4>
          <p>${group.chatId}</p>
          ${group.description ? `<small>${group.description}</small>` : ""}
        </div>
        <span class="telegram-group-state">${group.enabled ? "启用" : "停用"}</span>
        <div class="telegram-group-actions">
          <button type="button" data-tg-action="toggle" data-group="${group.id}">${group.enabled ? "停用" : "启用"}</button>
          <button type="button" data-tg-action="edit" data-group="${group.id}">编辑</button>
          <button type="button" class="is-danger" data-tg-action="delete" data-group="${group.id}">删除</button>
        </div>
      </article>
    `).join("")
    : `<div class="empty-state">还没有配置 TG 群。添加 Bot 进群后，在这里填写群名称和 Chat ID。</div>`;
}

function resetTelegramGroupForm() {
  $("#telegramGroupId").value = "";
  $("#telegramGroupName").value = "";
  $("#telegramChatId").value = "";
  $("#telegramGroupDescription").value = "";
  $("#telegramGroupEnabled").checked = true;
  $("#cancelTelegramGroupEdit").textContent = "清空";
}

function fillTelegramGroupForm(group) {
  $("#telegramGroupId").value = group.id;
  $("#telegramGroupName").value = group.name;
  $("#telegramChatId").value = group.chatId;
  $("#telegramGroupDescription").value = group.description || "";
  $("#telegramGroupEnabled").checked = group.enabled;
  $("#cancelTelegramGroupEdit").textContent = "取消编辑";
}

function renderTelegramSendPanel(course) {
  const enabledGroups = state.telegramConfig.groups.filter((group) => group.enabled);
  $("#telegramSendCourse").innerHTML = course
    ? `
      <p class="eyebrow">本次发送课程</p>
      <h4>${course.title}</h4>
      <span>${course.startAt.slice(0, 10)} · ${course.teacher}</span>
    `
    : "";
  if (!state.telegramConfig.botConfigured || !enabledGroups.length) {
    $("#telegramSendGroupChecks").innerHTML = `
      <div class="empty-state">请先完成 Bot Token 和至少一个启用群的配置。</div>
    `;
    $("#sendTelegramNow").disabled = true;
    $("#sendTelegramNow").textContent = "先配置 TG 群";
    return;
  }
  if (!state.telegramSelectedGroups.size) {
    state.telegramSelectedGroups = new Set(enabledGroups.map((group) => group.id));
  }
  $("#telegramSendGroupChecks").innerHTML = enabledGroups.map((group) => `
    <label class="telegram-send-check">
      <input type="checkbox" value="${group.id}" ${state.telegramSelectedGroups.has(group.id) ? "checked" : ""} />
      <span>
        <strong>${group.name}</strong>
        <small>${group.description || group.chatId}</small>
      </span>
    </label>
  `).join("");
  $("#sendTelegramNow").disabled = false;
  $("#sendTelegramNow").textContent = `发送到选中 TG 群`;
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
  localStorage.setItem(COURSE_CACHE_KEY, JSON.stringify({ courses: state.courses, updatedAt: Date.now() }));
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

async function loadNotifications() {
  if (!state.token) return;
  const data = await apiFetch("/api/notifications");
  state.notifications = data.notifications || [];
  renderReminderBadge();
}

async function loadTelegramConfig() {
  if (!state.token || !state.isAdmin) return;
  const data = await apiFetch("/api/telegram");
  state.telegramConfig = {
    botConfigured: Boolean(data.botConfigured),
    botSource: data.botSource || "",
    groups: data.groups || [],
  };
  renderTelegramConfig();
}

function restoreCachedCourses() {
  try {
    const cached = JSON.parse(localStorage.getItem(COURSE_CACHE_KEY) || "null");
    if (!Array.isArray(cached?.courses) || !cached.courses.length) return false;
    state.courses = cached.courses;
    return true;
  } catch {
    localStorage.removeItem(COURSE_CACHE_KEY);
    return false;
  }
}

function renderAppDataViews() {
  renderCalendar();
  renderCourses();
  renderRecords();
  renderAssetOptions();
  renderAdminCourseList();
}

async function loadAppData() {
  try {
    const recordsPromise = loadRecords().catch((error) => showToast(error.message || "学习记录加载失败，请重试"));
    await loadCourses();
    renderAppDataViews();
    await recordsPromise;
    renderAppDataViews();
    loadNotifications().catch((error) => showToast(error.message || "消息加载失败，请重试"));
  } catch (error) {
    showToast(error.message || "加载失败，请重试");
  }
}

function getCoursePayload(published) {
  syncCourseDateFields();
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
  const content = lines("#contentLines").slice(0, 5);
  return {
    title: $("#courseTitle").value.trim(),
    subtitle: content[0] || $("#courseTitle").value.trim(),
    positions,
    startAt: `${startAt}:00+08:00`,
    endAt: `${endAt}:00+08:00`,
    content,
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
  $("#coverUrl").value = "";
  $("#publishCoverFile").value = "";
  $$("#positionChecks input").forEach((input, index) => {
    input.checked = index < 2;
  });
  $$("#morePositionChecks input").forEach((input) => {
    input.checked = false;
  });
  setMorePositionsVisible(false);
  $("#startDate").value = "2026-05-18";
  $("#timeSlot").value = "20:00-21:30";
  syncCourseDateFields();
  $("#contentLines").value = "";
  $("#scenarioLines").value = "";
  $("#teacherName").value = "";
  $("#liveUrl").value = "";
  $("#publishButton").textContent = "发布";
  updateCoverPreview();
}

function fillCourseForm(course) {
  $("#editingCourseId").value = course.id;
  $("#courseTitle").value = course.title;
  $("#coverUrl").value = course.coverUrl || "";
  $("#publishCoverFile").value = "";
  $$("#positionChecks input, #morePositionChecks input").forEach((input) => {
    input.checked = course.positions.includes(input.value);
  });
  setMorePositionsVisible(false);
  $("#startDate").value = course.startAt.slice(0, 10);
  $("#timeSlot").value = `${course.startAt.slice(11, 16)}-${course.endAt.slice(11, 16)}`;
  syncCourseDateFields();
  $("#contentLines").value = course.content.join("\n");
  $("#scenarioLines").value = course.scenarios.join("\n");
  $("#teacherName").value = course.teacher;
  $("#liveUrl").value = course.liveUrl || "";
  $("#publishButton").textContent = "保存修改";
  updateCoverPreview();
}

function syncCourseDateFields() {
  const date = $("#startDate")?.value || "2026-05-18";
  const slot = ($("#timeSlot")?.value || "20:00-21:30").replace("—", "-").replace("–", "-");
  const [start = "20:00", end = "21:30"] = slot.split("-").map((item) => item.trim());
  $("#startAt").value = `${date}T${start}`;
  $("#endAt").value = `${date}T${end}`;
}

function updateCoverPreview() {
  const preview = $("#coverPreview");
  const file = $("#publishCoverFile")?.files?.[0];
  const url = ($("#coverUrl")?.value || "").trim();
  if (!preview) return;
  if (file) {
    preview.style.backgroundImage = `url("${URL.createObjectURL(file)}")`;
    preview.classList.add("has-image");
    preview.innerHTML = "";
    return;
  }
  if (!url) {
    preview.style.backgroundImage = "";
    preview.classList.remove("has-image");
    preview.innerHTML = "<span>暂无封面图</span>";
    return;
  }
  preview.style.backgroundImage = `url("${url.replace(/"/g, "")}")`;
  preview.classList.add("has-image");
  preview.innerHTML = "";
}

async function addCourse(published) {
  const payload = getCoursePayload(published);
  if (!payload) return;
  const editingCourseId = $("#editingCourseId").value;
  const publishCoverFile = $("#publishCoverFile").files[0];
  if (publishCoverFile && !publishCoverFile.type.startsWith("image/")) {
    showToast("课程封面需为图片格式");
    return;
  }
  setCourseFormSubmitting(true);
  try {
    let data = await apiFetch("/api/courses", {
      method: editingCourseId ? "PUT" : "POST",
      body: JSON.stringify(editingCourseId ? { ...payload, courseId: editingCourseId } : payload),
    });
    if (publishCoverFile) {
      setUploadProgress(true, 0, "正在上传封面...");
      const coverAsset = await uploadAssetFile(data.course, "cover", publishCoverFile, (loaded) => {
        const percent = publishCoverFile.size ? (loaded / publishCoverFile.size) * 100 : 0;
        setUploadProgress(true, percent, `封面上传 ${Math.round(percent)}%`);
      });
      data = await apiFetch("/api/courses", {
        method: "PUT",
        body: JSON.stringify({ mode: "assets", courseId: data.course.id, coverAsset }),
      });
      setUploadProgress(false);
    }
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
    showAdminPanel("adminListPanel");
    state.messagesRead = false;
    renderReminderBadge();
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

  $("#profileLogoutButton").addEventListener("click", () => {
    closeProfileModal();
    clearCurrentUser();
    showToast("已退出登录");
  });

  $("#userBadge").addEventListener("click", openProfileModal);
  $("#closeProfile").addEventListener("click", closeProfileModal);
  $("#profileModal").addEventListener("click", (event) => {
    if (event.target.id === "profileModal") closeProfileModal();
  });
  $("#profilePasswordForm").addEventListener("submit", (event) => {
    event.preventDefault();
    submitProfilePassword();
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

  document.body.addEventListener("click", async (event) => {
    const ratingStar = event.target.closest("[data-rating-target]");
    if (ratingStar) {
      setRatingValue(ratingStar.dataset.ratingTarget, Number(ratingStar.dataset.score));
      return;
    }
    const choiceButton = event.target.closest("[data-choice-target]");
    if (choiceButton) {
      $(`#${choiceButton.dataset.choiceTarget}`).value = choiceButton.dataset.choiceValue;
      $$(`[data-choice-target="${choiceButton.dataset.choiceTarget}"]`).forEach((button) => button.classList.remove("is-active"));
      choiceButton.classList.add("is-active");
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
    const moreButton = event.target.closest("#toggleSquareMorePositions");
    if (moreButton) {
      event.stopPropagation();
      state.squareMorePositionsVisible = !state.squareMorePositionsVisible;
      renderSquarePositionFilter();
      return;
    }
    const button = event.target.closest("[data-position-filter]");
    if (!button) return;
    event.stopPropagation();
    const position = button.dataset.positionFilter;
    if (position === "全部") {
      state.mainPositionFilters.clear();
      state.extraPositionFilters.clear();
      state.positionFilter = "全部";
      state.squareMorePositionsVisible = false;
      renderCourses();
      return;
    }
    if (state.mainPositionFilters.has(position)) {
      state.mainPositionFilters.delete(position);
    } else {
      state.mainPositionFilters.add(position);
    }
    state.positionFilter = state.mainPositionFilters.size || state.extraPositionFilters.size ? "自定义" : "全部";
    renderCourses();
  });
  $("#squarePositionFilter").addEventListener("change", (event) => {
    const input = event.target.closest("[data-square-extra-position]");
    if (!input) return;
    event.stopPropagation();
    if (input.checked) {
      state.extraPositionFilters.add(input.value);
    } else {
      state.extraPositionFilters.delete(input.value);
    }
    state.positionFilter = state.mainPositionFilters.size || state.extraPositionFilters.size ? "自定义" : "全部";
    renderCourses();
  });

  $("#learningListPanel").addEventListener("click", (event) => {
    const button = event.target.closest("[data-record-mode]");
    if (!button) return;
    state.recordMode = button.dataset.recordMode;
    renderRecords();
  });

  $("#closeRatingSheet").addEventListener("click", closeRatingSheet);
  $("#ratingSheet").addEventListener("click", (event) => {
    if (event.target.id === "ratingSheet") closeRatingSheet();
  });
  $("#backToSquare").addEventListener("click", closeCourseDetail);
  $("#backToLearning").addEventListener("click", closeRatingPage);
  $("#ratingForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    await submitRatingSheet();
  });
  $("#ratingPage").addEventListener("submit", async (event) => {
    if (event.target.id !== "pageRatingForm") return;
    event.preventDefault();
    await submitPageRating();
  });

  $("#openPublishCourse").addEventListener("click", () => {
    resetCourseForm();
    $("#courseEditorTitle").textContent = "发布新课程";
    showAdminPanel("courseFormPanel");
  });

  $("#openTelegramConfig").addEventListener("click", async () => {
    showAdminPanel("telegramConfigPanel");
    try {
      await loadTelegramConfig();
    } catch (error) {
      showToast(error.message || "TG 配置加载失败");
    }
  });

  $("#jumpTelegramConfig").addEventListener("click", async () => {
    showAdminPanel("telegramConfigPanel");
    try {
      await loadTelegramConfig();
    } catch (error) {
      showToast(error.message || "TG 配置加载失败");
    }
  });

  $$("[data-admin-back]").forEach((button) => {
    button.addEventListener("click", () => showAdminPanel("adminListPanel"));
  });

  $("#reminderBadge").addEventListener("click", openMessageDrawer);
  $$("[data-close-messages]").forEach((button) => {
    button.addEventListener("click", closeMessageDrawer);
  });
  $("#readAllMessages").addEventListener("click", () => {
    state.messagesRead = true;
    renderReminderBadge();
    showToast("消息已全部标记已读");
  });

  $("#courseFormPanel").addEventListener("submit", (event) => {
    event.preventDefault();
    addCourse(true);
  });

  $("#saveDraft").addEventListener("click", () => {
    resetCourseForm();
    showAdminPanel("adminListPanel");
  });

  $("#coverUrl").addEventListener("input", updateCoverPreview);
  $("#publishCoverFile").addEventListener("change", updateCoverPreview);
  $("#startDate").addEventListener("change", syncCourseDateFields);
  $("#timeSlot").addEventListener("input", syncCourseDateFields);

  $("#toggleMorePositions").addEventListener("click", () => {
    setMorePositionsVisible($("#morePositionChecks").hidden);
  });

  $("#morePositionChecks").addEventListener("change", updateMorePositionButton);

  $("#telegramBotForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const botToken = $("#telegramBotToken").value.trim();
    if (!botToken) {
      showToast("请输入 Telegram Bot Token");
      return;
    }
    const button = $("#telegramBotForm button[type='submit']");
    button.disabled = true;
    button.textContent = "保存中...";
    try {
      await apiFetch("/api/telegram", {
        method: "POST",
        body: JSON.stringify({ action: "saveBot", botToken }),
      });
      $("#telegramBotToken").value = "";
      await loadTelegramConfig();
      showToast("TG Bot Token 已保存");
    } catch (error) {
      showToast(error.message || "Bot Token 保存失败");
    } finally {
      button.disabled = false;
      button.textContent = "保存 Bot Token";
    }
  });

  $("#telegramGroupForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const group = {
      id: $("#telegramGroupId").value,
      name: $("#telegramGroupName").value.trim(),
      chatId: $("#telegramChatId").value.trim(),
      description: $("#telegramGroupDescription").value.trim(),
      enabled: $("#telegramGroupEnabled").checked,
    };
    const button = $("#telegramGroupForm button[type='submit']");
    button.disabled = true;
    button.textContent = "保存中...";
    try {
      await apiFetch("/api/telegram", {
        method: "POST",
        body: JSON.stringify({ action: "saveGroup", group }),
      });
      resetTelegramGroupForm();
      await loadTelegramConfig();
      showToast("TG 群配置已保存");
    } catch (error) {
      showToast(error.message || "TG 群配置保存失败");
    } finally {
      button.disabled = false;
      button.textContent = "保存群配置";
    }
  });

  $("#cancelTelegramGroupEdit").addEventListener("click", resetTelegramGroupForm);

  $("#telegramGroupList").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-tg-action]");
    if (!button) return;
    const group = state.telegramConfig.groups.find((item) => item.id === button.dataset.group);
    if (!group) return;
    if (button.dataset.tgAction === "edit") {
      fillTelegramGroupForm(group);
      $("#telegramGroupName").focus();
      return;
    }
    button.disabled = true;
    try {
      if (button.dataset.tgAction === "toggle") {
        await apiFetch("/api/telegram", {
          method: "POST",
          body: JSON.stringify({ action: "saveGroup", group: { ...group, enabled: !group.enabled } }),
        });
        showToast(group.enabled ? "TG 群已停用" : "TG 群已启用");
      }
      if (button.dataset.tgAction === "delete") {
        await apiFetch("/api/telegram", {
          method: "POST",
          body: JSON.stringify({ action: "deleteGroup", groupId: group.id }),
        });
        showToast("TG 群已删除");
      }
      await loadTelegramConfig();
    } catch (error) {
      showToast(error.message || "TG 群操作失败");
    } finally {
      button.disabled = false;
    }
  });

  $("#telegramSendGroupChecks").addEventListener("change", () => {
    state.telegramSelectedGroups = new Set($$("#telegramSendGroupChecks input:checked").map((input) => input.value));
  });

  $("#sendTelegramNow").addEventListener("click", async () => {
    const course = state.courses.find((item) => item.id === state.telegramTargetCourseId);
    const groupIds = [...state.telegramSelectedGroups];
    if (!course) {
      showToast("请选择要发送的课程");
      return;
    }
    if (!groupIds.length) {
      showToast("请选择至少一个 TG 群");
      return;
    }
    const button = $("#sendTelegramNow");
    button.disabled = true;
    button.textContent = "发送中...";
    try {
      const data = await apiFetch("/api/telegram", {
        method: "POST",
        body: JSON.stringify({ action: "send", courseId: course.id, groupIds }),
      });
      const failedText = data.failed?.length ? `，${data.failed.length} 个群失败` : "";
      showToast(`已发送到 ${data.sent?.length || 0} 个 TG 群${failedText}`);
    } catch (error) {
      showToast(error.message || "TG 群通知发送失败");
    } finally {
      button.disabled = false;
      button.textContent = "发送到选中 TG 群";
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".position-picker")) setMorePositionsVisible(false);
    if (!event.target.closest("#squarePositionFilter") && state.squareMorePositionsVisible) {
      state.squareMorePositionsVisible = false;
      renderSquarePositionFilter();
    }
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
      state.messagesRead = false;
      renderReminderBadge();
      showAdminPanel("adminListPanel");
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
    if (button.dataset.adminAction === "upload") {
      if (!canUploadCourseAssets(course)) {
        showToast("课程开课后才能上传回放和说明书");
        return;
      }
      renderAssetOptions();
      $("#assetCourse").value = course.id;
      updateAssetStatus();
      showAdminPanel("assetFormPanel");
      return;
    }
    if (button.dataset.adminAction === "message") {
      button.disabled = true;
      const originalText = button.textContent;
      button.textContent = "发送中";
      try {
        const data = await apiFetch("/api/notifications", {
          method: "POST",
          body: JSON.stringify({ courseId: course.id }),
        });
        if (data.notification) {
          state.notifications = [data.notification, ...state.notifications.filter((item) => item.id !== data.notification.id)];
        }
        state.messagesRead = false;
        renderReminderBadge();
        showToast(`已发送《${course.title}》提醒给学员`);
      } catch (error) {
        showToast(error.message || "提醒发送失败");
      } finally {
        button.disabled = false;
        button.textContent = originalText;
      }
      return;
    }
    if (button.dataset.adminAction === "telegram") {
      state.telegramTargetCourseId = course.id;
      state.telegramSelectedGroups = new Set();
      showAdminPanel("telegramSendPanel");
      try {
        await loadTelegramConfig();
        renderTelegramSendPanel(course);
      } catch (error) {
        renderTelegramSendPanel(course);
        showToast(error.message || "TG 配置加载失败");
      }
      return;
    }
    if (button.dataset.adminAction === "reviews") {
      renderAdminReviewPanel(course);
      showAdminPanel("adminReviewPanel");
      return;
    }
    if (button.dataset.adminAction === "edit") {
      fillCourseForm(course);
      $("#courseEditorTitle").textContent = "编辑课程";
      showAdminPanel("courseFormPanel");
      showToast("已载入课程，可直接修改");
      return;
    }
    if (button.dataset.adminAction === "delete") {
      openDeleteConfirm(course);
    }
  });

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
      state.messagesRead = false;
      renderReminderBadge();
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
    if (event.key === "Escape") closeMessageDrawer();
    if (event.key === "Escape" && $("#deleteConfirmModal").classList.contains("is-visible")) {
      closeDeleteConfirm();
    }
  });
}

async function init() {
  restoreSession();
  renderTabs();
  renderPositionChecks();
  renderReminderBadge();
  renderAuthMode();
  bindEvents();
  renderAuthState({ skipActiveRender: Boolean(state.currentUser) });
  if (state.currentUser) {
    if (restoreCachedCourses()) renderAppDataViews();
    await loadAppData();
    return;
  }
  renderCalendar();
  renderCourses();
  renderRecords();
  renderAssetOptions();
  renderAdminCourseList();
}

init();
