# Decisions

## 2026-10-27 — FTPS: extra CA chain via `FTP_CA_CERT`

**Context:** since the O2Switch FTP certificate renewal (2026-10-22, server `millet.o2switch.net`),
FTPS uploads failed with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. The new Let's Encrypt cert is issued
by intermediate `YR2` → `Root YR` (new "Gen Y" hierarchy). The server only sends the leaf cert,
and Node.js does not trust `Root YR` yet (only ISRG Root X1/X2).

**Decision:** optional env var `FTP_CA_CERT` (PEM) appended to Node's default roots. Value used:
`int-yr2.pem` + `root-yr-by-x1.pem` from https://letsencrypt.org/certificates/ (chain ends on ISRG Root X1).

**Rejected:** `rejectUnauthorized: false` (disables verification; family documents are sensitive).

**To revisit:** remove `FTP_CA_CERT` once O2Switch serves the full chain or Node trusts Root YR.
Intermediates expire 2028-09-02 (YR2).

**Update 2026-10-27:** O2Switch fixed the server (full chain now sent, verified with OpenSSL and Node
without `FTP_CA_CERT`). `FTP_CA_CERT` removed from Render. Code kept as a dormant fallback:
re-add the env var if the issue comes back.
