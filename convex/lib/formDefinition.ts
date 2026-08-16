/**
 * Shared form field validators — used by schema, forms.ts, and tests.
 * Add a field type here first, then wire the builder UI.
 */
import { v } from "convex/values";

export const formFieldTypeValidator = v.union(
  v.literal("text"),
  v.literal("email"),
  v.literal("phone"),
  v.literal("textarea"),
  v.literal("number"),
  v.literal("select"),
  v.literal("checkbox"),
  v.literal("url"),
  v.literal("date"),
);

export const formFieldValidator = v.object({
  id: v.string(),
  type: formFieldTypeValidator,
  label: v.string(),
  /** Machine key used in submission payloads (unique per form). */
  name: v.string(),
  placeholder: v.optional(v.string()),
  helpText: v.optional(v.string()),
  required: v.boolean(),
  options: v.optional(v.array(v.string())),
  /** Simple show-if: when otherField equals this value, show this field. */
  showIfFieldId: v.optional(v.string()),
  showIfEquals: v.optional(v.string()),
});

export const formFieldsValidator = v.array(formFieldValidator);

export const formStatusValidator = v.union(
  v.literal("draft"),
  v.literal("live"),
  v.literal("archived"),
);

export type FormFieldType =
  | "text"
  | "email"
  | "phone"
  | "textarea"
  | "number"
  | "select"
  | "checkbox"
  | "url"
  | "date";

export type FormField = {
  id: string;
  type: FormFieldType;
  label: string;
  name: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  options?: string[];
  showIfFieldId?: string;
  showIfEquals?: string;
};

export function defaultFormFields(): FormField[] {
  return [
    {
      id: "f_name",
      type: "text",
      label: "Name",
      name: "name",
      required: true,
      placeholder: "Your name",
    },
    {
      id: "f_email",
      type: "email",
      label: "Email",
      name: "email",
      required: true,
      placeholder: "you@company.com",
    },
    {
      id: "f_message",
      type: "textarea",
      label: "Message",
      name: "message",
      required: true,
      placeholder: "How can we help?",
    },
  ];
}

export function slugifyFormName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "form";
}

export function assertPublishableFields(fields: FormField[]): void {
  if (fields.length === 0) {
    throw new Error("Add at least one field before publishing");
  }
  const names = new Set<string>();
  for (const field of fields) {
    if (!field.label.trim()) {
      throw new Error("Every field needs a label");
    }
    const key = field.name.trim().toLowerCase();
    if (!/^[a-z][a-z0-9_]*$/.test(key)) {
      throw new Error(
        `Field "${field.label}" needs a name like email or company_name`,
      );
    }
    if (names.has(key)) {
      throw new Error(`Duplicate field name: ${key}`);
    }
    names.add(key);
    if (
      field.type === "select" &&
      (!field.options || field.options.length === 0)
    ) {
      throw new Error(`Select field "${field.label}" needs options`);
    }
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/.+/i;

function fieldNameLookup(fields: FormField[], fieldId: string): string {
  return fields.find((f) => f.id === fieldId)?.name ?? "";
}

/** Validate a submission map against published fields. Returns cleaned values. */
export function validateSubmission(
  fields: FormField[],
  raw: Record<string, unknown>,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const field of fields) {
    const visible =
      !field.showIfFieldId ||
      String(raw[fieldNameLookup(fields, field.showIfFieldId)] ?? "") ===
        (field.showIfEquals ?? "");
    if (!visible) continue;

    const value = raw[field.name];
    if (field.type === "checkbox") {
      const checked =
        value === true ||
        value === "true" ||
        value === "on" ||
        value === "1";
      if (field.required && !checked) {
        throw new Error(`${field.label} is required`);
      }
      out[field.name] = checked;
      continue;
    }

    const asString =
      value === undefined || value === null ? "" : String(value).trim();
    if (field.required && !asString) {
      throw new Error(`${field.label} is required`);
    }
    if (!asString) continue;

    if (field.type === "email" && !EMAIL_RE.test(asString)) {
      throw new Error(`${field.label} must be a valid email`);
    }
    if (field.type === "url" && !URL_RE.test(asString)) {
      throw new Error(`${field.label} must be an http(s) URL`);
    }
    if (field.type === "number") {
      const n = Number(asString);
      if (Number.isNaN(n)) {
        throw new Error(`${field.label} must be a number`);
      }
      out[field.name] = n;
      continue;
    }
    if (
      field.type === "select" &&
      field.options &&
      !field.options.includes(asString)
    ) {
      throw new Error(`${field.label} has an invalid option`);
    }
    if (asString.length > 10_000) {
      throw new Error(`${field.label} is too long`);
    }
    out[field.name] = asString;
  }
  return out;
}

export function truncateText(s: string, max = 4000): string {
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

export function previewFromPayload(
  cleaned: Record<string, string | number | boolean>,
): string {
  return (
    Object.entries(cleaned)
      .slice(0, 4)
      .map(([k, val]) => `${k}: ${String(val)}`)
      .join(" · ") || "Submission"
  );
}
