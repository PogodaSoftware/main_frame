/** Tracks which booking thread (if any) is currently on screen, so the
 *  global new-message toast can suppress itself for the open conversation. */
let active: number | null = null;

export function setActiveChat(bookingId: number | null) { active = bookingId; }
export function getActiveChat(): number | null { return active; }
