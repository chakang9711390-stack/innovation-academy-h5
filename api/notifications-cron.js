const { ensureSchema, getSql, json } = require("./_lib");
const { createAutomaticNotifications } = require("./notifications");

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "GET" && req.method !== "POST") {
      json(res, 405, { error: "Method not allowed" });
      return;
    }
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authorization = req.headers.authorization || "";
      if (authorization !== `Bearer ${cronSecret}`) {
        json(res, 401, { error: "Unauthorized" });
        return;
      }
    }
    await ensureSchema();
    const created = await createAutomaticNotifications(getSql());
    json(res, 200, { ok: true, created });
  } catch (error) {
    json(res, 500, { error: error.message || "自动提醒失败" });
  }
};
