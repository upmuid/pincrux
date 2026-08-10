---
document: 모으미(Collector) 출력 스키마
version: 1.0.0
last_updated: 2026-07-20
owner: 총총(COO)
produced_by: 모으미(v1)
consumed_by: 쓰미(v2), 읽어봄이(v3)
---

# 4-1. 모으미 출력 (`01_Collector/YYYY-MM-DD.json`)

> 공통 규칙(파일 경로, 상태 코드, 에러 포맷)은 `interface_common.md` 참조.

```json
{
  "schema_version": "1.1",
  "node": "collector",
  "run_date": "YYYY-MM-DD",
  "run_mode": "daily / backfill",
  "period": "YYYY-MM-DD to YYYY-MM-DD",
  "status": "success / fail",
  "data_summaries": [
    {
      "task_id": "T001",
      "major_category": "Client / Media_Partner / In-house",
      "minor_category": "Project / Product",
      "context_status": "matched / new / inquiry / unknown",
      "context_reference": "판단 근거",
      "entity_name": "광고주/매체/내부팀 고유명 (canonical name)",
      "project_name": "캠페인/프로젝트/상품명 (nullable — 엔티티 레벨 이슈면 null)",
      "page_scope": "root / child",
      "target_name": "entity_name 또는 'entity_name > project_name' 형식",
      "issue_title": "이슈 제목",
      "summary": "핵심 내용 요약 (50자 이내)",
      "decision": "결정 사항",
      "action_items": ["태스크 1", "태스크 2"],
      "slack_thread_link": "URL"
    }
  ],
  "uncategorized": [
    {
      "raw_text": "분류 불가 원문",
      "reason": "사유"
    }
  ]
}
```

**`entity_name` 규칙**: 동일 광고주/매체는 시간이 지나도 같은 이름을 유지해야 한다. 별칭·축약어가 여러 개인 경우 정식 명칭으로 통일하고 `context_reference`에 원문 표기를 기록한다.

**`page_scope` 결정 기준**:
- `root`: 계약 체결, 파트너십 개요, 조직 변경 등 특정 캠페인에 귀속되지 않는 엔티티 레벨 이슈
- `child`: 특정 캠페인·프로젝트·상품에 귀속되는 이슈. 반드시 `project_name`을 함께 기재
