document.addEventListener("click", (e) => {
  const link = e.target.closest("a");
  if (link) {
    e.preventDefault();
    browser.tabs.create({ url: link.href });
  }
  window.close();
});

browser.runtime.sendMessage({ type: "getState" }).then((state) => {
  const el = document.getElementById("content");
  el.textContent = "";
  if (state.error) {
    const div = document.createElement("div");
    div.className = "error";
    div.textContent = `Error: ${state.error}`;
    el.append(div);
    return;
  }

  const rows = [
    ["Next version: ", `Firefox ${state.nextVersion}`],
    ["Nightly starts: ", state.nextNightlyDate],
    ["Days remaining: ", state.daysRemaining],
  ];

  for (const [label, value] of rows) {
    const row = document.createElement("div");
    row.className = "row";

    const labelSpan = document.createElement("span");
    labelSpan.className = "label";
    labelSpan.textContent = label;

    const valueSpan = document.createElement("span");
    valueSpan.className = "value";
    valueSpan.textContent = value;

    row.append(labelSpan, valueSpan);
    el.append(row);
  }
});
