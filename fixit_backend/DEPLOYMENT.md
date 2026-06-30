# Production Deployment Guide (24/7 Hosting)

This guide provides step-by-step instructions to take the FixIt backend and mobile client applications live 24/7 on cloud infrastructure.

---

## 1. 24/7 Database Setup (MongoDB Atlas)

To run the application 24/7, you need a cloud-hosted MongoDB cluster rather than running it locally.

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign up for a free account.
2. Create a new Shared Cluster (M0 Free tier is perfect for initial launch).
3. Under **Database Access**, create a database user with a secure password.
4. Under **Network Access**, add `0.0.0.0/0` to allow access from any IP (required since cloud hosting platforms like Render have dynamic IP ranges).
5. Click **Connect** -> **Connect your application** and copy the **Connection String** (URI).
   - *Example:* `mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/fixit?retryWrites=true&w=majority`

---

## 2. 24/7 Backend API & Socket Server Hosting (Render)

Render is a cloud hosting platform that supports Node.js services with built-in WebSockets.

1. Log in to [Render](https://render.com/).
2. Click **New +** -> **Web Service**.
3. Connect your Git repository (GitHub/GitLab) where the code is pushed.
4. Configure the Web Service settings:
   - **Name:** `fixit-backend`
   - **Root Directory:** `fixit_backend` (Crucial: set this so Render builds from the backend folder)
   - **Language:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. Click **Advanced** and add the following **Environment Variables**:
   - `NODE_ENV` = `production`
   - `PORT` = `10000` (Render binds this dynamically, but setting it ensures standard routing)
   - `JWT_SECRET` = `[Generate A Random 64-Character Key]`
   - `MONGODB_URI` = `[Your MongoDB Atlas Connection String]`
   - `ALLOWED_ORIGIN` = `*` (Or list of domains if hosting a web version)
   - `TWILIO_ACCOUNT_SID` = `[Optional: Twilio SID for real SMS]`
   - `TWILIO_AUTH_TOKEN` = `[Optional: Twilio Token]`
   - `TWILIO_PHONE_NUMBER` = `[Optional: Twilio phone number]`
6. Click **Deploy Web Service**. Render will spin up the server and give you a public URL (e.g. `https://fixit-backend.onrender.com`).

---

## 3. Re-building Frontend Apps for Production

Once the backend is live on Render, update the mobile client environments to point to the live server URL instead of the local development IP.

### A. Environment Files Setup
In the root of the `fixit` and `fixit_patner` directories, update your `.env` or build environment variables.

#### For Customer App (`fixit/.env`):
```env
EXPO_PUBLIC_API_URL=https://fixit-backend.onrender.com/api
EXPO_PUBLIC_SOCKET_URL=https://fixit-backend.onrender.com
```

#### For Partner App (`fixit_patner/.env`):
```env
EXPO_PUBLIC_API_URL=https://fixit-backend.onrender.com/api
EXPO_PUBLIC_SOCKET_URL=https://fixit-backend.onrender.com
```

### B. Compile the Binaries (EAS Build)
Use EAS Build (Expo Application Services) to generate production-ready `.apk` and `.ipa` files that will communicate with the live cloud server 24/7.

1. Make sure you are logged into Expo:
   ```bash
   npm install -g eas-cli
   eas login
   ```
2. Configure EAS in the app directories:
   ```bash
   eas build:configure
   ```
3. Build for Android (generates production APK/AAB):
   ```bash
   eas build --platform android --profile production
   ```
4. Build for iOS (generates production IPA):
   ```bash
   eas build --platform ios --profile production
   ```

Now, anyone who downloads the mobile apps from anywhere in the world will be able to book service professionals, receive live updates, and update geolocation tracking live 24/7!
