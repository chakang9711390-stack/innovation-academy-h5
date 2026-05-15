# Telegram Cron Worker

This Worker wakes the Vercel API every 5 minutes so the app can deliver automatic Telegram reminders.

## Required variables

- `APP_BASE_URL`: production app origin, for example `https://innovation-academy-h5.vercel.app`
- `CRON_SECRET`: shared secret that must also exist in Vercel production env

## First deployment

```bash
npx wrangler login
cd cloudflare/telegram-cron
npx wrangler secret put APP_BASE_URL
npx wrangler secret put CRON_SECRET
npx wrangler deploy
```

After deployment, keep the in-app `自动发送 TG 提醒` switch enabled only for the groups that should receive automatic reminders.
