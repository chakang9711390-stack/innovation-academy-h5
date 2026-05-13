const { ensureSchema, getSql, json, readBody, requireAdmin, requireUser } = require("./_lib");

function makeId() {
  return `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function formatCourseTime(course) {
  const start = new Date(course.start_at);
  const end = new Date(course.end_at);
  const month = start.getMonth() + 1;
  const day = start.getDate();
  const startTime = start.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Shanghai" });
  const endTime = end.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Shanghai" });
  return `${month} 月 ${day} 日 ${startTime}-${endTime}`;
}

function normalizeNotification(row) {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    body: row.body,
    kind: row.kind,
    createdAt: row.created_at,
  };
}

module.exports = async function handler(req, res) {
  try {
    await ensureSchema();
    const sql = getSql();

    if (req.method === "GET") {
      if (!requireUser(req, res)) return;
      const rows = await sql`
        select id, course_id, title, body, kind, created_at
        from notifications
        order by created_at desc
        limit 30
      `;
      json(res, 200, { notifications: rows.map(normalizeNotification) });
      return;
    }

    if (req.method === "POST") {
      const admin = requireAdmin(req, res);
      if (!admin) return;
      const body = await readBody(req);
      const courseId = String(body.courseId || "");
      const rows = await sql`
        select id, title, start_at, end_at, live_url
        from courses
        where id = ${courseId} and status = 'published'
      `;
      const course = rows[0];
      if (!course) {
        json(res, 404, { error: "课程不存在或未发布" });
        return;
      }
      const title = `${course.title} — 开播提醒`;
      const bodyText = `课程将于 ${formatCourseTime(course)} 准时发车，麻烦大家帮忙转发，十分感谢！`;
      const id = makeId();
      await sql`
        insert into notifications (id, course_id, title, body, kind, created_by)
        values (${id}, ${courseId}, ${title}, ${bodyText}, 'course_reminder', ${admin.username})
      `;
      const created = await sql`
        select id, course_id, title, body, kind, created_at
        from notifications
        where id = ${id}
      `;
      json(res, 201, { notification: normalizeNotification(created[0]) });
      return;
    }

    json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    json(res, 500, { error: error.message || "通知服务异常" });
  }
};
