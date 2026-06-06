// app/brands/[slug]/tasks/TasksManager.js

'use client';

import { useState } from 'react';

export default function TasksManager({ brandSlug, initialTasks }) {
  const [tasks, setTasks] = useState(initialTasks || []);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function addTask(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true); setErr('');
    try {
      const res = await fetch(`/api/brands/${brandSlug}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Add failed');
      setTasks((cur) => [...cur, data.task]);
      setText('');
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function toggle(task) {
    const prev = task.done;
    setTasks((cur) => cur.map((t) => t.id === task.id ? { ...t, done: !prev } : t));
    try {
      const res = await fetch(`/api/brands/${brandSlug}/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: !prev }),
      });
      if (!res.ok) throw new Error('Toggle failed');
    } catch (e) {
      // revert on error
      setTasks((cur) => cur.map((t) => t.id === task.id ? { ...t, done: prev } : t));
      setErr(e.message);
    }
  }

  async function remove(task) {
    setTasks((cur) => cur.filter((t) => t.id !== task.id));
    try {
      const res = await fetch(`/api/brands/${brandSlug}/tasks/${task.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
    } catch (e) {
      setTasks((cur) => [...cur, task]);
      setErr(e.message);
    }
  }

  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <div>
      <form onSubmit={addTask} style={styles.form}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a task…"
          disabled={busy}
          style={styles.input}
        />
        <button type="submit" disabled={busy || !text.trim()} style={styles.button(busy || !text.trim())}>
          {busy ? 'Adding…' : 'Add'}
        </button>
      </form>
      {err && <div style={styles.err}>{err}</div>}

      {open.length === 0 && done.length === 0 ? (
        <p style={{ color: '#999', marginTop: 24 }}>No tasks yet.</p>
      ) : (
        <>
          <ul style={styles.list}>
            {open.map((t) => <TaskRow key={t.id} task={t} onToggle={() => toggle(t)} onDelete={() => remove(t)} />)}
          </ul>
          {done.length > 0 && (
            <>
              <div style={styles.doneHeader}>Done ({done.length})</div>
              <ul style={styles.list}>
                {done.map((t) => <TaskRow key={t.id} task={t} onToggle={() => toggle(t)} onDelete={() => remove(t)} />)}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}

function TaskRow({ task, onToggle, onDelete }) {
  return (
    <li style={styles.row}>
      <input type="checkbox" checked={task.done} onChange={onToggle} style={styles.checkbox} />
      <span style={styles.text(task.done)}>{task.text}</span>
      <button onClick={onDelete} style={styles.deleteBtn} title="Delete">×</button>
    </li>
  );
}

const styles = {
  form: { display: 'flex', gap: 8, marginBottom: 8 },
  input: {
    flex: 1, padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8,
    fontSize: 14, fontFamily: 'inherit',
  },
  button: (disabled) => ({
    padding: '10px 16px', background: disabled ? '#999' : '#000', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 13, cursor: disabled ? 'default' : 'pointer',
  }),
  err: { color: '#c00', fontSize: 12, marginBottom: 8 },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f0f0f0' },
  checkbox: { width: 18, height: 18, cursor: 'pointer' },
  text: (done) => ({
    flex: 1, fontSize: 14, color: done ? '#999' : '#111',
    textDecoration: done ? 'line-through' : 'none',
  }),
  deleteBtn: {
    background: 'none', border: 'none', color: '#bbb', fontSize: 22,
    cursor: 'pointer', padding: '0 8px', lineHeight: 1,
  },
  doneHeader: { marginTop: 24, fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
};
