"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type TaskStatus = "Backlog" | "In Progress" | "Review" | "Done";
type TaskPriority = "Low" | "Medium" | "High";
type ViewMode = "kanban" | "list";

type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

type TaskDraft = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  tags: string;
};

const STORAGE_KEY = "taskflow.tasks.v1";

const statuses: TaskStatus[] = ["Backlog", "In Progress", "Review", "Done"];
const priorities: TaskPriority[] = ["Low", "Medium", "High"];

const priorityStyles: Record<TaskPriority, string> = {
  Low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Medium: "border-amber-200 bg-amber-50 text-amber-700",
  High: "border-rose-200 bg-rose-50 text-rose-700",
};

const statusStyles: Record<TaskStatus, string> = {
  Backlog: "bg-stone-100 text-stone-700",
  "In Progress": "bg-sky-100 text-sky-700",
  Review: "bg-violet-100 text-violet-700",
  Done: "bg-emerald-100 text-emerald-700",
};

const sampleTasks: Task[] = [
  {
    id: "sample-1",
    title: "Map onboarding checklist",
    description: "Turn the first-run flow into a short, scannable set of tasks.",
    status: "Backlog",
    priority: "Medium",
    dueDate: "2026-05-10",
    tags: ["product", "planning"],
    createdAt: "2026-05-05T00:00:00.000Z",
    updatedAt: "2026-05-05T00:00:00.000Z",
  },
  {
    id: "sample-2",
    title: "Design task card states",
    description: "Cover empty, overdue, high-priority, and completed task states.",
    status: "In Progress",
    priority: "High",
    dueDate: "2026-05-08",
    tags: ["design"],
    createdAt: "2026-05-05T00:00:00.000Z",
    updatedAt: "2026-05-05T00:00:00.000Z",
  },
  {
    id: "sample-3",
    title: "Review weekly launch tasks",
    description: "Confirm the task list view exposes the same data as the board.",
    status: "Review",
    priority: "Low",
    dueDate: "2026-05-12",
    tags: ["ops", "review"],
    createdAt: "2026-05-05T00:00:00.000Z",
    updatedAt: "2026-05-05T00:00:00.000Z",
  },
  {
    id: "sample-4",
    title: "Publish internal task labels",
    description: "Document the default tags and priority language for TaskFlow.",
    status: "Done",
    priority: "Medium",
    dueDate: "2026-05-03",
    tags: ["docs"],
    createdAt: "2026-05-05T00:00:00.000Z",
    updatedAt: "2026-05-05T00:00:00.000Z",
  },
];

const emptyDraft: TaskDraft = {
  title: "",
  description: "",
  status: "Backlog",
  priority: "Medium",
  dueDate: "",
  tags: "",
};

function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isReady, setIsReady] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (stored) {
      try {
        setTasks(JSON.parse(stored) as Task[]);
      } catch {
        setTasks(sampleTasks);
      }
    } else {
      setTasks(sampleTasks);
    }

    setIsReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (isReady) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    }
  }, [isReady, tasks]);

  return { tasks, setTasks, isReady };
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `task-${Date.now()}`;
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function formatDate(value: string) {
  if (!value) return "No due date";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function isOverdue(task: Task) {
  if (!task.dueDate || task.status === "Done") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return new Date(`${task.dueDate}T00:00:00`) < today;
}

function getDraftFromTask(task: Task): TaskDraft {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    tags: task.tags.join(", "),
  };
}

export default function Home() {
  const { tasks, setTasks, isReady } = useTasks();
  const [view, setView] = useState<ViewMode>("kanban");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "All">("All");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "All">("All");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);

  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesQuery =
        !normalizedQuery ||
        [task.title, task.description, task.status, task.priority, ...task.tags]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesStatus = statusFilter === "All" || task.status === statusFilter;
      const matchesPriority =
        priorityFilter === "All" || task.priority === priorityFilter;

      return matchesQuery && matchesStatus && matchesPriority;
    });
  }, [priorityFilter, query, statusFilter, tasks]);

  const groupedTasks = useMemo(
    () =>
      statuses.map((status) => ({
        status,
        tasks: filteredTasks.filter((task) => task.status === status),
      })),
    [filteredTasks],
  );

  const completion = tasks.length
    ? Math.round(
        (tasks.filter((task) => task.status === "Done").length / tasks.length) * 100,
      )
    : 0;

  function openCreateEditor() {
    setEditingTask(null);
    setDraft(emptyDraft);
    setIsEditorOpen(true);
  }

  function openEditEditor(task: Task) {
    setEditingTask(task);
    setDraft(getDraftFromTask(task));
    setIsEditorOpen(true);
  }

  function closeEditor() {
    setIsEditorOpen(false);
    setEditingTask(null);
    setDraft(emptyDraft);
  }

  function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const now = new Date().toISOString();
    const normalizedTitle = draft.title.trim();

    if (!normalizedTitle) return;

    if (editingTask) {
      setTasks((current) =>
        current.map((task) =>
          task.id === editingTask.id
            ? {
                ...task,
                ...draft,
                title: normalizedTitle,
                tags: parseTags(draft.tags),
                updatedAt: now,
              }
            : task,
        ),
      );
    } else {
      setTasks((current) => [
        {
          id: createId(),
          title: normalizedTitle,
          description: draft.description.trim(),
          status: draft.status,
          priority: draft.priority,
          dueDate: draft.dueDate,
          tags: parseTags(draft.tags),
          createdAt: now,
          updatedAt: now,
        },
        ...current,
      ]);
    }

    closeEditor();
  }

  function deleteTask(taskId: string) {
    const confirmed = window.confirm("Delete this task?");
    if (!confirmed) return;

    setTasks((current) => current.filter((task) => task.id !== taskId));
  }

  function updateTaskStatus(taskId: string, status: TaskStatus) {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? { ...task, status, updatedAt: new Date().toISOString() }
          : task,
      ),
    );
  }

  function clearFilters() {
    setQuery("");
    setStatusFilter("All");
    setPriorityFilter("All");
  }

  return (
    <main className="min-h-screen bg-[#f6f3ee] text-stone-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-stone-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              TaskFlow
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-stone-950">
              Today&apos;s command center
            </h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative block">
              <span className="sr-only">Search tasks</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-11 w-full rounded-md border border-stone-300 bg-white px-4 pr-10 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 sm:w-72"
                placeholder="Search title, tag, status..."
              />
              <span className="pointer-events-none absolute right-3 top-2.5 text-stone-400">
                /
              </span>
            </label>

            <div className="grid h-11 grid-cols-2 rounded-md border border-stone-300 bg-white p-1 text-sm font-medium">
              <button
                type="button"
                onClick={() => setView("kanban")}
                className={`rounded px-3 transition ${
                  view === "kanban"
                    ? "bg-stone-950 text-white"
                    : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                Kanban
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className={`rounded px-3 transition ${
                  view === "list"
                    ? "bg-stone-950 text-white"
                    : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                List
              </button>
            </div>

            <button
              type="button"
              onClick={openCreateEditor}
              className="h-11 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
            >
              New task
            </button>
          </div>
        </header>

        <section className="grid gap-3 py-4 md:grid-cols-[1fr_auto_auto] md:items-center">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Tasks" value={tasks.length.toString()} />
            <Metric label="Done" value={`${completion}%`} />
            <Metric
              label="Overdue"
              value={tasks.filter((task) => isOverdue(task)).length.toString()}
            />
            <Metric label="Visible" value={filteredTasks.length.toString()} />
          </div>

          <SelectField
            label="Status"
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as TaskStatus | "All")}
            options={["All", ...statuses]}
          />
          <SelectField
            label="Priority"
            value={priorityFilter}
            onChange={(value) => setPriorityFilter(value as TaskPriority | "All")}
            options={["All", ...priorities]}
          />
        </section>

        {!isReady ? (
          <div className="flex flex-1 items-center justify-center rounded-md border border-stone-200 bg-white text-sm text-stone-500">
            Loading TaskFlow...
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState
            title="No tasks yet"
            description="Create your first task to start shaping the board."
            actionLabel="New task"
            onAction={openCreateEditor}
          />
        ) : filteredTasks.length === 0 ? (
          <EmptyState
            title="No matching tasks"
            description="Clear the current search or filters to see the full workspace."
            actionLabel="Clear filters"
            onAction={clearFilters}
          />
        ) : view === "kanban" ? (
          <section className="grid flex-1 gap-3 pb-5 lg:grid-cols-4">
            {groupedTasks.map(({ status, tasks: columnTasks }) => (
              <div
                key={status}
                className="flex min-h-80 flex-col rounded-md border border-stone-200 bg-white"
              >
                <div className="flex items-center justify-between border-b border-stone-200 px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${statusStyles[status]}`}
                    >
                      {status}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-stone-500">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-3">
                  {columnTasks.length ? (
                    columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onEdit={openEditEditor}
                        onDelete={deleteTask}
                        onStatusChange={updateTaskStatus}
                      />
                    ))
                  ) : (
                    <div className="flex min-h-32 items-center justify-center rounded-md border border-dashed border-stone-200 text-sm text-stone-400">
                      No tasks here
                    </div>
                  )}
                </div>
              </div>
            ))}
          </section>
        ) : (
          <section className="overflow-hidden rounded-md border border-stone-200 bg-white">
            <div className="grid grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr_auto] gap-3 border-b border-stone-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500 max-lg:hidden">
              <span>Task</span>
              <span>Status</span>
              <span>Priority</span>
              <span>Due</span>
              <span>Actions</span>
            </div>
            <div className="divide-y divide-stone-200">
              {filteredTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onEdit={openEditEditor}
                  onDelete={deleteTask}
                  onStatusChange={updateTaskStatus}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {isEditorOpen ? (
        <TaskEditor
          draft={draft}
          editingTask={editingTask}
          onChange={setDraft}
          onClose={closeEditor}
          onSubmit={saveTask}
        />
      ) : null}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-stone-200 bg-white px-3 py-2">
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <p className="text-xl font-semibold text-stone-950">{value}</p>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 min-w-40 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium normal-case tracking-normal text-stone-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <section className="flex flex-1 items-center justify-center rounded-md border border-dashed border-stone-300 bg-white px-6 py-20 text-center">
      <div>
        <h2 className="text-xl font-semibold text-stone-950">{title}</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-stone-500">
          {description}
        </p>
        <button
          type="button"
          onClick={onAction}
          className="mt-5 h-10 rounded-md bg-stone-950 px-4 text-sm font-semibold text-white transition hover:bg-stone-800"
        >
          {actionLabel}
        </button>
      </div>
    </section>
  );
}

function TaskCard({
  task,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}) {
  return (
    <article className="rounded-md border border-stone-200 bg-stone-50 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold leading-5 text-stone-950">
            {task.title}
          </h3>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-stone-600">
            {task.description || "No description"}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-1 text-xs font-semibold ${priorityStyles[task.priority]}`}
        >
          {task.priority}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {task.tags.length ? (
          task.tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-white px-2 py-1 text-xs font-medium text-stone-600"
            >
              {tag}
            </span>
          ))
        ) : (
          <span className="text-xs text-stone-400">No tags</span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <span
          className={`text-xs font-semibold ${
            isOverdue(task) ? "text-rose-600" : "text-stone-500"
          }`}
        >
          {formatDate(task.dueDate)}
        </span>
        <div className="flex items-center gap-2">
          <select
            value={task.status}
            onChange={(event) =>
              onStatusChange(task.id, event.target.value as TaskStatus)
            }
            className="h-8 rounded border border-stone-300 bg-white px-2 text-xs font-medium text-stone-700"
            aria-label={`Change status for ${task.title}`}
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onEdit(task)}
            className="h-8 rounded border border-stone-300 bg-white px-2 text-xs font-semibold text-stone-700 hover:bg-stone-100"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(task.id)}
            className="h-8 rounded border border-rose-200 bg-white px-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

function TaskRow({
  task,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}) {
  return (
    <article className="grid gap-3 px-4 py-4 lg:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr_auto] lg:items-center">
      <div>
        <h3 className="text-sm font-semibold text-stone-950">{task.title}</h3>
        <p className="mt-1 text-sm text-stone-500">{task.description}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {task.tags.map((tag) => (
            <span key={tag} className="rounded bg-stone-100 px-2 py-1 text-xs">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <select
        value={task.status}
        onChange={(event) => onStatusChange(task.id, event.target.value as TaskStatus)}
        className="h-9 rounded-md border border-stone-300 bg-white px-2 text-sm"
        aria-label={`Change status for ${task.title}`}
      >
        {statuses.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>

      <span
        className={`w-fit rounded-full border px-2 py-1 text-xs font-semibold ${priorityStyles[task.priority]}`}
      >
        {task.priority}
      </span>

      <span
        className={`text-sm font-medium ${
          isOverdue(task) ? "text-rose-600" : "text-stone-600"
        }`}
      >
        {formatDate(task.dueDate)}
      </span>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="h-9 rounded-md border border-stone-300 px-3 text-sm font-semibold text-stone-700 hover:bg-stone-100"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          className="h-9 rounded-md border border-rose-200 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"
        >
          Delete
        </button>
      </div>
    </article>
  );
}

function TaskEditor({
  draft,
  editingTask,
  onChange,
  onClose,
  onSubmit,
}: {
  draft: TaskDraft;
  editingTask: Task | null;
  onChange: (draft: TaskDraft) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-stone-950/40 p-0 sm:items-center sm:justify-center sm:p-6">
      <form
        onSubmit={onSubmit}
        className="w-full rounded-t-md bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-md"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              {editingTask ? "Edit task" : "New task"}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-stone-950">
              {editingTask ? "Update task details" : "Create a focused task"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-stone-300 px-3 text-sm font-semibold text-stone-700 hover:bg-stone-100"
          >
            Close
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            Title
            <input
              required
              value={draft.title}
              onChange={(event) => onChange({ ...draft, title: event.target.value })}
              className="h-11 rounded-md border border-stone-300 px-3 text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              placeholder="Write the task title"
            />
          </label>

          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            Description
            <textarea
              value={draft.description}
              onChange={(event) =>
                onChange({ ...draft, description: event.target.value })
              }
              className="min-h-28 rounded-md border border-stone-300 px-3 py-2 text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              placeholder="Add useful context"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-1 text-sm font-semibold text-stone-700">
              Status
              <select
                value={draft.status}
                onChange={(event) =>
                  onChange({ ...draft, status: event.target.value as TaskStatus })
                }
                className="h-11 rounded-md border border-stone-300 px-3 text-sm font-normal"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-semibold text-stone-700">
              Priority
              <select
                value={draft.priority}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    priority: event.target.value as TaskPriority,
                  })
                }
                className="h-11 rounded-md border border-stone-300 px-3 text-sm font-normal"
              >
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-semibold text-stone-700">
              Due date
              <input
                type="date"
                value={draft.dueDate}
                onChange={(event) =>
                  onChange({ ...draft, dueDate: event.target.value })
                }
                className="h-11 rounded-md border border-stone-300 px-3 text-sm font-normal"
              />
            </label>
          </div>

          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            Tags
            <input
              value={draft.tags}
              onChange={(event) => onChange({ ...draft, tags: event.target.value })}
              className="h-11 rounded-md border border-stone-300 px-3 text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              placeholder="design, launch, ops"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-md border border-stone-300 px-4 text-sm font-semibold text-stone-700 hover:bg-stone-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="h-11 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            {editingTask ? "Save changes" : "Create task"}
          </button>
        </div>
      </form>
    </div>
  );
}
