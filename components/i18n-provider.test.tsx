import { createContext, useContext, type ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const MockIntlCtx = createContext<{ locale: string; messages: Record<string, Record<string, string>> }>({
  locale: "en",
  messages: {},
});

jest.mock("next-intl", () => ({
  IntlErrorCode: { MISSING_MESSAGE: "MISSING_MESSAGE" },
  NextIntlClientProvider: ({
    locale,
    messages,
    children,
  }: {
    locale: string;
    messages: Record<string, Record<string, string>>;
    children: ReactNode;
  }) => <MockIntlCtx.Provider value={{ locale, messages }}>{children}</MockIntlCtx.Provider>,
  useLocale: () => useContext(MockIntlCtx).locale,
  useTranslations: (ns: string) => {
    const { messages } = useContext(MockIntlCtx);
    return (key: string) => messages[ns]?.[key] ?? key;
  },
}));

jest.mock("@base-ui/react/direction-provider", () => ({
  DirectionProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

jest.mock("../messages/en.json", () => ({ common: { language: "Language" } }));
jest.mock("../messages/ar.json", () => ({ common: { language: "اللغة" } }));

import { LocaleProvider, useSetLocale } from "./i18n-provider";
import { LocaleSwitcher } from "./nav/locale-switcher";

function Probe() {
  const { locale } = useSetLocale();
  return <span data-testid="probe">{locale}</span>;
}

describe("client-side locale switch", () => {
  it("swaps locale state, html dir/lang, and the cookie on select", async () => {
    document.documentElement.setAttribute("dir", "ltr");
    render(
      <LocaleProvider initialLocale="en">
        <Probe />
        <LocaleSwitcher />
      </LocaleProvider>,
    );

    expect(screen.getByTestId("probe")).toHaveTextContent("en");

    await userEvent.click(screen.getByRole("button", { name: /language/i }));
    await userEvent.click(await screen.findByRole("button", { name: "العربية" }));

    expect(screen.getByTestId("probe")).toHaveTextContent("ar");
    expect(document.documentElement.getAttribute("dir")).toBe("rtl");
    expect(document.documentElement.getAttribute("lang")).toBe("ar");
    expect(document.cookie).toContain("NEXT_LOCALE=ar");
  });
});

describe("useSetLocale outside a provider", () => {
  it("is a safe noop", () => {
    const seen: ReturnType<typeof useSetLocale>[] = [];
    function Peek() {
      seen.push(useSetLocale());
      return null;
    }
    render(<Peek />);
    const ctx = seen[0];
    expect(ctx.locale).toBe("en");
    expect(() => ctx.setLocale("ar")).not.toThrow();
  });
});
