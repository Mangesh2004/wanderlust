/** @jest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/react";
import { TripForm } from "@/app/components/trip-form";

describe("TripForm", () => {
  it("renders submit button", () => {
    render(<TripForm onSubmit={() => {}} />);
    expect(
      screen.getByRole("button", { name: /Generate Dream Destinations/i }),
    ).toBeInTheDocument();
  });

  it("calls onSubmit with values when valid", () => {
    const onSubmit = jest.fn();
    const { container } = render(<TripForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText(/snowy mountains/i), {
      target: { value: "Alpine hiking" },
    });
    fireEvent.change(screen.getByPlaceholderText(/mumbai/i), {
      target: { value: "Denver" },
    });
    const dateInput = container.querySelector(
      'input[type="date"]',
    ) as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: "2026-07-10" } });

    fireEvent.click(
      screen.getByRole("button", { name: /Generate Dream Destinations/i }),
    );

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        vibe: "Alpine hiking",
        departureCity: "Denver",
        travelDates: "2026-07-10",
        budget: "medium",
      }),
    );
  });

  it("shows error message when provided", () => {
    render(<TripForm onSubmit={() => {}} error="Something broke" />);
    expect(screen.getByText("Something broke")).toBeInTheDocument();
  });
});
