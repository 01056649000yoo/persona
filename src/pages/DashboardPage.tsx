import PageHeader from "../components/PageHeader";
import StatusCard from "../components/StatusCard";

export default function DashboardPage() {
  return (
    <div className="page">
      <section className="hero-card">
        <PageHeader
          label="Start"
          title="작가 페르소나 수업 앱 기본 셋업"
          description="이 화면은 로그인, 작가 설정, 대화 모드, 3D 아바타 화면으로 확장하기 위한 시작점입니다."
        />
      </section>

      <section className="status-grid">
        <StatusCard label="Auth" value="Ready" description="간편 로그인 UI를 붙일 자리입니다." />
        <StatusCard label="API" value="Remote" description="맥미니 API 서버 주소만 바꾸면 연결됩니다." />
        <StatusCard label="Avatar" value="Planned" description="추후 3D 모델과 음성 립싱크를 연결합니다." />
      </section>

      <section className="grid-2">
        <article className="list-card">
          <div className="section-label">Next Step</div>
          <h2>다음 구현 추천</h2>
          <p className="muted">로그인 페이지, 페르소나 저장 API, 대화 API를 순서대로 붙이면 가장 안정적입니다.</p>
        </article>

        <article className="list-card">
          <div className="section-label">Backend Contract</div>
          <h2>권장 API</h2>
          <p className="muted">`/auth/login`, `/personas`, `/sessions`, `/chat/respond`, `/realtime/session` 정도로 시작하면 깔끔합니다.</p>
        </article>
      </section>
    </div>
  );
}
