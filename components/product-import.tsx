"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FieldError, Notice, Select, SubmitButton } from "@/components/form";
import { categoryLabel, formatMoney, unitLabel } from "@/lib/catalog";
import {
  IMPORT_FIELDS,
  MAX_IMPORT_ROWS,
  guessMapping,
  parseCsv,
  pickValues,
  planRow,
  productIndex,
  splitHeader,
  templateCsv,
  type ExistingProduct,
  type ImportField,
  type Mapping,
  type PlannedRow,
} from "@/lib/product-import";
import { finishImport, importProducts, type ImportResult } from "@/lib/product-import-actions";

const CHUNK = 25;

type Sheet = { file: string; headers: string[]; body: string[][] };

// Spreadsheet → column matching → preview → import, in chunks with progress.
// `companyId` is set when a Spectra admin imports on a vendor's behalf.
export function ProductImport({ existing, companyId, doneHref }: { existing: ExistingProduct[]; companyId: string | null; doneHref: string }) {
  const router = useRouter();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [mapping, setMapping] = useState<Mapping>({});
  const [fileError, setFileError] = useState<string>();
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [importError, setImportError] = useState<string>();
  const [showAll, setShowAll] = useState(false);

  async function readFile(file: File | undefined) {
    if (!file) return;
    setFileError(undefined);
    setResults(null);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "xls") return setFileError("Older .xls files aren’t supported. In Excel, choose File → Save As → .xlsx or CSV.");
    if (ext !== "csv" && ext !== "xlsx" && ext !== "txt") return setFileError("Choose a CSV or Excel (.xlsx) file.");
    setReading(true);
    try {
      let rows: string[][];
      if (ext === "xlsx") {
        const { readSheet } = await import("read-excel-file/browser");
        const data = await readSheet(file);
        rows = data.map((r) => r.map((cell) => (cell === null || cell === undefined ? "" : cell instanceof Date ? cell.toISOString().slice(0, 10) : String(cell))));
      } else {
        rows = parseCsv(await file.text());
      }
      const { headers, body } = splitHeader(rows);
      if (!headers.length || !body.length) return setFileError("That file has no product rows. Make sure the first row has column names.");
      if (body.length > MAX_IMPORT_ROWS) return setFileError(`That’s ${body.length.toLocaleString()} rows. Split it into files of ${MAX_IMPORT_ROWS.toLocaleString()} or fewer.`);
      setSheet({ file: file.name, headers, body });
      setMapping(guessMapping(headers));
    } catch {
      setFileError("Couldn’t read that file. Try saving it as CSV.");
    } finally {
      setReading(false);
    }
  }

  const plans = useMemo(() => {
    if (!sheet) return [];
    const index = productIndex(existing);
    const seen = new Set<string>();
    return sheet.body.map((row) => planRow(pickValues(row, mapping), index, seen));
  }, [sheet, mapping, existing]);

  const counts = useMemo(() => {
    const c = { create: 0, update: 0, skip: 0, photos: 0 };
    for (const p of plans) {
      c[p.action]++;
      if (p.action !== "skip" && p.imageUrl) c.photos++;
    }
    return c;
  }, [plans]);

  async function runImport() {
    if (!sheet) return;
    setImportError(undefined);
    setProgress(0);
    const all: ImportResult[] = [];
    let seenKeys: string[] = [];
    try {
      for (let start = 0; start < sheet.body.length; start += CHUNK) {
        const chunk = sheet.body.slice(start, start + CHUNK).map((row, i) => ({ row: start + i + 1, values: pickValues(row, mapping) }));
        const response = await importProducts(companyId, chunk, seenKeys);
        if (response.error || !response.results) {
          setImportError(`${response.error ?? "The import stopped."} ${all.length ? `Rows 1–${start} were saved; you can re-import the same file and finished rows will just update.` : ""}`);
          break;
        }
        all.push(...response.results);
        seenKeys = response.seenKeys ?? seenKeys;
        setProgress(Math.min(start + CHUNK, sheet.body.length));
      }
    } catch {
      setImportError("The connection dropped mid-import. Re-import the same file; finished rows will just update.");
    }
    setResults(all);
    setProgress(null);
    if (companyId && all.length) {
      await finishImport(companyId, {
        created: all.filter((r) => r.status === "created").length,
        updated: all.filter((r) => r.status === "updated").length,
        skipped: all.filter((r) => r.status === "skipped").length,
        file: sheet.file,
      });
    }
    router.refresh();
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([templateCsv()], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "spectra-products-template.csv" });
    a.click();
    URL.revokeObjectURL(url);
  }

  if (results) return <ImportSummary results={results} error={importError} doneHref={doneHref} onAgain={() => { setSheet(null); setResults(null); }} />;

  const missing = IMPORT_FIELDS.filter((f) => f.required && mapping[f.key] === undefined);
  const columnOptions = (sheet?.headers ?? []).map((h, i) => ({ value: String(i), label: h || `Column ${i + 1}` }));
  const sample = (index: number | undefined) => (index === undefined ? "" : sheet?.body.find((r) => (r[index] ?? "").trim())?.[index]?.trim() ?? "");
  const visible = showAll ? plans : plans.slice(0, 100);

  return (
    <div className="space-y-14">
      <Step n={1} title="Choose a spreadsheet" note="CSV or Excel. Exports from LeafLink and Apex Trading work as-is.">
        <label
          className={`flex cursor-pointer items-center justify-between gap-3 rounded-[3px] border border-dashed px-4 py-4 text-[15px] transition-colors hover:border-sunset has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-sunset ${
            fileError ? "border-danger" : "border-ink-soft/40 bg-field"
          }`}
        >
          <input
            type="file"
            accept=".csv,.xlsx,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            disabled={reading || progress !== null}
            onChange={(e) => {
              readFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <span className={sheet ? "text-ink" : "text-ink-soft"}>
            {reading ? "Reading…" : sheet ? `${sheet.file} · ${sheet.body.length.toLocaleString()} rows` : "No file chosen"}
          </span>
          <span className="font-mono text-[11px] tracking-[0.12em] text-sunset uppercase">{sheet ? "Change" : "Browse"}</span>
        </label>
        <FieldError id="file-error" error={fileError} />
        <p className="mt-3 text-[13px] text-ink-soft">
          Starting from scratch?{" "}
          <button type="button" onClick={downloadTemplate} className="cursor-pointer text-ink underline decoration-sunset decoration-2 underline-offset-4 hover:text-sunset">
            Download the Spectra template
          </button>
          .
        </p>
      </Step>

      {sheet && (
        <Step n={2} title="Match the columns" note="We matched what we could. Fix anything that’s wrong; leave a field on “Not in file” to skip it.">
          <div className="divide-y divide-line border-y border-line">
            {IMPORT_FIELDS.map((field) => (
              <div key={field.key} className="grid items-center gap-x-6 gap-y-2 py-3 sm:grid-cols-[10rem_minmax(0,16rem)_minmax(0,1fr)]">
                <span className="text-[14px]">
                  {field.label}
                  {field.required && <span className="text-ink-soft"> · required for new</span>}
                </span>
                <Select
                  label={`${field.label} column`}
                  name={`map-${field.key}`}
                  className="[&>div:first-child]:sr-only"
                  options={columnOptions}
                  placeholder="Not in file"
                  value={mapping[field.key] === undefined ? "" : String(mapping[field.key])}
                  onChange={(e) =>
                    setMapping((m) => {
                      const next = { ...m };
                      if (e.target.value === "") delete next[field.key];
                      else next[field.key as ImportField] = Number(e.target.value);
                      return next;
                    })
                  }
                />
                <span className="truncate font-mono text-[12px] text-ink-soft">{sample(mapping[field.key]) || " "}</span>
              </div>
            ))}
          </div>
          {missing.length > 0 && (
            <p className="mt-4 text-[13px] text-ink-soft">
              Without {missing.map((f) => f.label.toLowerCase()).join(", ")}, rows can only update products you already have.
            </p>
          )}
        </Step>
      )}

      {sheet && (
        <Step n={3} title="Check and import">
          <dl className="grid grid-cols-2 border-y border-line sm:grid-cols-4">
            <Stat label="New" value={counts.create} />
            <Stat label="Updates" value={counts.update} />
            <Stat label="Skipped" value={counts.skip} tone={counts.skip ? "danger" : undefined} />
            <Stat label="Photos to copy" value={counts.photos} />
          </dl>
          <p className="mt-3 text-[13px] text-ink-soft">
            Products already in the catalog are matched by SKU, then exact name, and only the matched columns change. Photos are copied
            from their links into Spectra, and only for products without one.
          </p>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-[14px]">
              <thead>
                <tr className="border-b border-ink font-mono text-[11px] tracking-[0.14em] text-ink-soft uppercase">
                  <th className="py-2 pr-4 font-normal">Row</th>
                  <th className="py-2 pr-4 font-normal">Product</th>
                  <th className="py-2 pr-4 font-normal">Price</th>
                  <th className="py-2 pr-4 font-normal">Stock</th>
                  <th className="py-2 font-normal">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((plan, i) => (
                  <PreviewRow key={i} row={i + 1} plan={plan} />
                ))}
              </tbody>
            </table>
          </div>
          {plans.length > visible.length && (
            <button type="button" onClick={() => setShowAll(true)} className="mt-3 cursor-pointer text-[13px] text-ink-soft underline underline-offset-4 hover:text-sunset">
              Show all {plans.length.toLocaleString()} rows
            </button>
          )}

          <form
            className="mt-10 max-w-sm space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              runImport();
            }}
          >
            {importError && <Notice tone="error">{importError}</Notice>}
            {progress !== null && (
              <div>
                <div className="h-1.5 overflow-hidden rounded-[2px] bg-line">
                  <div className="h-full bg-sunset transition-[width] duration-300" style={{ width: `${(progress / sheet.body.length) * 100}%` }} />
                </div>
                <p className="mt-2 font-mono text-[12px] text-ink-soft">
                  {progress.toLocaleString()} of {sheet.body.length.toLocaleString()} rows
                </p>
              </div>
            )}
            {counts.create + counts.update > 0 ? (
              <SubmitButton pending={progress !== null} pendingLabel="Importing…">
                Import {(counts.create + counts.update).toLocaleString()} product{counts.create + counts.update === 1 ? "" : "s"}
              </SubmitButton>
            ) : (
              <p className="text-[14px] text-ink-soft">Nothing to import yet. Fix the columns above or the rows in your file.</p>
            )}
          </form>
        </Step>
      )}
    </div>
  );
}

function PreviewRow({ row, plan }: { row: number; plan: PlannedRow }) {
  if (plan.action === "skip") {
    return (
      <tr className="align-baseline">
        <td className="py-2.5 pr-4 font-mono text-[12px] text-ink-soft">{row}</td>
        <td className="py-2.5 pr-4">{plan.name || <span className="text-ink-soft">—</span>}</td>
        <td className="py-2.5 pr-4" />
        <td className="py-2.5 pr-4" />
        <td className="py-2.5 text-danger">{plan.error}</td>
      </tr>
    );
  }
  const p = plan.product;
  return (
    <tr className="align-baseline">
      <td className="py-2.5 pr-4 font-mono text-[12px] text-ink-soft">{row}</td>
      <td className="py-2.5 pr-4">
        {p.name}
        <span className="text-ink-soft">
          {" "}
          &middot; {categoryLabel(p.category)}
          {p.sku && <span className="font-mono text-[12px]"> &middot; {p.sku}</span>}
        </span>
      </td>
      <td className="py-2.5 pr-4 font-mono whitespace-nowrap">
        {p.price_per_unit !== null && `${formatMoney(p.price_per_unit)}/${unitLabel(p.unit)}`}
      </td>
      <td className="py-2.5 pr-4 font-mono">{p.stock_qty}</td>
      <td className="py-2.5 whitespace-nowrap">
        {plan.action === "update" ? (
          <span>Update{plan.matchedBy === "name" && <span className="text-ink-soft"> (by name)</span>}</span>
        ) : (
          <span className="text-success">New</span>
        )}
        {!p.is_active && <span className="text-ink-soft"> · hidden</span>}
        {plan.imageUrl && <span className="text-ink-soft"> · photo</span>}
      </td>
    </tr>
  );
}

function ImportSummary({ results, error, doneHref, onAgain }: { results: ImportResult[]; error?: string; doneHref: string; onAgain: () => void }) {
  const created = results.filter((r) => r.status === "created").length;
  const updated = results.filter((r) => r.status === "updated").length;
  const skipped = results.filter((r) => r.status === "skipped");
  const photoFails = results.filter((r) => r.photo === "failed");

  return (
    <div className="max-w-3xl space-y-8">
      {error ? <Notice tone="error">{error}</Notice> : <Notice tone="success">Import finished.</Notice>}
      <dl className="grid grid-cols-3 border-y border-line">
        <Stat label="Added" value={created} />
        <Stat label="Updated" value={updated} />
        <Stat label="Skipped" value={skipped.length} tone={skipped.length ? "danger" : undefined} />
      </dl>

      {skipped.length > 0 && (
        <IssueList title="Skipped rows" note="Fix these in the spreadsheet and import it again; rows already saved will just update." items={skipped.map((r) => ({ row: r.row, name: r.name, text: r.error ?? "" }))} />
      )}
      {photoFails.length > 0 && (
        <IssueList
          title="Photos that didn’t copy"
          note="The products were saved without a photo. The link may need a sign-in or not point straight at an image; add these photos from the product page."
          items={photoFails.map((r) => ({ row: r.row, name: r.name, text: "Photo link didn’t work" }))}
        />
      )}

      <div className="flex flex-wrap items-center gap-6">
        <Link href={doneHref} className="text-[15px] text-ink underline decoration-sunset decoration-2 underline-offset-4 hover:text-sunset">
          View products &rarr;
        </Link>
        <button type="button" onClick={onAgain} className="cursor-pointer text-[14px] text-ink-soft underline underline-offset-4 hover:text-sunset">
          Import another file
        </button>
      </div>
    </div>
  );
}

function IssueList({ title, note, items }: { title: string; note: string; items: { row: number; name: string; text: string }[] }) {
  return (
    <section>
      <h3 className="font-display text-xl">{title}</h3>
      <p className="mt-1 mb-3 text-[13px] text-ink-soft">{note}</p>
      <ul className="divide-y divide-line border-y border-line text-[14px]">
        {items.map((item) => (
          <li key={item.row} className="grid grid-cols-[4rem_minmax(0,1fr)] gap-3 py-2.5 sm:grid-cols-[4rem_minmax(0,16rem)_minmax(0,1fr)]">
            <span className="font-mono text-[12px] text-ink-soft">Row {item.row}</span>
            <span className="truncate">{item.name || "—"}</span>
            <span className="col-start-2 text-danger sm:col-start-auto">{item.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Step({ n, title, note, children }: { n: number; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-6 border-b border-ink pb-3">
        <p className="font-mono text-[11px] tracking-[0.16em] text-ink-soft uppercase">Step {n}</p>
        <h2 className="mt-1 font-display text-2xl">{title}</h2>
        {note && <p className="mt-1 text-[13px] text-ink-soft">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "danger" }) {
  return (
    <div className="border-line py-4 pr-4 [&:not(:first-child)]:border-l [&:not(:first-child)]:pl-4">
      <dt className="font-mono text-[11px] tracking-[0.14em] text-ink-soft uppercase">{label}</dt>
      <dd className={`mt-1 font-display text-3xl font-light ${tone === "danger" ? "text-danger" : ""}`}>{value.toLocaleString()}</dd>
    </div>
  );
}
