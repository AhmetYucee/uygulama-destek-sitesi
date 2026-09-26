import json
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo


API_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.nations/scoreboard"
OUTPUT_FILE = Path(__file__).with_name("nations-league.json")
ISTANBUL = ZoneInfo("Europe/Istanbul")


def fetch_day(day: date) -> list[dict]:
    url = f"{API_URL}?{urlencode({'dates': day.strftime('%Y%m%d')})}"
    request = Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (compatible; NationsLeagueScoreUpdater/1.0)",
        },
    )

    try:
        with urlopen(request, timeout=20) as response:
            payload = json.load(response)
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
        raise RuntimeError(f"ESPN scoreboard request failed for {day}: {error}") from error

    events = payload.get("events")
    if not isinstance(events, list):
        raise RuntimeError(f"ESPN scoreboard returned an invalid event list for {day}")

    matches = []
    for event in events:
        competition = (event.get("competitions") or [{}])[0]
        competitors = competition.get("competitors") or []
        home = next((team for team in competitors if team.get("homeAway") == "home"), None)
        away = next((team for team in competitors if team.get("homeAway") == "away"), None)
        if not home or not away:
            continue

        status = (competition.get("status") or {}).get("type") or {}
        matches.append(
            {
                "id": event.get("id"),
                "date": competition.get("date") or event.get("date"),
                "home": (home.get("team") or {}).get("displayName"),
                "away": (away.get("team") or {}).get("displayName"),
                "homeScore": home.get("score"),
                "awayScore": away.get("score"),
                "group": (competition.get("group") or {}).get("name"),
                "status": {
                    "state": status.get("state"),
                    "detail": status.get("detail") or status.get("shortDetail"),
                },
                "clock": (competition.get("status") or {}).get("displayClock"),
            }
        )

    return matches


def main() -> None:
    today = datetime.now(timezone.utc).astimezone(ISTANBUL).date()
    first_day = today - timedelta(days=7)
    last_day = today + timedelta(days=21)
    matches_by_id = {}

    for offset in range((last_day - first_day).days + 1):
        for match in fetch_day(first_day + timedelta(days=offset)):
            if match["id"] and match["date"] and match["home"] and match["away"]:
                matches_by_id[match["id"]] = match
        time.sleep(0.15)

    matches = sorted(matches_by_id.values(), key=lambda match: match["date"])
    payload = {
        "source": "ESPN",
        "fetchedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "from": first_day.isoformat(),
        "through": last_day.isoformat(),
        "events": matches,
    }
    OUTPUT_FILE.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Saved {len(matches)} UEFA Nations League matches to {OUTPUT_FILE.name}")


if __name__ == "__main__":
    main()
