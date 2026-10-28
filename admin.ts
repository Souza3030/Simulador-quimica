import { getIdToken, onAuthStateChanged, reload } from "firebase/auth";
import {
  auth,
  adminEmail,
  createEmailAccount,
  login,
  loginWithEmail,
  logout,
  isAdminUser,
  listCloudNotebooks,
  verifyEmail,
} from "./firebase.ts";
import { exportNotebook } from "./notebook-data.ts";
import { experiments, getExperiment } from "./experiments.ts";
import type { Notebook } from "./notebook-data.ts";
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
type Row = { uid: string; email: string; data: Notebook; updatedAt?: Date };
let rows: Row[] = [];
function status(text: string) {
  $("#admin-status").textContent = text;
}
function download(row: Row) {
  const url = URL.createObjectURL(
    new Blob([exportNotebook(row.data)], {
      type: "application/json;charset=utf-8",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `termolab-${row.uid}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function stats() {
  const totals = [
    ["Cadernos", rows.length],
    ["Ensaios", rows.reduce((n, r) => n + r.data.snapshots.length, 0)],
    ["Leituras", rows.reduce((n, r) => n + r.data.measurements.length, 0)],
    ["Temas visitados", rows.reduce((n, r) => n + r.data.visited.length, 0)],
  ];
  $("#admin-stats").innerHTML = totals
    .map(
      ([label, value]) =>
        `<div class="admin-stat"><strong>${value}</strong><span>${label}</span></div>`,
    )
    .join("");
}
function detail(row: Row) {
  const panel = $("#admin-detail");
  panel.hidden = false;
  panel.innerHTML = `<span class="eyebrow">CADERNO INDIVIDUAL</span><h2>${esc(row.email || row.uid)}</h2><p>UID: <code>${esc(row.uid)}</code> · Última sincronização: ${row.updatedAt ? esc(row.updatedAt.toLocaleString("pt-BR")) : "indisponível"}</p><div class="admin-stat-grid"><div class="admin-stat"><strong>${row.data.snapshots.length}</strong><span>Ensaios</span></div><div class="admin-stat"><strong>${row.data.measurements.length}</strong><span>Leituras</span></div><div class="admin-stat"><strong>${row.data.solved.length}</strong><span>Hipóteses</span></div><div class="admin-stat"><strong>${row.data.numericSolved.length}</strong><span>Desafios numéricos</span></div></div><h3>Ensaios por assunto</h3><ul>${
    experiments
      .filter((e) => row.data.snapshots.some((s) => s.mode === e.id))
      .map(
        (e) =>
          `<li>${esc(e.name)}: ${row.data.snapshots.filter((s) => s.mode === e.id).length}</li>`,
      )
      .join("") || "<li>Nenhum ensaio.</li>"
  }</ul><h3>Anotações</h3><p><strong>Ver:</strong> ${esc(row.data.notes.see) || "—"}</p><p><strong>Pensar:</strong> ${esc(row.data.notes.think) || "—"}</p><p><strong>Perguntar:</strong> ${esc(row.data.notes.ask) || "—"}</p><h3>Registros recentes</h3><ul>${
    row.data.snapshots
      .slice(-5)
      .map(
        (s) =>
          `<li>${esc(getExperiment(s.mode).name)} · ${Math.round(s.progress * 100)}% · ${esc(s.date)}</li>`,
      )
      .join("") || "<li>Sem ensaios.</li>"
  }</ul><div class="route-actions"><button id="admin-export-pdf" class="primary-action">Exportar PDF</button><button id="admin-export-user" class="secondary-action">Exportar JSON</button></div>`;
  $("#admin-export-user").addEventListener("click", () => download(row));
  $("#admin-export-pdf").addEventListener("click", async () => {
    const button = $<HTMLButtonElement>("#admin-export-pdf");
    button.disabled = true;
    button.textContent = "Preparando PDF…";
    try {
      const { downloadNotebookPdf } = await import("./pdf.ts");
      await downloadNotebookPdf(row.data, row.email || row.uid);
      status("PDF do caderno gerado.");
    } catch (error) {
      status(
        `Não foi possível gerar o PDF: ${error instanceof Error ? error.message : "tente novamente"}`,
      );
    } finally {
      button.disabled = false;
      button.textContent = "Exportar PDF";
    }
  });
  panel.scrollIntoView({ block: "start", behavior: "smooth" });
}
function render() {
  stats();
  const query = $<HTMLInputElement>("#admin-search").value.trim().toLowerCase();
  const filtered = rows.filter((r) =>
    `${r.email} ${r.uid}`.toLowerCase().includes(query),
  );
  $("#admin-list").innerHTML = filtered.length
    ? `<div class="route-scroll"><table class="route-table"><thead><tr><th scope="col">Usuário</th><th scope="col">Ensaios</th><th scope="col">Leituras</th><th scope="col">Sincronização</th><th scope="col">Detalhes</th></tr></thead><tbody>${filtered.map((r) => `<tr><th scope="row">${esc(r.email || r.uid)}<small style="display:block">${esc(r.uid)}</small></th><td>${r.data.snapshots.length}</td><td>${r.data.measurements.length}</td><td>${r.updatedAt ? esc(r.updatedAt.toLocaleString("pt-BR")) : "—"}</td><td><button class="secondary-action" data-user="${esc(r.uid)}">Abrir</button></td></tr>`).join("")}</tbody></table></div>`
    : '<p class="empty">Nenhum caderno sincronizado corresponde à busca.</p>';
  document.querySelectorAll<HTMLButtonElement>("[data-user]").forEach(
    (b) =>
      (b.onclick = () => {
        const row = rows.find((r) => r.uid === b.dataset.user);
        if (row) detail(row);
      }),
  );
}
async function refresh() {
  if (!auth.currentUser || !isAdminUser(auth.currentUser)) return;
  status("Carregando cadernos do Firestore…");
  try {
    rows = await listCloudNotebooks();
    render();
    status(`${rows.length} caderno(s) carregado(s) do Firestore.`);
  } catch (e) {
    $("#dashboard").hidden = true;
    status(
      `Não foi possível ler o banco. Confira as regras publicadas e a criação do Firestore. ${e instanceof Error ? e.message : ""}`,
    );
  }
}
$("#admin-login").addEventListener("click", async () => {
  try {
    await login();
  } catch (e) {
    status(
      `Falha ao entrar: ${e instanceof Error ? e.message : "tente novamente"}`,
    );
  }
});
const emailForm = $<HTMLFormElement>("#admin-email-form");
const emailField = $<HTMLInputElement>("#admin-email");
const passwordField = $<HTMLInputElement>("#admin-password");
emailField.value = adminEmail;
emailForm.onsubmit = async (event) => {
  event.preventDefault();
  try {
    await loginWithEmail(emailField.value.trim(), passwordField.value);
    passwordField.value = "";
  } catch (error) {
    passwordField.value = "";
    status(
      `Não foi possível entrar com e-mail: ${error instanceof Error ? error.message : "tente novamente"}`,
    );
  }
};
$("#admin-create-account").addEventListener("click", async () => {
  if (emailField.value.trim().toLowerCase() !== adminEmail) {
    status("Esta página só cria a conta do e-mail administrador configurado.");
    return;
  }
  try {
    await createEmailAccount(emailField.value.trim(), passwordField.value);
    passwordField.value = "";
    status(
      "Conta criada. Abra o e-mail de verificação enviado pelo Firebase antes de acessar o painel.",
    );
  } catch (error) {
    passwordField.value = "";
    status(
      `Não foi possível criar a conta: ${error instanceof Error ? error.message : "tente novamente"}`,
    );
  }
});
$("#admin-verify-email").addEventListener("click", async () => {
  try {
    await verifyEmail();
    status(
      "E-mail de verificação enviado. Abra a mensagem e depois clique em “Já verifiquei meu e-mail”.",
    );
  } catch (error) {
    status(
      `Não foi possível enviar a verificação: ${error instanceof Error ? error.message : "tente novamente"}`,
    );
  }
});
$("#admin-check-email").addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;
  try {
    await reload(user);
    await getIdToken(user, true);
    presentUser(user);
  } catch (error) {
    status(
      `Não foi possível conferir a conta: ${error instanceof Error ? error.message : "tente novamente"}`,
    );
  }
});
$("#admin-logout").addEventListener("click", () => logout());
$("#admin-refresh").addEventListener("click", refresh);
$<HTMLInputElement>("#admin-search").oninput = render;
function presentUser(user: typeof auth.currentUser) {
  $("#admin-login").hidden = !!user;
  $("#admin-logout").hidden = !user;
  emailForm.hidden = !!user;
  $("#admin-verify-email").hidden = !user || user.emailVerified;
  $("#admin-check-email").hidden = !user || user.emailVerified;
  $("#email-login-section").hidden = !!user && user.emailVerified;
  $("#admin-account").textContent = user?.email || "Entrar como administrador";
  $("#admin-uid").textContent = user ? `UID: ${user.uid}` : "";
  if (!user) {
    $("#dashboard").hidden = true;
    status("Entre com Google ou e-mail e senha para verificar o acesso.");
    return;
  }
  if (!isAdminUser(user)) {
    $("#dashboard").hidden = true;
    status(
      user.emailVerified
        ? "Acesso restrito ao e-mail administrador configurado."
        : "Verifique seu e-mail para liberar o acesso de administrador.",
    );
    return;
  }
  $("#dashboard").hidden = false;
  void refresh();
}
onAuthStateChanged(auth, presentUser);
