// ═══════════════════════════════════════════════════════════════
//  $WATT PROTOCOL — Waitlist Server
//  Stack: Node.js · Express · Nodemailer (SMTP) · Supabase (Postgres)
// ═══════════════════════════════════════════════════════════════

import 'dotenv/config';
import express from 'express';
import nodemailer from 'nodemailer';
import { nanoid } from 'nanoid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// ── Supabase (service role key — server-side only, never sent to browser) ──
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── CORS: allow Live Server (5500) and any localhost origin ────────────────
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());
app.use(express.static(__dirname));

// ── SMTP transporter ───────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ── Email builders ─────────────────────────────────────────────────────────
function buildHtmlEmail(referralCode, referralLink, dashboardUrl) {
  const tplPath = path.join(__dirname, 'watt-waitlist-email.html');
  const siteUrl = process.env.SITE_URL || 'https://wattprotocol.io';
  return fs.readFileSync(tplPath, 'utf8')
    .replaceAll('{{REFERRAL_CODE}}',   referralCode)
    .replaceAll('{{REFERRAL_LINK}}',   referralLink)
    .replaceAll('{{DASHBOARD_URL}}',   dashboardUrl)
    .replaceAll('{{UNSUBSCRIBE_URL}}', `${siteUrl}/unsubscribe`);
}

function buildPlainText(referralLink, dashboardUrl) {
  const siteUrl = process.env.SITE_URL || 'https://wattprotocol.io';
  return `
⚡ YOU'RE IN — $WATT PROTOCOL
wattprotocol.io

Welcome to the global clean energy revolution.

YOUR DASHBOARD
${dashboardUrl}
Bookmark this link — it's your personal dashboard.

THE CORE IDEA
Generate clean energy → WATT Meter logs it on-chain → Earn $WATT tokens
1 KWh = 1 $WATT. Automatically. No middleman. Every country on Earth.

YOUR FOUNDING MEMBER PERKS
• Priority hardware allocation — first to receive the WATT Smart Meter
• 1.5× earning multiplier for your first 90 days after launch
• 500 $WATT for every friend you refer who installs a meter
• Founding Member NFT badge — permanently on-chain

YOUR REFERRAL LINK
${referralLink}
Share it. Every friend who joins earns you 500 $WATT at launch.

WHAT'S COMING
Month 3–4:   Prototype ships — first energy data on-chain
Month 5–6:   Africa Pilot — Nigeria & Ghana go live
Month 12–18: Global mainnet launch, Uniswap listing
Year 2–3:    1M+ active meters worldwide

FOLLOW THE BUILD
Twitter:  https://twitter.com/WATTProtocol
Telegram: https://t.me/wattprotocol
Website:  https://wattprotocol.io

⚡ Born in Africa. Powered by the Sun. Built for Everyone.

────────────────────────────────
$WATT is a utility token. This is not financial advice.
Unsubscribe: ${siteUrl}/unsubscribe
`.trim();
}

function buildMagicLinkHtml(dashboardUrl) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>⚡ Your $WATT Dashboard — $WATT Protocol</title></head>
<body style="margin:0;padding:0;background:#080808;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#fff;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
  <tr><td>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="width:4px;background:#f5e642;">&nbsp;</td>
        <td style="background:#0f0f0f;padding:14px 24px;">
          <span style="font-family:'Courier New',monospace;font-size:11px;font-weight:700;color:#f5e642;letter-spacing:0.18em;">$WATT PROTOCOL</span>
        </td>
      </tr>
    </table>
  </td></tr>
  <tr><td>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="width:4px;background:#f5e642;">&nbsp;</td>
        <td style="background:#0e0e00;padding:48px 40px 40px;">
          <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.35em;color:#f5e642;text-transform:uppercase;margin:0 0 14px;">DASHBOARD ACCESS</p>
          <h1 style="font-size:34px;font-weight:700;line-height:1.1;margin:0 0 16px;color:#fff;">Your $WATT<br><span style="color:#f5e642;">Dashboard Link</span></h1>
          <p style="font-size:14px;color:#999;line-height:1.75;margin:0 0 32px;">Click the button below to access your personal waitlist dashboard — your position, referrals, and earned $WATT.</p>
          <a href="${dashboardUrl}" style="display:inline-block;background:#f5e642;color:#080808;font-family:'Courier New',monospace;font-size:12px;font-weight:700;letter-spacing:0.12em;padding:16px 32px;text-decoration:none;text-transform:uppercase;">ACCESS MY DASHBOARD →</a>
          <p style="font-size:11px;color:#333;margin-top:24px;word-break:break-all;">Or copy: <span style="color:#555;">${dashboardUrl}</span></p>
        </td>
      </tr>
    </table>
  </td></tr>
  <tr><td>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="width:4px;background:#f5e642;">&nbsp;</td>
        <td style="background:#080808;padding:20px 40px;">
          <p style="font-size:10px;color:#2a2a2a;line-height:1.75;margin:0;">
            $WATT is a utility token. This is not financial advice.<br>
            <a href="https://wattprotocol.io" style="color:#3a3a3a;">wattprotocol.io</a>
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

// ── GET /ref/:code — referral link redirect ────────────────────────────────
// When someone clicks wattprotocol.io/ref/X7K2PQ4M this fires.
// Sets a cookie and redirects to the home page with ?ref= so the form picks it up.
app.get('/ref/:code', (req, res) => {
  const code = (req.params.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!code) return res.redirect('/');

  // Set cookie for 7 days
  res.setHeader('Set-Cookie', `watt_ref=${code}; Path=/; Max-Age=604800; SameSite=Lax`);
  console.log(`[WATT] Referral visit: code=${code}`);

  // Redirect to home with ?ref= so the waitlist form auto-fills the code
  res.redirect(`/?ref=${code}`);
});

// ── POST /api/waitlist ─────────────────────────────────────────────────────
app.post('/api/waitlist', async (req, res) => {
  const { email, referredBy } = req.body || {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check duplicate
  const { data: existing } = await supabase
    .from('waitlist_users')
    .select('referral_code')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (existing) {
    return res.status(409).json({ error: 'This email is already on the waitlist.' });
  }

  // Count existing users to assign founding member status
  const { count } = await supabase
    .from('waitlist_users')
    .select('*', { count: 'exact', head: true });

  const siteUrl       = process.env.SITE_URL || 'https://wattprotocol.io';
  const referralCode  = nanoid(8).toUpperCase();
  const referralLink  = `${siteUrl}/ref/${referralCode}`;
  const dashboardUrl  = `${siteUrl}/dashboard.html?ref=${referralCode}`;
  const foundingMember = (count || 0) < 1000;

  // Sanitize referral code BEFORE insert so referred_by is stored consistently uppercase
  const cleanRef = (referredBy || '').toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
  console.log(`[WATT] referredBy received: "${cleanRef || 'none'}"`);

  // Insert user
  const { error: insertError } = await supabase
    .from('waitlist_users')
    .insert([{
      email:           normalizedEmail,
      referral_code:   referralCode,
      referral_link:   referralLink,
      referred_by:     cleanRef || null,
      founding_member: foundingMember,
    }]);

  if (insertError) {
    console.error('[WATT] Supabase insert error:', insertError.message);
    return res.status(500).json({ error: 'Could not save your signup. Please try again.' });
  }

  // Increment referrer count (cache field — live count is used for display)

  if (cleanRef) {
    // Use raw SQL increment to avoid race conditions
    const { data: referrer, error: refErr } = await supabase
      .from('waitlist_users')
      .select('id, email, referrals_count')
      .eq('referral_code', cleanRef)
      .maybeSingle();

    if (refErr) {
      console.error('[WATT] Referrer lookup error:', refErr.message);
    } else if (!referrer) {
      console.warn(`[WATT] Referral code "${cleanRef}" not found in DB — no credit given`);
    } else {
      const newCount = (referrer.referrals_count || 0) + 1;
      const { error: updateErr } = await supabase
        .from('waitlist_users')
        .update({ referrals_count: newCount })
        .eq('id', referrer.id);

      if (updateErr) {
        console.error('[WATT] Referral count update error:', updateErr.message);
      } else {
        console.log(`[WATT] ✓ Referral credited: ${referrer.email} now has ${newCount} referral(s)`);
      }
    }
  }

  // Load PDF
  const pdfPath = path.join(__dirname, 'watt-protocol-whitepaper.pdf');
  let pdfContent;
  try { pdfContent = fs.readFileSync(pdfPath).toString('base64'); }
  catch { console.warn('[WATT] Whitepaper PDF not found'); }

  const mailOptions = {
    from:    `"${process.env.FROM_NAME || '$WATT Protocol'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
    to:      normalizedEmail,
    subject: "⚡ You're in — $WATT Protocol. Energy to Earn.",
    html:    buildHtmlEmail(referralCode, referralLink, dashboardUrl),
    text:    buildPlainText(referralLink, dashboardUrl),
  };

  if (pdfContent) {
    mailOptions.attachments = [{
      filename:    'WATT-Protocol-Whitepaper-2025.pdf',
      content:     pdfContent,
      encoding:    'base64',
      contentType: 'application/pdf',
    }];
  }

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[WATT] ✓ Signup: ${normalizedEmail} | ref:${referralCode} | founding:${foundingMember}`);
  } catch (err) {
    console.error('[WATT] Email send error:', err.message);
  }

  return res.status(200).json({ success: true, referralCode, dashboardUrl });
});

// ── GET /api/me?ref=CODE — dashboard data ─────────────────────────────────
app.get('/api/me', async (req, res) => {
  const ref = (req.query.ref || '').toUpperCase().trim();
  if (!ref) return res.status(400).json({ error: 'Referral code required.' });

  const { data: user, error } = await supabase
    .from('waitlist_users')
    .select('email, referral_code, referral_link, referrals_count, founding_member, signed_up_at')
    .eq('referral_code', ref)
    .maybeSingle();

  if (error || !user) return res.status(404).json({ error: 'No account found for this code.' });

  // Waitlist position = how many signed up at or before this user
  const { count: position } = await supabase
    .from('waitlist_users')
    .select('*', { count: 'exact', head: true })
    .lte('signed_up_at', user.signed_up_at);

  // Total signups
  const { count: total } = await supabase
    .from('waitlist_users')
    .select('*', { count: 'exact', head: true });

  // Live referral count — case-insensitive to handle any legacy data
  const { count: referralsCount, error: countErr1 } = await supabase
    .from('waitlist_users')
    .select('*', { count: 'exact', head: true })
    .ilike('referred_by', user.referral_code);

  if (countErr1) console.error('[WATT] /api/me referral count error:', countErr1.message);
  console.log(`[WATT] /api/me referral count for code "${user.referral_code}": ${referralsCount}`);

  // Mask email: da***@gmail.com
  const [local, domain] = user.email.split('@');
  const maskedEmail = local.slice(0, 2) + '***@' + domain;

  return res.json({
    email:          maskedEmail,
    referralCode:   user.referral_code,
    referralLink:   user.referral_link,
    referralsCount: referralsCount || 0,
    foundingMember: user.founding_member,
    signedUpAt:     user.signed_up_at,
    position:       position || 1,
    total:          total    || 1,
    wattEarned:     (referralsCount || 0) * 500,
  });
});

// ── POST /api/lookup — find user by email and return dashboard data ────────
app.post('/api/lookup', async (req, res) => {
  const { email } = req.body || {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const { data: user } = await supabase
    .from('waitlist_users')
    .select('email, referral_code, referral_link, referrals_count, founding_member, signed_up_at')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  if (!user) {
    return res.status(404).json({ error: 'No account found for this email. Are you on the waitlist?' });
  }

  const { count: position } = await supabase
    .from('waitlist_users')
    .select('*', { count: 'exact', head: true })
    .lte('signed_up_at', user.signed_up_at);

  const { count: total } = await supabase
    .from('waitlist_users')
    .select('*', { count: 'exact', head: true });

  // Live referral count — case-insensitive to handle any legacy data
  const { count: referralsCount, error: countErr2 } = await supabase
    .from('waitlist_users')
    .select('*', { count: 'exact', head: true })
    .ilike('referred_by', user.referral_code);

  if (countErr2) console.error('[WATT] /api/lookup referral count error:', countErr2.message);
  console.log(`[WATT] /api/lookup referral count for code "${user.referral_code}": ${referralsCount}`);

  const [local, domain] = user.email.split('@');
  const maskedEmail = local.slice(0, 2) + '***@' + domain;

  return res.json({
    email:          maskedEmail,
    referralCode:   user.referral_code,
    referralLink:   user.referral_link,
    referralsCount: referralsCount || 0,
    foundingMember: user.founding_member,
    signedUpAt:     user.signed_up_at,
    position:       position || 1,
    total:          total    || 1,
    wattEarned:     (referralsCount || 0) * 500,
  });
});

// ── POST /api/send-dashboard-link — resend magic link to email ────────────
app.post('/api/send-dashboard-link', async (req, res) => {
  const { email } = req.body || {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required.' });
  }

  const { data: user } = await supabase
    .from('waitlist_users')
    .select('referral_code')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  // Always return success — don't reveal if email exists (prevent enumeration)
  if (user) {
    const siteUrl    = process.env.SITE_URL || 'https://wattprotocol.io';
    const dashboardUrl = `${siteUrl}/dashboard.html?ref=${user.referral_code}`;

    try {
      await transporter.sendMail({
        from:    `"${process.env.FROM_NAME || '$WATT Protocol'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
        to:      email,
        subject: '⚡ Your $WATT Dashboard Link',
        html:    buildMagicLinkHtml(dashboardUrl),
        text:    `Your $WATT dashboard: ${dashboardUrl}`,
      });
    } catch (err) {
      console.error('[WATT] Magic link email error:', err.message);
    }
  }

  return res.json({ success: true });
});

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[WATT] Server → http://localhost:${PORT}`);
  console.log(`[WATT] SMTP   → ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
  console.log(`[WATT] DB     → ${process.env.SUPABASE_URL || '⚠ SUPABASE_URL not set'}`);
});
