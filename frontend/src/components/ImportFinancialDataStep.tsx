import { useState, useRef, useCallback } from "react";
import { C_SUCCESS, C_ERROR, C_WARNING, C_PRIMARY, C_BORDER } from "@/lib/colors";
import { SpreadsheetGrid } from "@/components/SpreadsheetGrid";
import {
  STANDARDS,
  FIELD_LABELS,
  ORDERED_FIELDS,
  parseFile,
  extractStandardCSV,
  extractPLStatement,
  extractSuperstore,
  extractCustom,
  fmtImportValue,
} from "@/lib/importUtils";
import type { DataStandard, ParsedData, ExtractedValues, ColumnMapping, WizardStep } from "@/lib/importUtils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ImportFinancialDataStepProps {
  onBack: () => void;
  onSkip: () => void;
  onApply: (extracted: ExtractedValues) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WIZARD_STEP_LABELS: Record<WizardStep, string> = {
  standard: "Format",
  upload:   "Upload",
  confirm:  "Confirm",
};

const WIZARD_STEP_ORDER: WizardStep[] = ["standard", "upload", "confirm"];

// ── Component ─────────────────────────────────────────────────────────────────

export default function ImportFinancialDataStep({ onBack, onSkip, onApply }: ImportFinancialDataStepProps) {
  const [wizardStep, setWizardStep]   = useState<WizardStep>("standard");
  const [standard, setStandard]       = useState<DataStandard | null>(null);
  const [file, setFile]               = useState<File | null>(null);
  const [parsedData, setParsedData]   = useState<ParsedData | null>(null);
  const [parseError, setParseError]   = useState<string | null>(null);
  const [isDragging, setIsDragging]   = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const [mapping, setMapping]         = useState<ColumnMapping>({ date: "", revenue: "", cogs: "", marketing: "", payroll: "" });
  const [extracted, setExtracted]     = useState<ExtractedValues | null>(null);
  const [editableData, setEditableData] = useState<ParsedData | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const gridDataRef = useRef<(() => ParsedData) | null>(null);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setParseError(null);
    setIsLoading(true);
    try {
      const data = await parseFile(f);
      setParsedData(data);
      setEditableData({ headers: [...data.headers], rows: data.rows.map(r => [...r]) });
    } catch (err) {
      setParseError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleBack = () => {
    if (wizardStep === "standard") {
      onBack();
    } else if (wizardStep === "upload") {
      setWizardStep("standard");
      setFile(null);
      setParsedData(null);
      setEditableData(null);
      setParseError(null);
    } else {
      setWizardStep("upload");
    }
  };

  const handleNext = () => {
    if (wizardStep === "standard" && standard) {
      setWizardStep("upload");
    } else if (wizardStep === "upload" && editableData && !parseError) {
      const currentData = gridDataRef.current ? gridDataRef.current() : editableData;
      let values: ExtractedValues = {};
      if (standard === "standard-csv") values = extractStandardCSV(currentData);
      else if (standard === "pl-statement") values = extractPLStatement(currentData);
      else if (standard === "superstore") values = extractSuperstore(currentData);
      else if (standard === "custom") values = extractCustom(currentData, mapping);
      setExtracted(values);
      setWizardStep("confirm");
    } else if (wizardStep === "confirm" && extracted) {
      onApply(extracted);
    }
  };

  const canProceed =
    wizardStep === "standard" ? standard !== null :
    wizardStep === "upload"   ? editableData !== null && !parseError :
    extracted !== null;

  const nextLabel =
    wizardStep === "standard" ? "Continue →" :
    wizardStep === "upload"   ? "Extract Data →" :
    "Apply & Continue →";

  const wizardStepIndex = WIZARD_STEP_ORDER.indexOf(wizardStep);

  return (
    <div>
      {/* Step header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-extrabold text-xs flex items-center justify-center flex-shrink-0">
            1
          </div>
          <span className="text-muted-foreground text-xs tracking-widest uppercase">
            Step 1 of 3
          </span>
        </div>
        <h2 className="text-foreground text-2xl font-extrabold tracking-tight mb-1">
          Import Financial Data
        </h2>
        <p className="text-muted-foreground text-sm">
          Upload your existing data to pre-fill your projections automatically.
        </p>
      </div>

      {/* Wizard sub-step indicator */}
      <div className="flex items-center gap-1.5 mb-5">
        {WIZARD_STEP_ORDER.map((s, i) => {
          const isActive = wizardStep === s;
          const isDone   = wizardStepIndex > i;
          return (
            <div key={s} className="flex items-center gap-1.5">
              <div
                className={`flex items-center gap-1.5 text-xs font-medium transition-colors duration-200 ${
                  isActive ? "text-primary" : isDone ? "text-[#1D9E75]" : "text-muted-foreground"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-colors duration-200 ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isDone
                      ? "bg-[#1D9E75] text-white"
                      : "bg-border text-muted-foreground"
                  }`}
                >
                  {isDone ? "✓" : i + 1}
                </span>
                {WIZARD_STEP_LABELS[s]}
              </div>
              {i < WIZARD_STEP_ORDER.length - 1 && (
                <div
                  className={`w-6 h-px transition-colors duration-200 ${
                    wizardStepIndex > i ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Wizard content: Standard selection ── */}
      {wizardStep === "standard" && (
        <div className="flex flex-col gap-2.5">
          {STANDARDS.map((s) => {
            const active = standard === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setStandard(s.id)}
                className={`text-left rounded-lg px-4 py-3 border-[1.5px] border-l-[3px] transition-all duration-150 ${
                  active
                    ? "bg-primary/[0.08] border-primary"
                    : "bg-white/50 border-border hover:border-primary/60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div
                      className={`text-sm font-semibold mb-0.5 ${
                        active ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {s.title}
                    </div>
                    <div className="text-xs text-muted-foreground">{s.description}</div>
                  </div>
                  <div className="text-[10px] text-muted-foreground bg-primary/[0.07] rounded px-1.5 py-0.5 whitespace-nowrap flex-shrink-0 mt-0.5">
                    {s.hint}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Wizard content: Upload + Preview ── */}
      {wizardStep === "upload" && (
        <div className="flex flex-col gap-4">
          {/* How the Workflow Works */}
          <div
            className="rounded-xl px-4 py-3.5"
            style={{ backgroundColor: "rgba(47,36,133,0.05)", border: "1px solid rgba(47,36,133,0.12)" }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: "hsl(245 16% 49%)" }}>
              How the Workflow Works
            </p>
            <p className="text-xs text-muted-foreground mb-2.5">
              Implementing this usually follows a four-step process:
            </p>
            <ol className="flex flex-col gap-1.5">
              {[
                { step: "Upload", desc: "Select an Excel or CSV file from your device." },
                { step: "Parse", desc: "The file is read locally in your browser using SheetJS — no server upload required." },
                { step: "Display & Edit", desc: "Data loads into an editable grid. Change values, add rows, or fix headers directly." },
                { step: "Analyze", desc: "Once ready, the updated data is extracted and passed to the analytics engine." },
              ].map(({ step, desc }, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <span
                    className="mt-0.5 flex-shrink-0 rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold"
                    style={{ backgroundColor: "rgba(47,36,133,0.15)", color: "hsl(245 57% 33%)" }}
                  >
                    {i + 1}
                  </span>
                  <span>
                    <span className="font-semibold" style={{ color: "hsl(245 57% 33%)" }}>{step}:</span>{" "}
                    <span className="text-muted-foreground">{desc}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? C_PRIMARY : file && !parseError ? C_SUCCESS : C_BORDER}`,
              borderRadius: "12px",
              padding: "28px 20px",
              textAlign: "center",
              cursor: "pointer",
              backgroundColor: isDragging
                ? "rgba(47,36,133,0.07)"
                : file && !parseError
                ? "rgba(29,158,117,0.05)"
                : "rgba(255,255,255,0.50)",
              transition: "all 0.15s",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Parsing file…</p>
            ) : file ? (
              <>
                <p className="text-sm font-semibold" style={{ color: C_SUCCESS }}>✓ {file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {parsedData ? `${parsedData.rows.length} rows, ${parsedData.headers.length} columns` : ""}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-2">Click to replace</p>
              </>
            ) : (
              <>
                <div className="text-3xl opacity-25 mb-2">↑</div>
                <p className="text-sm font-medium text-muted-foreground">Drag & drop or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">.csv or .xlsx accepted</p>
              </>
            )}
          </div>

          {/* Parse error */}
          {parseError && (
            <div
              className="rounded-lg px-3.5 py-2.5 text-xs"
              style={{ backgroundColor: `${C_ERROR}1a`, border: `1px solid ${C_ERROR}44`, color: C_ERROR }}
            >
              {parseError}
            </div>
          )}

          {/* Spreadsheet grid */}
          {editableData && !parseError && (
            <SpreadsheetGrid
              data={editableData}
              onHeaderChange={(i, value) =>
                setEditableData((prev) => {
                  if (!prev) return prev;
                  const headers = [...prev.headers];
                  headers[i] = value;
                  return { ...prev, headers };
                })
              }
              gridRef={gridDataRef}
              fileKey={file?.name ?? "grid"}
            />
          )}

          {/* Custom column mapping */}
          {standard === "custom" && editableData && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">
                Column Mapping
              </p>
              <div className="flex flex-col gap-2">
                {(["revenue", "date", "cogs", "marketing", "payroll"] as const).map((field) => {
                  const labels: Record<string, string> = {
                    revenue:   "Revenue *",
                    date:      "Date",
                    cogs:      "COGS",
                    marketing: "Marketing Spend",
                    payroll:   "Payroll",
                  };
                  return (
                    <div key={field} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-28 flex-shrink-0">
                        {labels[field]}
                      </span>
                      <select
                        value={mapping[field]}
                        onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value }))}
                        className="flex-1 bg-white/70 border border-border rounded-md text-xs text-foreground px-2.5 py-1.5 cursor-pointer"
                      >
                        <option value="">— Skip —</option>
                        {editableData.headers.map((h, i) => (
                          <option key={i} value={h}>{h || `Column ${i + 1}`}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Wizard content: Confirm ── */}
      {wizardStep === "confirm" && extracted && (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            These values were extracted from{" "}
            <span className="text-primary font-medium">{file?.name}</span>. They will
            override the values you set in the previous steps for any detected fields.
          </p>
          <div className="border border-border rounded-xl overflow-hidden">
            {ORDERED_FIELDS.map((key, i) => {
              const v = extracted[key];
              const isLast = i === ORDERED_FIELDS.length - 1;
              return (
                <div
                  key={key}
                  className="flex items-center px-4 py-2.5 bg-white/60"
                  style={{ borderBottom: isLast ? "none" : `1px solid ${C_BORDER}` }}
                >
                  <span className="flex-1 text-sm text-foreground/70">{FIELD_LABELS[key]}</span>
                  {v !== undefined ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: C_SUCCESS }}>
                        {fmtImportValue(key, v)}
                      </span>
                      <span className="text-xs" style={{ color: C_SUCCESS, opacity: 0.7 }}>
                        ✓ detected
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs" style={{ color: C_WARNING }}>
                      ⚠ could not detect
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "hsl(245 16% 60%)" }}>
            Only detected fields will be updated. Undetected fields keep your slider values from the previous steps.
          </p>
        </div>
      )}

      {/* Navigation row */}
      <div className="flex items-center justify-between mt-7">
        <button
          onClick={handleBack}
          className="bg-transparent border border-border text-muted-foreground rounded-lg px-5 py-2.5 text-sm font-medium hover:border-muted-foreground hover:text-foreground transition-colors duration-150 font-sans"
        >
          ← Back
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={onSkip}
            className="bg-transparent border border-border text-muted-foreground rounded-lg px-5 py-2.5 text-sm font-medium hover:border-muted-foreground hover:text-foreground transition-colors duration-150 font-sans"
          >
            Skip importing data
          </button>
          <button
            onClick={handleNext}
            disabled={!canProceed}
            className={`bg-primary text-primary-foreground rounded-lg px-6 py-2.5 text-sm font-semibold transition-opacity duration-150 font-sans ${
              canProceed ? "hover:opacity-85 cursor-pointer" : "opacity-40 cursor-not-allowed"
            }`}
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
