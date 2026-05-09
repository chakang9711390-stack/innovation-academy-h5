const { ensureSchema, getSql, json, readBody, requireAdmin } = require("./_lib");
const { createUploadUrl, getPublicUrl, makeObjectKey } = require("./_storage");

const DEFAULT_MAX_UPLOAD_MB = 1024;

module.exports = async function handler(req, res) {
  try {
    await ensureSchema();
    if (req.method !== "POST") {
      json(res, 405, { error: "Method not allowed" });
      return;
    }
    if (!requireAdmin(req, res)) return;

    const body = await readBody(req);
    const courseId = String(body.courseId || "");
    const type = String(body.type || "");
    const fileName = String(body.fileName || "");
    const contentType = String(body.contentType || "application/octet-stream");
    const size = Number(body.size || 0);
    const maxBytes = Number(process.env.OBJECT_MAX_UPLOAD_MB || DEFAULT_MAX_UPLOAD_MB) * 1024 * 1024;

    if (!courseId || !["replay", "handbook"].includes(type) || !fileName) {
      json(res, 400, { error: "上传参数不完整" });
      return;
    }
    if (type === "replay" && !contentType.startsWith("video/")) {
      json(res, 400, { error: "回放文件需为视频格式" });
      return;
    }
    if (type === "handbook" && contentType !== "application/pdf") {
      json(res, 400, { error: "知识手册仅支持 PDF" });
      return;
    }
    if (size <= 0 || size > maxBytes) {
      json(res, 400, { error: `单个文件不能超过 ${Math.round(maxBytes / 1024 / 1024)}MB` });
      return;
    }

    const sql = getSql();
    const eligibleRows = await sql`
      select id
      from courses
      where id = ${courseId} and status = 'published' and start_at <= now()
    `;
    if (!eligibleRows[0]) {
      json(res, 400, { error: "课程未开播，不能上传回放和手册" });
      return;
    }

    const storageKey = makeObjectKey({ courseId, type, fileName });
    const uploadUrl = await createUploadUrl({ key: storageKey, contentType });
    const publicUrl = getPublicUrl(storageKey);
    json(res, 200, {
      uploadUrl,
      asset: {
        name: fileName,
        type: contentType,
        storageKey,
        url: publicUrl,
        size,
      },
    });
  } catch (error) {
    json(res, 500, { error: error.message || "创建上传地址失败" });
  }
};
