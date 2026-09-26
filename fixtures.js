(() => {
  "use strict";

  const verifiedFixtures = [];
  const fixtureList = document.querySelector("#fixture-list");
  const emptyState = document.querySelector("#empty-fixtures");

  if (verifiedFixtures.length === 0) {
    emptyState.hidden = false;
    fixtureList.hidden = true;
    return;
  }

  emptyState.hidden = true;
  fixtureList.hidden = false;
})();
