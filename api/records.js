const { ensureSchema, getSql, json, readBody, requireUser } = require("./_lib");

function makeId(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

module.exports = async function handler(req, res) {
  try {
    await ensureSchema();
    const user = requireUser(req, res);
    if (!user) return;
    const sql = getSql();

    if (req.method === "GET") {
      const watched = await sql`select course_id from user_records where username = ${user.username}`;
      const ratings = await sql`select course_id, score from ratings where username = ${user.username}`;
      json(res, 200, {
        watched: watched.map((row) => row.course_id),
        ratings: Object.fromEntries(ratings.map((row) => [row.course_id, row.score])),
      });
      return;
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      const courseId = String(body.courseId || "");
      if (body.action === "watch") {
        await sql`
          insert into user_records (id, username, course_id)
          values (${makeId("r")}, ${user.username}, ${courseId})
          on conflict (username, course_id) do update set watched_at = now()
        `;
        json(res, 200, { ok: true });
        return;
      }
      if (body.action === "rate") {
        const score = Number(body.score);
        if (!Number.isInteger(score) || score < 1 || score > 5) {
          json(res, 400, { error: "评分需为 1-5 星" });
          return;
        }
        await sql`
          insert into ratings (id, username, course_id, score)
          values (${makeId("s")}, ${user.username}, ${courseId}, ${score})
          on conflict (username, course_id) do update set score = ${score}, updated_at = now()
        `;
        json(res, 200, { ok: true });
        return;
      }
      json(res, 400, { error: "未知操作" });
      return;
    }

    json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    json(res, 500, { error: error.message || "服务异常" });
  }
};
