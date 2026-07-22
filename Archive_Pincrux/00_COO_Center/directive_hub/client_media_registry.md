---
node: 총총(Orchestrator / COO) 전용
version: 1.4.0
last_updated: 2026-07-22
role: 광고주(Client)·매체/제휴사(Media_Partner)·인하우스(In-house) 이중 역할 판단 기준·유지보수 절차·폴더링 정책을 총총이 직접 소유·관리하는 거버넌스 문서
---

# 광고주/매체/인하우스 엔티티 레지스트리 v1.3.0

> 이 문서는 총총(COO) 전용 거버넌스 문서다. 모으미/쓰미가 실행 중 즉시 참조하는 파일, 그리고 엔티티 리스트·major_category·오분류 정정 이력의 단일 원본은 `Archive_Pincrux/00_COO_Center/entity_manifest.json`이다(2026-07-20부로 통일, 아래 2절 참조). 이 레지스트리는 그 위에서 **애매한 케이스 판단 기준·유지보수 절차·폴더링 정책 히스토리**만 관리하며, 엔티티 리스트나 정정 이력을 별도로 다시 적지 않는다.

## 1. 목적
- 파이프라인 초기(2026-06월 첫 백필) 및 이후 여러 회차에서 엔티티가 잘못된 상위 카테고리에 생성되는 사고가 반복됐다(미래에셋대우, 오퍼월 등 — 정정 이력은 `entity_history.md`의 해당 엔티티 항목 참조). 이를 방지하기 위해 확정 엔티티를 역할별로 명시적으로 리스트업하고, 총총이 정기적으로 실제 Confluence 구조(parent)와 대조한다.
- 광고주와 매체 역할이 모호하거나 겸하는 엔티티에 대한 판단 기준을 명문화한다.

## 2. 엔티티 리스트업·정정 이력 — 별도 파일로 이관 완료 (2026-07-20)

> **2026-07-20 구조 변경**: 이 문서의 구 2절(역할별 확정 엔티티 리스트 A/B/C 표)과 구 3절(오분류 정정 이력 로그)은 `entity_manifest.json`과 내용이 전량 중복되어 있었다(같은 51개 엔티티, 같은 major_category, 같은 정정 사유를 두 파일에 매번 나눠 기록). Jason 확인 후 중복을 제거했고, 이어서 지침 다이어트 차원에서 entity_manifest.json 자체도 조회용(가벼움)과 이력용(배경 서술)으로 다시 나눴다. **엔티티 조회는 `entity_manifest.json`(entity_name/major_category/confluence_page_id/aliases/status만), 분류 배경·정정 이력은 `entity_history.md`**가 각각의 단일 원본이다. 이 문서(registry)는 아래 4·5·6절(판단 기준·유지보수 절차·정책 히스토리)만 관리한다.
>
> 역할별 확정 엔티티 목록은 `entity_manifest.json`, 특정 엔티티의 정정 이력·배경은 `entity_history.md`를 참조할 것.

## 3. (결번 — 옛 정정 이력 로그는 entity_history.md로 이관됨, 2026-07-20)

## 4. 애매한 케이스 및 이중 역할 판단 기준

**2026-07-22 신설 — Media_Partner ↔ Partner(제휴사) 분리**: 기존에 "매체/제휴사"로 뭉뚱그려 관리하던 카테고리를 Media_Partner(매체, 광고 인벤토리 거래)와 Partner(제휴사, 사업 협력·공급 관계, 폴더 215416833)로 분리했다. 쿠프마케팅(쿠폰 공급사)이 최초 이관 사례. 판단 기준: 핀크럭스 광고가 상대방 앱/플랫폼에 노출되고 매체비를 받는 구조 = Media_Partner. 광고 인벤토리 거래 없이 쿠폰·상품 공급, 컨텐츠 제휴 등만 있으면 = Partner. 신규 엔티티가 이 경계에서 애매하면 `human_action_required`로 총총에게 보고.

**핵심 원칙**: 하나의 엔티티가 항상 하나의 역할만 갖는 것은 아니다. 특히 아래 유형은 광고주(Client)와 매체(Media_Partner) 역할을 문맥에 따라 바꿔가며 등장할 수 있으므로, `entity_manifest.json`의 고정값을 기계적으로 따르기 전에 **이번 대화가 어떤 역할로 등장했는지** 확인해야 한다.

- **자체 트래픽/인벤토리를 보유한 대형 사업자**(카드사·통신사·포털 등)는 (a) 자사 서비스 홍보를 위해 핀크럭스에 비용을 지불하는 광고주로 등장할 수도 있고, (b) 자사 앱/플랫폼에 핀크럭스 광고 인벤토리(오퍼월 등)를 태워주는 매체로 등장할 수도 있다. 예: KT(엠모바일=매체로 등장, 프로젝트K/혜택플랫폼=제휴 구조가 매체에 가까움), SK플래닛(광고주로 등록되어 있으나 자체 커머스 플랫폼 성격도 있어 재확인 필요).
- **판단 기준**: 이번 대화에서 핀크럭스가 "비용을 지불받는 쪽"(광고 인벤토리를 제공하고 리워드/매체비를 받음)인지, "비용을 지불하는 쪽"(캠페인을 의뢰하고 광고비를 지불함)인지로 구분한다. 비용 흐름 방향이 명확하지 않으면 함부로 manifest 값을 재판단하지 말고, major_category 불일치 가능성을 `human_action_required` 플래그로 남겨 총총에게 보고한다.
- **manifest 우선 원칙과의 관계**: entity_manifest.json의 고정값은 기본으로 신뢰하되, 이번 대화 내용이 고정값과 명백히 다른 역할(예: 늘 매체였던 엔티티가 이번엔 광고주로 비용을 지불하는 캠페인을 시작)로 등장하면 재판단을 보류하지 말고 즉시 총총에게 플래그. **임의로 major_category를 바꾸지 않는다** — 오직 COO만 이 레지스트리와 entity_manifest.json을 함께 갱신할 권한을 가진다.

## 5. 유지보수 절차
- 신규 엔티티가 새로 생성될 때마다(쓰미가 `action_taken: created_new` 보고) 총총이 `entity_manifest.json`의 `entities` 배열에 조회용 항목을 추가한다(entity_name/major_category/confluence_page_id, 필요 시 aliases/status). 배경 설명이 필요하면 `entity_history.md`에 별도 항목을 추가한다.
- 분기 1회(또는 오분류 의심 시) 총총이 `parent = <카테고리ID>` CQL로 각 카테고리 하위 실제 페이지 목록을 재조회하여 `entity_manifest.json`과 대조한다.
- 오분류 발견 시 `entity_manifest.json`의 값(major_category 등)을 정정하고, 정정 사유·일자·근거는 `entity_history.md`의 해당 엔티티 항목에 기록한 후 Jason 확인을 받아 페이지 이동(parentId 변경) 및 라벨 수정을 진행한다.

## 6. 폴더링 체계 및 사명 표기 규칙
- **폴더 구조**: 실제 구조는 Client(210665474) / Media_Partner(210894849) / Partner(215416833, 2026-07-22 신설) / In-house(210698241, 하위 IH_Policy=210796545, IH_Product=210763777)이다. In-house만 정책류(IH_Policy)/제품류(IH_Product)로 구분한다.
- **minor_category(Project/Product) 개념 폐기**: Client/Media_Partner는 Project/Product 하위분류를 사용하지 않는다. "Product"라는 명명은 오직 In-house 하위 폴더명(IH_Product)에만 존속하며, 이는 폴더 이름일 뿐 개별 엔티티에 부여하는 분류 필드가 아니다.
- **사명 표기 고정**: 회사명은 반드시 "핀크럭스"로만 표기하며 "핑크럭스" 등 오탈자를 금지한다. 전 노드(v0~v4) 지침에 공통 반영됨. 기존 발행 콘텐츠 전수 정정은 완료됨(57개 페이지 전수 확인, 오탈자 0건 — `CHANGELOG.md` v0_coo.md 섹션 참조).

> 이 규칙들의 변경 배경은 `CHANGELOG.md`(client_media_registry.md 섹션) 참조.
