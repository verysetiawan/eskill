package main

import "testing"

func TestResolveDocumentNumberLSPFallsBackToSchoolNumber(t *testing.T) {
	student := map[string]interface{}{
		"Nomor Surat": "420.5/UKK/2026/0042",
		"Nomor Seri":  "2026UKKABC123",
		"Tahun Lulus": "2026",
	}
	settings := CertSettings{DocumentNumbering: map[string]interface{}{
		"format":    "420.5/UKK/{YEAR}/{SERIAL}",
		"lspFormat": "",
		"year":      "2026",
	}}

	if got := resolveDocumentNumber(student, settings, "lsp"); got != "420.5/UKK/2026/0042" {
		t.Fatalf("nomor LSP kosong harus memakai nomor sekolah, mendapat %q", got)
	}
}

func TestResolveDocumentNumberUsesSeparateLSPFormat(t *testing.T) {
	student := map[string]interface{}{
		"Nomor Surat": "420.5/UKK/2026/0042",
		"Nomor Seri":  "2026UKKABC123",
		"Tahun Lulus": "2026",
	}
	settings := CertSettings{DocumentNumbering: map[string]interface{}{
		"format":    "420.5/UKK/{YEAR}/{SERIAL}",
		"lspFormat": "BNSP/LSP/{YEAR}/{SERIAL}",
		"year":      "2026",
	}}

	if got := resolveDocumentNumber(student, settings, "lsp"); got != "BNSP/LSP/2026/0042" {
		t.Fatalf("nomor LSP harus memakai format LSP, mendapat %q", got)
	}
	if got := resolveDocumentNumber(student, settings, "ukk"); got != "420.5/UKK/2026/0042" {
		t.Fatalf("nomor UKK harus tetap memakai nomor sekolah, mendapat %q", got)
	}
}
