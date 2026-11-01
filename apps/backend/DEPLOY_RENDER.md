# SchoolDay Backend — Local Testing & Render Free Deployment

## 1. Running & Testing Locally (Active Now)

The backend server is running locally on port **4000**:
- **Health Check Endpoint:**
  ```bash
  curl -s http://localhost:4000/api/health
  ```
  **Response:**
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-10-26T13:08:41.566Z",
    "environment": "production",
    "cloudDatabase": "Supabase PostgreSQL (AWS eu-west-2)"
  }
  ```

- **Request Real Passwordless OTP via Resend:**
  ```bash
  curl -X POST http://localhost:4000/api/auth/request-otp \
    -H "Content-Type: application/json" \
    -d '{"email":"padeespace@gmail.com","isSignUp":true}'
  ```

- **Verify OTP:**
  ```bash
  curl -X POST http://localhost:4000/api/auth/verify-otp \
    -H "Content-Type: application/json" \
    -d '{"email":"padeespace@gmail.com","code":"123456","isSignUp":true}'
  ```

- **Register Campus Workspace & Proprietor:**
  ```bash
  curl -X POST http://localhost:4000/api/schools/register \
    -H "Content-Type: application/json" \
    -d '{
      "proprietorName": "Dr. Mrs. Folashade Adeleke",
      "email": "padeespace@gmail.com",
      "phone": "+234 803 123 4567",
      "schoolName": "Cedar Grove International Academy",
      "address": "14 Admiralty Way, Lekki Phase 1, Lagos",
      "term": "First Term · 2026/27",
      "motto": "Excellence, Wisdom & Leadership",
      "openTime": "07:30",
      "closeTime": "15:30"
    }'
  ```

---

## 2. Deploy to Render Free Web Service (Step-by-Step)

Render provides a generous free tier for Node.js Web Services.

### Option A: Using the Included Blueprint (`render.yaml`)
1. Push your repository to GitHub.
2. Go to [dashboard.render.com](https://dashboard.render.com) and click **New +** → **Blueprint**.
3. Select this repository. Render will automatically read `render.yaml` at the root!
4. Fill in the secret environment variables when prompted:
   - `DATABASE_URL`: `postgresql://postgres.fhztivnuvzjjdbzivqcx:bCn-4$Avpr23%,3@aws-0-eu-west-2.pooler.supabase.com:5432/postgres`
   - `RESEND_API_KEY`: `re_VHtzcYxy_AA5WDqPBzZ5hhWJWV8Rjinqe`
   - `CLOUDINARY_API_SECRET`: `nty7OZxHxMesvVXCJcsv3K8cJlk`
5. Click **Apply**. Render will build and deploy your API!

---

### Option B: Manual Web Service Setup on Render
If setting up manually on [render.com](https://dashboard.render.com):
1. Click **New +** → **Web Service**.
2. Select your repository.
3. Configure the following settings:
   - **Name:** `schoolday-api`
   - **Region:** Frankfurt (EU Central) or closest to AWS eu-west-2
   - **Root Directory:** `apps/backend`
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
4. Under **Environment Variables**, add:
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | `postgresql://postgres.fhztivnuvzjjdbzivqcx:bCn-4$Avpr23%,3@aws-0-eu-west-2.pooler.supabase.com:5432/postgres` |
   | `RESEND_API_KEY` | `re_VHtzcYxy_AA5WDqPBzZ5hhWJWV8Rjinqe` |
   | `RESEND_SENDER` | `SchoolDay <onboarding@resend.dev>` |
   | `CLOUDINARY_CLOUD_NAME` | `b8wk22xs` |
   | `CLOUDINARY_API_SECRET` | `nty7OZxHxMesvVXCJcsv3K8cJlk` |
5. Click **Deploy Web Service**.
6. Once deployed, Render will assign your live HTTPS URL (e.g., `https://schoolday-api.onrender.com`).
7. Update `EXPO_PUBLIC_BACKEND_URL` in `apps/mobile/.env` to your Render URL!
