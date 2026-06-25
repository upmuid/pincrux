---
document: 노드 간 데이터 교환 인터페이스 규격
version: 1.0.0
last_updated: 2026-06-25
owner: 총총(COO)
---

# 파이프라인 데이터 교환 인터페이스 규격 v1.0.0

파이프라인의 4개 노드(모으미 → 쓰미 → 읽어봄이 → 다시쓰미)가 데이터를 주고받는 방식을 정의한다.
각 노드는 이 규격에 정의된 입력 경로와 출력 스키마를 엄격히 준수해야 하며, 규격 불일치 시 즉시 `status: fail`을 출력하고 총총(COO)에게 제어권을 반환한다.

---

## 1. 전체 데이터 흐름

```
[슬랙 API]
    ↓ 수집
[모으미 v1]  →  01_Collector/YYYY-MM-DD.json
                    ↓ 읽기
              [쓰미 v2]  →  컨플루언스 AR (생성/병합)
                         →  02_Writer/YYYY-MM-DD.json  (컨플 URL 포함)
                                ↓ 읽기 (JSON + 컨플 페이지 직접 읽기)
                         [읽어봄이 v3]  →  03_Validator/YYYY-MM-DD.json  (컨플 URL 승계)
                                              ↓ 읽기 (JSON + 컨플 페이지 직접 읽기)
                                       [다시쓰미 v4]  →  컨플루언스 AR (최종 업데이트)
                                                     →  04_Refiner/YYYY-MM-DD.json  (최종 컨플 URL 포함)
```

---

## 2. 노드별 입출력 정의

| 노드 | 입력 (읽는 것) | 출력 (쓰는 것) |
|------|----------------|----------------|
| 모으미 (v1) | 슬랙 API | `01_Collector/YYYY-MM-DD.json` |
| 쓰미 (v2) | `01_Collector/YYYY-MM-DD.json` + 컨플루언스 AR 기존 페이지 | `02_Writer/YYYY-MM-DD.json` + 컨플루언스 AR (생성/병합) |
| 읽어봄이 (v3) | `01_Collector/YYYY-MM-DD.json` + `02_Writer/YYYY-MM-DD.json` + 컨플루언스 AR 실제 페이지 | `03_Validator/YYYY-MM-DD.json` |
| 다시쓰미 (v4) | `03_Validator/YYYY-MM-DD.json` + 컨플루언스 AR 실제 페이지 | `04_Refiner/YYYY-MM-DD.json` + 컨플루언스 AR (최종 업데이트) |

### 컨플루언스 페이지 접근 방식
- **쓰미**: `target_name`으로 컨플루언스 AR 스페이스를 검색하여 기존 페이지를 탐색. 작업 후 `confluence_page_url`을 출력 JSON에 기록.
- **읽어봄이**: `02_Writer` JSON의 `confluence_page_url`을 사용하여 컨플루언스 페이지를 직접 읽어 실제 반영 내용을 검증. **읽기 전용.**
- **다시쓰미**: `03_Validator` JSON의 `confluence_page_url`을 사용하여 컨플루언스 페이지를 직접 읽은 후 최종 업데이트 수행.

---

## 3. 파일 경로 규칙

```
Archive_Pincrux/
├── 01_Collector/
│   └── YYYY-MM-DD.json          # 재실행 시: YYYY-MM-DD_2.json
├── 02_Writer/
│   └── YYYY-MM-DD.json
├── 03_Validator/
│   └── YYYY-MM-DD.json
└── 04_Refiner/
    └── YYYY-MM-DD.json
```

- `YYYY-MM-DD`는 **파이프라인 실행 날짜** (모은 시점) 기준.
- 동일 날짜 재실행 시 `_2`, `_3` 순번 추가. (예: `2026-06-25_2.json`)
- 각 노드는 **오늘 날짜 파일**을 기본으로 탐색. 총총이가 특정 날짜를 지정한 경우 그 날짜를 우선.

---

## 4. JSON 스키마 규격

### 4-1. 모으미 출력 (`01_Collector/YYYY-MM-DD.json`)

```json
{
  "schema_version": "1.0",
  "node": "collector",
  "run_date": "YYYY-MM-DD",
  "period": "YYYY-MM-DD to YYYY-MM-DD",
  "status": "success / fail",
  "data_summaries": [
    {
      "task_id": "T001",
      "major_category": "Client / Media_Partner / In-house",
      "minor_category": "Project / Product",
      "context_status": "matched / new / inquiry / unknown",
      "context_reference": "판단 근거",
      "target_name": "광고주/매체/프로덕트명",
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

### 4-2. 쓰미 출력 (`02_Writer/YYYY-MM-DD.json`)

```json
{
  "schema_version": "1.0",
  "node": "writer",
  "run_date": "YYYY-MM-DD",
  "source_file": "Archive_Pincrux/01_Collector/YYYY-MM-DD.json",
  "node_status": "success / fail",
  "processed_tasks": [
    {
      "task_id": "T001",
      "target_name": "A광고주 프로젝트",
      "context_status": "matched / new / inquiry / unknown",
      "action_taken": "merged_into_existing / created_new / isolated_to_faq / skipped",
      "confluence_space": "AR",
      "confluence_page_url": "https://pincrux.atlassian.net/wiki/spaces/AR/pages/123456",
      "confluence_page_id": "123456",
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

### 4-3. 읽어봄이 출력 (`03_Validator/YYYY-MM-DD.json`)

```json
{
  "schema_version": "1.0",
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

### 4-4. 다시쓰미 출력 (`04_Refiner/YYYY-MM-DD.json`)

```json
{
  "schema_version": "1.0",
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

---

## 5. 공통 규칙

### 상태 코드
| 필드 | 값 | 의미 |
|------|-----|------|
| `status` / `node_status` | `success` | 정상 완료 |
| `status` / `node_status` | `fail` | 즉시 중단, 총총에게 제어권 반환 |

### 에러 출력 형식 (공통)
```json
{
  "node": "writer / validator / refiner",
  "run_date": "YYYY-MM-DD",
  "status": "fail",
  "message": "구체적 오류 사유",
  "failed_at_step": "데이터 로드 / 컨플루언스 탐색 / 페이지 업데이트 / ..."
}
```

### 핵심 제약
- 각 노드는 **자신의 입력 파일 경로를 직접 읽는다.** 총총이가 데이터를 복사해 전달하지 않는다.
- `confluence_page_url`과 `confluence_page_id`는 쓰미(v2)에서 최초 발급되어 v3 → v4로 그대로 승계된다. 중간에 URL이 바뀌면 전체 체인이 깨지므로 수정 금지.
- `schema_version`이 다른 파일을 수신한 노드는 작업을 중단하고 총총에게 버전 불일치를 보고한다.
