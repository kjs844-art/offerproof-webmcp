import type { ManipulationNotice } from '../domain/types';

interface Props {
  notices: ManipulationNotice[];
}

export function NoticeList({ notices }: Props) {
  if (notices.length === 0) return null;
  return (
    <section className="card notices" aria-labelledby="notices-heading">
      <h3 id="notices-heading">지시문처럼 보이는 문구 (참고)</h3>
      <p className="small">
        아래 문구는 원문 안에 있는 <strong>데이터</strong>일 뿐이며 앱이나 에이전트의 지시로 실행되지 않습니다. 판정 근거가 아니라
        관찰 사실입니다.
      </p>
      <ul className="plain-list">
        {notices.map((n) => (
          <li key={n.noticeId}>
            <figure className="evidence">
              <blockquote>{n.evidence.text}</blockquote>
              <figcaption className="small muted">
                입력 {n.evidence.paragraph}번째 문단 · 문자 위치 {n.evidence.start + 1}–{n.evidence.end} · 실행되지 않음
              </figcaption>
            </figure>
            <p className="small">{n.observation}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
