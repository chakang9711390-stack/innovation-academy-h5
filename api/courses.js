const { ensureSchema, getSql, json, normalizeCourse, readBody, requireAdmin } = require("./_lib");

const COURSE_SELECT = `
  id, title, subtitle, positions, start_at, end_at, content, scenarios,
  teacher, live_url, replay_url, handbook_url, replay_file_name, handbook_file_name,
  replay_data is not null as has_replay_file,
  handbook_data is not null as has_handbook_file,
  form, status, created_at, updated_at
`;

function makeId() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

module.exports = async function handler(req, res) {
  try {
    await ensureSchema();
    const sql = getSql();

    if (req.method === "GET") {
      const rows = await sql.query(`select ${COURSE_SELECT} from courses order by start_at asc`);
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
      const rows = await sql.query(`select ${COURSE_SELECT} from courses where id = $1`, [id]);
      json(res, 201, { course: normalizeCourse(rows[0]) });
      return;
    }

    if (req.method === "PUT") {
      if (!requireAdmin(req, res)) return;
      const body = await readBody(req);
      const courseId = String(body.courseId || "");
      if (body.mode === "assets") {
        const replayFile = body.replayFile;
        const handbookFile = body.handbookFile;
        if (replayFile?.data) {
          await sql`
            update courses
            set replay_file_name = ${String(replayFile.name || "replay-video")},
                replay_content_type = ${String(replayFile.type || "video/mp4")},
                replay_data = decode(${String(replayFile.data)}, 'base64'),
                replay_url = '',
                updated_at = now()
            where id = ${courseId}
          `;
        }
        if (handbookFile?.data) {
          await sql`
            update courses
            set handbook_file_name = ${String(handbookFile.name || "handbook.pdf")},
                handbook_content_type = ${String(handbookFile.type || "application/pdf")},
                handbook_data = decode(${String(handbookFile.data)}, 'base64'),
                handbook_url = '',
                updated_at = now()
            where id = ${courseId}
          `;
        }
        await sql`
          update courses
          set updated_at = now()
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
      const rows = await sql.query(`select ${COURSE_SELECT} from courses where id = $1`, [courseId]);
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
