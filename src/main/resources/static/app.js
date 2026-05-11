const taskList = document.getElementById("task-list");
const taskForm = document.getElementById("task-form");
const refreshTasksButton = document.getElementById("refresh-tasks");
const chatMessages = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");

async function fetchTasks() {
  const response = await fetch("/api/tasks");
  const tasks = await response.json();
  renderTasks(tasks);
}

function renderTasks(tasks) {
  taskList.innerHTML = "";

  if (!tasks.length) {
    taskList.innerHTML = "<p>No hay tareas registradas.</p>";
    return;
  }

  tasks.forEach((task) => {
    const card = document.createElement("article");
    card.className = "task-card";
    const badgeClass = task.status === "DONE" ? "done" : task.status === "IN_PROGRESS" ? "progress" : "pending";

    card.innerHTML = `
      <h3>${escapeHtml(task.title)}</h3>
      <div class="task-meta">
        <span class="badge ${badgeClass}">${escapeHtml(task.status)}</span>
        <span>Responsable: ${escapeHtml(task.assignee)}</span>
        <span>${task.storyPoints} pts</span>
        <span>${escapeHtml(task.sprintName)}</span>
        <span>Entrega: ${escapeHtml(task.dueDate)}</span>
      </div>
    `;
    taskList.appendChild(card);
  });
}

taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    title: document.getElementById("title").value.trim(),
    assignee: document.getElementById("assignee").value.trim(),
    storyPoints: Number(document.getElementById("storyPoints").value || 3),
    sprintName: document.getElementById("sprintName").value.trim(),
  };

  await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  taskForm.reset();
  await fetchTasks();
});

refreshTasksButton.addEventListener("click", fetchTasks);

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;

  appendMessage("user", message);
  chatInput.value = "";

  const response = await fetch("/api/assistant/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  const payload = await response.json();
  appendMessage("assistant", payload.response);
  await fetchTasks();
});

document.querySelectorAll(".hint").forEach((button) => {
  button.addEventListener("click", () => {
    chatInput.value = button.dataset.message;
    chatInput.focus();
  });
});

function appendMessage(role, text) {
  const item = document.createElement("div");
  item.className = `message ${role}`;
  item.textContent = text;
  chatMessages.appendChild(item);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

appendMessage("assistant", "Hola. Puedo ayudarte con tareas, sprint y carga del equipo.");
fetchTasks();

