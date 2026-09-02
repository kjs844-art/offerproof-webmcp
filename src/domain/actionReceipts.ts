import type { OfferCase } from './types.ts';

export const MAX_ACTION_RECEIPTS = 20;

export const RECEIPT_TOOL_NAMES = [
  'get_case_summary',
  'inspect_offer_signals',
  'build_verification_plan',
  'update_verification_step',
  'get_official_resources',
] as const;

export type ReceiptToolName = (typeof RECEIPT_TOOL_NAMES)[number];
export type ReceiptToolClass = 'read' | 'analysis' | 'mutation';
export type ReceiptOutcome = 'success' | 'blocked';

export interface ActionReceipt {
  receiptId: string;
  createdAt: string;
  toolName: ReceiptToolName;
  toolClass: ReceiptToolClass;
  outcome: ReceiptOutcome;
  caseId: string;
  caseVersion: number;
  message: string;
}

const RECEIPT_COPY: Record<ReceiptToolName, {
  toolClass: ReceiptToolClass;
  success: string;
  blocked: string;
}> = {
  get_case_summary: {
    toolClass: 'read',
    success: '개인정보 보호 사례 요약을 읽었습니다.',
    blocked: '사례 요약을 반환하지 않았습니다. 화면의 개인정보 확인 상태를 점검하세요.',
  },
  inspect_offer_signals: {
    toolClass: 'analysis',
    success: '브라우저 로컬 신호 검사를 완료했습니다.',
    blocked: '신호 검사를 적용하지 않았습니다. 화면의 개인정보 확인 상태를 점검하세요.',
  },
  build_verification_plan: {
    toolClass: 'mutation',
    success: '확인 체크리스트 변경을 적용했습니다.',
    blocked: '체크리스트 변경을 적용하지 않았습니다. 변경 동의와 최신 사례 상태를 확인하세요.',
  },
  update_verification_step: {
    toolClass: 'mutation',
    success: '확인 항목 상태 변경을 적용했습니다.',
    blocked: '확인 항목 변경을 적용하지 않았습니다. 변경 동의와 최신 사례 상태를 확인하세요.',
  },
  get_official_resources: {
    toolClass: 'read',
    success: '사전에 확인한 공식 자료 목록을 읽었습니다.',
    blocked: '공식 자료 목록을 반환하지 않았습니다.',
  },
};

function newReceiptId(): string {
  if (globalThis.crypto?.randomUUID) return `receipt-${globalThis.crypto.randomUUID()}`;
  return `receipt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Creates a receipt from allow-listed metadata only. This function intentionally
 * accepts no raw tool input, offer text, signal evidence, or arbitrary message.
 */
export function createActionReceipt(
  toolName: ReceiptToolName,
  outcome: ReceiptOutcome,
  state: Pick<OfferCase, 'caseId' | 'caseVersion'>,
): ActionReceipt {
  const copy = RECEIPT_COPY[toolName];
  return {
    receiptId: newReceiptId(),
    createdAt: new Date().toISOString(),
    toolName,
    toolClass: copy.toolClass,
    outcome,
    caseId: state.caseId,
    caseVersion: state.caseVersion,
    message: copy[outcome],
  };
}

export function prependActionReceipt(
  current: readonly ActionReceipt[],
  receipt: ActionReceipt,
): ActionReceipt[] {
  return [receipt, ...current].slice(0, MAX_ACTION_RECEIPTS);
}

export function clearActionReceipts(): ActionReceipt[] {
  return [];
}
