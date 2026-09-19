# Deploying Permanent File Host on Koyeb (Port 8080)

This guide walks you through deploying this project to **[Koyeb](https://www.koyeb.com)** with the unthrottled 10 Gbps permanent file hosting engine, crash-safe database, and active Telegram bot worker on **Port 8080**.

---

## 🚀 Quick 1-Click Deployment (Recommended)

1. **Push your repository to GitHub** (or connect your repo in Koyeb).
2. Go to **[Koyeb Dashboard](https://app.koyeb.com/)** and click **"Create Service"**.
3. Select **GitHub** as deployment source and choose this repository.
4. **Builder Configuration**:
   - Koyeb will automatically detect the included `Dockerfile` (or `koyeb.yaml`).
5. **Port Configuration**:
   - Internal Port: `8080` (already pre-configured in `Dockerfile` and `server.ts`).
   - Protocol: `HTTP`.
6. **Persistent Storage Volume (Important)**:
   - Under **Volumes**, click **Add Volume**.
   - Mount Path: `/app/uploads`.
   - Size: Choose 10GB, 50GB, or custom according to your hosting capacity.
   - *This ensures all uploaded files and database metadata persist permanently across deploys.*
7. **Environment Variables**:
   Add the following under **Environment variables**:
   - `PORT` = `8080`
   - `NODE_ENV` = `production`
   - `TELEGRAM_API_ID` = `your_numeric_api_id` (From my.telegram.org -> API development tools)
   - `TELEGRAM_API_HASH` = `your_32_char_api_hash` (From my.telegram.org -> API development tools)
   - `TELEGRAM_BOT_TOKEN` = `your_bot_token` (From @BotFather on Telegram)
   - `APP_BASE_URL` = `https://<your-app-name>.koyeb.app` (Your Koyeb public domain)
8. Click **"Deploy"**!

---

## 🤖 Activating the Telegram 4 GB MTProto Bot (No Strings Needed!)

Standard Telegram Bot API caps uploads at 20 MB. This project includes a native **MTProto binary client** powered by GramJS to handle massive files up to **4 GB (4,000 MB)**!

### Quick 3-Step Setup (No String Sessions Needed):

1. **Get your Telegram API ID & API Hash (Takes 60 seconds):**
   - Visit **[my.telegram.org](https://my.telegram.org)** and log in with your phone number.
   - Click on **"API development tools"**.
   - Create an app (enter any name, e.g. `MyUploadBot`).
   - Copy your numeric **`api_id`** and 32-character **`api_hash`**.

2. **Get your Bot Token:**
   - Message **[@BotFather](https://t.me/botfather)** on Telegram.
   - Send `/newbot`, choose a name and username.
   - Copy your bot token.

3. **Connect & Activate 4 GB Uploads:**
   - **On Koyeb:** Set `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, and `TELEGRAM_BOT_TOKEN` in your service environment variables.
   - **Or in Web UI:** Click **"Telegram Bot (4 GB)"** in the top navbar, enter your API ID, API Hash, and Bot Token, then click **"Connect MTProto 4 GB Bot"**.

Now send or forward any file up to 4 GB directly to your Telegram bot. It streams byte-by-byte into permanent storage and instantly replies with 10 Gbps unthrottled hotlinks and direct download URLs!

Now send or forward any file up to 4 GB directly in Telegram. The bot will stream it straight into your storage node with live progress updates and return permanent direct hotlinks!
