const { ensureSchema, getSql, json, normalizeCourse, readBody, requireAdmin } = require("./_lib");

function makeId() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

module.exports = async function handler(req, res) {
  try {
    await ensureSchema();
    const sql = getSql();

    if (req.method === "GET") {
      const rows = await sql`select * from courses order by start_at asc`;
      json(res, 200, { courses: rows.map(normalizeCourse) });
      return;
    }

    if (req.method === "POST") {
      if (!requireAdmin(req, res)) return;
      const body = await readBody(req);
      const id = makeId();
      const status = body.published ? "published" : "draft";
      await sql`
        insert into courses (
          id, title, subtitle, positions, start_at, end_at, content, scenarios,
          teacher, live_url, replay_url, handbook_url, form, status
        )
        values (
          ${id}, ${String(body.title || "").trim()}, ${String(body.subtitle || "").trim()},
          ${JSON.stringify(body.positions || [])}::jsonb, ${body.startAt}, ${body.endAt},
          ${JSON.stringify(body.content || [])}::jsonb, ${JSON.stringify(body.scenarios || [])}::jsonb,
          ${String(body.teacher || "").trim()}, ${String(body.liveUrl || "").trim()},
          '', '', ${String(body.form || "在线实操")}, ${status}
        )
      `;
      const rows = await sql`select * from courses where id = ${id}`;
      json(res, 201, { course: normalizeCourse(rows[0]) });
      return;
    }

    if (req.method === "PUT") {
      if (!requireAdmin(req, res)) return;
      const body = await readBody(req);
      const courseId = String(body.courseId || "");
      if (body.mode === "assets") {
        await sql`
          update courses
          set replay_url = ${String(body.replayUrl || "").trim()},
              handbook_url = ${String(body.handbookUrl || "").trim()},
              updated_at = now()
          where id = ${courseId}
        `;
      } else {
        const status = body.published ? "published" : "draft";
        await sql`
          update courses
          set title = ${String(body.title || "").trim()},
              subtitle = ${String(body.subtitle || "").trim()},
              positions = ${JSON.stringify(body.positions || [])}::jsonb,
              start_at = ${body.startAt},
              end_at = ${body.endAt},
              content = ${JSON.stringify(body.content || [])}::jsonb,
              scenarios = ${JSON.stringify(body.scenarios || [])}::jsonb,
              teacher = ${String(body.teacher || "").trim()},
              live_url = ${String(body.liveUrl || "").trim()},
              form = ${String(body.form || "在线实操")},
              status = ${status},
              updated_at = now()
          where id = ${courseId}
        `;
      }
      const rows = await sql`select * from courses where id = ${courseId}`;
      if (!rows[0]) {
        json(res, 404, { error: "课程不存在" });
        return;
      }
      json(res, 200, { course: normalizeCourse(rows[0]) });
      return;
    }

    if (req.method === "DELETE") {
      if (!requireAdmin(req, res)) return;
      const body = await readBody(req);
      const courseId = String(body.courseId || "");
      await sql`delete from courses where id = ${courseId}`;
      json(res, 200, { ok: true });
      return;
    }

    json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    json(res, 500, { error: error.message || "服务异常" });
  }
};
