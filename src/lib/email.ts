import { Resend } from "resend";

type SendEmailArgs = {
  to: string[];
  subject: string;
  html: string;
  text: string;
};

export async function sendEmail({ to, subject, html, text }: SendEmailArgs) {
  const recipients = Array.from(
    new Set(to.map((email) => email.trim().toLowerCase()).filter(Boolean))
  );

  if (recipients.length === 0) {
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    console.info("[email skipped]", { to: recipients, subject, text });
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: process.env.APP_EMAIL_FROM ?? "Book Bob <onboarding@resend.dev>",
    to: recipients,
    subject,
    html,
    text
  });
}

export function buttonLink(url: string, label: string) {
  return `
    <a href="${url}" style="display:inline-block;background:#123d36;color:#ffffff;text-decoration:none;padding:12px 16px;border-radius:6px;font-weight:700;">
      ${label}
    </a>
  `;
}

export function emailShell(content: string) {
  return `
    <div style="font-family:Arial,sans-serif;color:#17201d;line-height:1.5;max-width:640px;margin:0 auto;padding:24px;">
      <h1 style="font-size:22px;margin:0 0 16px;">Book Bob</h1>
      ${content}
      <p style="color:#6b7280;font-size:13px;margin-top:28px;">Sent by your shared camper calendar.</p>
    </div>
  `;
}
