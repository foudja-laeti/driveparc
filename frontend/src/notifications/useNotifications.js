// ─── src/notifications/useNotifications.js ───────────────────────────────────
// Hook de notifications avec :
//   • Polling toutes les 30 secondes
//   • Son Web Audio API (pas de fichier externe requis)
//   • Détection des nouvelles notifs par comparaison d'IDs
//   • Marquage lu / tout lire
//   • Compatible gestionnaire ET personnel
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from "react";

const API_BASE = "http://localhost:8000/api/v1";
const POLL_MS  = 30_000; // 30 secondes

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (res.status === 401) { window.location.href = "/login"; return null; }
  if (res.status === 204) return null;
  const json = await res.json();
  return json?.data ?? json;
}

// ── Son de notification (Web Audio API — aucun fichier requis) ───────────────
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Note 1 : Do (523 Hz)
    const o1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    o1.connect(g1); g1.connect(ctx.destination);
    o1.type = "sine";
    o1.frequency.setValueAtTime(523, ctx.currentTime);
    g1.gain.setValueAtTime(0.15, ctx.currentTime);
    g1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    o1.start(ctx.currentTime);
    o1.stop(ctx.currentTime + 0.35);

    // Note 2 : Mi (659 Hz) avec léger délai
    const o2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    o2.connect(g2); g2.connect(ctx.destination);
    o2.type = "sine";
    o2.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
    g2.gain.setValueAtTime(0, ctx.currentTime);
    g2.gain.setValueAtTime(0.12, ctx.currentTime + 0.15);
    g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    o2.start(ctx.currentTime + 0.15);
    o2.stop(ctx.currentTime + 0.5);

    // Fermer le contexte après
    setTimeout(() => ctx.close(), 600);
  } catch {
    // Silently fail if Web Audio not supported
  }
}

// ── Hook principal ────────────────────────────────────────────────────────────
export function useNotifications({ soundEnabled = true } = {}) {
  const [notifications, setNotifications]   = useState([]);
  const [loading,       setLoading]         = useState(true);
  const [error,         setError]           = useState(null);
  const knownIdsRef   = useRef(new Set());
  const firstLoadRef  = useRef(true);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const fetchNotifs = useCallback(async () => {
    try {
      const data = await apiFetch("/notifications/?page_size=50");
      if (!data) return;

      const list = Array.isArray(data) ? data : data?.results ?? [];

      // Détecter les nouvelles notifs non lues (après le premier chargement)
      if (!firstLoadRef.current) {
        const newUnread = list.filter(
          n => n.status === "NON_LU" && !knownIdsRef.current.has(n.id)
        );
        if (newUnread.length > 0 && soundEnabledRef.current) {
          playNotificationSound();
        }
      }

      // Mettre à jour les IDs connus
      list.forEach(n => knownIdsRef.current.add(n.id));
      firstLoadRef.current = false;

      setNotifications(list);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Chargement initial + polling
  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, POLL_MS);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  // Marquer une notif comme lue
  const markRead = useCallback(async (id) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, status: "LU" } : n)
    );
    try {
      await apiFetch(`/notifications/${id}/mark_read/`, { method: "POST" });
    } catch {
      // Rollback si échec
      await fetchNotifs();
    }
  }, [fetchNotifs]);

  // Marquer tout comme lu
  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, status: "LU" })));
    try {
      await apiFetch("/notifications/mark_all_read/", { method: "POST" });
    } catch {
      await fetchNotifs();
    }
  }, [fetchNotifs]);

  // Supprimer une notif
  const deleteNotif = useCallback(async (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await apiFetch(`/notifications/${id}/`, { method: "DELETE" });
    } catch {
      await fetchNotifs();
    }
  }, [fetchNotifs]);

  const unreadCount = notifications.filter(n => n.status === "NON_LU").length;

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markRead,
    markAllRead,
    deleteNotif,
    refresh: fetchNotifs,
    playSound: playNotificationSound,
  };
}