(() => {
  "use strict";

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
