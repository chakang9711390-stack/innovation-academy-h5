function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

async function triggerNotifications(env) {
  const appBaseUrl = trimTrailingSlash(env.APP_BASE_URL);
  if (!appBaseUrl) throw new Error("APP_BASE_URL is not configured");
  if (!env.CRON_SECRET) throw new Error("CRON_SECRET is not configured");

  const response = await fetch(`${appBaseUrl}/api/notifications-cron`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.CRON_SECRET}`,
    },
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Cron endpoint failed (${response.status}): ${body}`);
  }
  return body;
}

export default {
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(triggerNotifications(env));
  },
};
