const {
  ensureSchema,
  getSql,
  hashPassword,
  json,
  readBody,
  requireUser,
  verifyPassword,
} = require("./_lib");

module.exports = async function handler(req, res) {
  try {
    await ensureSchema();
    const user = requireUser(req, res);
    if (!user) return;

    if (req.method !== "POST") {
      json(res, 405, { error: "Method not allowed" });
      return;
    }

    const body = await readBody(req);
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");
    const confirmPassword = String(body.confirmPassword || "");

    if (!currentPassword || !newPassword || !confirmPassword) {
      json(res, 400, { error: "请完整填写密码信息" });
      return;
    }
    if (newPassword.length < 6) {
      json(res, 400, { error: "新密码至少 6 位" });
      return;
    }
    if (newPassword !== confirmPassword) {
      json(res, 400, { error: "两次新密码不一致" });
      return;
    }
    if (currentPassword === newPassword) {
      json(res, 400, { error: "新密码不能与当前密码相同" });
      return;
    }

    const sql = getSql();
    const rows = await sql`select password_hash from users where username = ${user.username}`;
    const account = rows[0];
    if (!account || !verifyPassword(currentPassword, account.password_hash)) {
      json(res, 401, { error: "当前密码不正确" });
      return;
    }

    await sql`update users set password_hash = ${hashPassword(newPassword)} where username = ${user.username}`;
    json(res, 200, { ok: true });
  } catch (error) {
    json(res, 500, { error: error.message || "服务异常" });
  }
};
