'use client';
import { useEffect } from 'react';

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 'max-w-lg',
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  width?: string;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} />
      <div className={`animate-pop relative w-full ${width} max-h-[88vh] overflow-hidden rounded-3xl bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button className="grid size-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>
        <div className="scroll-thin max-h-[calc(88vh-140px)] overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmText = '확인',
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      width="max-w-md"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onCancel}>
            취소
          </button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} autoFocus>
            {confirmText}
          </button>
        </>
      }
    >
      <div className="text-sm leading-relaxed text-slate-600">{message}</div>
    </Modal>
  );
}
