import PageHeader from "../components/PageHeader";

const messages = [
  { role: "assistant", content: "안녕하구나. 나는 오늘 너희와 작품 이야기를 나누러 온 작가란다." },
  { role: "user", content: "왜 그런 인물을 만들었는지 궁금해요." },
  { role: "assistant", content: "인물의 감정이 살아 있어야 독자도 자기 삶을 비춰볼 수 있기 때문이지." },
] as const;

export default function ConversationPage() {
  return (
    <div className="page">
      <section className="panel">
        <PageHeader
          label="Conversation"
          title="대화 모드 기본 화면"
          description="현재는 정적 화면이며, 이후 Realtime API와 3D 아바타를 여기에 연결하면 됩니다."
        />
      </section>

      <section className="chat-layout">
        <article className="chat-card">
          <div className="avatar-stage">
            <div>
              <div className="avatar-orb" />
              <h2>작가 3D 아바타 자리</h2>
              <p>VRM 또는 glTF 모델, 음성 반응, 표정 애니메이션을 여기에 연결합니다.</p>
            </div>
          </div>
        </article>

        <article className="chat-card">
          <div className="section-label">Live Session</div>
          <h2>작가와 대화</h2>
          <p className="muted">텍스트 입력, 마이크 버튼, 실시간 스트리밍 응답 UI로 확장할 수 있게 구성했습니다.</p>

          <div className="chat-log">
            {messages.map((message, index) => (
              <div key={index} className={`message ${message.role}`}>
                {message.content}
              </div>
            ))}
          </div>

          <div className="field" style={{ marginTop: 20 }}>
            <label htmlFor="chatInput">학생 질문</label>
            <textarea id="chatInput" placeholder="예: 이 작품을 쓸 때 가장 전하고 싶었던 마음은 무엇인가요?" />
          </div>

          <div className="button-row">
            <button type="button" className="button primary">대화 API 연결 예정</button>
            <button type="button" className="button secondary">음성 모드 연결 예정</button>
          </div>
        </article>
      </section>
    </div>
  );
}
