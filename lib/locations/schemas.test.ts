import { COUNTRY_CODE_MAX, countrySchema, REGION_CODE_MAX, regionSchema } from "./schemas";

const regionMessages = {
  countryRequired: "country",
  codeTooLong: "long",
  codeCharacters: "characters",
  nameEnRequired: "name",
  nameArRequired: "arabic",
};

const countryMessages = {
  codeRequired: "code",
  codeTooLong: "long",
  codeSpaces: "spaces",
  nameEnRequired: "name",
  nameArRequired: "arabic",
};

const validRegion = { countryId: "1", code: "AD-01", nameEn: " Abu Dhabi ", nameAr: "", isActive: true };
const validCountry = { code: "AE", nameEn: "United Arab Emirates", nameAr: "", isActive: true };

function messagesOf(result: { success: boolean; error?: { issues: Array<{ message: string }> } }): string[] {
  return result.success ? [] : (result.error?.issues ?? []).map((issue) => issue.message);
}

describe("regionSchema", () => {
  const schema = regionSchema(regionMessages);

  it("accepts a region with an optional code and Arabic name, trimming text", () => {
    const parsed = schema.parse({ ...validRegion, code: "" });
    expect(parsed.nameEn).toBe("Abu Dhabi");
    expect(parsed.code).toBe("");
  });

  it("requires a country and an English name", () => {
    const result = schema.safeParse({ ...validRegion, countryId: "", nameEn: "  " });
    expect(messagesOf(result)).toEqual(expect.arrayContaining(["country", "name"]));
  });

  it("limits codes to 16 letters, numbers, dots, dashes or underscores", () => {
    expect(schema.safeParse({ ...validRegion, code: "X".repeat(REGION_CODE_MAX + 1) }).success).toBe(false);
    for (const code of ["AD 01", "DU+01", "دبي-1", "AD/01"]) {
      expect(messagesOf(schema.safeParse({ ...validRegion, code }))).toEqual(["characters"]);
    }
    expect(schema.safeParse({ ...validRegion, code: "AD-01_v2.1" }).success).toBe(true);
  });

  it("keeps an Arabic name that was already saved", () => {
    const keeping = regionSchema(regionMessages, { keepArabic: true });
    expect(messagesOf(keeping.safeParse({ ...validRegion, nameAr: " " }))).toEqual(["arabic"]);
    expect(keeping.safeParse({ ...validRegion, nameAr: "أبوظبي" }).success).toBe(true);
  });
});

describe("countrySchema", () => {
  const schema = countrySchema(countryMessages);

  it("requires a code and an English name", () => {
    expect(messagesOf(schema.safeParse({ ...validCountry, code: " ", nameEn: "" }))).toEqual(
      expect.arrayContaining(["code", "name"]),
    );
  });

  it("limits codes to 10 characters without spaces", () => {
    expect(schema.safeParse({ ...validCountry, code: "X".repeat(COUNTRY_CODE_MAX + 1) }).success).toBe(false);
    expect(schema.safeParse({ ...validCountry, code: "A E" }).success).toBe(false);
    expect(schema.safeParse(validCountry).success).toBe(true);
  });

  it("keeps an Arabic name that was already saved", () => {
    const keeping = countrySchema(countryMessages, { keepArabic: true });
    expect(messagesOf(keeping.safeParse(validCountry))).toEqual(["arabic"]);
  });
});
