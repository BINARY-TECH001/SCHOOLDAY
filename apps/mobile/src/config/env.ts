/**
 * School Management App - Cloud & Backend Integration Configuration
 *
 * Configures credentials for:
 * 1. Supabase (PostgreSQL Database & Realtime Auth)
 * 2. Resend (Enterprise Transactional Email & Passwordless OTP)
 * 3. Cloudinary (Media CDN for campus covers, staff avatars & student QR ID badges)
 */

function getDevBackendUrl(): string {
  const custom = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (custom && !custom.includes("localhost")) {
    return custom;
  }
  return "http://192.168.0.162:4000";
}

export const env = {
  // Supabase
  supabaseUrl:
    process.env.EXPO_PUBLIC_SUPABASE_URL || "https://fhztivnuvzjjdbzivqcx.supabase.co",
  supabaseAnonKey:
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "your-supabase-anon-key",

  // Resend (Verified Domain padeespace.com)
  resendApiKey:
    process.env.EXPO_PUBLIC_RESEND_API_KEY || "re_VHtzcYxy_AA5WDqPBzZ5hhWJWV8Rjinqe",
  resendSenderEmail:
    process.env.EXPO_PUBLIC_RESEND_SENDER || "hello@padeespace.com",

  // Cloudinary
  cloudinaryCloudName:
    process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || "b8wk22xs",
  cloudinaryUploadPreset:
    process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "school_covers",
  cloudinaryApiKey:
    process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY || "123456789012345",
  cloudinaryApiSecret:
    process.env.EXPO_PUBLIC_CLOUDINARY_API_SECRET || "nty7OZxHxMesvVXCJcsv3K8cJlk",

  // Paystack (Payment Gateway & Dedicated NUBAN Accounts)
  paystackPublicKey:
    process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY || "pk_test_d3a84fa0c5ef9df770141fbe1472314541300998",

  // Backend API URL (Dynamically routes to host Mac on Wi-Fi or Render)
  backendUrl: getDevBackendUrl(),

  // Validation helpers
  isSupabaseConfigured: () => {
    return (
      Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL) &&
      process.env.EXPO_PUBLIC_SUPABASE_URL !== "https://your-project.supabase.co"
    );
  },
  isResendConfigured: () => {
    return Boolean(process.env.EXPO_PUBLIC_RESEND_API_KEY);
  },
  isCloudinaryConfigured: () => {
    return (
      Boolean(process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME) &&
      process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME !== "demo"
    );
  },
  isPaystackConfigured: () => {
    return Boolean(process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY);
  },
};
