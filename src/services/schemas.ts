import { ID_PATTERNS } from '../domain/ids';
import { JURISDICTIONS, RESOURCE_TOPICS, type ToolName } from '../domain/types';
import type { JsonSchema } from './validation';

/**
 * Exact input schemas from docs/webmcp/TOOL_CONTRACTS.md. Shared by the
 * service layer (validation) and the WebMCP adapter (registration).
 */
const CASE_ID: JsonSchema = { type: 'string', pattern: ID_PATTERNS.caseId.source, description: '현재 사례 ID' };
const CASE_VERSION: JsonSchema = {
  type: 'string',
  pattern: ID_PATTERNS.caseVersion.source,
  description: '직전에 읽은 사례 버전 (예: v3)',
};
const SIGNAL_ID: JsonSchema = { type: 'string', pattern: ID_PATTERNS.signalId.source };

export const TOOL_SCHEMAS: Record<ToolName, JsonSchema> = {
  get_case_summary: {
    type: 'object',
    additionalProperties: false,
    properties: { caseId: CASE_ID },
    required: ['caseId'],
  },
  inspect_offer_signals: {
    type: 'object',
    additionalProperties: false,
    properties: {
      caseId: CASE_ID,
      caseVersion: CASE_VERSION,
      privacyConfirmed: { type: 'boolean', const: true, description: '사용자가 개인정보 경고를 확인했음' },
      replaceExisting: { type: 'boolean', default: false, description: '같은 입력의 기존 결과를 다시 계산할 때만 true' },
      analysisScope: { type: 'string', enum: ['full'] },
    },
    required: ['caseId', 'caseVersion', 'privacyConfirmed'],
  },
  build_verification_plan: {
    type: 'object',
    additionalProperties: false,
    properties: {
      caseId: CASE_ID,
      caseVersion: CASE_VERSION,
      signalIds: { type: 'array', minItems: 1, maxItems: 20, uniqueItems: true, items: SIGNAL_ID },
      mode: { type: 'string', enum: ['create', 'replace'], default: 'create' },
      confirmation: { type: 'string', enum: ['user_confirmed'] },
    },
    required: ['caseId', 'caseVersion', 'signalIds', 'confirmation'],
  },
  update_verification_step: {
    type: 'object',
    additionalProperties: false,
    properties: {
      caseId: CASE_ID,
      caseVersion: CASE_VERSION,
      verificationPlanId: { type: 'string', pattern: ID_PATTERNS.verificationPlanId.source },
      verificationStepId: { type: 'string', pattern: ID_PATTERNS.verificationStepId.source },
      status: { type: 'string', enum: ['todo', 'done'] },
      memo: { type: 'string', maxLength: 2000 },
      confirmation: { type: 'string', enum: ['user_confirmed'] },
    },
    required: ['caseId', 'caseVersion', 'verificationPlanId', 'verificationStepId', 'status', 'confirmation'],
  },
  get_official_resources: {
    type: 'object',
    additionalProperties: false,
    properties: {
      caseId: CASE_ID,
      jurisdiction: { type: 'string', enum: JURISDICTIONS },
      topic: { type: 'string', enum: RESOURCE_TOPICS },
      signalIds: { type: 'array', maxItems: 20, uniqueItems: true, items: SIGNAL_ID },
    },
    required: ['caseId', 'jurisdiction'],
  },
};

export const TOOL_DESCRIPTIONS: Record<ToolName, string> = {
  get_case_summary:
    '현재 OfferProof 사례의 마스킹된 요약(상태, 신호 ID, 체크리스트 개수, 버전)을 읽습니다. 상태를 변경하지 않습니다. 사기·안전 여부를 판정하지 않습니다. Reads the masked summary of the current case; read-only.',
  inspect_offer_signals:
    '사용자가 화면에서 개인정보 확인을 마친 현재 입력을 고정 규칙으로 검사해 원문 근거가 있는 "확인이 필요한 신호" 카드를 만듭니다. 원문은 이 페이지 안에서만 처리되며 도구 입력으로 받지 않습니다. 판정·점수를 반환하지 않습니다. Runs the deterministic signal engine on the page-held input.',
  build_verification_plan:
    '선택한 신호 ID로 사용자가 직접 확인할 체크리스트(확인 계획)를 만듭니다. 되돌릴 수 있는 변경이며 신고·결제·메시지 전송을 하지 않습니다. Builds a reversible verification checklist from selected signal IDs.',
  update_verification_step:
    '확인 계획의 한 단계 상태(todo/done)와 메모를 바꿉니다. 오래된 caseVersion이면 CASE_VERSION_CONFLICT를 반환합니다. Updates exactly one checklist step.',
  get_official_resources:
    '관할·주제에 맞는 허용 목록의 공식 기관 자료를 반환합니다. 링크를 자동으로 열거나 제출하지 않으며, 미검증 자료는 링크 없이 표시됩니다. Read-only allowlisted official resources.',
};

export const TOOL_READ_ONLY: Record<ToolName, boolean> = {
  get_case_summary: true,
  inspect_offer_signals: false,
  build_verification_plan: false,
  update_verification_step: false,
  get_official_resources: true,
};

/** Product limits from docs/webmcp/TOOL_CONTRACTS.md §2.4. */
export const INPUT_MAX_LENGTH = 100_000;
export const MEMO_MAX_LENGTH = 2000;
