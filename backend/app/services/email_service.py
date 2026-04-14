# app/services/email_service.py

import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List

from app.config import settings

logger = logging.getLogger(__name__)


def send_email(to: List[str], subject: str, html_body: str, text_body: str = "") -> bool:
    """Siunčia email naudojant SMTP."""
    if not settings.EMAIL_ENABLED:
        print(f"[EMAIL DISABLED] Would send to {to}: {subject}")
        return False
    
    if not to:
        logger.warning("No recipients specified for email: %s", subject)
        return False
    
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM
        msg["To"] = ", ".join(to)
        
        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))
        
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_USER:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, to, msg.as_string())
        
        logger.info("Email sent successfully to %s: %s", to, subject)
        print(f"[EMAIL SENT] To {to}: {subject}")
        return True
        
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to, str(e))
        return False


def notify_confirmers_new_submission(
    form_title: str,
    submission_id: int,
    submitted_by: str,
    confirmers: List[str]
):
    """Siunčia žinutę confirmeriams kai gaunamas naujas submission."""
    subject = f"🆕 Naujas pateikimas: {form_title}"
    
    text_body = f"""
Naujas pateikimas gautas!

Forma: {form_title}
Pateikė: {submitted_by}
Submission ID: {submission_id}

Prašome peržiūrėti ir patvirtinti arba atmesti.

IT Portal
"""
    
    html_body = f"""
<html>
<body style="font-family: Arial, sans-serif; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">🆕 Naujas pateikimas</h2>
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Forma:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">{form_title}</td>
            </tr>
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Pateikė:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">{submitted_by}</td>
            </tr>
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Submission ID:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">#{submission_id}</td>
            </tr>
        </table>
        <p style="margin-top: 20px; color: #666;">
            Prašome peržiūrėti ir patvirtinti arba atmesti šį pateikimą.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
            IT Portal - IT Paslaugų Valdymo Sistema
        </p>
    </div>
</body>
</html>
"""
    
    return send_email(confirmers, subject, html_body, text_body)


def notify_submitter_declined(
    form_title: str,
    submission_id: int,
    decline_reason: str,
    submitter_email: str
):
    """Siunčia žinutę submitteriui kai jo submission atmetamas."""
    if not submitter_email:
        logger.warning("No submitter email for declined submission %d", submission_id)
        return False
    
    subject = f"❌ Jūsų pateikimas atmestas: {form_title}"
    
    text_body = f"""
Jūsų pateikimas buvo atmestas.

Forma: {form_title}
Submission ID: {submission_id}
Priežastis: {decline_reason}

Galite redaguoti savo pateikimą ir pateikti iš naujo.

IT Portal
"""
    
    html_body = f"""
<html>
<body style="font-family: Arial, sans-serif; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626;">❌ Pateikimas atmestas</h2>
        <p style="color: #666;">Jūsų pateikimas buvo peržiūrėtas ir atmestas.</p>
        <table style="width: 100%; border-collapse: collapse; background: #fef2f2; border-radius: 8px;">
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #fecaca; font-weight: bold;">Forma:</td>
                <td style="padding: 8px; border-bottom: 1px solid #fecaca;">{form_title}</td>
            </tr>
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #fecaca; font-weight: bold;">Submission ID:</td>
                <td style="padding: 8px; border-bottom: 1px solid #fecaca;">#{submission_id}</td>
            </tr>
            <tr>
                <td style="padding: 8px; font-weight: bold;">Priežastis:</td>
                <td style="padding: 8px; color: #dc2626;">{decline_reason}</td>
            </tr>
        </table>
        <p style="margin-top: 20px; color: #666;">
            Galite <strong>redaguoti savo pateikimą</strong> ir pateikti iš naujo peržiūrai.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
            IT Portal - IT Paslaugų Valdymo Sistema
        </p>
    </div>
</body>
</html>
"""
    
    return send_email([submitter_email], subject, html_body, text_body)


def notify_submitter_confirmed(
    form_title: str,
    submission_id: int,
    submitter_email: str
):
    """Siunčia žinutę submitteriui kai jo submission patvirtinamas."""
    if not submitter_email:
        logger.warning("No submitter email for confirmed submission %d", submission_id)
        return False
    
    subject = f"✅ Jūsų pateikimas patvirtintas: {form_title}"
    
    text_body = f"""
Jūsų pateikimas buvo patvirtintas!

Forma: {form_title}
Submission ID: {submission_id}

Ačiū už pateikimą!

IT Portal
"""
    
    html_body = f"""
<html>
<body style="font-family: Arial, sans-serif; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #16a34a;">✅ Pateikimas patvirtintas</h2>
        <p style="color: #666;">Jūsų pateikimas buvo peržiūrėtas ir patvirtintas.</p>
        <table style="width: 100%; border-collapse: collapse; background: #f0fdf4; border-radius: 8px;">
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #bbf7d0; font-weight: bold;">Forma:</td>
                <td style="padding: 8px; border-bottom: 1px solid #bbf7d0;">{form_title}</td>
            </tr>
            <tr>
                <td style="padding: 8px; font-weight: bold;">Submission ID:</td>
                <td style="padding: 8px;">#{submission_id}</td>
            </tr>
        </table>
        <p style="margin-top: 20px;">Ačiū už jūsų pateikimą!</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
            IT Portal - IT Paslaugų Valdymo Sistema
        </p>
    </div>
</body>
</html>
"""
    
    return send_email([submitter_email], subject, html_body, text_body)
