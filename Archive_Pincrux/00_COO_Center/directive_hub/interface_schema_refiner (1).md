---
document: 다시쓰미(Refiner) 출력 스키마
version: 1.0.0
last_updated: 2026-07-20
owner: 총총(COO)
produced_by: 다시쓰미(v4)
consumed_by: 총총(COO) — 최종 리포트 집계용
---

# 4-4. 다시쓰미 출력 (`04_Refiner/YYYY-MM-DD.json`)

> 공통 규칙은 `interface_common.md`, 입력 데이터(읽어봄이 출력) 형식은 `interface_schema_validator.md` 참조.

```json
{
  "schema_version": "1.1",
  "node": "refiner",
  "run_date": "YYYY-MM-DD",
  "source_file": "Archive_Pincrux/03_Validator/YYYY-MM-DD.json",
  "node_status": "success / fail",
  "published_tasks": [
    {
      "task_id": "T001",
      "target_name": "A광고주 프로젝트",
      "confluence_space": "AR",
      "confluence_page_url": "https://pincrux.atlassian.net/wiki/spaces/AR/pages/123456",
      "confluence_page_id": "123456",
      "refined_points": [
        "구어체 종결어미를 비즈니스 문어체로 교정",
        "액션 아이템을 마크다운 체크리스트 형식으로 포맷팅"
      ],
      "published_at": "YYYY-MM-DDTHH:MM:SS+09:00"
    }
  ]
}
```

> `published_at` 타임스탬프가 기록된 시점이 파이프라인의 공식 완료 시점.
