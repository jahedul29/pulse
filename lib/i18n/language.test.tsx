import { renderHook } from "@testing-library/react";
import mockMessages from "../../messages/en.json";
import { useLanguageLabel } from "./language";

jest.mock("next-intl", () => {
  const messages = mockMessages as Record<string, Record<string, unknown>>;
  return {
    useTranslations: (ns: string) => {
      const translate = (key: string) => (messages[ns]?.[key] as string) ?? key;
      translate.has = (key: string) => key in (messages[ns] ?? {});
      return translate;
    },
  };
});

describe("useLanguageLabel", () => {
  it("maps codes to names, case-insensitive, with fallbacks", () => {
    const { result } = renderHook(() => useLanguageLabel());
    expect(result.current("EN")).toBe("English");
    expect(result.current("ar")).toBe("Arabic");
    expect(result.current(null)).toBe("-");
    expect(result.current("xx")).toBe("XX");
  });
});
