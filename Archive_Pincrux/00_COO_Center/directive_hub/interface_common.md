---
document: 노드 간 데이터 교환 인터페이스 — 공통 규격
version: 1.0.0
last_updated: 2026-07-20
owner: 총총(COO)
---

# 인터페이스 공통 규격

> 2026-07-20부로 `interface_spec.md`가 노드별 스키마 파일로 분리되었다. 이 파일은 **모든 노드가 공통으로 읽어야 하는 부분**(데이터 흐름, 파일 경로, 공통 상태 코드, 백필 체크포인트)만 담는다. 각 노드가 실제로 주고받는 JSON 필드 정의는 아래 스키마 파일을 참조한다.
>
> - 모으미(v1) 출력 스키마 → `interface_schema_collector.md`
> - 쓰미(v2) 출력 스키마 → `interface_schema_writer.md`
> - 읽어봄이(v3) 출력 스키마 → `interface_schema_validator.md`
> - 다시쓰미(v4) 출력 스키마 → `interface_schema_refiner.md`

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

## 4. 공통 규칙

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
- `entity_name`은 파이프라인 전 노드에서 동일한 표기를 유지해야 한다. 노드가 임의로 수정 불가.

## 5. 백필(Backfill) 체크포인트 파일

백필 모드 실행 시 진행 상태를 아래 경로에 기록한다. 중단 후 재실행 시 이 파일을 기준으로 재개한다.

```
Archive_Pincrux/00_COO_Center/backfill_checkpoint.json
```

```json
{
  "last_completed_period": "YYYY-MM-DD",
  "next_period_start": "YYYY-MM-DD",
  "batch_cadence": "monthly",
  "last_run_date": "YYYY-MM-DD"
}
```

> 실제 필드 구성은 `Archive_Pincrux/00_COO_Center/backfill_checkpoint.json` 현재 파일을 기준으로 한다. 위는 최소 필수 필드 예시.
