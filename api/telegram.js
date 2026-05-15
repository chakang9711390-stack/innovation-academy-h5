const { ensureSchema, getSql, json, readBody, requireAdmin } = require("./_lib");
const { formatCourseTime } = require("./notifications");

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
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

async function sendTelegramMessage(course) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    throw new Error("TG 群通知未配置，请先在 Vercel 环境变量中配置 TELEGRAM_BOT_TOKEN 和 TELEGRAM_CHAT_ID");
  }

  const payload = {
    chat_id: chatId,
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

module.exports = async function handler(req, res) {
  try {
    await ensureSchema();
    if (req.method !== "POST") {
      json(res, 405, { error: "Method not allowed" });
      return;
    }

    const admin = requireAdmin(req, res);
    if (!admin) return;

    const body = await readBody(req);
    const courseId = String(body.courseId || "");
    const sql = getSql();
    const rows = await sql`
      select id, title, positions, start_at, end_at, content, scenarios, teacher, live_url
      from courses
      where id = ${courseId} and status = 'published'
    `;
    const course = rows[0];
    if (!course) {
      json(res, 404, { error: "课程不存在或未发布" });
      return;
    }

    const message = await sendTelegramMessage(course);
    json(res, 200, { ok: true, messageId: message.message_id });
  } catch (error) {
    json(res, 500, { error: error.message || "TG 群通知服务异常" });
  }
};
