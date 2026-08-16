/** Client form field types — keep in sync with convex/lib/formDefinition.ts */

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

export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: "Short text",
  email: "Email",
  phone: "Phone",
  textarea: "Long text",
  number: "Number",
  select: "Dropdown",
  checkbox: "Checkbox",
  url: "URL",
  date: "Date",
};

export function newFieldId(): string {
  return `f_${Math.random().toString(36).slice(2, 9)}`;
}

export function createBlankField(type: FormFieldType): FormField {
  const id = newFieldId();
  const label = FIELD_TYPE_LABELS[type];
  const name = type === "textarea" ? "message" : type;
  return {
    id,
    type,
    label,
    name: `${name}_${id.slice(2, 6)}`,
    required: type !== "checkbox",
    placeholder: type === "select" ? undefined : "",
    options: type === "select" ? ["Option A", "Option B"] : undefined,
  };
}
