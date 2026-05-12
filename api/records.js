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
      const watched = await sql`select course_id, replayed_at, reminded_at, downloaded_at from user_records where username = ${user.username}`;
      const ratings = await sql`select course_id, score from ratings where username = ${user.username}`;
      json(res, 200, {
        watched: watched.filter((row) => row.replayed_at || row.downloaded_at).map((row) => row.course_id),
        reminders: watched.filter((row) => row.reminded_at).map((row) => row.course_id),
        ratings: Object.fromEntries(ratings.map((row) => [row.course_id, row.score])),
      });
      return;
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      const courseId = String(body.courseId || "");
      if (body.action === "cancelReminder") {
        await sql`update user_records set reminded_at = null where username = ${user.username} and course_id = ${courseId}`;
        json(res, 200, { ok: true });
        return;
      }
      if (["watch", "remind", "download"].includes(body.action)) {
        const remindAt = body.action === "remind" ? new Date().toISOString() : null;
        const replayAt = body.action === "watch" ? new Date().toISOString() : null;
        const downloadAt = body.action === "download" ? new Date().toISOString() : null;
        await sql`
          insert into user_records (id, username, course_id, replayed_at, reminded_at, downloaded_at)
          values (${makeId("r")}, ${user.username}, ${courseId}, ${replayAt}, ${remindAt}, ${downloadAt})
          on conflict (username, course_id) do update set watched_at = now()
        `;
        if (body.action === "watch") {
          await sql`update user_records set replayed_at = now() where username = ${user.username} and course_id = ${courseId}`;
        }
        if (body.action === "remind") {
          await sql`update user_records set reminded_at = coalesce(reminded_at, now()) where username = ${user.username} and course_id = ${courseId}`;
        }
        if (body.action === "download") {
          await sql`update user_records set downloaded_at = now() where username = ${user.username} and course_id = ${courseId}`;
        }
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
