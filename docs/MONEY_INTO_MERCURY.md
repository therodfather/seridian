# How money lands in Mercury

Operator runbook for Seridian (two owners). Locked stack: **Stripe collects → Mercury checking holds USD → Ramp spends → Gusto payroll later**.

Mercury is the LLC bank account. “Client paid” is not “in Mercury.” Read this before traveling.

This is operations, not tax or legal advice. Do not commit routing numbers, account numbers, EINs, or Stripe live URLs to git.

## Five-step checklist

1. **Finish US KYC** — US entity + EIN proof + both owners’ IDs. Open Stripe live and apply to Mercury from the US (no VPN).
2. **Point Stripe payouts at Mercury** — paste Mercury routing + account into Stripe [Payout settings](https://dashboard.stripe.com/settings/payouts). Automatic daily payouts.
3. **Collect** — live Payment Links for the $999 Health Check and sprint deposits. Clients who will not card: send the Mercury wire/ACH PDF.
4. **Do not wait on Instant Payouts or Stripe ACH** — first Stripe payout is typically **7–14 days**. Same-day/next-day cash is a **direct wire into Mercury**.
5. **Verify** — $1 **live** charge → see it in Stripe → wait for the payout → see the deposit in Mercury. Then leave.

Ramp and Gusto pull **from** Mercury. They do not put client money in.

---

## 1. Prerequisites

You need all of these before money can settle in Mercury. Do not invent or paste the EIN in this repo.

| Requirement | Why |
|-------------|-----|
| US-registered entity (LLC or corp) | Mercury only opens for companies formed in the US or a US territory. |
| EIN proof | Mercury wants IRS-issued CP-575, 147C, or the **returned** SS-4 (not the blank application). Stripe needs the EIN on the account. |
| Mercury account **approved** | Application is often 1–3 business days. You can send Stripe Payment Links while Mercury is pending; payouts cannot land until the checking account exists and is connected. |
| Stripe account **live** (not test mode) | Test charges never start the first-payout clock. |
| Government photo ID for each 25%+ owner **and** the control person | Both owners if each is ≥25%. US DL/passport, or foreign passport for non-US citizens. |
| Physical street address | Residential is OK. Registered-agent, PO box, and UPS Store addresses are not. |
| One-line US operations + source of funds | Mercury asks on the application. |

One admin creates Stripe and Mercury so you do not double-apply. Both owners upload IDs. The control person becomes Mercury admin.

Mercury is a fintech, not an FDIC-insured bank. Deposits are held at partner banks (Choice Financial Group and Column N.A., Members FDIC).

---

## 2. Connect Stripe payouts to Mercury

This is the default path for card payments. It is **not** same-day.

### Add Mercury as the USD payout destination

1. In Mercury, open the checking account you want payouts in. Copy the **routing number** (9-digit ABA) and **account number**. (Same numbers as on the wire/ACH PDF in §4.)
2. In Stripe, go to [Payout settings](https://dashboard.stripe.com/settings/payouts) (Settings → Payouts / Bank accounts and currencies).
3. **Add bank account**. Country US, currency USD. Paste routing + account. Account holder name must match the LLC legal name on Stripe.
4. Set this account as the default for USD. Leave **automatic daily** payouts on unless you have a reason not to.
5. Confirm the destination on [Balances](https://dashboard.stripe.com/balance/overview) / [Payouts](https://dashboard.stripe.com/payouts). Expected deposit dates show there.

Stripe may verify a new bank with micro-deposits (1–2 business days) or instantly. Payouts go to the previous destination until the new one is verified and default.

### Clocks (US, as of Aug 2026)

| Clock | What it means |
|-------|----------------|
| **First live payout** | Stripe typically schedules it **7–14 days after the first successful live payment**. Industry risk can make it longer. This is one-time. |
| **Later payouts** | US default settlement is **T+2 business days**, then the bank posts. Automatic daily is the usual schedule. Weekends and holidays slip to the next business day. |
| **Instant Payouts** | **Not day-one.** New Stripe users are not immediately eligible. Stripe’s explainer cites ~60 days of processing before Instant Payouts is typically offered. US fee is **1.5%** (min $0.50, max $9,999 per payout, 10/day). Do not plan travel cash around this. |
| **Standard payout fee** | Included in processing. No extra Stripe fee to ACH into Mercury. |

**“Client paid” ≠ “in Mercury.”** A succeeded Payment Link means you may deliver. Until the payout posts in Mercury checking, the money is still at Stripe (pending, then available). You cannot fund Ramp, run Gusto, or take owner draws from Stripe balance.

You can invoice before Mercury is approved. Connect the bank **before** the first payout is scheduled to fire, or the payout fails / sits until a destination exists.

---

## 3. Payment Links ($999 Health Check + sprint deposits)

Payment Links live in the Stripe Dashboard, not in this repo. Create them in **live** mode.

1. Stripe Dashboard → [Payment Links](https://dashboard.stripe.com/payment-links) → **+ New**.
2. **Cloud Health Check** — one-time **$999 USD**.
3. **Sprint deposit** — either a “customer chooses amount” link titled “50% sprint deposit,” or fixed links (Feature sprint ~$1,250 / MVP ~$1,750+).
4. Copy the `https://buy.stripe.com/...` URLs. Send them in email/iMessage **tonight**. Do not wait for the website button.

US domestic cards: **2.9% + 30¢** ([stripe.com/pricing](https://stripe.com/pricing)). On $999 that is about **$29.27** fee, **$969.73** net to Stripe balance — still not in Mercury until payout.

### Website button (after the pay-first CTA merges)

PR **#75** (`feat/pay-first-health-check`) wires the marketing CTA to `NEXT_PUBLIC_HEALTH_CHECK_PAY_URL`. Until that merges, text clients the `buy.stripe.com` URL.

After merge, on the canonical Netlify site **[seridian](https://app.netlify.com/projects/seridian)** (prod: [https://seridian.netlify.app](https://seridian.netlify.app)):

```bash
bunx netlify env:set NEXT_PUBLIC_HEALTH_CHECK_PAY_URL "https://buy.stripe.com/YOUR_LIVE_LINK"
```

Set at least **production**. Optionally the same value for **deploy-preview**. Then **trigger a new production deploy** — `NEXT_PUBLIC_*` is inlined at Next.js build time. Saving the env without rebuilding leaves the old (or empty) URL in the client bundle.

Do not commit the live Payment Link. Do not use a test-mode link on production.

---

## 4. Direct wire / ACH into Mercury

Use this when a client will not pay by card, or when you need cash in the LLC **this week** (Stripe’s first payout will not help).

Mercury incoming (business days only, except RTP):

| Rail | Typical arrival | Use when |
|------|-----------------|----------|
| **Domestic wire** | Same business day if sent before the sending bank’s cutoff; otherwise next business day. Same-day, not instant. | Fastest client path into Mercury. |
| **Incoming ACH credit** | **0–2 business days**, usually posts ~9–11am PT Mon–Fri. | Clients who ACH-pay vendors. Still faster than Stripe’s first payout. |
| **International wire** | Up to **4 business days** if instructions are complete. | Non-US senders. They must follow the PDF exactly. |
| **RTP** (if your account is at Column N.A.) | Seconds to ~30 minutes, 24/7. | Only if the sender’s bank supports RTP. |

### Export the one-page instructions PDF

Do this once Mercury is open. Share the PDF; do not paste numbers into Slack/git.

**Web**

1. Dashboard → **Accounts** → the checking account.
2. **Documents** → **Wire Details** → confirm account → **Download**.

Or: **Move Money** → **Deposit** → receiving account → **View More Details** → copy, download PDF, or **Share** by email.

**Mobile:** Accounts tab → account → **Wire Details** → save the PDF.

The PDF typically has:

- Page 1: domestic wires, ACH, and real-time payments
- Page 2: international wires (MT103 fields)

Tell the sender to include a remittance / invoice reference so you can match the deposit.

Direct ACH/wire into Mercury **skips Stripe**. No card fee, no 7–14 day first-payout hold. That is why it is the 24-hour (or next-business-day) rail, not Stripe ACH.

---

## 5. What not to use as a 24-hour rail

| Don’t | Why | Do instead |
|-------|-----|------------|
| **Stripe ACH Direct Debit** | Confirmation can take **up to 4 business days** (T+4). Eligible US accounts can enable T+2 — still not same-day. Bank debits on Payment Links can take **2–14 days** to confirm. | Cards on Payment Links, or a **direct** ACH/wire to Mercury. |
| **Stripe Instant Payouts** | New accounts are not eligible. ~60 days of processing is typical before Stripe offers it. 1.5% US fee. ACH/bank-debit funds are only instant-payout-able after they fully settle. | Wait for the standard payout, or take a client wire into Mercury. |
| **Test-mode charges** | Never hit a real bank. Do not start the first-payout clock. | Live mode, real card. |
| **PayPal.me / personal checking / personal cards as the system of record** | Mixes LLC money with personal. | LLC money in Mercury. Personal cards only as a documented emergency, reimbursed once. |

Stripe ACH is fine later for large invoices once the client is used to it. It is not “pay us today.”

---

## 6. Ramp and Gusto pull from Mercury

They do **not** collect from clients.

```
Client ──card──► Stripe ──ACH payout (7–14d first)──► Mercury checking
Client ──wire/ACH────────────────────────────────────► Mercury checking
                                                         │
                                                         ├──► Ramp (cards, bill pay)
                                                         ├──► Gusto (payroll debit)  [later]
                                                         └──► Owner draws
```

**Ramp** — apply after Mercury exists. Connect Mercury as the bank. Ramp underwrites (often ~$25k cash in the connected US account, or sales-based underwriting via Stripe). Issue virtual cards only after approval. Bill pay and card repayment debit Mercury.

**Gusto** — US checking required. Gusto **debits Mercury** for wages, taxes, and its fee. Do **not** set up Gusto before the first dollar unless a CPA says S-corp W-2 / reasonable compensation must start now. Two-member partnership default is owner **draws** from Mercury, not 1099-ing yourselves. Core Gusto payroll is US employees + US bank + US entity.

**Wise** is an optional later FX/spend pocket funded **from Mercury**. It is not the bank, not the payout destination, and not this runbook. Do not point Stripe payouts at Wise.

---

## 7. Travel — finish this before you fly

This stack lets a US LLC operate remotely. It does not un-geolock tax residency.

- **Finish Stripe + Mercury KYC from the US.** Do not start identity verification from a plane or a café abroad.
- **Do not VPN KYC.** Banks and Stripe flag mismatched location vs documents.
- **Keep a US phone number on 2FA** (SMS or, better, an authenticator app + backup codes stored offline). Losing SMS while abroad locks you out of the money.
- **Do not fly waiting on the first Stripe payout.** If you need spendable LLC cash in the next 48 hours, that is a **client wire into Mercury**, not a Payment Link.
- Mercury can refuse **new** applications from founders living in [prohibited countries](https://support.mercury.com/hc/en-us/articles/28771710754580-Prohibited-countries). Traveling through after the account is open is not the same as applying while domiciled there.
- Logins from abroad after KYC is done are normal. The LLC, EIN, and Mercury stay US.

---

## 8. Verify end-to-end

Test mode proves nothing about Mercury.

1. Toggle Stripe Dashboard to **live**.
2. Create a **$1** live Payment Link (or charge a real card $1 in the Dashboard). Pay it with a personal card.
3. Confirm the charge on [Payments](https://dashboard.stripe.com/payments) in **live** mode (Succeeded). Receipt to the cardholder email.
4. On [Balances](https://dashboard.stripe.com/balance/overview), note pending → available, and the **expected payout date**.
5. Wait for the payout (first one: **7–14 days**). Confirm it on [Payouts](https://dashboard.stripe.com/payouts) as paid.
6. In Mercury, confirm the ACH deposit from Stripe. That is the first dollar in the LLC bank.

Do not refund the $1 until the payout has posted (or there may be nothing to pay out). A Health Check card payment also starts this clock — the $1 charge is only so you are not waiting on a client.

---

## Sources (Aug 2026)

- Stripe payouts (first payout 7–14 days; US subsequent T+2; add bank in Payout settings): [docs.stripe.com/payouts](https://docs.stripe.com/payouts)
- Instant Payouts (not for new users; US 1.5%; ~30 min): [docs.stripe.com/payouts/instant-payouts](https://docs.stripe.com/payouts/instant-payouts)
- Instant Payouts typically after ~60 days of processing: [stripe.com/resources/more/payouts-explained](https://stripe.com/resources/more/payouts-explained)
- US pricing 2.9% + 30¢ cards; ACH 0.8% capped at $5: [stripe.com/pricing](https://stripe.com/pricing)
- ACH Direct Debit settlement T+4 (optional T+2): [docs.stripe.com/payments/ach-direct-debit](https://docs.stripe.com/payments/ach-direct-debit)
- Payment Links: [docs.stripe.com/payment-links/create](https://docs.stripe.com/payment-links/create)
- Mercury eligibility (US entity, US ops, address rules, international founders): [Eligibility and requirements](https://support.mercury.com/hc/en-us/articles/28770467511060-Eligibility-and-requirements-for-opening-a-Mercury-account)
- Mercury documents (formation, CP-575 / 147C / returned SS-4, IDs): [Gathering your documents](https://support.mercury.com/hc/en-us/articles/28770957425172-Gathering-your-documents)
- Mercury wire/ACH PDF: [Finding your wire details](https://support.mercury.com/hc/en-us/articles/28767997786260-Finding-your-wire-details)
- Mercury processing times (incoming ACH 0–2 days; domestic wire same/next day): [Processing times for payments](https://support.mercury.com/hc/en-us/articles/28773186865684-Processing-times-for-payments)
- Ramp connects to Mercury to spend / bill-pay (does not collect): [ramp.com/integrations/mercury](https://ramp.com/integrations/mercury)
- Gusto debits a US checking account for payroll: [Manage company bank account details](https://support.gusto.com/article/106622315100000/manage-company-bank-account-details-for-admins)
