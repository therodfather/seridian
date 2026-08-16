import { describe, expect, it } from "vitest";
import {
  assertPublishableFields,
  defaultFormFields,
  slugifyFormName,
  validateSubmission,
  type FormField,
} from "./formDefinition";

describe("formDefinition", () => {
  it("slugifies names", () => {
    expect(slugifyFormName("Hello World!")).toBe("hello-world");
  });

  it("rejects empty publish", () => {
    expect(() => assertPublishableFields([])).toThrow(/at least one field/i);
  });

  it("validates required email", () => {
    const fields = defaultFormFields();
    expect(() =>
      validateSubmission(fields, { name: "Ada", email: "bad", message: "hi there" }),
    ).toThrow(/email/i);
    const cleaned = validateSubmission(fields, {
      name: "Ada",
      email: "ada@ex.com",
      message: "Hello world",
    });
    expect(cleaned.email).toBe("ada@ex.com");
  });

  it("honors show-if visibility", () => {
    const fields: FormField[] = [
      {
        id: "a",
        type: "select",
        label: "Kind",
        name: "kind",
        required: true,
        options: ["a", "b"],
      },
      {
        id: "b",
        type: "text",
        label: "Only A",
        name: "only_a",
        required: true,
        showIfFieldId: "a",
        showIfEquals: "a",
      },
    ];
    const whenB = validateSubmission(fields, { kind: "b" });
    expect(whenB.only_a).toBeUndefined();
    expect(() =>
      validateSubmission(fields, { kind: "a" }),
    ).toThrow(/Only A/i);
  });
});
