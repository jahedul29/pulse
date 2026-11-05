import { render, screen } from "@testing-library/react";
import mockMessages from "../../messages/en.json";
import { TemplateHtml } from "./template-html";
import { TemplatePreview } from "./template-preview";

jest.mock("next-intl", () => {
  const messages = mockMessages as Record<string, Record<string, unknown>>;
  const resolve = (ns: string, key: string): unknown =>
    key.split(".").reduce<unknown>((node, segment) => (node as Record<string, unknown>)?.[segment], messages[ns]);
  return {
    useTranslations: (ns: string) => (key: string) => {
      const value = resolve(ns, key);
      return typeof value === "string" ? value : key;
    },
    createTranslator:
      ({ messages: bundle, namespace }: { messages: Record<string, unknown>; namespace: string }) =>
      (key: string) => {
        const value = `${namespace}.${key}`
          .split(".")
          .reduce<unknown>((node, segment) => (node as Record<string, unknown>)?.[segment], bundle);
        return typeof value === "string" ? value : key;
      },
  };
});

const popup = {
  type: "POPUP" as const,
  body: { EN: '<p>The format is incorrect</p><p>Click <a class="highlight" data-action="verify_mobile">verify</a></p>' },
  button_label: { EN: "OK" },
  subject: null,
};

const notification = {
  type: "NOTIFICATION" as const,
  icon: "user_blocked",
  sender_name: "ABAPRO",
  header_title: { EN: "Account blocked", AR: "تم حظر الحساب" },
  header_subtitle: { EN: "Your account has been blocked" },
  subject: { EN: "Your account has been blocked" },
  body: { EN: "<p>Hello {first_name},</p>", AR: "<p>مرحباً {first_name}،</p>" },
  button_label: { EN: "OK", AR: "حسناً" },
};

describe("TemplatePreview", () => {
  it("shows a popup as its message and button only", () => {
    const { container } = render(<TemplatePreview template={popup} language="EN" />);
    expect(screen.getByText("Popup")).toBeInTheDocument();
    expect(screen.queryByText("Notification bar")).not.toBeInTheDocument();
    expect(screen.queryByText("From")).not.toBeInTheDocument();
    expect(screen.getByText("OK")).toBeInTheDocument();
    expect(container.querySelector('a.highlight[data-action="verify_mobile"]')).toHaveTextContent("verify");
  });

  it("shows a notification as its bar and the opened detail", () => {
    render(<TemplatePreview template={notification} language="EN" />);
    expect(screen.getByText("Notification bar")).toBeInTheDocument();
    expect(screen.getByText("Account blocked")).toBeInTheDocument();
    expect(screen.getAllByText("Your account has been blocked")).toHaveLength(2);
    expect(screen.getByText("From").nextSibling).toHaveTextContent("ABAPRO");
    expect(screen.getByText("Hello Layla,")).toBeInTheDocument();
  });

  it("keeps the button at the start of the line instead of stretching it across the card", () => {
    render(<TemplatePreview template={notification} language="AR" />);
    const button = screen.getByText("حسناً");
    expect(button.tagName).toBe("SPAN");
    expect(button.closest("[dir]")).toHaveAttribute("dir", "rtl");
  });

  it("lays the Arabic copy out right to left, with the app's labels in Arabic", () => {
    render(<TemplatePreview template={notification} language="AR" />);
    expect(screen.getByText("تم حظر الحساب").closest("[dir]")).toHaveAttribute("dir", "rtl");
    expect(screen.getByText("حسناً")).toBeInTheDocument();
    expect(screen.getByText("من").nextSibling).toHaveTextContent("ABAPRO");
    expect(screen.getAllByText("الآن").length).toBeGreaterThan(0);
    expect(screen.queryByText("From")).not.toBeInTheDocument();
  });

  it("marks a missing bar title, icon and button instead of showing them as content", () => {
    const { container } = render(
      <TemplatePreview
        template={{ type: "NOTIFICATION", subject: { EN: "Welcome" }, body: { EN: "Plain text body." } }}
        language="EN"
      />,
    );
    const title = screen.getByText("No bar title");
    expect(title).toHaveClass("italic", "text-muted-foreground");
    expect(screen.getByRole("img", { name: "No icon" })).toBeEmptyDOMElement();
    expect(container.querySelector("svg")).toBeNull();
    expect(screen.getByText("No button label")).toHaveClass("italic");
  });

  it("splits a plain-text body into paragraphs like an HTML one", () => {
    render(<TemplatePreview template={{ type: "POPUP", subject: null, body: { EN: "Line one\nLine two" } }} language="EN" />);
    expect(screen.getByText("Line one").tagName).toBe("P");
    expect(screen.getByText("Line two").tagName).toBe("P");
  });
});

describe("TemplateHtml", () => {
  it("aligns the copy to the start of the line for its language and keeps the highlight styling", () => {
    const { container } = render(<TemplateHtml html='<p><span class="highlight">Hi</span></p>' dir="auto" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("text-start");
    expect(root.className).not.toContain("text-center");
    expect(root.className).toContain("[&_.highlight]:text-accent-foreground");
    expect(root.querySelector("span.highlight")).toHaveTextContent("Hi");
  });
});
