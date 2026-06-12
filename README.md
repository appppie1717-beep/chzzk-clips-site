# 드림이 클립

치지직 클립 링크를 카테고리별로 정리해서 보는 정적 사이트입니다.

## 여는 방법

`index.html` 파일을 브라우저로 열면 됩니다.

브라우저 보안 때문에 `clips.json`이 안 불러와지면, 이 폴더에서 간단한 로컬 서버를 켜세요.

```powershell
python -m http.server 8765
```

그 다음 브라우저에서 아래 주소를 엽니다.

```text
http://localhost:8765
```

## 클립 추가 방법

`clips.json` 파일만 수정하면 됩니다.

```json
{
  "title": "클립 제목",
  "category": "A",
  "url": "https://chzzk.naver.com/...",
  "video": "",
  "thumbnail": "",
  "streamer": "방송인 이름",
  "date": "2026-06-10",
  "memo": "짧은 메모"
}
```

주의할 점.

- 마지막 항목 뒤에는 쉼표를 붙이지 않습니다.
- `url`에는 치지직 클립 링크를 넣습니다.
- `video`에 `videos/파일명.mp4`를 넣으면 사이트 안에서 직접 재생됩니다.
- `thumbnail`은 없어도 됩니다. 비워두면 기본 배경이 나옵니다.
- 카테고리는 `A`, `B`, `웃긴장면`, `명장면`처럼 원하는 이름을 써도 됩니다.
- 처음 화면에는 카테고리 카드만 표시됩니다.
- 카테고리를 누르면 오른쪽 영역에 해당 카테고리의 클립 카드가 표시됩니다.
- 치지직 링크만 있는 클립은 치지직 사이트로 열립니다.
- 영상 파일을 직접 넣은 클립은 사이트 안 플레이어로 재생됩니다.

## 인기순위 저장 설정

애교 인기순위 게임 결과를 모든 유저 기준으로 모으려면 Supabase와 Vercel 환경변수가 필요합니다.

1. Supabase SQL Editor에서 `SUPABASE_SQL.md` 내용을 실행합니다.
2. Vercel 프로젝트 환경변수에 아래 값을 추가합니다.

```text
SUPABASE_URL=https://pkcirbldvybzjmclgyie.supabase.co
SUPABASE_SECRET_KEY=Supabase Secret key
```

`SUPABASE_SECRET_KEY`는 GitHub에 올리면 안 됩니다. Vercel 환경변수에만 넣으세요.

환경변수가 없으면 사이트는 깨지지 않고, 인기순위는 현재 브라우저의 임시 저장값으로만 표시됩니다.
