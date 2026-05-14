const {
  ensureAuthSchema,
  getSql,
  hashPassword,
  json,
  readBody,
  signToken,
  verifyPassword,
} = require("./_lib");

module.exports = async function handler(req, res) {
  try {
    await ensureAuthSchema();
    if (req.method !== "POST") {
      json(res, 405, { error: "Method not allowed" });
      return;
    }

    const sql = getSql();
    const body = await readBody(req);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const mode = body.mode === "register" ? "register" : "login";

    if (!username || !password) {
      json(res, 400, { error: "请输入账号和密码" });
      return;
    }

    if (mode === "register") {
      if (password.length < 6) {
        json(res, 400, { error: "密码至少 6 位" });
        return;
      }
      if (password !== String(body.confirmPassword || "")) {
        json(res, 400, { error: "两次密码不一致" });
        return;
      }
      try {
        await sql`
          insert into users (username, password_hash, role)
          values (${username}, ${hashPassword(password)}, 'member')
        `;
      } catch (error) {
        if (String(error.message).includes("duplicate key")) {
          json(res, 409, { error: "账号已存在" });
          return;
        }
        throw error;
      }
    }

    const rows = await sql`select username, password_hash, role from users where username = ${username}`;
    const user = rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      json(res, 401, { error: "账号或密码错误" });
      return;
    }

    const safeUser = { username: user.username, role: user.role };
    json(res, 200, { user: safeUser, token: signToken(safeUser) });
  } catch (error) {
    json(res, 500, { error: error.message || "服务异常" });
  }
};
