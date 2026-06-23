import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Organization } from "@/entities/organization";
import type { Project } from "@/entities/project";

import messages from "../../../../messages/en.json";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/p/p1",
}));

import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

const orgs: Organization[] = [
  { id: "o1", name: "Aurora Labs", created_at: "", updated_at: "" },
];
const projects: Project[] = [
  {
    id: "p1",
    organization_id: "o1",
    name: "Web",
    created_at: "",
    updated_at: "",
  },
  {
    id: "p2",
    organization_id: "o1",
    name: "Mobile",
    created_at: "",
    updated_at: "",
  },
];

function renderSwitcher(p: Project[]) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <WorkspaceSwitcher organizations={orgs} projects={p} />
    </NextIntlClientProvider>,
  );
}

describe("WorkspaceSwitcher", () => {
  beforeEach(() => push.mockReset());

  it("lists each project and navigates on selection", async () => {
    renderSwitcher(projects);
    const select = screen.getByRole("combobox", { name: "Switch project" });
    expect(
      within(select).getByRole("option", { name: "Web" }),
    ).toBeInTheDocument();
    expect(
      within(select).getByRole("option", { name: "Mobile" }),
    ).toBeInTheDocument();

    await userEvent.selectOptions(select, "p2");
    expect(push).toHaveBeenCalledWith("/p/p2");
  });

  it("renders nothing when there are no projects to switch between", () => {
    const { container } = renderSwitcher([]);
    expect(container).toBeEmptyDOMElement();
  });
});
