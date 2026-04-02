# app/auth/ldap.py

import logging
from ldap3 import Server, Connection, ALL, SIMPLE
from ldap3.core.exceptions import LDAPException
from app.config import settings

logger = logging.getLogger(__name__)


def ldap_authenticate(username: str, password: str) -> bool:
    """Tikrina ar username/password kombinacija teisinga per LDAP bind."""
    try:
        server = Server(settings.LDAP_HOST, port=settings.LDAP_PORT, get_info=ALL)
        user_dn = f"uid={username},ou=users,{settings.ldap_base_dn}"

        conn = Connection(
            server,
            user=user_dn,
            password=password,
            authentication=SIMPLE,
            auto_bind=True,
        )
        conn.unbind()
        logger.info("LDAP auth success: %r", username)
        return True

    except LDAPException as e:
        logger.warning("LDAP auth failed for %r: %s", username, str(e))
        return False


def ldap_get_user_info(username: str) -> dict | None:
    """
    Grąžina vartotojo info ir rolę pagal LDAP grupes.
    FormAdmin → role="admin"
    FormUser  → role="user"
    Jei nerastas nei vienoje grupėje → None (negalima prisijungti)
    """
    try:
        server = Server(settings.LDAP_HOST, port=settings.LDAP_PORT, get_info=ALL)
        conn = Connection(
            server,
            user=settings.ldap_admin_dn,
            password=settings.LDAP_ADMIN_PASSWORD,
            authentication=SIMPLE,
            auto_bind=True,
        )

        # Gauti vartotojo atributus
        conn.search(
            search_base=f"ou=users,{settings.ldap_base_dn}",
            search_filter=f"(uid={username})",
            attributes=["cn", "mail", "uid"],
        )

        if not conn.entries:
            conn.unbind()
            logger.warning("User %r not found in LDAP", username)
            return None

        entry = conn.entries[0]
        user_dn = f"uid={username},ou=users,{settings.ldap_base_dn}"

        # Tikrinti FormAdmin grupę
        admin_group_dn = f"cn={settings.LDAP_ADMIN_GROUP},ou=groups,{settings.ldap_base_dn}"
        conn.search(
            search_base=admin_group_dn,
            search_filter=f"(member={user_dn})",
            attributes=["cn"],
        )
        is_admin = len(conn.entries) > 0

        # Tikrinti FormUser grupę
        user_group_dn = f"cn={settings.LDAP_USER_GROUP},ou=groups,{settings.ldap_base_dn}"
        conn.search(
            search_base=user_group_dn,
            search_filter=f"(member={user_dn})",
            attributes=["cn"],
        )
        is_user = len(conn.entries) > 0

        conn.unbind()

        # Jei nerastas nei vienoje grupėje — neleidžiame prisijungti
        if not is_admin and not is_user:
            logger.warning("User %r not in any allowed group — access denied", username)
            return None

        # Admin turi prioritetą
        role = "admin" if is_admin else "user"

        return {
            "username": str(entry.uid),
            "email":    str(entry.mail) if entry.mail else f"{username}@{settings.LDAP_DOMAIN}",
            "role":     role,
        }

    except LDAPException as e:
        logger.error("LDAP user info fetch failed: %s", str(e))
        return None