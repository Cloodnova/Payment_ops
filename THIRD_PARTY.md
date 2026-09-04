# Third-Party Components & Attribution

CloudNova PaymentOps integrates the following third-party components. This is the NOTICE /
CHANGES record required by the upstream licenses.

## Swift Hybrid Postal Address Structuring — upstream code

- **Upstream project:** `Swift-SC/iso20022-address-structuring`
- **Pinned upstream commit:** `916deca20a2f3501c9b7befb11e21be3931887ba`
- **Upstream version:** `swift_address_structuring` v1.0.2
- **Purpose:** Town/country intelligence from unstructured postal addresses (CRF/Transformer
  model).
- **License:** see `third_party/swift-address/LICENSE.txt` (and `LICENSE.pdf`). Copyright
  © S.W.I.F.T SC ("Swift"), 2025. All rights reserved. The license permits use, copy, modify,
  merge, publish, distribute, sublicense and sell, subject to its conditions.
- **Status in CloudNova PaymentOps:**
  - The upstream `data_structuring` package is **vendored** at `third_party/swift-address/`
    (pinned commit). No upstream files have been modified; a `CloudNova-INTEGRATION.md` note
    records the integration context.
  - The engine runs in a **separate internal component** (`paymentops-address-structuring`),
    not in the core API image. `SwiftDerivedAddressProvider` is an HTTP client; the rest of
    PaymentOps depends only on the `AddressProvider` interface.
- **Branding / endorsement compliance:**
  - The Swift name is used only for technical attribution/identification (upstream copyright
    notice retained). CloudNova does not use the Swift name in product branding, does not imply
    Swift endorsement, does not use Swift logos.
  - Modified/derivative works are not branded with the Swift name (license §6.a).

## Swift Hybrid Postal Address Structuring — resources (model + misc)

- **Upstream project:** `Swift-SC/iso20022-address-structuring-resources`
- **Pinned commit:** `b4e66e280c6797da94cd87ea5fd72b015ba1eab8`
- **Contents vendored:** `models/CRF_with_MLP_EPOCH_1.safetensors`, `models/*.config.json`,
  `misc/*.json`, `LICENSE.txt`, `LICENSE.pdf`, `NOTICES.txt`.
- **License:** see `third_party/swift-address-resources/LICENSE.txt`. Copyright © S.W.I.F.T SC,
  2025. All rights reserved.
- **NOTICES.txt** (vendored) documents third-party datasets used in training:
  Wikipedia (CC BY-SA 4.0), restCountries (MPL 2.0), GeoNames (CC BY 4.0), OpenStreetMap,
  and ODbL v1.0 share-alike provisions.

## Reference data provisioning (NOT vendored)

The upstream engine's reference database is **derived from external datasets and is not
included** in the resources repository (the `raw/` dirs are empty placeholders). It is
provisioned at runtime (mounted read-only volume) and is governed by its own licenses:

- **GeoNames** (towns/alternate names/postcodes): CC BY 4.0 (attribution required). Source:
  `download.geonames.org/export/...`.
- **restCountries**: MPL 2.0.
- **Wikipedia-derived reference data**: CC BY-SA 4.0 (share-alike).
- **Training data**: ODbL v1.0 (share-alike, §§4.4–4.8) per the resources LICENSE.

These datasets are NOT redistributed in this repository. In CloudNova, they must be generated
(GeoNames dumps + preprocessing scripts) and mounted into the `paymentops-address-structuring`
component at deploy time. Until they are present, the component reports **not ready** and
PaymentOps falls back to the deterministic `CloudNovaAddressProvider`.

## Bundled ISO 20022 subset schema

The bundled `schemas/iso20022/pacs.008.001.08/*.xsd` is a CloudNova-authored subset. The
official ISO 20022 schemas are the property of ISO and are substituted under a proper ISO
license in production.
