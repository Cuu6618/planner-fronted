const BASE = "http://localhost:8000";

export const getTasks = (userId, date) =>
  fetch(`${BASE}/tasks/?user_id=${userId}&date=${date}`).then(r => r.json());

export const createTask = (task) =>
  fetch(`${BASE}/tasks/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task),
  }).then(r => r.json());

export const completeTask = (taskId) =>
  fetch(`${BASE}/tasks/${taskId}/complete`, { method: "PATCH" }).then(r => r.json());

export const deleteTask = (taskId) =>
  fetch(`${BASE}/tasks/${taskId}`, { method: "DELETE" }).then(r => r.json());