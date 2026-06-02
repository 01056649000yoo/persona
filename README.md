# Persona Voice Lab

OpenAI Realtime API를 이용해 로컬 PC에서만 실행하는 페르소나 음성 대화 앱입니다.

## 실행

1. PowerShell에서 앱 폴더로 이동합니다.
2. `node server.js`
3. 브라우저에서 `http://localhost:3030`
4. OpenAI API 키를 입력하고 음성 세션을 시작합니다.

## 특징

- 설치 없이 실행되는 순수 Node 서버
- 브라우저 WebRTC 기반 실시간 음성 대화
- 페르소나 프롬프트, 음성, 속도, 응답 길이 설정
- 텍스트 수동 입력과 Realtime 이벤트 로그

## 참고

- 음성 변경은 첫 응답 이후 같은 세션에서 제한될 수 있어 재연결이 더 안정적입니다.
- 로컬 전용 실험 앱이라 API 키를 UI 입력 방식으로 받습니다.
