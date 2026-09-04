# Third-Party Components & Attribution

CloudNova PaymentOps reuses / integrates the following third-party components. This file is
the NOTICE/CHANGES record required by the upstream license.

## Swift Hybrid Postal Address Structuring (upstream, NOT vendored in Week 2)

- **Upstream project:** `Swift-SC/iso20022-address-structuring`
- **Purpose:** Town/country intelligence from unstructured postal addresses (Swift AI address
  structuring model, a Conditional Random Field model).
- **License:** Open source, published on Swift (LICENSE.txt / LICENSE.pdf in the upstream
  repo). Consult the upstream license for exact terms.
- **Status in CloudNova PaymentOps:**
  - The component is **isolated** behind the `AddressProvider` interface
    (`packages/address_engine/base.py`).
  - The `SwiftDerivedAddressProvider`
    (`packages/address_engine/providers/swift_derived.py`) is an **adapter** that targets a
    separately-containerized Swift inference service.
  - In Week 2 the upstream Swift code and its model resources are **not vendored or
    deployed**; the adapter reports `available=False` and the pipeline uses the CloudNova
    deterministic provider.
- **Modifications:** None to upstream code (it is not vendored).
- **Branding / endorsement:** The "Swift" name is used only as the upstream component
  identifier in the adapter. CloudNova PaymentOps does not use the Swift name in product
  branding, does not imply Swift endorsement, and does not use Swift logos.
- **Model / reference resources:** The separately-downloaded model resources
  (`iso20022-address-structuring-resources`) and GeoNames data have their own license terms
  (GeoNames data is CC-BY and requires attribution). These MUST be verified before any
  redistribution and are **not** included in this repository.

## GeoNames (if/when used)

GeoNames data is licensed under Creative Commons Attribution 4.0 (CC BY 4.0). Attribution is
required. GeoNames data is not included in this repository.

## Bundled ISO 20022 subset schema

The bundled `schemas/iso20022/pacs.008.001.08/*.xsd` is a CloudNova-authored subset that
models the supported message structure. It is not the official ISO schema. The official ISO
20022 schemas are the property of ISO and are substituted under a proper ISO license in
production.
