# app/services/ldap_sync_service.py

import logging
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.auth.ldap import ldap_get_all_users

logger = logging.getLogger(__name__)


class LdapSyncService:
    @staticmethod
    def sync_all_users():
        """
        Sinchronizuoja visus LDAP vartotojus į DB.
        - Nauji LDAP vartotojai → sukuriami DB
        - Pakeisti LDAP duomenys (email, role) → atnaujinami DB
        """
        import sys
        print("DEBUG: LDAP sync started", flush=True)
        logger.info("=== Starting LDAP sync ===")
        
        ldap_users = ldap_get_all_users()
        print(f"DEBUG: Got {len(ldap_users)} users from LDAP", flush=True)
        
        if not ldap_users:
            logger.warning("LDAP sync: no users fetched from LDAP")
            return

        db_gen = get_db()
        db: Session = next(db_gen)
        
        try:
            print("DEBUG: Getting users from DB", flush=True)
            db_users = {u.username: u for u in db.query(User).all()}
            print(f"DEBUG: Got {len(db_users)} users from DB", flush=True)
            ldap_users_dict = {u["username"]: u for u in ldap_users}
            
            created_count = 0
            updated_count = 0

            for username, ldap_user in ldap_users_dict.items():
                if username in db_users:
                    db_user = db_users[username]
                    changed = False

                    if ldap_user["email"] and db_user.email != ldap_user["email"]:
                        taken = db.query(User).filter(
                            User.email == ldap_user["email"],
                            User.username != username
                        ).first()
                        if not taken:
                            logger.info("LDAP sync: %s email changed: %s → %s",
                                      username, db_user.email, ldap_user["email"])
                            db_user.email = ldap_user["email"]
                            changed = True
                        else:
                            logger.warning("LDAP sync: email %s already used by %s, skipping for %s",
                                          ldap_user["email"], taken.username, username)

                    if db_user.role != ldap_user["role"]:
                        logger.info("LDAP sync: %s role changed: %s → %s", 
                                  username, db_user.role, ldap_user["role"])
                        db_user.role = ldap_user["role"]
                        changed = True

                    if not db_user.is_active:
                        logger.info("LDAP sync: %s reactivated", username)
                        changed = True

                    if changed:
                        updated_count += 1

                else:
                    new_user = User(
                        username=ldap_user["username"],
                        email=ldap_user["email"],
                        role=ldap_user["role"],
                        password_hash=None,
                        is_active=True,
                    )
                    db.add(new_user)
                    created_count += 1
                    logger.info("LDAP sync: created user %s with role %s", 
                              ldap_user["username"], ldap_user["role"])

            print(f"DEBUG: Committing changes - created={created_count}, updated={updated_count}", flush=True)
            db.commit()
            print("DEBUG: Commit done", flush=True)
            logger.info(
                "LDAP sync complete: created=%d, updated=%d",
                created_count, updated_count
            )
            print("=== LDAP sync FINISHED ===", flush=True)

        except Exception as e:
            db.rollback()
            print(f"DEBUG: LDAP sync FAILED: {e}", flush=True)
            logger.error("LDAP sync failed: %s", str(e))
            raise
        finally:
            db_gen.close()


def run_ldap_sync():
    """Patogiai iškviesti sync iš bet kur."""
    LdapSyncService.sync_all_users()
