# Persona Frontend

작가 페르소나 수업용 프론트엔드 기본 프로젝트입니다.

## 시작

```bash
npm install
npm run dev
```

## 환경 변수

`.env` 파일을 만들고 아래 값을 설정합니다.

```bash
VITE_API_BASE_URL=http://your-api-server:4000
VITE_APP_NAME=Persona Classroom
```

## 백엔드 연결 방식

- 프론트엔드는 직접 DB에 연결하지 않습니다.
- 집의 맥미니에 띄운 API 서버 주소를 `VITE_API_BASE_URL`로 연결합니다.
- 인증, OpenAI 키 관리, DB 접근은 모두 백엔드에서 처리하는 구조를 전제로 합니다.
