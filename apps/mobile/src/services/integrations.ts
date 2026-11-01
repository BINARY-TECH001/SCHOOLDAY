import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env";

/**
 * 1. SUPABASE CLIENT
 * Configured for persistent PostgreSQL storage, Row Level Security (RLS), and Realtime.
 */
let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return supabaseInstance;
}

/**
 * 2. RESEND EMAIL INTEGRATION
 * Dispatches enterprise branded transactional emails with the 6-digit security code.
 */
export interface SendOtpEmailParams {
  to: string;
  otpCode: string;
  recipientName?: string;
  isSignUp?: boolean;
}

export async function sendOtpEmail({
  to,
  otpCode,
  recipientName = "School Administrator",
  isSignUp = false,
}: SendOtpEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!env.isResendConfigured()) {
    console.info(
      `[Resend Notice] EXPO_PUBLIC_RESEND_API_KEY is not set yet. OTP for ${to} is: ${otpCode}`
    );
    return {
      success: true,
      messageId: "dev-simulated-msg-" + Date.now(),
    };
  }

  const subject = isSignUp
    ? `Your School Setup Verification Code: ${otpCode}`
    : `Your School Security Login Code: ${otpCode}`;

  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f8fa; margin: 0; padding: 40px 16px; }
          .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
          .header { background: #0F172A; padding: 32px 28px; text-align: center; }
          .logo { color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
          .badge { display: inline-block; background: #F97316; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; margin-top: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
          .content { padding: 36px 32px; color: #334155; line-height: 1.6; }
          .title { font-size: 20px; font-weight: 700; color: #0F172A; margin: 0 0 12px 0; }
          .code-box { background: #F8FAFC; border: 2px dashed #CBD5E1; border-radius: 12px; padding: 20px; text-align: center; margin: 28px 0; }
          .code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0F172A; font-family: monospace; }
          .note { font-size: 13px; color: #64748B; margin-top: 24px; border-top: 1px solid #F1F5F9; padding-top: 20px; }
          .footer { background: #F8FAFC; padding: 20px 32px; font-size: 12px; color: #94A3B8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="logo">SCHOOLDAY</h1>
            <span class="badge">Institutional Security</span>
          </div>
          <div class="content">
            <h2 class="title">Hello ${recipientName},</h2>
            <p>Use the 6-digit verification code below to ${
              isSignUp ? "verify your institutional email and provision your campus workspace" : "sign in to your school management portal"
            }:</p>
            <div class="code-box">
              <div class="code">${otpCode}</div>
            </div>
            <p style="font-size: 14px; color: #475569;">
              This code will expire in <strong>10 minutes</strong>. Never share this code with anyone. School personnel will never ask for your code.
            </p>
            <div class="note">
              If you did not request this email, please ignore it or alert your campus IT director.
            </div>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} SchoolDay Enterprise Campus Platform. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const makePayload = (target: string, isFallback = false) => ({
      from: `SchoolDay <${env.resendSenderEmail}>`,
      to: [target],
      subject: isFallback ? `[For ${to}] ${subject}` : subject,
      html: htmlBody,
    });

    let res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.resendApiKey}`,
      },
      body: JSON.stringify(makePayload(to)),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      // Resend unverified account restriction: can only send to registered email (padeespace@gmail.com)
      if (res.status === 403 && to.toLowerCase() !== "padeespace@gmail.com") {
        console.info(
          `[Resend Sandbox Fallback] Delivering code for ${to} to registered Resend account: padeespace@gmail.com`
        );
        res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.resendApiKey}`,
          },
          body: JSON.stringify(makePayload("padeespace@gmail.com", true)),
        });
      }

      if (!res.ok) {
        const finalErr = await res.json().catch(() => ({}));
        console.warn("[Resend Error]", finalErr);
        return { success: false, error: finalErr.message || "Failed to dispatch email" };
      }
    }

    const data = await res.json();
    return { success: true, messageId: data.id };
  } catch (err: any) {
    console.error("[Resend Network Exception]", err);
    return { success: false, error: err?.message || "Network exception during email dispatch" };
  }
}

export interface SendStaffInvitationParams {
  to: string;
  recipientName: string;
  schoolName: string;
  role: string;
  title: string;
  otpCode: string;
}

export async function sendStaffInvitationEmail({
  to,
  recipientName,
  schoolName,
  role,
  title,
  otpCode,
}: SendStaffInvitationParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!env.isResendConfigured()) {
    console.info(
      `[Resend Notice] Resend not configured. Staff invite for ${to} (${recipientName}) OTP: ${otpCode}`
    );
    return {
      success: true,
      messageId: "dev-simulated-invite-" + Date.now(),
    };
  }

  const subject = `Official Invitation: Join ${schoolName} · Access Code: ${otpCode}`;

  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f8fa; margin: 0; padding: 40px 16px; }
          .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
          .header { background: #0F172A; padding: 32px 28px; text-align: center; }
          .logo { color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
          .badge { display: inline-block; background: #4F46E5; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 999px; margin-top: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
          .content { padding: 36px 32px; color: #334155; line-height: 1.6; }
          .title { font-size: 20px; font-weight: 700; color: #0F172A; margin: 0 0 12px 0; }
          .highlight { background: #F1F5F9; border-left: 4px solid #4F46E5; padding: 12px 16px; border-radius: 6px; margin: 18px 0; font-size: 14px; }
          .code-box { background: #F8FAFC; border: 2px dashed #CBD5E1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
          .code { font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #0F172A; font-family: monospace; }
          .steps { margin: 20px 0; padding-left: 20px; font-size: 14px; color: #475569; }
          .steps li { margin-bottom: 8px; }
          .footer { background: #F8FAFC; padding: 20px 32px; font-size: 12px; color: #94A3B8; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="logo">SCHOOLDAY</h1>
            <span class="badge">Faculty & Staff Accreditation</span>
          </div>
          <div class="content">
            <h2 class="title">Welcome, ${recipientName}!</h2>
            <p>You have been officially invited and appointed to the faculty of <strong>${schoolName}</strong>.</p>
            
            <div class="highlight">
              <strong>Role:</strong> ${role.toUpperCase()} &nbsp;|&nbsp; <strong>Designation:</strong> ${title}
            </div>

            <p>Your one-time access security code to sign in to your staff portal is:</p>
            <div class="code-box">
              <div class="code">${otpCode}</div>
            </div>

            <h3 style="font-size: 15px; color: #0F172A; margin-top: 24px;">How to Log In:</h3>
            <ol class="steps">
              <li>Launch the <strong>SchoolDay</strong> mobile app or open the campus web portal.</li>
              <li>Select <strong>Sign In</strong> and enter your email: <strong>${to}</strong>.</li>
              <li>Type the 6-digit access code shown above: <strong>${otpCode}</strong>.</li>
              <li>Your staff workspace, classroom rosters, and attendance features will open immediately.</li>
            </ol>

            <p style="font-size: 13px; color: #64748B; margin-top: 24px;">
              This code remains active for 24 hours. For questions regarding your appointment, contact your School Proprietor or HR department.
            </p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} SchoolDay Campus Infrastructure. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const makePayload = (target: string, isFallback = false) => ({
      from: `SchoolDay <${env.resendSenderEmail}>`,
      to: [target],
      subject: isFallback ? `[For ${to}] ${subject}` : subject,
      html: htmlBody,
    });

    let res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.resendApiKey}`,
      },
      body: JSON.stringify(makePayload(to)),
    });

    if (!res.ok) {
      if (res.status === 403 && to.toLowerCase() !== "padeespace@gmail.com") {
        console.info(
          `[Resend Sandbox Fallback] Delivering staff invitation for ${to} to registered Resend account: padeespace@gmail.com`
        );
        res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.resendApiKey}`,
          },
          body: JSON.stringify(makePayload("padeespace@gmail.com", true)),
        });
      }

      if (!res.ok) {
        const finalErr = await res.json().catch(() => ({}));
        console.warn("[Resend Staff Invite Error]", finalErr);
        return { success: false, error: finalErr.message || "Failed to dispatch staff invitation email" };
      }
    }

    const data = await res.json();
    return { success: true, messageId: data.id };
  } catch (err: any) {
    console.error("[Resend Network Exception]", err);
    return { success: false, error: err?.message || "Network exception during email dispatch" };
  }
}

/**
 * 3. CLOUDINARY UPLOAD INTEGRATION
 * Direct upload of campus cover photos, avatars, and school seals to Cloudinary.
 */
export interface CloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
}

export async function uploadToCloudinary(
  localUri: string,
  options?: {
    uploadPreset?: string;
    folder?: string;
  }
): Promise<CloudinaryUploadResult> {
  const cloudName = env.cloudinaryCloudName;
  const uploadPreset = options?.uploadPreset || env.cloudinaryUploadPreset;
  const folder = options?.folder || "school_covers";

  // If Cloudinary isn't configured with a live account yet, return the local file URI gracefully
  if (!env.isCloudinaryConfigured()) {
    console.info(
      `[Cloudinary Notice] Cloudinary credentials not detected yet. Using local URI directly: ${localUri}`
    );
    return {
      secureUrl: localUri,
      publicId: "local-" + Date.now(),
    };
  }

  const apiUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const formData = new FormData();
  const fileType = localUri.endsWith(".png") ? "image/png" : "image/jpeg";

  // React Native FormData file structure
  formData.append("file", {
    uri: localUri,
    type: fileType,
    name: `upload_${Date.now()}.${fileType === "image/png" ? "png" : "jpg"}`,
  } as any);

  formData.append("upload_preset", uploadPreset);
  if (folder) {
    formData.append("folder", folder);
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    body: formData,
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(
      errorJson.error?.message || `Cloudinary upload failed with status ${response.status}`
    );
  }

  const result = await response.json();
  return {
    secureUrl: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
  };
}
