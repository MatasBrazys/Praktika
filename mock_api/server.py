# mock_api/server.py
# Standalone mock API that imitates a Netbox-like REST API.
# Listens on port 9000. Swagger UI: http://localhost:9000/docs
#
# Auth: Click "Authorize" in Swagger, enter: test-token-123

from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import uvicorn

app = FastAPI(title="Mock External API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Auth ───────────────────────────────────────────────────────────────────

VALID_TOKEN = "test-token-123"
security = HTTPBearer(auto_error=False)


def check_auth(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if credentials is None:
        raise HTTPException(status_code=403, detail="Authorization required")
    if credentials.credentials != VALID_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid token")


# ── Mock Data ──────────────────────────────────────────────────────────────

DEVICES = [
    {"id": 1,  "name": "core-switch-01",    "device_type": {"model": "Catalyst 9300"},   "site": {"name": "Vilnius HQ",    "slug": "vilnius-hq"},    "primary_ip4": {"address": "10.0.1.1/24"},    "tenant": {"name": "UAB TechCorp"},      "status": {"value": "active"}},
    {"id": 2,  "name": "core-switch-02",    "device_type": {"model": "Catalyst 9300"},   "site": {"name": "Vilnius HQ",    "slug": "vilnius-hq"},    "primary_ip4": {"address": "10.0.1.2/24"},    "tenant": {"name": "UAB TechCorp"},      "status": {"value": "active"}},
    {"id": 3,  "name": "edge-router-01",    "device_type": {"model": "ASR 1001-X"},      "site": {"name": "Kaunas DC",     "slug": "kaunas-dc"},     "primary_ip4": {"address": "172.16.0.1/30"},  "tenant": {"name": "AB Datagroup"},      "status": {"value": "active"}},
    {"id": 4,  "name": "edge-router-02",    "device_type": {"model": "ASR 1001-X"},      "site": {"name": "Klaipeda POP",  "slug": "klaipeda-pop"},  "primary_ip4": {"address": "172.16.1.1/30"},  "tenant": {"name": "AB Datagroup"},      "status": {"value": "active"}},
    {"id": 5,  "name": "fw-palo-01",        "device_type": {"model": "PA-3260"},          "site": {"name": "Vilnius HQ",    "slug": "vilnius-hq"},    "primary_ip4": {"address": "10.0.0.1/24"},    "tenant": {"name": "UAB TechCorp"},      "status": {"value": "active"}},
    {"id": 6,  "name": "fw-palo-02",        "device_type": {"model": "PA-3260"},          "site": {"name": "Kaunas DC",     "slug": "kaunas-dc"},     "primary_ip4": {"address": "10.1.0.1/24"},    "tenant": {"name": "AB Datagroup"},      "status": {"value": "active"}},
    {"id": 7,  "name": "access-sw-floor1",  "device_type": {"model": "Catalyst 2960"},   "site": {"name": "Vilnius HQ",    "slug": "vilnius-hq"},    "primary_ip4": {"address": "10.0.10.1/24"},   "tenant": {"name": "UAB Bitė"},          "status": {"value": "active"}},
    {"id": 8,  "name": "access-sw-floor2",  "device_type": {"model": "Catalyst 2960"},   "site": {"name": "Vilnius HQ",    "slug": "vilnius-hq"},    "primary_ip4": {"address": "10.0.11.1/24"},   "tenant": {"name": "UAB Bitė"},          "status": {"value": "active"}},
    {"id": 9,  "name": "srv-web-01",        "device_type": {"model": "PowerEdge R640"},  "site": {"name": "Kaunas DC",     "slug": "kaunas-dc"},     "primary_ip4": {"address": "10.1.10.10/24"},  "tenant": {"name": "UAB Atea"},           "status": {"value": "active"}},
    {"id": 10, "name": "srv-web-02",        "device_type": {"model": "PowerEdge R640"},  "site": {"name": "Kaunas DC",     "slug": "kaunas-dc"},     "primary_ip4": {"address": "10.1.10.11/24"},  "tenant": {"name": "UAB Atea"},           "status": {"value": "active"}},
    {"id": 11, "name": "srv-db-master",     "device_type": {"model": "PowerEdge R740"},  "site": {"name": "Kaunas DC",     "slug": "kaunas-dc"},     "primary_ip4": {"address": "10.1.20.10/24"},  "tenant": {"name": "UAB CGI"},            "status": {"value": "active"}},
    {"id": 12, "name": "srv-db-replica",    "device_type": {"model": "PowerEdge R740"},  "site": {"name": "Vilnius HQ",    "slug": "vilnius-hq"},    "primary_ip4": {"address": "10.0.20.10/24"},  "tenant": {"name": "UAB CGI"},            "status": {"value": "active"}},
    {"id": 13, "name": "ap-wifi-lobby",     "device_type": {"model": "Meraki MR46"},     "site": {"name": "Vilnius HQ",    "slug": "vilnius-hq"},    "primary_ip4": {"address": "10.0.50.1/24"},   "tenant": {"name": "UAB TechCorp"},      "status": {"value": "active"}},
    {"id": 14, "name": "ups-kaunas-01",     "device_type": {"model": "APC Smart-UPS"},   "site": {"name": "Kaunas DC",     "slug": "kaunas-dc"},     "primary_ip4": None,                           "tenant": {"name": "AB Datagroup"},      "status": {"value": "active"}},
    {"id": 15, "name": "old-switch-03",     "device_type": {"model": "Catalyst 3750"},   "site": {"name": "Klaipeda POP",  "slug": "klaipeda-pop"},  "primary_ip4": {"address": "172.16.10.1/24"}, "tenant": {"name": "Klaipėdos Nafta"},   "status": {"value": "decommissioning"}},
]

PREFIXES = [
    {"id": 1,  "prefix": "10.0.0.0/16",     "site": {"name": "Vilnius HQ"},   "vlan": {"vid": 100, "name": "Management"},  "tenant": {"name": "UAB TechCorp"}, "status": {"value": "active"}},
    {"id": 2,  "prefix": "10.0.1.0/24",     "site": {"name": "Vilnius HQ"},   "vlan": {"vid": 101, "name": "Core"},        "tenant": {"name": "UAB TechCorp"}, "status": {"value": "active"}},
    {"id": 3,  "prefix": "10.0.10.0/24",    "site": {"name": "Vilnius HQ"},   "vlan": {"vid": 110, "name": "Floor1"},      "tenant": {"name": "UAB Bitė"},     "status": {"value": "active"}},
    {"id": 4,  "prefix": "10.1.0.0/16",     "site": {"name": "Kaunas DC"},    "vlan": {"vid": 200, "name": "DC-Mgmt"},     "tenant": {"name": "AB Datagroup"},  "status": {"value": "active"}},
    {"id": 5,  "prefix": "10.1.10.0/24",    "site": {"name": "Kaunas DC"},    "vlan": {"vid": 210, "name": "Web-Servers"}, "tenant": {"name": "UAB Atea"},      "status": {"value": "active"}},
    {"id": 6,  "prefix": "172.16.0.0/16",   "site": {"name": "WAN"},          "vlan": None,                                 "tenant": {"name": "AB Datagroup"},  "status": {"value": "active"}},
    {"id": 7,  "prefix": "192.168.1.0/24",  "site": {"name": "Vilnius HQ"},   "vlan": {"vid": 999, "name": "Guest"},       "tenant": None,                      "status": {"value": "reserved"}},
]

TENANTS = [
    {"id": 1, "name": "UAB TechCorp",      "slug": "techcorp",        "cf_CRM_ID": "CRM001", "group": {"name": "Customers"},  "description": "Primary IT client",   "custom_fields": {"contract_end": "2026-12-31", "account_manager": "Jonas Jonaitis"}},
    {"id": 2, "name": "AB Datagroup",       "slug": "datagroup",       "cf_CRM_ID": "CRM002", "group": {"name": "Internal"},   "description": "Parent company",      "custom_fields": {"contract_end": "2027-06-30", "account_manager": "Petras Petraitis"}},
    {"id": 3, "name": "UAB Bitė",           "slug": "bite",            "cf_CRM_ID": "CRM003", "group": {"name": "Customers"},  "description": "Telecom client",      "custom_fields": {"contract_end": "2026-09-15", "account_manager": "Jonas Jonaitis"}},
    {"id": 4, "name": "UAB Atea",            "slug": "atea",            "cf_CRM_ID": "CRM004", "group": {"name": "Customers"},  "description": "IT reseller",         "custom_fields": {"contract_end": "2026-03-01", "account_manager": "Asta Astaitė"}},
    {"id": 5, "name": "UAB CGI",             "slug": "cgi",             "cf_CRM_ID": "CRM005", "group": {"name": "Customers"},  "description": "Consulting firm",     "custom_fields": {"contract_end": "2027-01-15", "account_manager": "Petras Petraitis"}},
    {"id": 6, "name": "Klaipėdos Nafta",    "slug": "klaipedos-nafta", "cf_CRM_ID": "CRM006", "group": {"name": "Customers"},  "description": "Energy sector",       "custom_fields": {"contract_end": "2026-11-30", "account_manager": "Asta Astaitė"}},
]


# ── Helper ─────────────────────────────────────────────────────────────────

def netbox_response(results: list):
    return {"count": len(results), "next": None, "previous": None, "results": results}


# ── Endpoints ──────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "Mock External API", "auth": "Click Authorize in /docs, enter: test-token-123"}


@app.get("/api/dcim/devices/", dependencies=[Depends(check_auth)])
def list_devices(
    name__ic: Optional[str] = Query(None, description="Case-insensitive name search"),
    id: Optional[str] = Query(None, description="Exact ID match"),
    site__name__ic: Optional[str] = Query(None),
):
    results = DEVICES
    if id:
        try:
            results = [d for d in results if d["id"] == int(id)]
        except ValueError:
            results = []
    if name__ic:
        q = name__ic.lower()
        results = [d for d in results if q in d["name"].lower()]
    if site__name__ic:
        q = site__name__ic.lower()
        results = [d for d in results if q in (d.get("site", {}) or {}).get("name", "").lower()]
    return netbox_response(results)


@app.get("/api/dcim/devices/{device_id}/", dependencies=[Depends(check_auth)])
def get_device(device_id: int):
    device = next((d for d in DEVICES if d["id"] == device_id), None)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device


@app.get("/api/ipam/prefixes/", dependencies=[Depends(check_auth)])
def list_prefixes(
    prefix__ic: Optional[str] = Query(None, description="Search by prefix"),
    site__name__ic: Optional[str] = Query(None),
):
    results = PREFIXES
    if prefix__ic:
        q = prefix__ic.lower()
        results = [p for p in results if q in p["prefix"].lower()]
    if site__name__ic:
        q = site__name__ic.lower()
        results = [p for p in results if q in (p.get("site", {}) or {}).get("name", "").lower()]
    return netbox_response(results)


@app.get("/api/tenancy/tenants/", dependencies=[Depends(check_auth)])
def list_tenants(
    name__ic: Optional[str] = Query(None, description="Case-insensitive name search"),
    cf_CRM_ID: Optional[str] = Query(None, description="Exact CRM ID match (unique key)"),
):
    results = TENANTS
    if cf_CRM_ID:
        q = cf_CRM_ID.strip().upper()
        results = [t for t in results if t.get("cf_CRM_ID", "").upper().startswith(q)]
    elif name__ic:
        q = name__ic.lower()
        results = [t for t in results if q in t["name"].lower()]
    return netbox_response(results)


# ── Run ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n🔗 Mock API running on http://localhost:9000")
    print("   Swagger: http://localhost:9000/docs")
    print("   Authorize with: test-token-123\n")
    uvicorn.run(app, host="0.0.0.0", port=9000)