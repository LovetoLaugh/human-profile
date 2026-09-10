'use client';
import { useEffect, useId, useRef, type ReactNode } from 'react';
export function ProfileModal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
 const ref = useRef<HTMLDialogElement>(null);
 const titleId = useId();
 useEffect(() => {
  const previous = document.activeElement as HTMLElement | null;
  const dialog = ref.current;
  dialog?.showModal();
  return () => { dialog?.close(); previous?.focus(); };
 }, []);
 return <dialog className="evidence-dialog" ref={ref} aria-labelledby={titleId} onCancel={onClose} onClick={e => { if (e.target === ref.current) onClose(); }}>
  <div className="evidence-dialog-content"><div className="panel-heading"><h2 id={titleId}>{title}</h2><button className="evidence-link" autoFocus onClick={onClose}>Close</button></div>{children}</div>
 </dialog>;
}
