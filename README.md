# 도착 난이도

목적지를 검색하면 주변 도로 흐름, 예상 지연률, 장소 혼잡도, 시간대 패턴을 합산해 `도착 난이도`를 보여주는 서버 없는 정적 웹앱 프로토타입입니다.

현재는 웹/PWA 형태로 동작하며, 추후 Windows exe와 Android apk 패키징까지 확장할 수 있도록 `www` 정적 산출물 구조를 함께 준비했습니다.

## 현재까지 구현한 내용

- 정적 웹앱 기본 구조: `index.html`, `styles.css`, `app.js`
- PWA 기반 파일: `manifest.json`, `sw.js`, `assets/icon.svg`
- 서비스워커 앱 셸 캐시, 오프라인 내비게이션 fallback, PWA 설정 점검 스크립트
- 모바일 우선 UI: 지도 영역, 상단 검색 패널, 하단 결과 시트
- 데스크톱 UI: 좌측 컨트롤 패널, 우측 지도 스테이지
- 목적지 검색, 빠른 목적지 선택, 검색어 기반 데모 목적지 생성
- 출발 기준 시간대 선택: 지금, 아침, 점심, 퇴근, 심야
- 도착 난이도 점수, 상태, 신뢰도, 근거 카드 표시
- 네이버지도, TMAP, 카카오내비 관점의 서비스별 점수 카드
- Kakao JavaScript 키 설정 시 실제 Kakao 지도와 장소 검색 연결
- ITS 교통소통정보 키 설정 시 목적지 주변 실시간 도로 속도 반영
- 현재 위치 권한 허용 시 목적지까지의 추정 이동거리/시간/지연률 반영
- 현재 위치 마커 표시 및 실제 Kakao 지도에서 현재 위치와 목적지를 함께 보이도록 범위 조정
- 현재 위치 정확도가 1km를 넘으면 자동 반영을 막고 수동 출발지 입력으로 보정
- 검색, 지도, 위치, 실시간 도로 연결 상태를 톤이 있는 상태 배지로 표시
- 실행 주소, Kakao/ITS 키 설정 여부, 지도/API 연결 상태를 보여주는 진단 패널
- 위치 API 보안 컨텍스트/권한/정확도 진단
- 실제 API가 없어도 동작하는 데모 지도와 목업 데이터
- `npm run build`로 APK/EXE 패키징용 정적 파일을 `www` 폴더에 생성

## 점수 모델

기본 가중치:

- 주변 도로 흐름: 50%
- 예상 지연률: 25%
- 장소 혼잡: 15%
- 시간대 패턴: 10%

데이터가 없는 항목은 제외하고, 남은 항목끼리 가중치를 재분배합니다.

출발 기준 시간대를 바꾸면 시간대 보정이 다시 적용됩니다. ITS 실시간 도로 데이터가 있는 경우 `지금` 기준에서는 신뢰도를 높게 표시하고, 미래 시간대를 선택하면 현재 도로 상태를 참고값으로 낮춰 표시합니다.

## 실제 데이터 연결

`config.js`에 Kakao JavaScript 키를 설정하면 실제 Kakao 지도와 장소 검색을 사용합니다. 키가 없거나 연결에 실패하면 데모 모드로 동작합니다.

ITS 국가교통정보센터 교통소통정보 키를 설정하면 목적지 좌표 주변의 실시간 도로 속도를 조회해 `주변 도로 흐름` 점수에 반영합니다. ITS 교통소통정보는 고속도로 및 국도 중심 실시간 소통정보를 5분 간격 집계로 제공합니다.

서버 없이 배포할 경우 API 키 노출 위험이 있으므로 공개 클라이언트 키만 직접 사용하고, 유료 REST 키는 Cloudflare Workers 같은 서버리스 프록시를 통해 호출하는 방식을 권장합니다.

## 실행 방법

파일을 바로 열어도 동작합니다.

```powershell
start .\index.html
```

로컬 서버로 테스트하려면:

```powershell
cd D:\WTG
python -m http.server 8080
```

브라우저에서 다음 주소를 엽니다.

```text
http://localhost:8080/index.html
```

현재 위치 기능은 브라우저 정책상 `localhost` 또는 HTTPS에서 테스트해야 합니다. 파일을 직접 여는 `file://` 방식에서는 위치 권한이 동작하지 않을 수 있습니다.

PC 위치 정확도가 낮게 잡히면 앱은 자동 위치를 계산에 반영하지 않습니다. 이 경우 `출발지 직접 입력`에 출발지를 입력해 Kakao 장소 검색 또는 데모 목적지 좌표로 출발지를 보정합니다.

패키징용 정적 산출물을 만들려면:

```powershell
npm run build
```

빌드 결과는 `www` 폴더에 생성됩니다.

PWA 설정을 점검하려면:

```powershell
npm run pwa:check
```

## API 설정

`.env.example`에는 사용할 API 키 이름을 정리했습니다. 현재 앱은 별도 빌드 주입 없이 `config.js`를 직접 읽습니다.

공개 저장소에 키가 올라가지 않도록 실제 키는 `config.local.js`에 넣는 것을 권장합니다. 이 파일은 `.gitignore`에 포함되어 커밋되지 않습니다.

```powershell
Copy-Item .\config.local.example.js .\config.local.js
```

```js
window.APP_CONFIG = {
  ...window.APP_CONFIG,
  KAKAO_JAVASCRIPT_KEY: "여기에_JavaScript_키",
  ITS_TRAFFIC_API_KEY: "여기에_ITS_교통소통정보_키",
  ROUTE_PROXY_URL: "여기에_경로_API_프록시_URL"
};
```

Kakao Developers에서 필요한 설정:

1. `내 애플리케이션`에서 앱 생성
2. `Kakao Map` > `Usage settings` > `State`를 `On`
3. `Platform key` > `JavaScript key`에서 JavaScript 키 복사
4. `Platform key` > `JavaScript key` > `JavaScript SDK domain`에 실행 주소 등록

개발 중 등록할 로컬 주소:

```text
http://localhost:8080
```

웹 배포 시에는 실제 배포 도메인을 추가합니다.

```text
https://your-domain.com
```

ITS 교통소통정보 키는 국가교통정보센터 오픈데이터에서 신청합니다.

```text
https://www.its.go.kr/opendata/opendataList?service=traffic
```

앱은 목적지 주변 좌표 박스를 기준으로 다음 API를 호출합니다.

```text
https://openapi.its.go.kr:9443/trafficInfo
```

주의: ITS 데이터는 전국 모든 골목과 시내도로를 촘촘히 제공하는 데이터가 아니라 고속도로와 국도 등 제공 구간 중심입니다. 검색 위치 주변에 제공 구간이 없으면 앱은 기존 시간대/장소 추정 점수를 유지하고 `주변 ITS 구간 없음`으로 표시합니다.

## 앞으로 해야 할 일

- Kakao JavaScript SDK 도메인 등록 후 실제 지도/장소 검색 동작 검증
- Kakao JavaScript SDK 도메인 등록 후 실제 지도/장소 검색 동작 검증: 진단 패널 완료, 실제 키/브라우저 검증 필요
- ITS 교통소통정보 API 키 발급 후 실시간 도로 반영 품질 확인
- TMAP 또는 다른 경로 API를 연결해 실제 예상 지연률 계산
- TMAP 또는 다른 경로 API를 연결해 실제 예상 지연률 계산: `ROUTE_PROXY_URL` 어댑터 자리 완료, 프록시 구현 필요
- 장소 혼잡도 데이터 소스 연결: 서울시 실시간 도시데이터, TMAP 장소 혼잡도 등
- API 키 보호를 위한 서버리스 프록시 설계
- 현재 위치 기반 출발지 설정과 경로 기준 계산 고도화: 위치 마커/지도 범위/정확도 제한/수동 출발지 보정 완료, 실제 경로 API 연동 필요
- 오류 상태, 로딩 상태, API 실패 시 사용자 안내 강화: 1차 상태 배지 완료, 세부 재시도 UI 필요
- PWA 설치성 테스트와 서비스 워커 캐시 전략 점검: 앱 셸 캐시와 점검 스크립트 완료, 실제 브라우저 Lighthouse 검증 필요
- Android 패키징: Capacitor 프로젝트 초기화, WebView origin 확인, APK 빌드
- Windows 패키징: Tauri 초기화, 아이콘/권한/빌드 설정, exe 빌드
- 실제 기기에서 모바일 레이아웃, 지도 리사이즈, 성능 테스트

## Windows exe / Android apk 계획

Windows:

```powershell
npm run tauri:init
npm run tauri:build
```

Android:

```powershell
npm run build
npm run android:init
npm run android:open
```

위 명령은 패키징 도구 설치가 필요하므로 네트워크와 각 플랫폼 SDK 설정이 필요합니다.
