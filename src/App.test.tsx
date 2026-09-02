import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { StrictMode, useMemo } from 'react';
import { describe, expect, it } from 'vitest';
import App from './App';
import { createSequentialIdGenerator } from './domain/ids';
import { createOfferProofService } from './services/offerProofService';
import { createFakeModelContext, type FakeModelContext } from './test/fakeModelContext';
import { FORBIDDEN_PHRASES, SAMPLES } from './test/samples';

function makeService(seed = 'app') {
  return createOfferProofService({ idGen: createSequentialIdGenerator(seed) });
}

function Harness({ mc, seed }: { mc: FakeModelContext | null; seed: string }) {
  const service = useMemo(() => makeService(seed), [seed]);
  return <App service={service} modelContext={mc} />;
}

async function pasteAndAnalyze(text: string) {
  fireEvent.change(screen.getByLabelText('구인 제안 원문'), { target: { value: text } });
  fireEvent.click(screen.getByRole('checkbox', { name: /개인정보를 제거하거나 가렸음을 확인/ }));
  fireEvent.click(screen.getByRole('button', { name: '분석 시작' }));
  await screen.findByText(/분석을 완료했습니다/);
}

describe('App (manual mode)', () => {
  it('shows a visible manual-mode fallback when WebMCP is unavailable', async () => {
    render(<Harness mc={null} seed="fallback" />);
    const banner = await screen.findByTestId('webmcp-fallback');
    expect(banner.textContent).toContain('수동 모드');
    expect(banner.textContent).toContain('document.modelContext');
    expect(screen.getByRole('button', { name: '분석 시작' })).toBeDefined();
  });

  it('runs the full manual flow: paste → privacy → analyze → cards → plan → step → undo', async () => {
    render(<Harness mc={null} seed="manual" />);
    await screen.findByTestId('webmcp-fallback');

    // Analysis is blocked until the privacy checkbox is ticked.
    fireEvent.change(screen.getByLabelText('구인 제안 원문'), { target: { value: SAMPLES.koRrn } });
    fireEvent.click(screen.getByRole('button', { name: '분석 시작' }));
    expect((await screen.findByRole('alert')).textContent).toContain('개인정보 확인 체크박스');

    fireEvent.click(screen.getByRole('checkbox', { name: /개인정보를 제거하거나 가렸음을 확인/ }));
    fireEvent.click(screen.getByRole('button', { name: '분석 시작' }));
    await screen.findByText(/분석을 완료했습니다/);

    const card = await screen.findByRole('article', { name: /민감정보 제공 요구 문구가 있습니다/ });
    expect(within(card).getByText('❝ 관찰 사실 (Observation)')).toBeDefined();
    expect(within(card).getByText(/공식 안내 \(Official guidance\)/)).toBeDefined();
    expect(within(card).getByText(/제한된 추론 \(Limited inference\)/)).toBeDefined();
    const quote = within(card).getByText(/901231-\*\*\*\*\*\*\*/);
    expect(quote.tagName).toBe('BLOCKQUOTE');
    // The raw identifier stays in the textarea the user typed into; rendered results only show the masked copy.
    const resultPanel = screen.getByRole('region', { name: '② 분석 결과' });
    const rendered = resultPanel.textContent ?? '';
    expect(rendered).not.toContain('901231-1234567');
    expect(rendered).toContain('901231-*******');
    for (const phrase of FORBIDDEN_PHRASES) expect(rendered).not.toContain(phrase);
    expect(rendered).toContain('사기 여부나 안전 여부를 확정하지 않습니다');

    // Build the checklist through the confirmation step.
    fireEvent.click(screen.getByRole('button', { name: '확인 계획 만들기' }));
    fireEvent.click(screen.getByRole('button', { name: '만들기' }));
    await screen.findByText(/확인 계획을 생성했습니다/);
    const progress = screen.getByText(/\/\d+ 확인 · 계획 ID/);
    expect(progress.textContent).toMatch(/^0\//);

    const stepBox = screen.getAllByRole('checkbox', { name: /개인정보 요구 확인/ })[0];
    fireEvent.click(stepBox);
    await waitFor(() => expect(screen.getByText(/\/\d+ 확인 · 계획 ID/).textContent).toMatch(/^1\//));
    expect(screen.getByText('사용자가 확인함')).toBeDefined();

    // Undo restores the step and is announced.
    fireEvent.click(screen.getByRole('button', { name: '되돌리기' }));
    await waitFor(() => expect(screen.getByText(/\/\d+ 확인 · 계획 ID/).textContent).toMatch(/^0\//));
    expect(screen.getByText(/되돌렸습니다: 단계 완료 표시/)).toBeDefined();

    // Masked preview toggle shows the display copy only.
    fireEvent.click(screen.getByRole('button', { name: '표시용 마스킹 미리보기' }));
    expect(screen.getByRole('region', { name: '표시용 마스킹 미리보기' }).textContent).toContain('901231-*******');
  });

  it('never states that a low-signal offer is safe and shows unverified KR resources without links', async () => {
    render(<Harness mc={null} seed="clean" />);
    await screen.findByTestId('webmcp-fallback');
    await pasteAndAnalyze(SAMPLES.koClean);
    expect(screen.getByText(/이는 안전을 보장하지 않습니다/)).toBeDefined();
    const resources = screen.getByRole('region', { name: '공식 자료로 다시 확인하기' });
    expect(within(resources).getAllByText(/링크 미검증/).length).toBeGreaterThan(0);
    expect(within(resources).queryAllByRole('link')).toHaveLength(0);
    fireEvent.change(screen.getByLabelText('관할 국가'), { target: { value: 'US' } });
    const link = await within(resources).findByRole('link', { name: /Job Scams/ });
    expect(link.getAttribute('href')).toBe('https://consumer.ftc.gov/articles/job-scams');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    const body = document.body.textContent ?? '';
    for (const phrase of FORBIDDEN_PHRASES) expect(body).not.toContain(phrase);
  });

  it('renders forged tool-call text inside the offer as plain text and does not build a plan', async () => {
    render(<Harness mc={null} seed="inject" />);
    await screen.findByTestId('webmcp-fallback');
    await pasteAndAnalyze(`${SAMPLES.koInjection}\n${SAMPLES.koToolForgery}`);
    const notices = screen.getByRole('region', { name: '지시문처럼 보이는 문구 (참고)' });
    expect(within(notices).getAllByRole('blockquote', { hidden: true }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/계획 ID/)).toBeNull();
    expect(screen.getByRole('button', { name: '확인 계획 만들기' })).toBeDefined();
  });
});

describe('App (WebMCP mode)', () => {
  it('registers the five tools, and agent calls update the UI immediately and reversibly', async () => {
    const mc = createFakeModelContext();
    render(<Harness mc={mc} seed="agent" />);
    const banner = await screen.findByText(/WebMCP 연결됨/);
    expect(banner.textContent).toContain('document.modelContext');
    expect(mc.tools.size).toBe(5);
    for (const name of ['get_case_summary', 'inspect_offer_signals', 'build_verification_plan', 'update_verification_step', 'get_official_resources']) {
      expect(banner.textContent).toContain(name);
    }

    const caseId = screen.getByTestId('case-id').textContent!;
    fireEvent.change(screen.getByLabelText('구인 제안 원문'), { target: { value: SAMPLES.koUpfront } });
    fireEvent.click(screen.getByRole('checkbox', { name: /개인정보를 제거하거나 가렸음을 확인/ }));
    const version = screen.getByTestId('case-version').textContent!;

    let inspect: { ok: boolean; data: { signalIds: string[] }; caseVersion: string } | null = null;
    await act(async () => {
      inspect = (await mc.execute('inspect_offer_signals', { caseId, caseVersion: version, privacyConfirmed: true })) as typeof inspect;
    });
    expect(inspect!.ok).toBe(true);
    await screen.findByRole('article', { name: /선입금·비용 요구 문구가 있습니다/ });
    expect(screen.getByTestId('case-version').textContent).toBe(inspect!.caseVersion);

    let plan: { ok: boolean; data: { verificationPlanId: string; steps: { verificationStepId: string }[] }; caseVersion: string } | null = null;
    await act(async () => {
      plan = (await mc.execute('build_verification_plan', { caseId, caseVersion: inspect!.caseVersion, signalIds: inspect!.data.signalIds, confirmation: 'user_confirmed' })) as typeof plan;
    });
    await screen.findByText(/\/\d+ 확인 · 계획 ID/);

    await act(async () => {
      await mc.execute('update_verification_step', {
        caseId,
        caseVersion: plan!.caseVersion,
        verificationPlanId: plan!.data.verificationPlanId,
        verificationStepId: plan!.data.steps[0].verificationStepId,
        status: 'done',
        confirmation: 'user_confirmed',
      });
    });
    await waitFor(() => expect(screen.getByText(/\/\d+ 확인 · 계획 ID/).textContent).toMatch(/^1\//));

    fireEvent.click(screen.getByText(/도구 호출 기록/));
    expect(screen.getAllByText('에이전트').length).toBeGreaterThanOrEqual(3);

    fireEvent.click(screen.getByRole('button', { name: '되돌리기' }));
    await waitFor(() => expect(screen.getByText(/\/\d+ 확인 · 계획 ID/).textContent).toMatch(/^0\//));
  });

  it('overwrites a stale local memo draft when the memo changes externally via a WebMCP call', async () => {
    const mc = createFakeModelContext();
    render(<Harness mc={mc} seed="memo-sync" />);
    await screen.findByText(/WebMCP 연결됨/);

    const caseId = screen.getByTestId('case-id').textContent!;
    fireEvent.change(screen.getByLabelText('구인 제안 원문'), { target: { value: SAMPLES.koUpfront } });
    fireEvent.click(screen.getByRole('checkbox', { name: /개인정보를 제거하거나 가렸음을 확인/ }));
    const version = screen.getByTestId('case-version').textContent!;

    let inspect: { ok: boolean; data: { signalIds: string[] }; caseVersion: string } | null = null;
    await act(async () => {
      inspect = (await mc.execute('inspect_offer_signals', { caseId, caseVersion: version, privacyConfirmed: true })) as typeof inspect;
    });
    let plan: { ok: boolean; data: { verificationPlanId: string; steps: { verificationStepId: string }[] }; caseVersion: string } | null = null;
    await act(async () => {
      plan = (await mc.execute('build_verification_plan', {
        caseId,
        caseVersion: inspect!.caseVersion,
        signalIds: inspect!.data.signalIds,
        confirmation: 'user_confirmed',
      })) as typeof plan;
    });
    await screen.findByText(/\/\d+ 확인 · 계획 ID/);

    const stepId = plan!.data.steps[0].verificationStepId;
    const memoInput = screen.getAllByLabelText('메모(선택, 개인정보 제외)')[0] as HTMLInputElement;

    // The user is mid-edit, has not clicked "메모 저장" yet.
    fireEvent.change(memoInput, { target: { value: '사용자가 입력 중인 메모' } });
    expect(memoInput.value).toBe('사용자가 입력 중인 메모');

    // An agent saves a different memo for the same step in the meantime.
    await act(async () => {
      await mc.execute('update_verification_step', {
        caseId,
        caseVersion: plan!.caseVersion,
        verificationPlanId: plan!.data.verificationPlanId,
        verificationStepId: stepId,
        status: 'todo',
        memo: '에이전트가 저장한 메모',
        confirmation: 'user_confirmed',
      });
    });

    await waitFor(() => {
      const current = screen.getAllByLabelText('메모(선택, 개인정보 제외)')[0] as HTMLInputElement;
      expect(current.value).toBe('에이전트가 저장한 메모');
    });
  });

  it('survives StrictMode double registration and unregisters on unmount', async () => {
    const mc = createFakeModelContext();
    const service = makeService('strict');
    const view = render(
      <StrictMode>
        <App service={service} modelContext={mc} />
      </StrictMode>,
    );
    await screen.findByText(/WebMCP 연결됨/);
    expect(mc.tools.size).toBe(5);
    expect(mc.registerCalls.length).toBeGreaterThanOrEqual(5);
    view.unmount();
    expect(mc.tools.size).toBe(0);
  });
});
