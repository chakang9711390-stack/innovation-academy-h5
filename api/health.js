const { ensureSchema, json } = require("./_lib");

module.exports = async function handler(req, res) {
  try {
    await ensureSchema();
    json(res, 200, { ok: true });
  } catch (error) {
    json(res, 500, { ok: false, error: error.message || "服务异常" });
  }
};
