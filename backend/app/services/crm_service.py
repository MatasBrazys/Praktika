# app/services/crm_service.py
#
# Mock CRM data store.
# To connect a real CRM: replace lookup() with an HTTP call.

from dataclasses import dataclass


_MOCK_DB: dict[str, dict] = {
    "CRM001": {"name": "UAB TechCorp",                       "street": "Gedimino pr. 1",      "postcode": "01103", "state": "Vilnius"},
    "CRM002": {"name": "AB Datagroup Baltic",                "street": "Konstitucijos pr. 7",  "postcode": "09308", "state": "Vilnius"},
    "CRM003": {"name": "UAB Bitė Lietuva",                   "street": "Lvivo g. 25",          "postcode": "09320", "state": "Vilnius"},
    "CRM004": {"name": "Tele2 Lietuva UAB",                  "street": "Žalgirio g. 90",       "postcode": "09303", "state": "Vilnius"},
    "CRM005": {"name": "UAB Atea",                           "street": "Ukmergės g. 126",      "postcode": "08100", "state": "Vilnius"},
    "CRM006": {"name": "UAB CGI Lietuva",                    "street": "Olimpiečių g. 1",      "postcode": "09200", "state": "Vilnius"},
    "CRM007": {"name": "UAB Kauno Dujos",                    "street": "Savanorių pr. 347",    "postcode": "49303", "state": "Kaunas"},
    "CRM008": {"name": "AB SEB Bankas",                      "street": "Gedimino pr. 12",      "postcode": "01103", "state": "Vilnius"},
    "CRM009": {"name": "Klaipėdos Nafta AB",                 "street": "Burių g. 19",          "postcode": "91009", "state": "Klaipėda"},
    "CRM010": {"name": "UAB Maxima LT",                      "street": "Savanorių pr. 176",    "postcode": "03154", "state": "Vilnius"},
    "CRM011": {"name": "Šiaulių Bankas AB",                  "street": "Tilžės g. 149",        "postcode": "76348", "state": "Šiauliai"},
    "CRM012": {"name": "UAB Rimi Lietuva",                   "street": "Ukmergės g. 369",      "postcode": "14153", "state": "Vilnius"},
    "CRM013": {"name": "Energijos Skirstymo Operatorius AB", "street": "Aguonų g. 24",         "postcode": "03212", "state": "Vilnius"},
    "CRM014": {"name": "UAB Ignitis",                        "street": "Žvejų g. 14",          "postcode": "09310", "state": "Vilnius"},
    "CRM015": {"name": "AB Orlen Lietuva",                   "street": "Juodeikių g. 13",      "postcode": "89333", "state": "Mažeikiai"},
    "CRM016": {"name": "UAB Norfa LT",                       "street": "Metalo g. 2a",         "postcode": "02190", "state": "Vilnius"},
    "CRM017": {"name": "Kauno Energija UAB",                 "street": "Raudondvario pl. 84",  "postcode": "47182", "state": "Kaunas"},
    "CRM018": {"name": "UAB Informacinės Technologijos",     "street": "T. Narbuto g. 5",      "postcode": "08105", "state": "Vilnius"},
    "CRM019": {"name": "Panevėžio Energija UAB",             "street": "Energetikų g. 5",      "postcode": "35173", "state": "Panevėžys"},
    "CRM020": {"name": "UAB Baltic Amadeus",                 "street": "Naugarduko g. 3",      "postcode": "03231", "state": "Vilnius"},
}


@dataclass
class CRMResult:
    found: bool
    crm_id: str
    name: str = ""
    street: str = ""
    postcode: str = ""
    state: str = ""


def lookup(crm_id: str) -> CRMResult:
    normalised = crm_id.strip().upper()
    record = _MOCK_DB.get(normalised)
    if not record:
        return CRMResult(found=False, crm_id=normalised)
    return CRMResult(found=True, crm_id=normalised, **record)


def list_all() -> list[dict]:
    return [{"crm_id": k, **v} for k, v in _MOCK_DB.items()]