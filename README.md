# Persona Voice Lab

OpenAI Realtime API를 이용해 작가 페르소나와 실시간 음성 또는 텍스트 대화를 할 수 있는 로컬 앱입니다.

## 웹 모드 실행

1. PowerShell 또는 터미널에서 앱 폴더로 이동합니다.
2. `node server.js`
3. 브라우저에서 `http://localhost:3030`
4. OpenAI API 키를 입력하고 대화를 시작합니다.

## Windows 설치형 앱 실행

Electron으로 감싼 Windows 설치형 앱을 만들 수 있습니다.

### 개발 실행

1. 의존성 설치: `npm install`
2. Electron 앱 실행: `npm run electron`

### Windows 설치 파일 만들기

1. 의존성 설치: `npm install`
2. 설치 파일 빌드: `npm run dist:win`
3. 생성 위치: `dist/Persona-Voice-Lab-Setup-<version>.exe`

## 특징

- OpenAI Realtime WebRTC 기반 실시간 음성 대화
- 텍스트 전용 페르소나 테스트 모드
- 설치형 Windows 앱 지원(Electron)
- 페르소나 프롬프트, 음성, 속도 설정
- 바탕화면 바로가기 생성 메뉴

## API 키 저장

- 입력한 API 키는 현재 브라우저 또는 설치형 앱 내부 저장소에만 저장됩니다.
- 서버 파일에는 API 키를 별도로 저장하지 않습니다.

## 참고

- 음성 변경은 첫 응답 이후 같은 세션에서 제한될 수 있어 재연결이 더 안정적입니다.
- 설치형 앱에서도 로컬 서버와 로컬 창만 사용합니다.
