# app/services/teams_notification_service.py

import json
import logging
from typing import Dict, Any, Optional
import urllib.request
import urllib.error

from app.config import settings

logger = logging.getLogger(__name__)


def send_teams_notification(
    title: str,
    text: str,
    theme_color: str = "0076D7",  # Microsoft Blue
    sections: Optional[list] = None,
    potential_action: Optional[list] = None
) -> bool:
    """
    Send a notification to Microsoft Teams via Incoming Webhook.
    
    Uses Microsoft Teams Message Card format.
    Returns True if successful, False otherwise.
    """
    if not settings.TEAMS_NOTIFICATION_ENABLED or not settings.TEAMS_WEBHOOK_URL:
        logger.debug("Teams notifications disabled or webhook URL not configured")
        return False
    
    # Construct Message Card payload
    message_card: Dict[str, Any] = {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "summary": title,
        "themeColor": theme_color,
        "title": title,
        "text": text,
    }
    
    if sections:
        message_card["sections"] = sections
        
    if potential_action:
        message_card["potentialAction"] = potential_action
    
    # Prepare request
    data = json.dumps(message_card).encode('utf-8')
    req = urllib.request.Request(
        settings.TEAMS_WEBHOOK_URL,
        data=data,
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            response_code = response.getcode()
            if 200 <= response_code < 300:
                logger.info(f"Teams notification sent successfully: {title}")
                return True
            else:
                logger.warning(f"Teams notification failed with status {response_code}: {title}")
                return False
                
    except urllib.error.HTTPError as e:
        logger.error(f"Teams notification HTTP error: {e.code} {e.reason} - {title}")
        return False
    except urllib.error.URLError as e:
        logger.error(f"Teams notification URL error: {e.reason} - {title}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending Teams notification: {e} - {title}")
        return False


def notify_new_form_created(
    form_id: int,
    form_title: str,
    creator_username: str,
    form_description: Optional[str] = None,
    frontend_url: Optional[str] = None
) -> bool:
    """
    Send a Teams notification when a new form is created.
    
    Intended to notify FormConfirmers that a new form requires their attention.
    """
    if frontend_url is None:
        frontend_url = settings.FRONTEND_URL
    
    title = f"📝 Naujas formų šablonas sukurtas: {form_title}"
    
    text_lines = [
        f"**Formos ID:** {form_id}",
        f"**Sukūrė:** {creator_username}",
        f"**Data:** {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M')}",
    ]
    
    if form_description and form_description.strip():
        text_lines.append(f"**Aprašymas:** {form_description}")
    
    text_lines.append("\nNaudojantis 'Formų patvirtintojas' vaidmeniu galite peržiūrėti šią formą.")
    
    text = "\n".join(text_lines)
    
    # Add action link to view the form submissions for confirmation
    potential_action = [{
        "@type": "OpenUri",
        "name": "Žiūrėti pateiktis",
        "targets": [{"os": "default", "uri": f"{frontend_url}/form-confirmations/submissions/{form_id}"}]
    }]
    
    return send_teams_notification(
        title=title,
        text=text,
        theme_color="2EB886",  # Green for new item
        potential_action=potential_action
    )


def notify_new_submission(
    form_id: int,
    form_title: str,
    submission_id: int,
    submitted_by_username: str,
    frontend_url: Optional[str] = None
) -> bool:
    """
    Send a Teams notification when a new submission is created.
    
    Notifies FormConfirmers that a new submission needs their attention.
    """
    if frontend_url is None:
        frontend_url = settings.FRONTEND_URL
    
    title = f"📋 Nauja siūmimo užklausa: {form_title}"
    
    text_lines = [
        f"**Forma:** {form_title}",
        f"**Siūmimo ID:** {submission_id}",
        f"**Pateikė:** {submitted_by_username}",
        f"**Data:** {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M')}",
    ]
    
    text_lines.append("\nReikalingas patvirtinimas. Peržiūrėkite ir patvirtinkite šią užklausą.")
    
    text = "\n".join(text_lines)
    
    # Add action link to view the submission for confirmation
    potential_action = [{
        "@type": "OpenUri",
        "name": "Žiūrėti ir patvirtinti",
        "targets": [{"os": "default", "uri": f"{frontend_url}/form-confirmations/submissions/{form_id}"}]
    }]
    
    return send_teams_notification(
        title=title,
        text=text,
        theme_color="FF6B6B",  # Red/Coral for new submission
        potential_action=potential_action
    )


def notify_form_confirmation_required(
    form_id: int,
    form_title: str,
    submission_count: int
) -> bool:
    """
    Send a Teams notification when a form has submissions awaiting confirmation.
    """
    title = f"⚠️ Forma laukia patvirtinimo: {form_title}"
    
    text = (
        f"Forma **{form_title}** (ID: {form_id}) turi {submission_count} "
        "naujų siūmimų laukiančių patvirtinimo.\n\n"
        "Prisijunkite prie sistemos, kad peržiūrėtumėte ir patvirtintumėte šias užklausas."
    )
    
    return send_teams_notification(
        title=title,
        text=text,
        theme_color="FF8C00",  # Dark Orange for warning
    )