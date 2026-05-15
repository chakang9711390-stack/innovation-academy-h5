const crypto = require("node:crypto");
const { ensureSchema, getSql, json, readBody, requireAdmin } = require("./_lib");
const { formatCourseTime } = require("./notifications");

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function normalizeGroup(row) {
  return {
    id: row.id,
    name: row.name,
    chatId: row.chat_id,
    description: row.description || "",
    enabled: row.enabled !== false,
  };
}

function validateChatId(chatId) {
  return /^-?\d{5,}$/.test(chatId) || /^@[A-Za-z0-9_]{5,}$/.test(chatId);
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value) === "true";
}

function buildTelegramText(course) {
  const positions = Array.isArray(course.positions) ? course.positions.join(" / ") : "";
  const content = Array.isArray(course.content) && course.content.length
    ? course.content.map((item, index) => `${index + 1}. ${item}`).join("\n")
    : "暂无课程内容";
  const lines = [
    `📢 <b>${escapeHtml(course.title)}</b>`,
    "",
    `⏰ ${escapeHtml(formatCourseTime(course))}`,
    positions ? `🏷 ${escapeHtml(positions)}` : "",
    course.teacher ? `👤 ${escapeHtml(course.teacher)}` : "",
    "",
    "<b>课程内容</b>",
    escapeHtml(content),
  ].filter(Boolean);
  if (Array.isArray(course.scenarios) && course.scenarios.length) {
    lines.push("", "<b>适用场景</b>", escapeHtml(course.scenarios.map((item) => `• ${item}`).join("\n")));
  }
  lines.push("", "课程将准时发车，麻烦大家帮忙转发，十分感谢！");
  return lines.join("\n");
}

async function getBotToken(sql) {
  const rows = await sql`select value from telegram_config where key = 'bot_token' limit 1`;
  return rows[0]?.value || process.env.TELEGRAM_BOT_TOKEN || "";
}

async function getAutoEnabled(sql) {
  const rows = await sql`select value from telegram_config where key = 'auto_enabled' limit 1`;
  return parseBoolean(rows[0]?.value, false);
}

async function sendTelegramMessage(course, group, token) {
  const payload = {
    chat_id: group.chat_id,
    text: buildTelegramText(course),
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
  if (course.live_url) {
    payload.reply_markup = {
      inline_keyboard: [[{ text: "加入会议", url: course.live_url }]],
    };
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    throw new Error(result.description || "TG 群通知发送失败");
  }
  return result.result;
}

async function listConfig(sql, res) {
  const token = await getBotToken(sql);
  const autoEnabled = await getAutoEnabled(sql);
  const groups = await sql`
    select id, name, chat_id, description, enabled
    from telegram_groups
    order by created_at asc
  `;
  json(res, 200, {
    ok: true,
    botConfigured: Boolean(token),
    botSource: token && process.env.TELEGRAM_BOT_TOKEN === token ? "env" : "database",
    autoEnabled,
    groups: groups.map(normalizeGroup),
  });
}

async function saveBot(sql, body, res) {
  const botToken = String(body.botToken || "").trim();
  if (!botToken) {
    json(res, 400, { error: "请输入 Telegram Bot Token" });
    return;
  }
  if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(botToken)) {
    json(res, 400, { error: "Bot Token 格式不正确" });
    return;
  }
  await sql`
    insert into telegram_config (key, value, updated_at)
    values ('bot_token', ${botToken}, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `;
  json(res, 200, { ok: true });
}

async function saveGroup(sql, body, res) {
  const group = body.group || {};
  const id = String(group.id || `tg_${crypto.randomUUID()}`).trim();
  const name = String(group.name || "").trim();
  const chatId = String(group.chatId || "").trim();
  const description = String(group.description || "").trim();
  const enabled = group.enabled !== false;

  if (!name) {
    json(res, 400, { error: "请输入群名称" });
    return;
  }
  if (!validateChatId(chatId)) {
    json(res, 400, { error: "请输入有效的 Telegram Chat ID，例如 -1001234567890 或 @channelname" });
    return;
  }

  await sql`
    insert into telegram_groups (id, name, chat_id, description, enabled, updated_at)
    values (${id}, ${name}, ${chatId}, ${description}, ${enabled}, now())
    on conflict (id) do update set
      name = excluded.name,
      chat_id = excluded.chat_id,
      description = excluded.description,
      enabled = excluded.enabled,
      updated_at = now()
  `;
  json(res, 200, { ok: true, group: { id, name, chatId, description, enabled } });
}

async function saveAutoSetting(sql, body, res) {
  const autoEnabled = body.autoEnabled === true;
  await sql`
    insert into telegram_config (key, value, updated_at)
    values ('auto_enabled', ${String(autoEnabled)}, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `;
  json(res, 200, { ok: true, autoEnabled });
}

async function deleteGroup(sql, body, res) {
  const id = String(body.groupId || "").trim();
  if (!id) {
    json(res, 400, { error: "请选择要删除的 TG 群" });
    return;
  }
  await sql`delete from telegram_groups where id = ${id}`;
  json(res, 200, { ok: true });
}

async function sendToGroups(sql, body, res) {
  const courseId = String(body.courseId || "").trim();
  const groupIds = Array.isArray(body.groupIds) ? body.groupIds.map(String).filter(Boolean) : [];
  if (!courseId) {
    json(res, 400, { error: "请选择课程" });
    return;
  }
  if (!groupIds.length) {
    json(res, 400, { error: "请选择至少一个 TG 群" });
    return;
  }

  const token = await getBotToken(sql);
  if (!token) {
    json(res, 400, { error: "请先在 TG 群配置中填写 Bot Token" });
    return;
  }

  const courseRows = await sql`
    select id, title, positions, start_at, end_at, content, scenarios, teacher, live_url
    from courses
    where id = ${courseId} and status = 'published'
  `;
  const course = courseRows[0];
  if (!course) {
    json(res, 404, { error: "课程不存在或未发布" });
    return;
  }

  const groupRows = await sql`
    select id, name, chat_id, description, enabled
    from telegram_groups
    where id = any(${groupIds}) and enabled = true
  `;
  if (!groupRows.length) {
    json(res, 400, { error: "选中的 TG 群不存在或已停用" });
    return;
  }

  const sent = [];
  const failed = [];
  for (const group of groupRows) {
    try {
      const message = await sendTelegramMessage(course, group, token);
      sent.push({ groupId: group.id, name: group.name, messageId: message.message_id });
    } catch (error) {
      failed.push({ groupId: group.id, name: group.name, error: error.message });
    }
  }

  if (!sent.length) {
    json(res, 500, { error: failed[0]?.error || "TG 群通知发送失败", sent, failed });
    return;
  }
  json(res, 200, { ok: true, sent, failed });
}

async function createAutomaticTelegramNotifications(sql, now = new Date()) {
  if (!(await getAutoEnabled(sql))) return { sent: 0, failed: 0, skipped: "disabled" };
  const token = await getBotToken(sql);
  if (!token) return { sent: 0, failed: 0, skipped: "missing_bot" };

  const [courses, groups] = await Promise.all([
    sql`
      select id, title, positions, start_at, end_at, content, scenarios, teacher, live_url
      from courses
      where status = 'published'
        and start_at > now()
        and start_at <= now() + interval '1 hour 10 minutes'
      order by start_at asc
    `,
    sql`
      select id, name, chat_id, description, enabled
      from telegram_groups
      where enabled = true
      order by created_at asc
    `,
  ]);
  let sent = 0;
  let failed = 0;
  const nowMs = now.getTime();
  for (const course of courses) {
    const startMs = new Date(course.start_at).getTime();
    for (const minutesBefore of [60, 15]) {
      const dueAt = startMs - minutesBefore * 60 * 1000;
      const dueWindowEnds = dueAt + 10 * 60 * 1000;
      if (nowMs < dueAt || nowMs >= dueWindowEnds) continue;
      for (const group of groups) {
        const triggerKey = `${course.id}:${group.id}:before_${minutesBefore}m`;
        const id = `tgl_${crypto.randomUUID()}`;
        const reserved = await sql`
          insert into telegram_delivery_logs (id, course_id, group_id, trigger_key)
          values (${id}, ${course.id}, ${group.id}, ${triggerKey})
          on conflict (trigger_key) do nothing
          returning id
        `;
        if (!reserved.length) continue;
        try {
          const message = await sendTelegramMessage(course, group, token);
          await sql`
            update telegram_delivery_logs
            set telegram_message_id = ${String(message.message_id)}
            where id = ${id}
          `;
          sent += 1;
        } catch (error) {
          await sql`delete from telegram_delivery_logs where id = ${id}`;
          failed += 1;
        }
      }
    }
  }
  return { sent, failed };
}

module.exports = async function handler(req, res) {
  try {
    await ensureSchema();
    const admin = requireAdmin(req, res);
    if (!admin) return;

    const sql = getSql();
    if (req.method === "GET") {
      await listConfig(sql, res);
      return;
    }
    if (req.method !== "POST") {
      json(res, 405, { error: "Method not allowed" });
      return;
    }

    const body = await readBody(req);
    const action = String(body.action || "send");
    if (action === "saveBot") {
      await saveBot(sql, body, res);
      return;
    }
    if (action === "saveGroup") {
      await saveGroup(sql, body, res);
      return;
    }
    if (action === "saveAutoSetting") {
      await saveAutoSetting(sql, body, res);
      return;
    }
    if (action === "deleteGroup") {
      await deleteGroup(sql, body, res);
      return;
    }
    if (action === "send") {
      await sendToGroups(sql, body, res);
      return;
    }
    json(res, 400, { error: "未知 TG 操作" });
  } catch (error) {
    const message = error.code === "23505" ? "该 TG Chat ID 已存在" : error.message;
    json(res, 500, { error: message || "TG 群通知服务异常" });
  }
};

module.exports.buildTelegramText = buildTelegramText;
module.exports.createAutomaticTelegramNotifications = createAutomaticTelegramNotifications;
