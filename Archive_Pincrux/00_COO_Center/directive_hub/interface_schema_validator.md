---
document: 읽어봄이(Validator) 출력 스키마
version: 1.0.0
last_updated: 2026-07-20
owner: 총총(COO)
produced_by: 읽어봄이(v3)
consumed_by: 다시쓰미(v4)
---

# 4-3. 읽어봄이 출력 (`03_Validator/YYYY-MM-DD.json`)

> 공통 규칙은 `interface_common.md`, 입력 데이터 형식은 `interface_schema_collector.md`(모으미)·`interface_schema_writer.md`(쓰미) 참조.

```json
{
  "schema_version": "1.1",
  "node": "validator",
  "run_date": "YYYY-MM-DD",
  "source_files": {
    "collector": "Archive_Pincrux/01_Collector/YYYY-MM-DD.json",
    "writer": "Archive_Pincrux/02_Writer/YYYY-MM-DD.json"
  },
  "node_status": "success / fail",
  "review_summary": {
    "total_reviewed": 7,
    "passed_cnt": 6,
    "failed_cnt": 1,
    "slack_reread_cnt": 2
  },
  "validation_results": [
    {
      "task_id": "T001",
      "target_name": "A광고주 프로젝트",
      "context_status": "matched",
      "confluence_space": "AR",
      "confluence_page_url": "https://pincrux.atlassian.net/wiki/spaces/AR/pages/123456",
      "confluence_page_id": "123456",
      "slack_reread": false,
      "slack_reread_trigger": null,
      "result": "PASSED / FAILED",
      "error_type": null,
      "comment": "검증 코멘트"
    },
    {
      "task_id": "T003",
      "target_name": "B프로덕트",
      "context_status": "new",
      "confluence_space": "AR",
      "confluence_page_url": "https://pincrux.atlassian.net/wiki/spaces/AR/pages/789012",
      "confluence_page_id": "789012",
      "slack_reread": true,
      "slack_reread_trigger": "context_status: new — 신규 페이지이므로 슬랙 원본 확인",
      "result": "FAILED",
      "error_type": "CONTEXT_DISTORTION / DATA_LOSS / ACTION_ITEM_MISSING / OVERWRITE_ERROR",
      "comment": "왜곡 내용 및 수정 제안",
      "suggested_fix": "슬랙 원본 기반 수정 방향"
    }
  ]
}
```

> `confluence_page_url`과 `confluence_page_id`는 쓰미 JSON에서 그대로 승계하여 다시쓰미에게 전달. 누락 시 다시쓰미가 해당 페이지 업데이트 불가.
> `slack_reread`와 `slack_reread_trigger`는 슬랙 재읽기 발생 여부와 트리거 사유를 기록한다. 총총이의 파이프라인 감사(Audit) 및 리소스 추적에 활용한다.
