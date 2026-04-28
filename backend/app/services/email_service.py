# app/services/email_service.py

import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List

from app.config import settings

logger = logging.getLogger(__name__)


# ── Core sender ───────────────────────────────────────────────────────────────

def send_email(to: List[str], subject: str, html_body: str, text_body: str = "") -> bool:
    if not settings.EMAIL_ENABLED:
        print(f"[EMAIL DISABLED] Would send to {to}: {subject}")
        return False
    if not to:
        logger.warning("No recipients specified for email: %s", subject)
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = settings.SMTP_FROM
        msg["To"]      = ", ".join(to)
        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_USER:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, to, msg.as_string())
        logger.info("Email sent to %s: %s", to, subject)
        return True
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to, str(e))
        return False


# ── HTML helpers ──────────────────────────────────────────────────────────────

def _fmt_key(key: str) -> str:
    """Turn a SurveyJS field name into a readable label."""
    return key.replace("_", " ").replace("-", " ").title()


def _render_data_table(data: dict) -> str:
    """Render submission data dict as an HTML table of rows."""
    if not data:
        return "<p style='color:#64748b;font-size:13px;'>No data attached.</p>"

    rows = []
    for key, value in data.items():
        if value is None or value == "":
            continue
        label = _fmt_key(str(key))
        if isinstance(value, (dict, list)):
            import json
            display = f"<code style='font-size:12px;color:#0f172a;'>{json.dumps(value, ensure_ascii=False)}</code>"
        else:
            display = f"<span style='color:#0f172a;'>{value}</span>"
        rows.append(f"""
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#64748b;
                       font-size:13px;font-weight:600;white-space:nowrap;width:40%;">{label}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;
                       word-break:break-word;">{display}</td>
          </tr>""")
    if not rows:
        return "<p style='color:#64748b;font-size:13px;'>No data attached.</p>"
    return f"""
    <table style="width:100%;border-collapse:collapse;background:#f8fafc;
                  border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
      <tbody>{''.join(rows)}
      </tbody>
    </table>"""


def _render_button(text: str, url: str, color: str = "#0d9488") -> str:
    return f"""
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;">
      <tr>
        <td style="border-radius:8px;background:{color};">
          <a href="{url}"
             style="display:inline-block;padding:13px 28px;color:#fff;font-size:14px;
                    font-weight:600;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,
                    'Segoe UI',sans-serif;letter-spacing:0.01em;">{text}</a>
        </td>
      </tr>
    </table>"""


def _accent_bar(color: str) -> str:
    return f"<div style='height:4px;background:{color};border-radius:4px 4px 0 0;'></div>"


def _email_wrapper(accent_color: str, body_html: str) -> str:
    """Wrap body in a clean enterprise shell."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td style="padding:40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
               style="max-width:600px;margin:0 auto;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:12px;">
              <span style="font-size:13px;font-weight:700;color:#64748b;letter-spacing:0.08em;
                           text-transform:uppercase;">IT Services Portal</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#fff;border-radius:12px;
                       box-shadow:0 1px 3px rgba(15,23,42,0.08),0 4px 16px rgba(15,23,42,0.04);
                       overflow:hidden;">
              {_accent_bar(accent_color)}
              <div style="padding:32px 36px 36px;">
                {body_html}
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                IT Services Portal &nbsp;·&nbsp; Automated notification — please do not reply
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _submission_meta(form_title: str, submission_id: int, submitted_by: str) -> str:
    return f"""
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;
                   color:#64748b;font-weight:600;width:40%;">Form</td>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;
                   color:#0f172a;font-weight:600;">{form_title}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;font-weight:600;">Submission ID</td>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a;">
          <code style="background:#f1f5f9;padding:2px 7px;border-radius:4px;font-size:12px;">#{submission_id}</code>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-size:13px;color:#64748b;font-weight:600;">Submitted by</td>
        <td style="padding:8px 0;font-size:13px;color:#0f172a;">{submitted_by}</td>
      </tr>
    </table>"""


def _section_title(text: str) -> str:
    return f"""<p style="margin:24px 0 10px;font-size:11px;font-weight:700;color:#94a3b8;
                         letter-spacing:0.08em;text-transform:uppercase;">{text}</p>"""


# ── Notification functions ────────────────────────────────────────────────────

def notify_confirmers_new_submission(
    form_title: str,
    submission_id: int,
    submitted_by: str,
    confirmers: List[str],
    form_id: int,
    submission_data: dict | None = None,
):
    subject = f"New submission pending review — {form_title}"
    portal_url = settings.APP_URL
    review_url = f"{portal_url}/form-confirmations/submissions/{form_id}"

    body = f"""
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.02em;">
        New submission to review
      </h1>
      <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
        A new form submission is waiting for your approval.
      </p>

      {_submission_meta(form_title, submission_id, submitted_by)}

      {_section_title("Submitted data")}
      {_render_data_table(submission_data or {})}

      {_render_button("Review submission →", review_url)}

      <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
        Or copy this link: <a href="{review_url}" style="color:#0d9488;">{review_url}</a>
      </p>"""

    html = _email_wrapper("#0d9488", body)
    text = (
        f"New submission pending review\n\n"
        f"Form: {form_title}\nSubmission ID: #{submission_id}\nSubmitted by: {submitted_by}\n\n"
        f"Review at: {review_url}"
    )
    return send_email(confirmers, subject, html, text)


def notify_submitter_confirmed(
    form_title: str,
    submission_id: int,
    submitter_email: str,
    form_id: int,
    submitted_by: str = "",
    submission_data: dict | None = None,
):
    if not submitter_email:
        return False

    subject = f"Your submission has been approved — {form_title}"
    portal_url = settings.APP_URL
    view_url = f"{portal_url}/user/submissions/{form_id}"

    body = f"""
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.02em;">
        Submission approved
      </h1>
      <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
        Your form submission has been reviewed and <strong style="color:#16a34a;">approved</strong>.
      </p>

      {_submission_meta(form_title, submission_id, submitted_by or submitter_email)}

      {_section_title("Your submitted data")}
      {_render_data_table(submission_data or {})}

      {_render_button("View submission →", view_url)}"""

    html = _email_wrapper("#16a34a", body)
    text = (
        f"Your submission has been approved\n\n"
        f"Form: {form_title}\nSubmission ID: #{submission_id}\n\n"
        f"View at: {view_url}"
    )
    return send_email([submitter_email], subject, html, text)


def notify_submitter_declined(
    form_title: str,
    submission_id: int,
    decline_reason: str,
    submitter_email: str,
    form_id: int,
    submitted_by: str = "",
    submission_data: dict | None = None,
):
    if not submitter_email:
        return False

    subject = f"Your submission needs attention — {form_title}"
    portal_url = settings.APP_URL
    edit_url = f"{portal_url}/user/submissions/{form_id}"

    reason_block = f"""
    <div style="margin:20px 0;padding:16px;background:#fef2f2;border-radius:8px;
                border-left:3px solid #ef4444;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#94a3b8;
                letter-spacing:0.08em;text-transform:uppercase;">Reason for decline</p>
      <p style="margin:0;font-size:14px;color:#dc2626;line-height:1.6;">{decline_reason or "No reason provided."}</p>
    </div>"""

    body = f"""
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.02em;">
        Submission declined
      </h1>
      <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
        Your form submission was reviewed and <strong style="color:#dc2626;">declined</strong>.
        You can edit and resubmit it at any time.
      </p>

      {_submission_meta(form_title, submission_id, submitted_by or submitter_email)}
      {reason_block}

      {_section_title("Your submitted data")}
      {_render_data_table(submission_data or {})}

      {_render_button("Edit and resubmit →", edit_url, "#dc2626")}

      <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
        Or copy this link: <a href="{edit_url}" style="color:#dc2626;">{edit_url}</a>
      </p>"""

    html = _email_wrapper("#ef4444", body)
    text = (
        f"Your submission was declined\n\n"
        f"Form: {form_title}\nSubmission ID: #{submission_id}\n"
        f"Reason: {decline_reason}\n\n"
        f"Edit at: {edit_url}"
    )
    return send_email([submitter_email], subject, html, text)
