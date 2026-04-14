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


def _get_user_role(conn: Connection, user_dn: str) -> str | None:
    """Nustato vartotojo rolę pagal LDAP grupes. Grąžina None jei ne jokioje grupėje."""
    groups = [
        (settings.LDAP_ADMIN_GROUP, "admin"),
        (settings.LDAP_CONFIRMER_GROUP, "form_confirmer"),
        (settings.LDAP_USER_GROUP, "user"),
    ]
    
    for group_name, role in groups:
        group_dn = f"cn={group_name},ou=groups,{settings.ldap_base_dn}"
        conn.search(
            search_base=group_dn,
            search_filter=f"(member={user_dn})",
            attributes=["cn"],
        )
        if len(conn.entries) > 0:
            return role
    
    return None


def ldap_get_user_info(username: str) -> dict | None:
    """
    Grąžina vartotojo info ir rolę pagal LDAP grupes.
    FormAdmin → role="admin"
    FormConfirmer → role="form_confirmer"
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
        role = _get_user_role(conn, user_dn)

        conn.unbind()

        if role is None:
            logger.warning("User %r not in any allowed group — access denied", username)
            return None

        email = str(entry.mail) if entry.mail else ""
        
        return {
            "username": str(entry.uid),
            "email":    email,
            "role":     role,
        }

    except LDAPException as e:
        logger.error("LDAP user info fetch failed: %s", str(e))
        return None


def ldap_get_all_users() -> list[dict]:
    """
    Grąžina visų LDAP vartotojų sąrašą su jų rolėmis.
    Naudojamas background sync.
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

        conn.search(
            search_base=f"ou=users,{settings.ldap_base_dn}",
            search_filter="(objectClass=inetOrgPerson)",
            attributes=["uid", "mail"],
        )

        users = []
        for entry in conn.entries:
            username = str(entry.uid)
            user_dn = f"uid={username},ou=users,{settings.ldap_base_dn}"
            role = _get_user_role(conn, user_dn)
            
            if role is None:
                continue
            
            email = str(entry.mail) if entry.mail else ""
            
            users.append({
                "username": username,
                "email":    email,
                "role":     role,
            })

        conn.unbind()
        logger.info("LDAP: fetched %d users", len(users))
        return users

    except LDAPException as e:
        logger.error("LDAP get all users failed: %s", str(e))
        return []


def ldap_get_user_email(username: str) -> str | None:
    """
    Gauna konkretaus vartotojo email iš LDAP.
    Naudojamas siunčiant notifications.
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

        conn.search(
            search_base=f"ou=users,{settings.ldap_base_dn}",
            search_filter=f"(uid={username})",
            attributes=["mail"],
        )

        if not conn.entries:
            conn.unbind()
            logger.warning("User %r not found in LDAP", username)
            return None

        email = str(conn.entries[0].mail) if conn.entries[0].mail else None
        conn.unbind()
        return email

    except LDAPException as e:
        logger.error("LDAP get user email failed for %r: %s", username, str(e))
        return None