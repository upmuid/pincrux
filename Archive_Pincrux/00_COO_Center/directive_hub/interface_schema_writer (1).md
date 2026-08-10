---
document: 쓰미(Writer) 출력 스키마
version: 1.0.0
last_updated: 2026-07-20
owner: 총총(COO)
produced_by: 쓰미(v2)
consumed_by: 읽어봄이(v3)
---

# 4-2. 쓰미 출력 (`02_Writer/YYYY-MM-DD.json`)

> 공통 규칙은 `interface_common.md`, 입력 데이터(모으미 출력) 형식은 `interface_schema_collector.md` 참조.

```json
{
  "schema_version": "1.1",
  "node": "writer",
  "run_date": "YYYY-MM-DD",
  "source_file": "Archive_Pincrux/01_Collector/YYYY-MM-DD.json",
  "node_status": "success / fail",
  "processed_tasks": [
    {
      "task_id": "T001",
      "entity_name": "A광고주",
      "project_name": "2022 여름 캠페인",
      "page_scope": "child",
      "target_name": "A광고주 > 2022 여름 캠페인",
      "context_status": "matched / new / inquiry / unknown",
      "action_taken": "merged_into_existing / created_new / created_root_and_child / isolated_to_faq / skipped",
      "confluence_space": "AR",
      "confluence_page_url": "https://pincrux.atlassian.net/wiki/spaces/AR/pages/123456",
      "confluence_page_id": "123456",
      "confluence_parent_page_url": "https://pincrux.atlassian.net/wiki/spaces/AR/pages/111111",
      "confluence_parent_page_id": "111111",
      "updated_sections": ["## 3. 매체 운영 히스토리"]
    }
  ],
  "skipped_tasks": [
    {
      "task_id": "T003",
      "reason": "unknown 맥락으로 매칭 실패. 총총 개입 필요."
    }
  ]
}
```

> `confluence_page_url`과 `confluence_page_id`는 필수 필드. 없으면 읽어봄이가 검증 불가.
> `page_scope: child`인 경우 `confluence_parent_page_url`과 `confluence_parent_page_id`도 필수. root 페이지가 없으면 쓰미가 먼저 root를 생성한 뒤 child를 작성한다.
