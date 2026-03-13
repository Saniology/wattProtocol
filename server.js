// ═══════════════════════════════════════════════════════════════
//  $WATT PROTOCOL — Waitlist Server
//  Stack: Node.js · Express · Nodemailer (SMTP) · Supabase (Postgres)
// ═══════════════════════════════════════════════════════════════

import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
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

// ── Dynamic config cache (60s TTL) ────────────────────────────────────────
let _configCache = null;
let _configTime  = 0;

async function getConfig() {
  if (_configCache && Date.now() - _configTime < 60_000) return _configCache;
  const { data } = await supabase.from('watt_config').select('key, value');
  if (data?.length) {
    _configCache = Object.fromEntries(data.map(r => [r.key, r.value]));
    _configTime  = Date.now();
  }
  return _configCache || {};
}

function invalidateConfig() { _configCache = null; }

// ── Admin auth middleware ──────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  const key = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  next();
}

// ── CORS: allow Live Server (5500) and any localhost origin ────────────────
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());

// ── Rate limiting ──────────────────────────────────────────────────────────
// Waitlist signup: max 5 attempts per IP per 15 minutes
const waitlistLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many signup attempts. Please try again in 15 minutes.' },
});

// Lookup / dashboard: max 20 per IP per 10 minutes
const lookupLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

// Admin login: max 10 attempts per IP per hour
const adminLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many admin attempts. Try again in an hour.' },
});

// Service worker must never be cached by the browser (so updates are detected immediately)
app.get('/sw.js', (_req, res) => {
  res.sendFile(path.join(__dirname, 'sw.js'), {
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Content-Type': 'application/javascript' },
  });
});

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

function buildVerificationEmail(verifyUrl) {
  const siteUrl = process.env.SITE_URL || 'https://wattprotocol.io';
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>⚡ Confirm your $WATT spot</title></head>
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
          <p style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.35em;color:#f5e642;text-transform:uppercase;margin:0 0 14px;">ONE STEP TO GO</p>
          <h1 style="font-size:28px;font-weight:700;line-height:1.2;margin:0 0 20px;">Confirm your<br><span style="color:#f5e642;">$WATT spot.</span></h1>
          <p style="font-size:15px;color:#888;line-height:1.8;margin:0 0 32px;">Click the button below to confirm your email and secure your place on the $WATT Protocol waitlist. This link expires in 24 hours.</p>
          <a href="${verifyUrl}" style="display:inline-block;background:#f5e642;color:#080808;font-family:'Courier New',monospace;font-size:12px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;padding:16px 36px;text-decoration:none;">⚡ CONFIRM MY SPOT →</a>
          <p style="font-size:12px;color:#444;line-height:1.7;margin:32px 0 0;">Or copy this URL into your browser:<br><span style="color:#f5e642;word-break:break-all;">${verifyUrl}</span></p>
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
            If you didn't sign up for $WATT Protocol, ignore this email.<br>
            <a href="${siteUrl}" style="color:#3a3a3a;">wattprotocol.io</a>
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
app.get('/ref/:code', (req, res) => {
  const code = (req.params.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!code) return res.redirect('/');
  res.setHeader('Set-Cookie', `watt_ref=${code}; Path=/; Max-Age=604800; SameSite=Lax`);
  console.log(`[WATT] Referral visit: code=${code}`);
  res.redirect(`/?ref=${code}`);
});

// ── POST /api/waitlist ─────────────────────────────────────────────────────
app.post('/api/waitlist', waitlistLimiter, async (req, res) => {
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

  // Load dynamic config
  const cfg = await getConfig();
  const foundingThreshold = parseInt(cfg.founding_member_threshold) || 1000;

  // Count existing users to assign founding member status
  const { count } = await supabase
    .from('waitlist_users')
    .select('*', { count: 'exact', head: true });

  const siteUrl        = process.env.SITE_URL || 'https://wattprotocol.io';
  const referralCode   = nanoid(8).toUpperCase();
  const referralLink   = `${siteUrl}/ref/${referralCode}`;
  const dashboardUrl   = `${siteUrl}/dashboard.html?ref=${referralCode}`;
  const foundingMember = (count || 0) < foundingThreshold;

  // Sanitize referral code BEFORE insert so referred_by is stored consistently uppercase
  const cleanRef = (referredBy || '').toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
  console.log(`[WATT] referredBy received: "${cleanRef || 'none'}"`);

  // Generate email verification token
  const verificationToken = nanoid(32);
  const verifyUrl = `${siteUrl}/verify-email?token=${verificationToken}`;

  // Insert user (unverified — awaiting email confirmation)
  const { error: insertError } = await supabase
    .from('waitlist_users')
    .insert([{
      email:              normalizedEmail,
      referral_code:      referralCode,
      referral_link:      referralLink,
      referred_by:        cleanRef || null,
      founding_member:    foundingMember,
      email_verified:     false,
      verification_token: verificationToken,
    }]);

  if (insertError) {
    console.error('[WATT] Supabase insert error:', insertError.message);
    return res.status(500).json({ error: 'Could not save your signup. Please try again.' });
  }

  // Increment referrer count (cache field — live count is used for display)
  if (cleanRef) {
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

  // Send verification email (welcome email is sent after they click the link)
  try {
    await transporter.sendMail({
      from:    `"${process.env.FROM_NAME || '$WATT Protocol'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to:      normalizedEmail,
      subject: '⚡ Confirm your $WATT spot — one click to go',
      html:    buildVerificationEmail(verifyUrl),
      text:    `Confirm your $WATT Protocol waitlist spot:\n\n${verifyUrl}\n\nThis link expires in 24 hours.`,
    });
    console.log(`[WATT] ✓ Verification email sent: ${normalizedEmail}`);
  } catch (err) {
    console.error('[WATT] Verification email send error:', err.message);
  }

  return res.status(200).json({ success: true, requiresVerification: true });
});

// ── GET /verify-email?token=xxx ────────────────────────────────────────────
app.get('/verify-email', async (req, res) => {
  const token   = (req.query.token || '').trim();
  const siteUrl = process.env.SITE_URL || 'https://wattprotocol.io';

  if (!token) return res.redirect('/?error=invalid-token');

  const { data: user, error } = await supabase
    .from('waitlist_users')
    .select('id, email, referral_code, referral_link, founding_member, email_verified')
    .eq('verification_token', token)
    .maybeSingle();

  if (error || !user) {
    return res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Invalid Link — $WATT</title><style>body{margin:0;background:#080808;color:#fff;font-family:'Inter',system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}.box{max-width:420px;text-align:center}h2{color:#ef4444;margin-bottom:12px}p{color:#888;font-size:14px;line-height:1.7}a{color:#f5e642}</style></head><body><div class="box"><h2>Invalid or Expired Link</h2><p>This verification link has already been used or has expired.<br><a href="${siteUrl}">← Back to $WATT Protocol</a></p></div></body></html>`);
  }

  // Already verified — just redirect to dashboard
  if (user.email_verified) {
    return res.redirect(`${siteUrl}/dashboard.html?ref=${user.referral_code}`);
  }

  // Mark verified and clear token
  await supabase
    .from('waitlist_users')
    .update({ email_verified: true, verification_token: null })
    .eq('id', user.id);

  const dashboardUrl = `${siteUrl}/dashboard.html?ref=${user.referral_code}`;
  const referralLink = user.referral_link;

  // Now send the full welcome email
  const pdfPath = path.join(__dirname, 'watt-protocol-whitepaper.pdf');
  let pdfContent;
  try { pdfContent = fs.readFileSync(pdfPath).toString('base64'); }
  catch { /* PDF not found — send without attachment */ }

  const mailOptions = {
    from:    `"${process.env.FROM_NAME || '$WATT Protocol'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
    to:      user.email,
    subject: "⚡ You're in — $WATT Protocol. Energy to Earn.",
    html:    buildHtmlEmail(user.referral_code, referralLink, dashboardUrl),
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
    console.log(`[WATT] ✓ Verified + welcome email sent: ${user.email} | ref:${user.referral_code}`);
  } catch (err) {
    console.error('[WATT] Welcome email error after verify:', err.message);
  }

  // Redirect to dashboard
  return res.redirect(dashboardUrl);
});

// ── GET /api/me?ref=CODE — dashboard data ─────────────────────────────────
app.get('/api/me', lookupLimiter, async (req, res) => {
  const ref = (req.query.ref || '').toUpperCase().trim();
  if (!ref) return res.status(400).json({ error: 'Referral code required.' });

  const { data: user, error } = await supabase
    .from('waitlist_users')
    .select('email, referral_code, referral_link, referrals_count, founding_member, signed_up_at')
    .eq('referral_code', ref)
    .maybeSingle();

  if (error || !user) return res.status(404).json({ error: 'No account found for this code.' });

  const [
    { count: position },
    { count: total },
    { count: referralsCount, error: countErr },
    cfg,
  ] = await Promise.all([
    supabase.from('waitlist_users').select('*', { count: 'exact', head: true }).lte('signed_up_at', user.signed_up_at),
    supabase.from('waitlist_users').select('*', { count: 'exact', head: true }),
    supabase.from('waitlist_users').select('*', { count: 'exact', head: true }).ilike('referred_by', user.referral_code),
    getConfig(),
  ]);

  if (countErr) console.error('[WATT] /api/me referral count error:', countErr.message);

  const referralReward    = parseInt(cfg.referral_reward_watt) || 500;
  const foundingMultiplier = parseFloat(cfg.founding_member_multiplier) || 1.5;
  const [local, domain]   = user.email.split('@');
  const maskedEmail        = local.slice(0, 2) + '***@' + domain;

  return res.json({
    email:            maskedEmail,
    referralCode:     user.referral_code,
    referralLink:     user.referral_link,
    referralsCount:   referralsCount || 0,
    foundingMember:   user.founding_member,
    signedUpAt:       user.signed_up_at,
    position:         position || 1,
    total:            total    || 1,
    referralReward,
    multiplier:       user.founding_member ? foundingMultiplier : 1,
    wattEarned:       (referralsCount || 0) * referralReward,
  });
});

// ── POST /api/lookup — find user by email ─────────────────────────────────
app.post('/api/lookup', adminLimiter, lookupLimiter, async (req, res) => {
  const { email } = req.body || {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Admin shortcut — return admin token, skip user data
  const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  if (adminEmail && normalizedEmail === adminEmail && process.env.ADMIN_KEY) {
    console.log(`[WATT] Admin login: ${normalizedEmail}`);
    return res.json({ isAdmin: true, adminKey: process.env.ADMIN_KEY });
  }

  const { data: user } = await supabase
    .from('waitlist_users')
    .select('email, referral_code, referral_link, referrals_count, founding_member, signed_up_at')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (!user) {
    return res.status(404).json({ error: 'No account found for this email. Are you on the waitlist?' });
  }

  const [
    { count: position },
    { count: total },
    { count: referralsCount, error: countErr },
    cfg,
  ] = await Promise.all([
    supabase.from('waitlist_users').select('*', { count: 'exact', head: true }).lte('signed_up_at', user.signed_up_at),
    supabase.from('waitlist_users').select('*', { count: 'exact', head: true }),
    supabase.from('waitlist_users').select('*', { count: 'exact', head: true }).ilike('referred_by', user.referral_code),
    getConfig(),
  ]);

  if (countErr) console.error('[WATT] /api/lookup referral count error:', countErr.message);

  const referralReward     = parseInt(cfg.referral_reward_watt) || 500;
  const foundingMultiplier = parseFloat(cfg.founding_member_multiplier) || 1.5;
  const [local, domain]    = user.email.split('@');
  const maskedEmail         = local.slice(0, 2) + '***@' + domain;

  return res.json({
    email:            maskedEmail,
    referralCode:     user.referral_code,
    referralLink:     user.referral_link,
    referralsCount:   referralsCount || 0,
    foundingMember:   user.founding_member,
    signedUpAt:       user.signed_up_at,
    position:         position || 1,
    total:            total    || 1,
    referralReward,
    multiplier:       user.founding_member ? foundingMultiplier : 1,
    wattEarned:       (referralsCount || 0) * referralReward,
  });
});

// ── GET /api/leaderboard — top 10 referrers (emails masked) ───────────────
app.get('/api/leaderboard', async (req, res) => {
  // Count live referrals per referral_code by querying referred_by column
  const { data, error } = await supabase
    .from('waitlist_users')
    .select('referral_code, referred_by, founding_member')
    .not('referred_by', 'is', null);

  if (error) return res.status(500).json({ error: error.message });

  // Build counts map
  const counts = {};
  (data || []).forEach(row => {
    const code = (row.referred_by || '').toUpperCase();
    if (code) counts[code] = (counts[code] || 0) + 1;
  });

  // Get top 10 codes
  const topCodes = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([code, count]) => ({ code, count }));

  if (!topCodes.length) return res.json({ leaders: [] });

  // Look up emails for these codes (masked for privacy)
  const { data: users } = await supabase
    .from('waitlist_users')
    .select('referral_code, email, founding_member')
    .in('referral_code', topCodes.map(t => t.code));

  const userMap = {};
  (users || []).forEach(u => { userMap[u.referral_code] = u; });

  const cfg = await getConfig();
  const referralReward = parseInt(cfg.referral_reward_watt) || 500;

  const leaders = topCodes.map((t, i) => {
    const u = userMap[t.code] || {};
    const [local = '', domain = ''] = (u.email || '').split('@');
    const masked = local.length > 2
      ? local.slice(0, 2) + '***@' + domain
      : '***@' + domain;
    return {
      rank:          i + 1,
      maskedEmail:   masked,
      referralCode:  t.code,
      referrals:     t.count,
      wattEarned:    t.count * referralReward,
      foundingMember: u.founding_member || false,
    };
  });

  return res.json({ leaders });
});

// ── GET /api/stats — public, no auth required ─────────────────────────────
app.get('/api/stats', async (req, res) => {
  const [{ count: total }, cfg] = await Promise.all([
    supabase.from('waitlist_users').select('*', { count: 'exact', head: true }),
    getConfig(),
  ]);
  return res.json({
    total:     total || 0,
    threshold: parseInt(cfg.founding_member_threshold) || 1000,
  });
});

// ── GET /unsubscribe?email=... — one-click unsubscribe from emails ─────────
app.get('/unsubscribe', async (req, res) => {
  const email = (req.query.email || '').toLowerCase().trim();
  const siteUrl = process.env.SITE_URL || 'https://wattprotocol.io';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe — $WATT Protocol</title><style>body{margin:0;background:#080808;color:#fff;font-family:'Inter',system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}div{max-width:420px;text-align:center}h2{color:#ef4444;margin-bottom:12px}p{color:#888;font-size:14px;line-height:1.7}a{color:#f5e642}</style></head><body><div><h2>Invalid Link</h2><p>This unsubscribe link is invalid or expired.<br>Email us at <a href="mailto:hello@wattprotocol.io">hello@wattprotocol.io</a> to opt out.</p><p style="margin-top:24px"><a href="${siteUrl}">← Back to $WATT Protocol</a></p></div></body></html>`);
  }

  // Mark the user as unsubscribed (we store it in a watt_config key or just log it)
  // For simplicity: remove from waitlist OR flag in DB. Here we just flag with a note.
  // The most respectful action is to note the unsubscribe without deleting their spot.
  try {
    await supabase
      .from('waitlist_users')
      .update({ unsubscribed: true })
      .eq('email', email);
  } catch {}

  console.log(`[WATT] Unsubscribe: ${email}`);

  return res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed — $WATT Protocol</title><style>body{margin:0;background:#080808;color:#fff;font-family:'Inter',system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}div{max-width:420px;text-align:center}.icon{font-size:48px;margin-bottom:16px}h2{color:#f5e642;font-family:'Courier New',monospace;letter-spacing:0.05em;margin-bottom:12px}p{color:#888;font-size:14px;line-height:1.7}a{color:#f5e642;text-decoration:none}a:hover{text-decoration:underline}</style></head><body><div><div class="icon">✓</div><h2>You've been unsubscribed.</h2><p>We've removed <strong style="color:#fff">${email}</strong> from our mailing list. You won't receive any more emails from $WATT Protocol.</p><p style="margin-top:8px;font-size:12px;color:#555">Your waitlist spot is preserved. You can still access your dashboard anytime.</p><p style="margin-top:24px"><a href="${siteUrl}">← Back to $WATT Protocol</a></p></div></body></html>`);
});

// ── GET /api/announcement — public, no auth required ──────────────────────
app.get('/api/announcement', async (req, res) => {
  const cfg = await getConfig();
  return res.json({ announcement: cfg.announcement || '' });
});

// ── GET /api/roadmap — public, no auth required ────────────────────────────
app.get('/api/roadmap', async (req, res) => {
  const cfg = await getConfig();
  let stages = [];
  try { stages = JSON.parse(cfg.roadmap || '[]'); } catch {}
  return res.json({ stages });
});

// ── POST /api/send-dashboard-link ─────────────────────────────────────────
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

  if (user) {
    const siteUrl      = process.env.SITE_URL || 'https://wattprotocol.io';
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

// ── POST /api/pageview — lightweight privacy-first page analytics ──────────
app.post('/api/pageview', async (req, res) => {
  const page = (req.body?.page || '').slice(0, 120).replace(/[^a-zA-Z0-9/_.-]/g, '');
  if (!page) return res.sendStatus(204);

  // Upsert: increment views for this page
  try {
    const { error } = await supabase.rpc('increment_page_view', { p_page: page });
    if (error) {
      // Fallback if RPC not created yet — direct upsert (less atomic but safe)
      await supabase.from('page_views')
        .upsert({ page, views: 1, updated_at: new Date().toISOString() }, { onConflict: 'page' });
    }
  } catch { /* ignore analytics errors — never crash the server */ }

  return res.sendStatus(204);
});

// ── GET /api/admin/pageviews — top pages by views ─────────────────────────
app.get('/api/admin/pageviews', requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('page_views')
    .select('page, views, updated_at')
    .order('views', { ascending: false })
    .limit(20);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ pages: data || [] });
});

// ═══════════════════════════════════════════════════════════════
//  ADMIN ROUTES — all protected by requireAdmin middleware
// ═══════════════════════════════════════════════════════════════

// GET /api/admin/chart — daily signups for the last N days
app.get('/api/admin/chart', requireAdmin, async (req, res) => {
  const days = Math.min(90, parseInt(req.query.days) || 30);
  const from = new Date();
  from.setDate(from.getDate() - days + 1);
  from.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('waitlist_users')
    .select('signed_up_at')
    .gte('signed_up_at', from.toISOString())
    .order('signed_up_at');

  if (error) return res.status(500).json({ error: error.message });

  // Build date → count map
  const counts = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    counts[d.toISOString().slice(0, 10)] = 0;
  }
  (data || []).forEach(r => {
    const day = r.signed_up_at.slice(0, 10);
    if (counts[day] !== undefined) counts[day]++;
  });

  return res.json({ labels: Object.keys(counts), values: Object.values(counts) });
});

// GET /api/admin/stats — overview dashboard
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const [
    { count: total },
    { count: founding },
    { count: todayCount },
    { data: topReferrers },
    { data: recent },
    { data: refRows },
    cfg,
  ] = await Promise.all([
    supabase.from('waitlist_users').select('*', { count: 'exact', head: true }),
    supabase.from('waitlist_users').select('*', { count: 'exact', head: true }).eq('founding_member', true),
    supabase.from('waitlist_users').select('*', { count: 'exact', head: true }).gte('signed_up_at', today.toISOString()),
    supabase.from('waitlist_users').select('email, referral_code, referrals_count').order('referrals_count', { ascending: false }).limit(5),
    supabase.from('waitlist_users').select('email, referral_code, founding_member, signed_up_at, referred_by').order('signed_up_at', { ascending: false }).limit(10),
    supabase.from('waitlist_users').select('referrals_count'),
    getConfig(),
  ]);

  const totalReferrals = (refRows || []).reduce((s, r) => s + (r.referrals_count || 0), 0);

  return res.json({ total, founding, todayCount, totalReferrals, topReferrers, recent, config: cfg });
});

// GET /api/admin/users?page=1&search=&limit=20
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page) || 1);
  const limit  = Math.min(100, parseInt(req.query.limit) || 25);
  const search = (req.query.search || '').trim();
  const from   = (page - 1) * limit;

  let q = supabase
    .from('waitlist_users')
    .select('id, email, referral_code, referrals_count, founding_member, signed_up_at, referred_by', { count: 'exact' })
    .order('signed_up_at', { ascending: false })
    .range(from, from + limit - 1);

  if (search) q = q.ilike('email', `%${search}%`);

  const { data, count, error } = await q;
  if (error) return res.status(500).json({ error: error.message });

  return res.json({ users: data || [], total: count || 0, page, pages: Math.ceil((count || 0) / limit) });
});

// PATCH /api/admin/users/:id — update founding_member status
app.patch('/api/admin/users/:id', requireAdmin, async (req, res) => {
  const allowed = ['founding_member', 'status'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  const { error } = await supabase.from('waitlist_users').update(updates).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true });
});

// DELETE /api/admin/users/:id
app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  const { error } = await supabase.from('waitlist_users').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true });
});

// GET /api/admin/config
app.get('/api/admin/config', requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('watt_config').select('key, value').order('key');
  if (error) return res.status(500).json({ error: error.message });
  return res.json(Object.fromEntries((data || []).map(r => [r.key, r.value])));
});

// PUT /api/admin/config — upsert one or many config values
app.put('/api/admin/config', requireAdmin, async (req, res) => {
  const rows = Object.entries(req.body).map(([key, value]) => ({
    key,
    value:      String(value),
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from('watt_config').upsert(rows, { onConflict: 'key' });
  if (error) return res.status(500).json({ error: error.message });
  invalidateConfig();
  return res.json({ success: true });
});

// POST /api/admin/resend-email/:id — resend welcome email to a user
app.post('/api/admin/resend-email/:id', requireAdmin, async (req, res) => {
  const { data: user } = await supabase
    .from('waitlist_users')
    .select('email, referral_code, referral_link')
    .eq('id', req.params.id)
    .maybeSingle();

  if (!user) return res.status(404).json({ error: 'User not found.' });

  const siteUrl      = process.env.SITE_URL || 'https://wattprotocol.io';
  const dashboardUrl = `${siteUrl}/dashboard.html?ref=${user.referral_code}`;

  try {
    await transporter.sendMail({
      from:    `"${process.env.FROM_NAME || '$WATT Protocol'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to:      user.email,
      subject: '⚡ Your $WATT Dashboard Link',
      html:    buildMagicLinkHtml(dashboardUrl),
      text:    `Your $WATT dashboard: ${dashboardUrl}`,
    });
    console.log(`[WATT] Admin resent dashboard email to ${user.email}`);
    return res.json({ success: true });
  } catch (err) {
    console.error('[WATT] Admin resend email error:', err.message);
    return res.status(500).json({ error: 'Email send failed: ' + err.message });
  }
});

// GET /api/admin/export — download all users as CSV
app.get('/api/admin/export', requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('waitlist_users')
    .select('email, referral_code, referrals_count, founding_member, signed_up_at, referred_by')
    .order('signed_up_at');
  if (error) return res.status(500).json({ error: error.message });

  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [
    'Email,Referral Code,Referrals,Founding Member,Signed Up,Referred By',
    ...(data || []).map(u =>
      [q(u.email), q(u.referral_code), u.referrals_count || 0, u.founding_member, q(u.signed_up_at), q(u.referred_by || '')].join(',')
    ),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="watt-waitlist-${new Date().toISOString().slice(0,10)}.csv"`);
  return res.send(csv);
});

// ── /og-image.png — serve SVG OG image (Discord/Slack/Twitter parse SVG fine) ──
app.get('/og-image.png', (_req, res) => {
  res.sendFile(path.join(__dirname, 'og-image.svg'), {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' },
  });
});

// ── /favicon.ico — serve the SVG favicon (stops browser 404 noise) ────────
app.get('/favicon.ico', (_req, res) => {
  res.sendFile(path.join(__dirname, 'favicon.svg'), {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' },
  });
});

// ── 404 fallback — serve custom 404 page for unmatched routes ─────────────
app.use((_req, res) => {
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[WATT] Server  → http://localhost:${PORT}`);
  console.log(`[WATT] SMTP    → ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
  console.log(`[WATT] DB      → ${process.env.SUPABASE_URL || '⚠ SUPABASE_URL not set'}`);
  console.log(`[WATT] Admin   → ${process.env.ADMIN_EMAIL  || '⚠ ADMIN_EMAIL not set'}`);
});
