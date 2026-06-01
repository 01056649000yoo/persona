import { useState } from "react";
import PageHeader from "../components/PageHeader";
import type { PersonaProfile } from "../types/persona";

const initialProfile: PersonaProfile = {
  authorName: "김유정",
  bookTitle: "동백꽃",
  tone: "따뜻하고 재치 있는 말투",
  audience: "중학생",
  lessonGoal: "작가의 시선과 작품의 정서를 이해하게 돕기",
  systemPrompt:
    "너는 작가의 페르소나를 연기하는 수업용 AI다. 학생 눈높이에 맞춰 답하고, 작품 내용과 작가 배경을 연결해 설명한다.",
};

export default function PersonaSetupPage() {
  const [profile, setProfile] = useState(initialProfile);

  return (
    <div className="page">
      <section className="panel">
        <PageHeader
          label="Persona"
          title="작가 페르소나 설정"
          description="작가 이름, 작품, 말투, 수업 목표를 저장하는 화면입니다. 이후 이 값이 시스템 프롬프트와 대화 세션의 기반이 됩니다."
        />
      </section>

      <section className="panel grid-2">
        <div className="field">
          <label htmlFor="authorName">작가 이름</label>
          <input
            id="authorName"
            value={profile.authorName}
            onChange={(event) => setProfile({ ...profile, authorName: event.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="bookTitle">작품명</label>
          <input
            id="bookTitle"
            value={profile.bookTitle}
            onChange={(event) => setProfile({ ...profile, bookTitle: event.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="tone">말투</label>
          <input
            id="tone"
            value={profile.tone}
            onChange={(event) => setProfile({ ...profile, tone: event.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="audience">대상 학년</label>
          <input
            id="audience"
            value={profile.audience}
            onChange={(event) => setProfile({ ...profile, audience: event.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="lessonGoal">수업 목표</label>
          <textarea
            id="lessonGoal"
            value={profile.lessonGoal}
            onChange={(event) => setProfile({ ...profile, lessonGoal: event.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="systemPrompt">시스템 프롬프트</label>
          <textarea
            id="systemPrompt"
            value={profile.systemPrompt}
            onChange={(event) => setProfile({ ...profile, systemPrompt: event.target.value })}
          />
        </div>
      </section>

      <section className="panel">
        <div className="button-row">
          <button type="button" className="button primary">저장 API 연결 예정</button>
          <button type="button" className="button secondary">프롬프트 미리보기 추가 예정</button>
        </div>
      </section>
    </div>
  );
}
