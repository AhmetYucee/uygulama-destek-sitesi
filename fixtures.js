(() => {
  "use strict";

  const scoreList = document.querySelector("#score-list");
  const scoreMessage = document.querySelector("#score-message");
  const scoreUpdated = document.querySelector("#live-update");
  const refreshButton = document.querySelector("#refresh-scores");
  const filterButtons = [...document.querySelectorAll(".score-filter")];
  const nationsDashboard = document.querySelector("#nations-dashboard");
  const nationsGroupFilter = document.querySelector("#nations-group-filter");
  const nationsStatusButtons = [...document.querySelectorAll(".nations-status-button")];
  const scoreApi = "https://www.thesportsdb.com/api/v1/json/123/eventsday.php";
  const refreshInterval = 60_000;
  const nationsLeagueFeed = "nations-league.json";
  const teamNamesTR = {
    Albania: "Arnavutluk",
    Andorra: "Andorra",
    Armenia: "Ermenistan",
    Austria: "Avusturya",
    Azerbaijan: "Azerbaycan",
    Belarus: "Belarus",
    Belgium: "Belçika",
    Bulgaria: "Bulgaristan",
    "Bosnia-Herzegovina": "Bosna-Hersek",
    "Bosnia and Herzegovina": "Bosna-Hersek",
    Croatia: "Hırvatistan",
    Czechia: "Çekya",
    "Czech Republic": "Çekya",
    Cyprus: "Kıbrıs",
    Denmark: "Danimarka",
    England: "İngiltere",
    Estonia: "Estonya",
    "Faroe Islands": "Faroe Adaları",
    Finland: "Finlandiya",
    France: "Fransa",
    Georgia: "Gürcistan",
    Germany: "Almanya",
    Gibraltar: "Cebelitarık",
    Greece: "Yunanistan",
    Hungary: "Macaristan",
    Iceland: "İzlanda",
    Israel: "İsrail",
    Italy: "İtalya",
    Kazakhstan: "Kazakistan",
    Kosovo: "Kosova",
    Latvia: "Letonya",
    Liechtenstein: "Lihtenştayn",
    Lithuania: "Litvanya",
    Luxembourg: "Lüksemburg",
    Malta: "Malta",
    Moldova: "Moldova",
    Montenegro: "Karadağ",
    Netherlands: "Hollanda",
    "North Macedonia": "Kuzey Makedonya",
    "Northern Ireland": "Kuzey İrlanda",
    Norway: "Norveç",
    Poland: "Polonya",
    Portugal: "Portekiz",
    Romania: "Romanya",
    "Republic of Ireland": "İrlanda Cumhuriyeti",
    Scotland: "İskoçya",
    Serbia: "Sırbistan",
    Slovakia: "Slovakya",
    Slovenia: "Slovenya",
    "San Marino": "San Marino",
    Spain: "İspanya",
    Sweden: "İsveç",
    Switzerland: "İsviçre",
    Turkey: "Türkiye",
    Türkiye: "Türkiye",
    Ukraine: "Ukrayna",
    Wales: "Galler",
  };
  let selectedFilter = "all";
  let latestEvents = [];
  let isLoading = false;
  let nationsEvents = [];
  let nationsFeedLoaded = false;
  let nationsFeedError = false;
  let nationsFetchedAt = "";
  let selectedNationsStatus = "all";

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

  function formatKickoff(date, options) {
    return new Intl.DateTimeFormat("tr-TR", {
      ...options,
      timeZone: "Europe/Istanbul",
    }).format(new Date(date));
  }

  function renderNationsLeague() {
    nationsDashboard.hidden = !nationsFeedLoaded;
    scoreList.classList.toggle("nations-score-list", nationsFeedLoaded);

    if (nationsFeedError && !nationsFeedLoaded) {
      scoreMessage.textContent = "UEFA Uluslar Ligi fikstür akışı şu anda alınamıyor. Yeniden denemek için Yenile'ye dokunun.";
      scoreList.replaceChildren();
      return;
    }

    if (!nationsFeedLoaded) {
      scoreMessage.textContent = "UEFA Uluslar Ligi maçları yükleniyor.";
      scoreList.replaceChildren();
      return;
    }

    const groupOptions = [...new Set(nationsEvents.map((event) => event.group).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right, "en"));
    const currentGroup = nationsGroupFilter.value;
    nationsGroupFilter.innerHTML = '<option value="all">Tüm gruplar</option>' +
      groupOptions.map((group) => {
        const label = group.replace(/^Group\b/i, "Grup");
        return `<option value="${escapeHTML(group)}">${escapeHTML(label)}</option>`;
      }).join("");
    nationsGroupFilter.value = groupOptions.includes(currentGroup) ? currentGroup : "all";

    const summary = {
      all: nationsEvents.length,
      in: nationsEvents.filter((event) => event.status?.state === "in").length,
      post: nationsEvents.filter((event) => event.status?.state === "post").length,
      pre: nationsEvents.filter((event) => event.status?.state === "pre").length,
    };
    document.querySelector("#nations-summary").innerHTML = `
      <div class="nations-stat nations-stat-live"><span class="nations-stat-indicator"></span><strong>${summary.in}</strong><span>Canlı</span></div>
      <div class="nations-stat"><strong>${summary.post}</strong><span>Tamamlandı</span></div>
      <div class="nations-stat"><strong>${summary.pre}</strong><span>Programda</span></div>`;

    const visibleEvents = nationsEvents.filter((event) => {
      const matchesGroup = nationsGroupFilter.value === "all" ||
        event.group === nationsGroupFilter.value;
      const matchesStatus = selectedNationsStatus === "all" ||
        event.status?.state === selectedNationsStatus;
      return matchesGroup && matchesStatus;
    });

    if (visibleEvents.length === 0) {
      scoreMessage.textContent = "Bu grup ve maç durumu için gösterilecek karşılaşma yok.";
      scoreList.replaceChildren();
      return;
    }

    scoreMessage.textContent = nationsFeedError
      ? `Son başarılı veri gösteriliyor; güncel veri alınamadı. ${visibleEvents.length} maç listeleniyor.`
      : `${visibleEvents.length} maç listeleniyor · Son 7 gün ve gelecek 21 gün`;
    scoreList.innerHTML = visibleEvents
      .map((event) => {
        const dateLabel = formatKickoff(event.date, {
          weekday: "short",
          day: "numeric",
          month: "short",
        });
        const timeLabel = formatKickoff(event.date, {
          hour: "2-digit",
          minute: "2-digit",
        });
        const state = event.status?.state;
        const live = state === "in";
        const finished = state === "post";
        const hasScore = state !== "pre" &&
          event.homeScore !== null &&
          event.awayScore !== null;
        const status = live
          ? `Canlı${event.clock ? ` · ${event.clock}` : ""}`
          : finished
            ? "Maç bitti"
            : timeLabel;
        const home = teamNamesTR[event.home] || event.home;
        const away = teamNamesTR[event.away] || event.away;
        const groupName = event.group?.replace(/^Group\b/i, "Grup");
        const score = hasScore
          ? `<strong>${escapeHTML(event.homeScore)}</strong><span aria-hidden="true">:</span><strong>${escapeHTML(event.awayScore)}</strong>`
          : '<span class="nations-versus">VS</span>';
        const stateClass = live ? " is-live" : finished ? " is-finished" : "";

        return `
          <article class="score-card nations-match-card${stateClass}">
            <div class="score-card-meta">
              <span class="nations-card-context"><span class="nations-group-tag">${escapeHTML(groupName || "Uluslar Ligi")}</span><span>${escapeHTML(dateLabel)}</span></span>
              <span class="score-status">${live ? '<i aria-hidden="true"></i>' : ""}${escapeHTML(status)}</span>
            </div>
            <div class="nations-matchup">
              <div class="nations-team"><strong>${escapeHTML(home)}</strong></div>
              <div class="nations-scoreline">${score}</div>
              <div class="nations-team"><strong>${escapeHTML(away)}</strong></div>
            </div>
            <div class="nations-card-footer"><span>UEFA Uluslar Ligi</span><span>${live ? "Şu anda oynanıyor" : finished ? "Karşılaşma tamamlandı" : "Başlama · TRT"}</span></div>
          </article>`;
      })
      .join("");
  }

  function renderScores() {
    if (selectedFilter === "nations-league") {
      renderNationsLeague();
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

  async function loadNationsLeague() {
    try {
      const response = await fetch(`${nationsLeagueFeed}?_=${Date.now()}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`UEFA Uluslar Ligi servisi HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data.events) || typeof data.fetchedAt !== "string") {
        throw new Error("UEFA Uluslar Ligi servisi beklenmeyen yanıt verdi.");
      }

      nationsEvents = data.events;
      nationsFetchedAt = data.fetchedAt;
      nationsFeedLoaded = true;
      nationsFeedError = false;
      if (selectedFilter === "nations-league") {
        scoreUpdated.textContent = `Uluslar Ligi · son veri ${formatKickoff(nationsFetchedAt, {
          hour: "2-digit",
          minute: "2-digit",
        })}`;
      }
    } catch (error) {
      console.error("UEFA Uluslar Ligi maçları yüklenemedi:", error);
      nationsFeedError = true;
      if (selectedFilter === "nations-league" && !nationsFeedLoaded) {
        scoreUpdated.textContent = "UEFA Uluslar Ligi verisi alınamadı";
      }
    }

    if (selectedFilter === "nations-league") renderScores();
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
      if (selectedFilter !== "nations-league") {
        scoreUpdated.textContent = `Son güncelleme ${new Intl.DateTimeFormat("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Istanbul",
        }).format(new Date())}`;
      }
    } catch (error) {
      console.error("Canlı skorlar yüklenemedi:", error);
      if (selectedFilter !== "nations-league") {
        scoreUpdated.textContent = "Güncelleme başarısız";
        scoreMessage.textContent = "Skor verisi şu anda alınamıyor. Biraz sonra yeniden deneyin.";
      }
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
      if (selectedFilter === "nations-league" && nationsFetchedAt) {
        scoreUpdated.textContent = `Uluslar Ligi · son veri ${formatKickoff(nationsFetchedAt, {
          hour: "2-digit",
          minute: "2-digit",
        })}`;
      }
    });
  });

  nationsGroupFilter.addEventListener("change", renderNationsLeague);
  nationsStatusButtons.forEach((button) => {
    button.addEventListener("click", () => {
      selectedNationsStatus = button.dataset.nationsStatus;
      nationsStatusButtons.forEach((statusButton) => {
        const selected = statusButton === button;
        statusButton.classList.toggle("is-active", selected);
        statusButton.setAttribute("aria-pressed", String(selected));
      });
      renderNationsLeague();
    });
  });

  refreshButton.addEventListener("click", () => {
    loadScores();
    loadNationsLeague();
  });
  loadScores();
  loadNationsLeague();
  window.setInterval(() => {
    loadScores();
    loadNationsLeague();
  }, refreshInterval);

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
