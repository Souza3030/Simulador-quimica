import { onAuthStateChanged } from "firebase/auth";
import {
  auth,
  getCloudNotebook,
  login,
  logout,
  putCloudNotebook,
} from "./firebase.ts";
import {
  loadNotebook,
  saveNotebook,
  sanitizeNotebook,
  exportNotebook,
  storageKey,
} from "./notebook-data.ts";
import type { Notebook, Snapshot } from "./notebook-data.ts";
import { experiments, evaluate, getExperiment } from "./experiments.ts";
import type { Mode } from "./experiments.ts";
const $ = <T extends Element = HTMLElement>(selector: string) => {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Elemento ausente: ${selector}`);
  return el;
};
const esc = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const fmt = (n: number, d = 2) =>
  n.toLocaleString("pt-BR", { maximumFractionDigits: d });
const channel = new BroadcastChannel("termolab-caderno");
let book = loadNotebook(),
  ready = false,
  timer: ReturnType<typeof setTimeout> | undefined;
let compareMode: Mode = book.selected;
function status(message: string) {
  $("#sync-status").textContent = message;
}
function updateBackupButton() {
  $("#restore-backup").hidden = !localStorage.getItem(`${storageKey}-backup`);
}
function queueCloud() {
  if (!ready || !auth.currentUser) return;
  clearTimeout(timer);
  status("Salvo neste navegador. Sincronizando…");
  timer = setTimeout(async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await putCloudNotebook(user, loadNotebook());
      status("Salvo neste navegador e no Firestore.");
    } catch {
      status(
        "Salvo neste navegador. A sincronização falhou; verifique o Firebase.",
      );
    }
  }, 700);
}
function save() {
  if (!saveNotebook(book)) {
    status("O navegador não permitiu salvar. Exporte uma cópia JSON.");
    return;
  }
  status("Salvo neste navegador.");
  queueCloud();
}
function syncFields() {
  for (const key of ["see", "think", "ask"] as const)
    $<HTMLTextAreaElement>(`#note-${key}`).value = book.notes[key];
}
function renderRuns() {
  $("#run-count").textContent = `${book.snapshots.length}/12`;
  $("#saved-runs").innerHTML = book.snapshots.length
    ? book.snapshots
        .map((s, i) => {
          const r = evaluate(s.mode, s.params, s.progress);
          return `<article class="saved-run"><div><strong>${i + 1}. ${esc(getExperiment(s.mode).name)} · ${fmt(s.progress * 100, 0)}%</strong><p>${r.metrics.map((m) => `${esc(m.label)}: ${fmt(m.value)} ${esc(m.unit)}`).join(" · ")}</p></div><div class="route-actions"><button class="secondary-action" data-restore="${esc(s.id)}">Retomar</button><button class="danger-action" data-delete="${esc(s.id)}" aria-label="Excluir ensaio ${i + 1}">Excluir</button></div></article>`;
        })
        .join("")
    : '<p class="empty">Nenhum ensaio guardado. Abra a bancada, escolha um instante e clique em “Guardar este ensaio”.</p>';
  document.querySelectorAll<HTMLButtonElement>("[data-restore]").forEach(
    (button) =>
      (button.onclick = () => {
        const snapshot = book.snapshots.find(
          (s) => s.id === button.dataset.restore,
        );
        if (!snapshot) return;
        channel.postMessage({ type: "restore", snapshot });
        status(
          "Ensaio enviado à bancada aberta. Se ela estiver fechada, abra a bancada e tente novamente.",
        );
      }),
  );
  document.querySelectorAll<HTMLButtonElement>("[data-delete]").forEach(
    (button) =>
      (button.onclick = () => {
        book.snapshots = book.snapshots.filter(
          (s) => s.id !== button.dataset.delete,
        );
        save();
        renderRuns();
        renderComparison();
      }),
  );
}
function renderComparison() {
  const selected = book.snapshots
    .filter((s) => s.mode === compareMode)
    .slice(-2);
  $("#comparison").innerHTML =
    selected.length < 2
      ? `<p class="empty">Guarde dois ensaios de “${esc(getExperiment(compareMode).name)}” para comparar.</p>`
      : `<div class="route-scroll"><table class="route-table"><thead><tr><th scope="col">Grandeza</th><th scope="col">Ensaio A</th><th scope="col">Ensaio B</th></tr></thead><tbody>${getExperiment(
          compareMode,
        )
          .controls.map(
            (c) =>
              `<tr><th scope="row">${esc(c.label)}</th>${selected.map((s) => `<td>${c.options ? esc(c.options[s.params[c.key]]) : fmt(s.params[c.key]) + " " + esc(c.unit)}</td>`).join("")}</tr>`,
          )
          .join("")}${evaluate(
          compareMode,
          selected[0].params,
          selected[0].progress,
        )
          .metrics.map(
            (m, i) =>
              `<tr><th scope="row">${esc(m.label)}</th>${selected
                .map((s) => {
                  const metric = evaluate(compareMode, s.params, s.progress)
                    .metrics[i];
                  return `<td>${fmt(metric.value)} ${esc(metric.unit)}</td>`;
                })
                .join("")}</tr>`,
          )
          .join("")}</tbody></table></div>`;
}
function renderReadings() {
  $("#readings").innerHTML = book.measurements.length
    ? `<div class="route-scroll"><table class="route-table"><thead><tr><th scope="col">Assunto</th><th scope="col">Avanço</th><th scope="col">Condições</th><th scope="col">Medições</th></tr></thead><tbody>${book.measurements
        .slice()
        .reverse()
        .map((s) => {
          const e = getExperiment(s.mode),
            r = evaluate(s.mode, s.params, s.progress);
          return `<tr><th scope="row">${esc(e.name)}</th><td>${fmt(s.progress * 100, 0)}%</td><td>${e.controls.map((c) => `${esc(c.label)}: ${c.options ? esc(c.options[s.params[c.key]]) : fmt(s.params[c.key]) + " " + esc(c.unit)}`).join("<br>")}</td><td>${r.metrics.map((m) => `${esc(m.label)}: ${fmt(m.value)} ${esc(m.unit)}`).join("<br>")}</td></tr>`;
        })
        .join("")}</tbody></table></div>`
    : '<p class="empty">As leituras registradas na aba “Tabela de dados” da bancada aparecerão aqui.</p>';
}
function render() {
  syncFields();
  renderRuns();
  renderComparison();
  renderReadings();
}
const modeSelect = $<HTMLSelectElement>("#compare-mode");
modeSelect.innerHTML = experiments
  .map((e) => `<option value="${e.id}">${esc(e.name)}</option>`)
  .join("");
modeSelect.value = compareMode;
modeSelect.onchange = () => {
  compareMode = modeSelect.value as Mode;
  renderComparison();
};
for (const key of ["see", "think", "ask"] as const)
  $<HTMLTextAreaElement>(`#note-${key}`).oninput = (event) => {
    book.notes[key] = (event.target as HTMLTextAreaElement).value;
    save();
  };
$("#sign-in").addEventListener("click", async () => {
  try {
    await login();
  } catch (e) {
    status(
      `Falha ao entrar com Google: ${e instanceof Error ? e.message : "tente novamente"}`,
    );
  }
});
$("#sign-out").addEventListener("click", async () => {
  await logout();
  status("Conta desconectada. O caderno local continua disponível.");
});
$("#export").addEventListener("click", () => {
  const url = URL.createObjectURL(
    new Blob([exportNotebook(book)], {
      type: "application/json;charset=utf-8",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "meu-caderno-termolab.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$("#restore-backup").addEventListener("click", () => {
  const raw = localStorage.getItem(`${storageKey}-backup`);
  if (!raw) return;
  try {
    book = sanitizeNotebook(JSON.parse(raw));
    save();
    render();
    status(
      "Cópia local restaurada. Exporte JSON se quiser guardá-la fora do navegador.",
    );
  } catch {
    status("A cópia local não pôde ser lida.");
  }
});
window.addEventListener("storage", (event) => {
  if (event.key === storageKey) {
    book = loadNotebook();
    render();
  }
});
onAuthStateChanged(auth, async (user) => {
  ready = false;
  $("#sign-in").hidden = !!user;
  $("#sign-out").hidden = !user;
  $("#account-name").textContent = user?.email ?? "Caderno local";
  if (!user) {
    status("Salvo neste navegador. Entre com Google para sincronizar.");
    return;
  }
  status("Conferindo dados salvos na nuvem…");
  try {
    const remote = await getCloudNotebook(user.uid),
      local = loadNotebook();
    if (remote && remote.updatedAt > local.updatedAt) {
      try {
        localStorage.setItem(`${storageKey}-backup`, JSON.stringify(local));
      } catch {
        /* optional backup */
      }
      book = sanitizeNotebook(remote);
      localStorage.setItem(storageKey, JSON.stringify(book));
      updateBackupButton();
      render();
    } else if (!remote || local.updatedAt > remote.updatedAt) {
      book = local;
      await putCloudNotebook(user, book);
    }
    ready = true;
    status("Salvo neste navegador e no Firestore.");
  } catch {
    status(
      "Salvo neste navegador. Ative Authentication e Firestore e publique as regras para sincronizar.",
    );
  }
});
render();
updateBackupButton();
status("Salvo neste navegador. Entre com Google para sincronizar.");
