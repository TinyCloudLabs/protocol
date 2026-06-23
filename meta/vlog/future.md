# Verdict log — concepts/future/

Authoring verdicts for the `concepts/future/` group. Roadmap entries: brief, no fabricated mechanics, depth pushed to the live concept. Ground truth: SYNTHESIS "Future Directions" + maps/whitepaper.md §6 + the encryption_network / replication scaffolds in tinycloud-node.

## 2026-06-23 — group authored (7 concepts)

All 7 were unauthored stubs (TODO comment + placeholder blockquote). Replaced each with a brief authored entry; added `layer: protocol` frontmatter; kept `status: planned`; converted blockquote stubs to liftable definition-first prose with `[[wikilinks]]`.

- **roadmap.md** (Template C) — index of the other six + one-paragraph "state of the roadmap" (shipped / actively-developed / speculative / dropped). Links each member and the live concepts. VERDICT: ok.
- **threshold-decryption.md** — ferveo/TACO, owner picks ≥3 nodes, key-gen ceremony, client-side share-combine, no blockchain, owner-only non-delegatable network management. Marked **actively under development** (only `KeyBackendKind::Threshold` slot exists). Links [[encryption/threshold-decryption]]. Scheme specifics flagged as design-intent (explicitly out of whitepaper scope). VERDICT: ok — grounded in SYNTHESIS §"Encryption pivot" + reserved enum slot; no mechanics invented beyond captured design intent.
- **replication-and-discovery.md** — first-class P2P replication + Bitcoin/Ethereum-style peer discovery; `replication/` module present but not declared in lib.rs (unmounted). Marked **actively under development**. Links [[consistency/replication]]. VERDICT: ok — module-unmounted fact + discovery-is-design-intent both stated.
- **compute.md** — `tinycloud.compute` (`execute`/`deploy`/`list`); WASM/ZK-VM over space data; NO captured design, MPC folded into threshold. Links [[services/compute]]. Marked speculative/planned. VERDICT: ok.
- **proxy-re-encryption-deprecated.md** — LIT-style proxy re-encryption CUT from v1, replaced by [[encryption/threshold-decryption|threshold decryption]]; never implemented. Records the Appendix L "Vault" + implementation-status `reencrypt` drift → [[meta/contradictions]]. Whitepaper README §4 "hard break" (no proxy re-encryption path) cited. VERDICT: ok — deprecation + drift both sourced.
- **zk-vms.md** — verifiable compute via ZK VMs (RISC Zero/SP1), `verify(proof, function_cid, inputs, outputs)`; research-phase, speculative. VERDICT: ok.
- **light-clients.md** — recursive-ZK light-client verification ("Recon"/lite-client explorations); depends on non-existent ZK-VM proving; speculative. VERDICT: ok.

### Notes / open items
- Appendix path for proxy-re-encryption: stub frontmatter said `appendix/appendix-k.md`; the Vault content the contract points at is Appendix **L** ("System Spaces", per whitepaper map line 135). Updated source path to `appendix-l-system-spaces.md`. Possible the stub's appendix-k ref is also valid — left a note rather than asserting.
- Link disambiguation: future files share basenames with live concepts (e.g. `threshold-decryption.md`). Used path-prefixed wikilinks (`[[encryption/threshold-decryption]]`, `[[future/threshold-decryption|…]]`) per existing convention in the bundle.
- All linked targets verified to exist on disk (encryption/*, consistency/*, services/compute, meta/status, meta/contradictions, architecture-layers).
- No code claims beyond: reserved `Threshold` enum slot; unmounted `replication/` module; `tinycloud.compute` not in code; proxy-re-encryption never implemented. These match SYNTHESIS §6/§8 and the whitepaper map. No new mechanics fabricated.
