# Google OAuth Configuration & Origin Setup Guide

If the browser console shows the error:
```
[GSI_LOGGER]: The given origin is not allowed for the given client ID.
```
it means the current domain/origin running your frontend application is not listed in your **Google Cloud Console OAuth 2.0 Credentials**.

---

## Authorized JavaScript Origins Setup

1. Open the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials).
2. Select your project.
3. Under **OAuth 2.0 Client IDs**, click on your Client ID:
   `979562784305-qv4cn7nkbs9evd9b6d3dg1okvd96qmsj.apps.googleusercontent.com`
4. In the **Authorized JavaScript origins** section, add the following URLs:

### Development Origins:
- `http://localhost:5173`
- `http://127.0.0.1:5173`

### Production Frontend Origins:
- `https://bikedoctor-blue.vercel.app`
- `https://bikedoctor-three.vercel.app`
- *(Add any custom domain or Vercel production URL used for the frontend site)*

> **Note:** Do NOT include trailing slashes (e.g. use `http://localhost:5173` instead of `http://localhost:5173/`).

5. Click **Save**. Note that Google OAuth changes can take 5 minutes to propagate.
