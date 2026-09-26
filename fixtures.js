(() => {
  "use strict";

  const scoreList = document.querySelector("#score-list");
  const scoreMessage = document.querySelector("#score-message");
  const scoreUpdated = document.querySelector("#live-update");
  const refreshButton = document.querySelector("#refresh-scores");
  const filterButtons = [...document.querySelectorAll(".score-filter")];
  const scoreApi = "https://www.thesportsdb.com/api/v1/json/123/eventsday.php";
  const refreshInterval = 60_000;
  const nationsLeagueMatches = [
    {
      date: "2026-09-26T13:00:00Z",
      home: "Slovenya",
      away: "İskoçya",
      homeScore: 0,
      awayScore: 0,
      status: "Maç bitti",
      group: "Grup B1",
    },
    {
      date: "2026-09-27T13:00:00Z",
      home: "Litvanya",
      away: "Azerbaycan",
      status: "Programda",
      group: "Grup D2",
    },
    {
      date: "2026-09-28T16:00:00Z",
      home: "Ermenistan",
      away: "Karadağ",
      status: "Programda",
      group: "Grup C2",
    },
    {
      date: "2026-09-29T16:00:00Z",
      home: "Finlandiya",
      away: "Belarus",
      status: "Programda",
      group: "Grup C1",
    },
  ];
  let selectedFilter = "all";
  let latestEvents = [];
  let isLoading = false;

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return entities[character];
    });
  }

  function todayInIstanbul() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Istanbul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function isLiveEvent(event) {
    return /^(live|1h|2h|ht|et|bt|p|pen)$/i.test(event.strStatus ?? "") ||
      /live|in progress|1st half|2nd half|half time|extra time|penalt/i.test(
        event.strStatus ?? "",
      );
  }

  function getStatusLabel(event) {
    if (isLiveEvent(event)) {
      const status = event.strStatus ?? "";
      const labels = {
        "1H": "1. yarı",
        "2H": "2. yarı",
        HT: "Devre arası",
        ET: "Uzatmalar",
        P: "Penaltılar",
      };
      return labels[status.toUpperCase()] ?? "Canlı";
    }

    if (/^(ft|aet|ft pens|match finished)$/i.test(event.strStatus ?? "")) {
      return "Maç bitti";
    }

    return event.strTimeLocal || event.strTime || "Programda";
  }

  function renderScores() {
    if (selectedFilter === "nations-league") {
      scoreMessage.textContent =
        "Fikstür ESPN program verisinden alınmıştır (26 Eylül 2026). Ücretsiz canlı skor akışında bu lig bulunmadığından başlamamış maçlar sonuç gibi gösterilmez.";
      scoreList.innerHTML = nationsLeagueMatches
        .map((match) => {
          const kickoff = new Date(match.date);
          const formattedDate = new Intl.DateTimeFormat("tr-TR", {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Europe/Istanbul",
          }).format(kickoff);
          const hasResult = Number.isInteger(match.homeScore) && Number.isInteger(match.awayScore);
          const status = hasResult
            ? match.status
            : Date.now() >= kickoff.getTime()
              ? "Program saati geçti · sonuç akışı yok"
              : formattedDate;

          return `
            <article class="score-card${hasResult ? " is-finished" : ""}">
              <div class="score-card-meta">
                <span>UEFA Uluslar Ligi · ${escapeHTML(match.group)}</span>
                <span class="score-status">${escapeHTML(status)}</span>
              </div>
              <div class="score-team-row">
                <span class="score-team"><strong>${escapeHTML(match.home)}</strong></span>
                <strong class="score-number">${hasResult ? match.homeScore : "—"}</strong>
              </div>
              <div class="score-team-row">
                <span class="score-team"><strong>${escapeHTML(match.away)}</strong></span>
                <strong class="score-number">${hasResult ? match.awayScore : "—"}</strong>
              </div>
            </article>`;
        })
        .join("");
      return;
    }

    const visibleEvents = latestEvents.filter((event) => {
      if (selectedFilter === "live") return isLiveEvent(event);
      if (selectedFilter === "world-cup") {
        return /world cup|dünya kupası/i.test(event.strLeague ?? "");
      }
      return true;
    });

    if (latestEvents.length === 0) {
      scoreMessage.textContent = "Bugün için listelenecek maç bulunamadı.";
    } else if (visibleEvents.length === 0 && selectedFilter === "live") {
      scoreMessage.textContent = "Şu anda canlı maç görünmüyor. Yeni maçlar için otomatik yenileme açık.";
    } else if (visibleEvents.length === 0 && selectedFilter === "world-cup") {
      scoreMessage.textContent = "Bugün Dünya Kupası maçı görünmüyor.";
    } else {
      scoreMessage.textContent = "";
    }

    scoreList.innerHTML = visibleEvents
      .map((event) => {
        const homeScore = event.intHomeScore ?? "—";
        const awayScore = event.intAwayScore ?? "—";
        const live = isLiveEvent(event);
        const timeOrStatus = getStatusLabel(event);
        const leagueName = event.strLeague || "Futbol";
        const homeBadge = event.strHomeTeamBadge
          ? `<img src="${escapeHTML(event.strHomeTeamBadge)}" alt="" loading="lazy" />`
          : "";
        const awayBadge = event.strAwayTeamBadge
          ? `<img src="${escapeHTML(event.strAwayTeamBadge)}" alt="" loading="lazy" />`
          : "";

        return `
          <article class="score-card${live ? " is-live" : ""}">
            <div class="score-card-meta">
              <span>${escapeHTML(leagueName)}</span>
              <span class="score-status">${live ? '<i aria-hidden="true"></i>' : ""}${escapeHTML(timeOrStatus)}</span>
            </div>
            <div class="score-team-row">
              <span class="score-team">${homeBadge}<strong>${escapeHTML(event.strHomeTeam || "Ev sahibi")}</strong></span>
              <strong class="score-number">${escapeHTML(homeScore)}</strong>
            </div>
            <div class="score-team-row">
              <span class="score-team">${awayBadge}<strong>${escapeHTML(event.strAwayTeam || "Deplasman")}</strong></span>
              <strong class="score-number">${escapeHTML(awayScore)}</strong>
            </div>
          </article>`;
      })
      .join("");
  }

  async function loadScores() {
    if (isLoading) return;
    isLoading = true;
    refreshButton.disabled = true;
    scoreUpdated.textContent = "Skorlar güncelleniyor…";

    try {
      const params = new URLSearchParams({
        d: todayInIstanbul(),
        s: "Soccer",
      });
      const response = await fetch(`${scoreApi}?${params}`, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Skor servisi HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data.events) && data.events !== null) {
        throw new Error("Skor servisi beklenmeyen yanıt verdi.");
      }

      latestEvents = Array.isArray(data.events) ? data.events : [];
      renderScores();
      scoreUpdated.textContent = `Son güncelleme ${new Intl.DateTimeFormat("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Istanbul",
      }).format(new Date())}`;
    } catch (error) {
      console.error("Canlı skorlar yüklenemedi:", error);
      scoreUpdated.textContent = "Güncelleme başarısız";
      scoreMessage.textContent = "Skor verisi şu anda alınamıyor. Biraz sonra yeniden deneyin.";
    } finally {
      isLoading = false;
      refreshButton.disabled = false;
    }
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      selectedFilter = button.dataset.filter;
      filterButtons.forEach((filterButton) => {
        const isSelected = filterButton === button;
        filterButton.classList.toggle("is-active", isSelected);
        filterButton.setAttribute("aria-pressed", String(isSelected));
      });
      renderScores();
    });
  });

  refreshButton.addEventListener("click", loadScores);
  loadScores();
  window.setInterval(loadScores, refreshInterval);

  const verifiedFixtures = [
    {
      date: "2026-10-09T20:00:00+03:00",
      home: "Galatasaray",
      away: "Kasımpaşa",
    },
    {
      date: "2026-10-10T13:30:00+03:00",
      home: "Gençlerbirliği",
      away: "Amed SFK",
    },
    {
      date: "2026-10-11T13:30:00+03:00",
      home: "Konyaspor",
      away: "İstanbul Başakşehir",
    },
    {
      date: "2026-10-12T20:00:00+03:00",
      home: "Eyüpspor",
      away: "Göztepe",
    },
    {
      date: "2026-10-16T20:00:00+03:00",
      home: "Çorum FK",
      away: "Çaykur Rizespor",
    },
    {
      date: "2026-10-17T13:30:00+03:00",
      home: "Erzurum BB",
      away: "Eyüpspor",
    },
  ];
  const highlightedMatches = [
    {
      home: "Galatasaray",
      away: "Kasımpaşa",
      form: "Son 5 maç: Galatasaray M-G-M-G-G · Kasımpaşa B-G-B-B-G",
      pick: "Galatasaray kaybetmez",
    },
    {
      home: "Gençlerbirliği",
      away: "Amed SFK",
      form: "Son 5 maç: Gençlerbirliği M-M-M-B-G · Amed SFK G-G-B-G-M",
      pick: "Amed SFK kaybetmez",
    },
    {
      home: "Çorum FK",
      away: "Çaykur Rizespor",
      form: "Son 5 maç: Çorum FK M-G-G-M-M · Rizespor B-G-M-G-M",
      pick: "Çaykur Rizespor kaybetmez",
    },
  ];
  const fixtureList = document.querySelector("#fixture-list");
  const emptyState = document.querySelector("#empty-fixtures");
  const pickList = document.querySelector("#pick-list");

  if (verifiedFixtures.length === 0) {
    emptyState.hidden = false;
    fixtureList.hidden = true;
    return;
  }

  emptyState.hidden = true;
  fixtureList.hidden = false;
  fixtureList.innerHTML = verifiedFixtures
    .map((fixture) => {
      const date = new Date(fixture.date);
      const day = new Intl.DateTimeFormat("tr-TR", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }).format(date);
      const time = new Intl.DateTimeFormat("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Istanbul",
      }).format(date);

      return `
        <article class="fixture-card">
          <time class="fixture-time" datetime="${fixture.date}">
            <strong>${day}</strong>
            <span>${time}</span>
          </time>
          <div class="fixture-teams">
            <strong>${fixture.home}</strong>
            <span>—</span>
            <strong>${fixture.away}</strong>
          </div>
          <span class="fixture-status">Yaklaşan</span>
        </article>`;
    })
    .join("");

  pickList.innerHTML = highlightedMatches
    .map(
      (match, index) => `
        <li class="pick-card">
          <span class="pick-rank">${String(index + 1).padStart(2, "0")}</span>
          <span class="pick-details">
            <strong>${match.home} – ${match.away}</strong>
            <small>${match.form}</small>
          </span>
          <span class="pick-confidence">${match.pick}</span>
        </li>`,
    )
    .join("");
})();
