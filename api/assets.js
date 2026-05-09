const { ensureSchema, getSql } = require("./_lib");

module.exports = async function handler(req, res) {
  try {
    await ensureSchema();
    if (req.method !== "GET") {
      res.statusCode = 405;
      res.end("Method not allowed");
      return;
    }

    const sql = getSql();
    const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
    const courseId = url.searchParams.get("courseId") || "";
    const type = url.searchParams.get("type") || "";

    if (!courseId || !["replay", "handbook"].includes(type)) {
      res.statusCode = 400;
      res.end("Invalid asset request");
      return;
    }

    const rows = type === "replay"
      ? await sql`
          select replay_file_name as file_name,
                 replay_content_type as content_type,
                 encode(replay_data, 'base64') as data
          from courses
          where id = ${courseId} and status = 'published' and replay_data is not null
        `
      : await sql`
          select handbook_file_name as file_name,
                 handbook_content_type as content_type,
                 encode(handbook_data, 'base64') as data
          from courses
          where id = ${courseId} and status = 'published' and handbook_data is not null
        `;

    if (!rows[0]) {
      res.statusCode = 404;
      res.end("Asset not found");
      return;
    }

    const file = rows[0];
    const buffer = Buffer.from(file.data, "base64");
    const disposition = type === "handbook" ? "attachment" : "inline";
    res.statusCode = 200;
    res.setHeader("content-type", file.content_type || "application/octet-stream");
    res.setHeader("content-length", buffer.length);
    res.setHeader("content-disposition", `${disposition}; filename="${encodeURIComponent(file.file_name || type)}"`);
    res.setHeader("cache-control", "private, max-age=0, must-revalidate");
    res.end(buffer);
  } catch (error) {
    res.statusCode = 500;
    res.end(error.message || "Asset error");
  }
};
