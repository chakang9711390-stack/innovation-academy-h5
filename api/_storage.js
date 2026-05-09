const crypto = require("node:crypto");
const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

let client;

function getStorageConfig() {
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION || "auto";
  const endpoint = process.env.S3_ENDPOINT || undefined;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const publicBaseUrl = (process.env.S3_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";
  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("对象存储未配置，请设置 S3_BUCKET、S3_ACCESS_KEY_ID、S3_SECRET_ACCESS_KEY");
  }
  return { bucket, region, endpoint, accessKeyId, secretAccessKey, publicBaseUrl, forcePathStyle };
}

function getStorageClient() {
  const config = getStorageConfig();
  if (!client) {
    client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  return client;
}

function cleanFileName(fileName) {
  const name = String(fileName || "asset").replace(/[^\w.\-\u4e00-\u9fa5]+/g, "-").replace(/^-+|-+$/g, "");
  return name || "asset";
}

function makeObjectKey({ courseId, type, fileName }) {
  const suffix = crypto.randomBytes(6).toString("hex");
  return `courses/${cleanFileName(courseId)}/${type}/${Date.now()}-${suffix}-${cleanFileName(fileName)}`;
}

function getPublicUrl(key) {
  const config = getStorageConfig();
  return config.publicBaseUrl ? `${config.publicBaseUrl}/${encodeURI(key)}` : "";
}

async function createUploadUrl({ key, contentType }) {
  const config = getStorageConfig();
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType || "application/octet-stream",
  });
  return getSignedUrl(getStorageClient(), command, { expiresIn: 60 * 10 });
}

async function createDownloadUrl(key) {
  const config = getStorageConfig();
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });
  return getSignedUrl(getStorageClient(), command, { expiresIn: 60 * 10 });
}

module.exports = {
  createDownloadUrl,
  createUploadUrl,
  getPublicUrl,
  makeObjectKey,
};
