/** @jest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { TripLoading, type StreamEvent } from "@/app/components/trip-loading";

describe("TripLoading", () => {
  it("shows initializing state with no events", () => {
    render(<TripLoading events={[]} />);
    expect(
      screen.getByText(/Researching your dream destinations/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Initializing agent/i)).toBeInTheDocument();
  });

  it("renders status events", () => {
    const events: StreamEvent[] = [
      { type: "status", message: "Selecting cities..." },
    ];
    render(<TripLoading events={events} />);
    expect(screen.getByText("Selecting cities...")).toBeInTheDocument();
  });

  it("renders tool call and result", () => {
    const events: StreamEvent[] = [
      {
        type: "tool_call",
        tool: "geocode_location",
        toolInput: { query: "Paris" },
      },
      {
        type: "tool_result",
        tool: "geocode_location",
        toolOutput: '{"lat":48.8,"lon":2.3}',
      },
    ];
    render(<TripLoading events={events} />);
    expect(screen.getByText(/geocode_location/i)).toBeInTheDocument();
  });
});
