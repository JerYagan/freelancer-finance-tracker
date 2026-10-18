import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Folder } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

describe("EmptyState and Skeleton Components", () => {
  it("renders EmptyState with icon, title, description, and action", () => {
    render(
      <EmptyState
        icon={Folder}
        title="No items found"
        description="Get started by creating your first record."
        action={<Button>Create Record</Button>}
      />,
    );

    expect(
      screen.getByRole("region", { name: "No items found" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No items found")).toBeInTheDocument();
    expect(
      screen.getByText("Get started by creating your first record."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Record" }),
    ).toBeInTheDocument();
  });

  it("renders Skeleton with aria-hidden", () => {
    const { container } = render(<Skeleton className="h-4 w-20" />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveAttribute("aria-hidden", "true");
    expect(skeleton).toHaveClass("animate-pulse");
  });
});
