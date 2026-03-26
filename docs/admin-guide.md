# AEO Analyzer: System Admin Guide
## Deployment, Management, and Operations

This guide is for the **SuperAdmin** (`lindsay.hiebert@gmail.com`) to manage the AEO Analyzer in production.

### 1. Production Deployment Strategy
The app is built as a **Full-Stack Express + Vite** application.

- **Frontend**: React 19 + Tailwind CSS + Motion.
- **Backend**: Express.js (on Node.js).
- **Database/Auth**: Firebase (Firestore + Auth).
- **Hosting**: Google Cloud Run (recommended) or Vercel/Render.

#### Deployment Steps (Google Cloud Run):
1. **Build**: `npm run build`
2. **Dockerize**: Use a standard Node.js Dockerfile (or the platform's auto-build).
3. **Deploy**: `gcloud run deploy aeo-analyzer --source .`
4. **Env Vars**: Set `GEMINI_API_KEY`, `STRIPE_SECRET_KEY`, and `VITE_STRIPE_PUBLIC_KEY` in the Cloud Run console.

### 2. Managing Users and Subscriptions
The **SuperAdmin Dashboard** is your command center.
- **User Metrics**: View total users, free vs. pro subscribers.
- **User Support**: Use the dashboard to manually reset passwords or view user activity.
- **Firestore**: For deep data management, use the [Firebase Console](https://console.firebase.google.com/).

### 3. CI/CD and Ongoing Development
- **Local Dev**: `npm run dev`
- **Testing**: Run `npm run lint` before every push.
- **Staging**: Deploy to a separate Cloud Run service (e.g., `aeo-analyzer-staging`) before production.
- **Feature Flags**: Use Firestore to toggle experimental features for specific users.

### 4. Monitoring and Analytics
- **GA4**: Access Google Analytics 4 to see real-time user streams and conversion funnels.
- **Error Logging**: Check Cloud Run logs for backend errors and Firestore logs for security rule violations.

### 5. Troubleshooting
- **Permission Denied**: Check `firestore.rules`. Ensure the user is authenticated.
- **Stripe Issues**: Check the Stripe Dashboard for failed webhooks or incomplete payments.
- **AI Errors**: Ensure the `GEMINI_API_KEY` is valid and hasn't hit its quota.

---
*SuperAdmin Password: Superstar1*
