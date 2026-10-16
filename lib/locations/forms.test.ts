import { countryBody, countryFormValues, nameBody, regionBody, regionFormValues } from "./forms";
import type { CityDto, CountryDto } from "./types";

const city: CityDto = {
  id: 7,
  country_id: 1,
  code: "AD-01",
  name: "Abu Dhabi",
  name_translations: { en: "Abu Dhabi", ar: "أبوظبي" },
  sort_order: 1,
  is_active: null,
  center: null,
  tiles_url: null,
  tiles_version: 0,
  created_at: null,
  updated_at: null,
};

const country: CountryDto = {
  id: 1,
  code: "AE",
  name: { en: "United Arab Emirates" },
  tiles_url: null,
  is_active: false,
  created_at: null,
  updated_at: null,
};

describe("region form values", () => {
  it("starts a new region in the chosen country", () => {
    expect(regionFormValues(null, 3)).toEqual({ countryId: "3", code: "", nameEn: "", nameAr: "", isActive: true });
    expect(regionFormValues(null).countryId).toBe("");
  });

  it("reads both names and treats a missing status as active", () => {
    expect(regionFormValues(city)).toEqual({
      countryId: "1",
      code: "AD-01",
      nameEn: "Abu Dhabi",
      nameAr: "أبوظبي",
      isActive: true,
    });
  });

  it("reads a country", () => {
    expect(countryFormValues(country)).toEqual({ code: "AE", nameEn: "United Arab Emirates", nameAr: "", isActive: false });
  });
});

describe("request bodies", () => {
  it("leaves out an empty Arabic name", () => {
    expect(nameBody(" Dubai ", " ")).toEqual({ en: "Dubai" });
    expect(nameBody("Dubai", "دبي")).toEqual({ en: "Dubai", ar: "دبي" });
  });

  it("leaves out an empty code when creating and clears it when editing", () => {
    const values = { countryId: "2", code: " ", nameEn: "Dubai", nameAr: "", isActive: true };
    expect(regionBody(values, false)).toEqual({ country_id: 2, name: { en: "Dubai" }, is_active: true });
    expect(regionBody(values, true)).toEqual({ country_id: 2, code: null, name: { en: "Dubai" }, is_active: true });
    expect(regionBody({ ...values, code: "DXB" }, false).code).toBe("DXB");
  });

  it("upper-cases country codes", () => {
    expect(countryBody({ code: " ae ", nameEn: "UAE", nameAr: "", isActive: true })).toEqual({
      code: "AE",
      name: { en: "UAE" },
      is_active: true,
    });
  });
});
