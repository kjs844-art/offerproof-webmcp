import { useState } from 'react';
import type { OfferProofService } from '../services/offerProofService';

interface Props {
  service: OfferProofService;
  canUndo: boolean;
  undoLabel: string | null;
}

export function UndoBar({ service, canUndo, undoLabel }: Props) {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="undo-bar" role="region" aria-label="되돌리기">
      <span aria-live="polite">{message ?? (canUndo ? `마지막 변경: ${undoLabel}` : '되돌릴 변경이 없습니다.')}</span>
      <button
        type="button"
        className="button secondary"
        disabled={!canUndo}
        onClick={() => {
          const label = service.undo();
          setMessage(label ? `되돌렸습니다: ${label}` : null);
        }}
      >
        되돌리기
      </button>
    </div>
  );
}
