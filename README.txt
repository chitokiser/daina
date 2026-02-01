DAINA Firebase Site (config 포함)

1) 설치
- 이 폴더를 그대로 로컬에서 실행:
  - VSCode Live Server 또는
  - npm i -g serve 후 serve public

2) Firebase 설정
- Firebase Console > Authentication > Sign-in method
  - Google Enabled
- Firebase Console > Authentication > Settings > Authorized domains
  - localhost
  - 127.0.0.1

3) Firestore Rules 반영
- firebase/firestore.rules 내용을 Firestore 규칙에 붙여넣고 Publish

4) 관리자 role 설정
- roles/{UID} 문서 생성
  - role: "admin"
- 구인자: role: "employer"
- 구직자: role: "jobseeker"

5) Seed
- tools 폴더에 serviceAccountKey.json 넣기
- node tools/seed-firestore.js 실행

6) 사진 추가
- ZIP에는 jobseeker 1.png~20.png만 포함
- 나머지 21~100.png는 public/assets/images/jobseeker/ 에 복사

주의
- 브라우저는 C:\Users\... 경로 이미지를 직접 로딩할 수 없습니다.
- 반드시 /assets/images/jobseeker/1.png 형태여야 합니다.
