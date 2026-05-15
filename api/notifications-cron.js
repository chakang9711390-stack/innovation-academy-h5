const { ensureSchema, getSql, json } = require("./_lib");
const { createAutomaticNotifications } = require("./notifications");
const { createAutomaticTelegramNotifications } = require("./telegram");

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
    const sql = getSql();
    const created = await createAutomaticNotifications(sql);
    const telegram = await createAutomaticTelegramNotifications(sql);
    json(res, 200, { ok: true, created, telegram });
  } catch (error) {
    json(res, 500, { error: error.message || "自动提醒失败" });
  }
};
