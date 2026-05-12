const crypto = require("node:crypto");
const { neon } = require("@neondatabase/serverless");

const ADMIN_USERNAME = "kete2026";
const ADMIN_PASSWORD = "999999";
const SESSION_SECRET = process.env.SESSION_SECRET || "local-development-secret";

let schemaReady = false;

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }
  return neon(process.env.DATABASE_URL);
}

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 8_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt] = stored.split(":");
  return hashPassword(password, salt) === stored;
}

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function signToken(user) {
  const payload = base64url(JSON.stringify({ username: user.username, role: user.role, iat: Date.now() }));
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifyToken(token) {
  if (!token || !token.includes(".")) return null;
  const [payload, signature] = token.split(".");
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function getAuthUser(req) {
  const header = req.headers.authorization || "";
  return verifyToken(header.replace(/^Bearer\s+/i, ""));
}

function requireUser(req, res) {
  const user = getAuthUser(req);
  if (!user) {
    json(res, 401, { error: "请先登录" });
    return null;
  }
  return user;
}

function requireAdmin(req, res) {
  const user = requireUser(req, res);
  if (!user) return null;
  if (user.role !== "admin") {
    json(res, 403, { error: "仅管理员可操作" });
    return null;
  }
  return user;
}

function normalizeCourse(row) {
  const coverUrl = row.cover_storage_key || row.has_cover_file
    ? `/api/assets?courseId=${encodeURIComponent(row.id)}&type=cover`
    : row.cover_url || "";
  const replayUrl = row.replay_storage_key || row.has_replay_file
    ? `/api/assets?courseId=${encodeURIComponent(row.id)}&type=replay`
    : row.replay_url || "";
  const handbookUrl = row.handbook_storage_key || row.has_handbook_file
    ? `/api/assets?courseId=${encodeURIComponent(row.id)}&type=handbook`
    : row.handbook_url || "";
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    positions: row.positions || [],
    startAt: row.start_at,
    endAt: row.end_at,
    content: row.content || [],
    scenarios: row.scenarios || [],
    teacher: row.teacher,
    liveUrl: row.live_url || "",
    coverUrl,
    replayUrl,
    handbookUrl,
    coverFileName: row.cover_file_name || "",
    replayFileName: row.replay_file_name || "",
    handbookFileName: row.handbook_file_name || "",
    form: row.form || "讲解",
    published: row.status === "published",
  };
}

async function ensureSchema() {
  if (schemaReady) return;
  const sql = getSql();
  await sql`
    create table if not exists users (
      username text primary key,
      password_hash text not null,
      role text not null check (role in ('admin', 'member')),
      created_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists courses (
      id text primary key,
      title text not null,
      subtitle text not null,
      positions jsonb not null default '[]'::jsonb,
      start_at timestamptz not null,
      end_at timestamptz not null,
      content jsonb not null default '[]'::jsonb,
      scenarios jsonb not null default '[]'::jsonb,
      teacher text not null,
      live_url text,
      cover_url text,
      cover_file_name text,
      cover_content_type text,
      cover_data bytea,
      cover_storage_key text,
      replay_url text,
      handbook_url text,
      replay_file_name text,
      replay_content_type text,
      replay_data bytea,
      replay_storage_key text,
      handbook_file_name text,
      handbook_content_type text,
      handbook_data bytea,
      handbook_storage_key text,
      form text not null default '讲解',
      status text not null default 'published' check (status in ('draft', 'published')),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await sql`alter table courses add column if not exists cover_url text`;
  await sql`alter table courses add column if not exists cover_file_name text`;
  await sql`alter table courses add column if not exists cover_content_type text`;
  await sql`alter table courses add column if not exists cover_data bytea`;
  await sql`alter table courses add column if not exists cover_storage_key text`;
  await sql`alter table courses add column if not exists replay_file_name text`;
  await sql`alter table courses add column if not exists replay_content_type text`;
  await sql`alter table courses add column if not exists replay_data bytea`;
  await sql`alter table courses add column if not exists replay_storage_key text`;
  await sql`alter table courses add column if not exists handbook_file_name text`;
  await sql`alter table courses add column if not exists handbook_content_type text`;
  await sql`alter table courses add column if not exists handbook_data bytea`;
  await sql`alter table courses add column if not exists handbook_storage_key text`;
  await sql`
    create table if not exists user_records (
      id text primary key,
      username text not null references users(username) on delete cascade,
      course_id text not null references courses(id) on delete cascade,
      watched_at timestamptz not null default now(),
      replayed_at timestamptz,
      reminded_at timestamptz,
      downloaded_at timestamptz,
      unique(username, course_id)
    )
  `;
  await sql`alter table user_records add column if not exists replayed_at timestamptz`;
  await sql`alter table user_records add column if not exists reminded_at timestamptz`;
  await sql`alter table user_records add column if not exists downloaded_at timestamptz`;
  await sql`
    create table if not exists ratings (
      id text primary key,
      username text not null references users(username) on delete cascade,
      course_id text not null references courses(id) on delete cascade,
      score int not null check (score between 1 and 5),
      clarity_score int,
      teacher_score int,
      difficulty text,
      completed_setup text,
      comment text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(username, course_id)
    )
  `;
  await sql`alter table ratings add column if not exists clarity_score int`;
  await sql`alter table ratings add column if not exists teacher_score int`;
  await sql`alter table ratings add column if not exists difficulty text`;
  await sql`alter table ratings add column if not exists completed_setup text`;
  await sql`alter table ratings add column if not exists comment text`;
  await sql`
    insert into users (username, password_hash, role)
    values (${ADMIN_USERNAME}, ${hashPassword(ADMIN_PASSWORD)}, 'admin')
    on conflict (username) do nothing
  `;
  const countRows = await sql`select count(*)::int as count from courses`;
  if (countRows[0].count === 0) {
    await seedCourses(sql);
  }
  schemaReady = true;
}

async function seedCourses(sql) {
  const courses = [
    {
      id: "c1",
      title: "运维多功能机器人 & DNS检测平台",
      subtitle: "带领大家在线安装和使用",
      positions: ["运维", "研发"],
      startAt: "2026-04-30T21:00:00+08:00",
      endAt: "2026-04-30T22:00:00+08:00",
      content: ["环境准备与机器人部署", "DNS 检测任务配置", "告警通知与结果复盘"],
      scenarios: ["内部域名巡检", "自动化排障", "跨团队故障同步", "值班告警降噪", "平台能力评估"],
      teacher: "创新学院-Ben",
      liveUrl: "https://example.com/live/dns",
      replayUrl: "",
      handbookUrl: "",
      form: "在线安装实操",
      status: "published",
    },
    {
      id: "c2",
      title: "内网穿透与反代架构实战",
      subtitle: "从访问路径到安全边界",
      positions: ["研发"],
      startAt: "2026-04-23T21:00:00+08:00",
      endAt: "2026-04-23T22:00:00+08:00",
      content: ["反代链路拆解", "内网穿透安全策略", "常见异常定位"],
      scenarios: ["远程联调", "灰度验证", "私有服务暴露", "权限边界梳理", "临时演示环境"],
      teacher: "创新学院-Ada",
      liveUrl: "https://example.com/live/proxy",
      replayUrl: "https://example.feishu.cn/minutes/proxy-review",
      handbookUrl: "proxy-handbook.pdf",
      form: "讲解",
      status: "published",
    },
    {
      id: "c3",
      title: "容器网络排障与流量观测",
      subtitle: "用观测数据定位服务调用问题",
      positions: ["运维", "研发"],
      startAt: "2026-04-16T20:30:00+08:00",
      endAt: "2026-04-16T21:30:00+08:00",
      content: ["Pod 网络路径", "流量采样与链路分析", "故障案例拆解"],
      scenarios: ["接口超时", "跨集群访问异常", "发布后错误率上升", "网络策略验证", "容量压测"],
      teacher: "平台团队-Cora",
      liveUrl: "https://example.com/live/network",
      replayUrl: "https://example.feishu.cn/minutes/network",
      handbookUrl: "",
      form: "实战演示",
      status: "published",
    },
    {
      id: "c4",
      title: "自动化巡检脚本与值班效率提升",
      subtitle: "从巡检清单到可复用脚本",
      positions: ["运维"],
      startAt: "2026-05-12T20:00:00+08:00",
      endAt: "2026-05-12T21:00:00+08:00",
      content: ["巡检任务建模", "脚本模板设计", "异常输出标准化"],
      scenarios: ["日常值班", "节前保障", "变更前检查", "新人交接", "重复问题收敛"],
      teacher: "创新学院-Lin",
      liveUrl: "https://example.com/live/ops-script",
      replayUrl: "",
      handbookUrl: "",
      form: "在线安装实操",
      status: "published",
    },
  ];

  for (const course of courses) {
    await sql`
      insert into courses (
        id, title, subtitle, positions, start_at, end_at, content, scenarios,
        teacher, live_url, cover_url, replay_url, handbook_url, form, status
      )
      values (
        ${course.id}, ${course.title}, ${course.subtitle}, ${JSON.stringify(course.positions)}::jsonb,
        ${course.startAt}, ${course.endAt}, ${JSON.stringify(course.content)}::jsonb,
        ${JSON.stringify(course.scenarios)}::jsonb, ${course.teacher}, ${course.liveUrl},
        ${course.coverUrl || ""}, ${course.replayUrl}, ${course.handbookUrl}, ${course.form}, ${course.status}
      )
      on conflict (id) do nothing
    `;
  }
}

module.exports = {
  getSql,
  json,
  readBody,
  hashPassword,
  verifyPassword,
  signToken,
  requireUser,
  requireAdmin,
  normalizeCourse,
  ensureSchema,
};
