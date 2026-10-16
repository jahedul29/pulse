import { coverageFileRequestUrl, parseCoverageFile } from "./coverage-file";
import { coverageObjectUrl } from "./coverage-origin";
import { alternateName, localizedName, translatedNames } from "./names";

describe("coverageFileRequestUrl", () => {
  it("routes coverage files on the S3 bucket through the same-origin proxy", () => {
    expect(
      coverageFileRequestUrl(
        "https://abapro.s3.eu-north-1.amazonaws.com/abapro-staging/Media/coverage/cities/AD-01/tiles.v56.json",
      ),
    ).toBe("/coverage-files/abapro-staging/Media/coverage/cities/AD-01/tiles.v56.json");
  });

  it("refuses anything that isn't a city coverage file on that bucket", () => {
    expect(coverageFileRequestUrl("https://cdn.example.com/tiles.json")).toBeNull();
    expect(coverageFileRequestUrl("https://abapro.s3.eu-north-1.amazonaws.com/abapro-staging/Media/avatars/me.svg")).toBeNull();
    expect(
      coverageFileRequestUrl("https://abapro.s3.eu-north-1.amazonaws.com/abapro-staging/Media/coverage/cities/AD-01/index.html"),
    ).toBeNull();
    expect(coverageFileRequestUrl("not a url")).toBeNull();
  });
});

describe("coverageObjectUrl", () => {
  it("maps a coverage file request to its S3 object", () => {
    expect(coverageObjectUrl("/coverage-files/abapro-staging/Media/coverage/cities/AD-01/tiles.v56.json", "")).toBe(
      "https://abapro.s3.eu-north-1.amazonaws.com/abapro-staging/Media/coverage/cities/AD-01/tiles.v56.json",
    );
  });

  it("refuses other objects, other casing and any query string", () => {
    expect(coverageObjectUrl("/coverage-files/abapro-staging/Media/avatars/me.svg", "")).toBeNull();
    expect(coverageObjectUrl("/coverage-files/ENV/MEDIA/COVERAGE/CITIES/AD-01/TILES.V1.JSON", "")).toBeNull();
    expect(coverageObjectUrl("/coverage-files/env/Media/coverage/cities/AD-01/tiles.v1.json", "?versionId=abc")).toBeNull();
    expect(coverageObjectUrl("/coverage-files/env/Media/coverage/cities/AD%2F01/tiles.v1.json", "")).toBeNull();
    expect(coverageObjectUrl("/other/env/Media/coverage/cities/AD-01/tiles.v1.json", "")).toBeNull();
  });
});

describe("parseCoverageFile", () => {
  it("keeps active tiles as unique normalized codes and reads the version", () => {
    const file = parseCoverageFile({
      version: 56,
      tiles: [
        { t: "39QWG7153", a: true },
        { t: "39q wg 72 51", a: true },
        { t: "39QWG7153", a: true },
        { t: "39QWG7252", a: false },
        { t: "" },
        null,
      ],
    });
    expect(file).toEqual({ version: 56, codes: ["39QWG7153", "39QWG7251"] });
  });

  it("reduces finer points to their 1 km cell", () => {
    expect(parseCoverageFile({ tiles: [{ t: "39Q WG 71500 53500" }] }).codes).toEqual(["39QWG7153"]);
  });

  it("returns an empty file for an unexpected body", () => {
    expect(parseCoverageFile("nope")).toEqual({ version: null, codes: [] });
  });
});

describe("localizedName", () => {
  it("prefers the locale translation, then the resolved name", () => {
    expect(localizedName("Dubai", { en: "Dubai", ar: "دبي" }, "ar")).toBe("دبي");
    expect(localizedName("Dubai", { en: "", ar: "" }, "en")).toBe("Dubai");
    expect(localizedName({ en: "Ajman", ar: "عجمان" }, undefined, "ar")).toBe("عجمان");
  });
});

describe("alternateName", () => {
  it("returns the other language's name when it differs", () => {
    expect(alternateName("Abu Dhabi", { en: "Abu Dhabi", ar: "أبوظبي" }, "en")).toBe("أبوظبي");
    expect(alternateName("Abu Dhabi", { en: "Abu Dhabi", ar: "أبوظبي" }, "ar")).toBe("Abu Dhabi");
    expect(alternateName("Beijing", { en: "Beijing", ar: "" }, "en")).toBeNull();
  });
});

describe("translatedNames", () => {
  it("reads both languages from translations, then from the name", () => {
    expect(translatedNames({ name: "Dubai", name_translations: { en: " Dubai ", ar: "دبي" } })).toEqual({ en: "Dubai", ar: "دبي" });
    expect(translatedNames({ name: { en: "Ajman", ar: "عجمان" } })).toEqual({ en: "Ajman", ar: "عجمان" });
    expect(translatedNames({ name: "Beijing" })).toEqual({ en: "Beijing", ar: "" });
  });
});
