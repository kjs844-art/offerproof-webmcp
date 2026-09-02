import { describe, expect, it } from 'vitest';
import { maskSensitiveText } from './mask';
import { SAMPLES } from '../../test/samples';

describe('sensitive-data masking', () => {
  it('masks resident registration numbers while preserving length', () => {
    const { masked, findings } = maskSensitiveText(SAMPLES.koRrn);
    expect(masked).toContain('901231-*******');
    expect(masked).not.toContain('1234567');
    expect(masked.length).toBe(SAMPLES.koRrn.length);
    expect(findings.map((f) => f.kind)).toEqual(['resident_registration']);
  });

  it('masks bank accounts but leaves business registration numbers alone', () => {
    const { masked } = maskSensitiveText(SAMPLES.koAccount);
    expect(masked).toContain('******-**-**1234');
    expect(masked).not.toContain('123456-78-901234');
    const biz = maskSensitiveText('사업자등록번호 123-45-67890');
    expect(biz.masked).toBe('사업자등록번호 123-45-67890');
    expect(biz.findings).toEqual([]);
  });

  it('masks phone numbers, cards, emails and secrets', () => {
    expect(maskSensitiveText('연락처 010-1234-5678').masked).toBe('연락처 010-****-5678');
    expect(maskSensitiveText('call +1 555 123 4567').masked).toBe('call +1 *** *** 4567');
    expect(maskSensitiveText('card 1234-5678-9012-3456').masked).toBe('card ****-****-****-3456');
    expect(maskSensitiveText('mail hong.gildong@gmail.com now').masked).toBe('mail h***********@gmail.com now');
    expect(maskSensitiveText('비밀번호: abc123 입니다').masked).toBe('비밀번호: ****** 입니다');
    expect(maskSensitiveText('password is hunter22').masked).toBe('password is ********');
    expect(maskSensitiveText('여권번호 M12345678').masked).toBe('여권번호 *********');
  });

  it('does not mask ordinary numbers or short tokens', () => {
    expect(maskSensitiveText(SAMPLES.koSecret).masked).toBe(SAMPLES.koSecret);
    expect(maskSensitiveText('급여 250만원, 2026년 9월 2일').masked).toBe('급여 250만원, 2026년 9월 2일');
  });

  it('keeps offsets aligned so masked evidence can be sliced', () => {
    const text = `${SAMPLES.koRrn}\n${SAMPLES.koAccount}`;
    const { masked, findings } = maskSensitiveText(text);
    expect(masked.length).toBe(text.length);
    for (const f of findings) {
      expect(masked.slice(f.start, f.end)).not.toBe(text.slice(f.start, f.end));
      expect(masked.slice(f.start, f.end).length).toBe(f.end - f.start);
    }
    expect(masked.slice(0, SAMPLES.koRrn.length)).toContain('901231-*******');
  });
});
