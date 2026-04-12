import "server-only";
import { tavily } from "@tavily/core";

const client = tavily({ apiKey: process.env.TAVILY_API_KEY || "" });

export async function searchHotels(params: {
  destination: string;
  checkIn: string;
  checkOut: string;
  budget: string;
}): Promise<string> {
  const query = `hotels in ${params.destination} ${params.checkIn} to ${params.checkOut} ${params.budget} budget price per night USD booking.com`;
  const result = await client.search(query, {
    maxResults: 8,
    searchDepth: "advanced",
    includeAnswer: true,
  });
  return JSON.stringify({
    answer: result.answer,
    results: result.results.slice(0, 6).map((r) => ({
      title: r.title,
      content: r.content?.slice(0, 400),
      url: r.url,
    })),
  });
}

export async function searchFlights(params: {
  from: string;
  to: string;
  date: string;
  returnDate?: string;
}): Promise<string> {
  const returnPart = params.returnDate ? ` return ${params.returnDate}` : "";
  const query = `cheapest flights from ${params.from} to ${params.to} ${params.date}${returnPart} round trip price airlines Google Flights`;
  const result = await client.search(query, {
    maxResults: 8,
    searchDepth: "advanced",
    includeAnswer: true,
  });
  return JSON.stringify({
    answer: result.answer,
    results: result.results.slice(0, 6).map((r) => ({
      title: r.title,
      content: r.content?.slice(0, 400),
      url: r.url,
    })),
  });
}

export async function searchTransport(params: {
  destination: string;
}): Promise<string> {
  const query = `${params.destination} local transport options bus taxi train metro cost price USD tourist guide 2025 2026`;
  const result = await client.search(query, {
    maxResults: 5,
    includeAnswer: true,
  });
  return JSON.stringify({
    answer: result.answer,
    results: result.results.slice(0, 4).map((r) => ({
      title: r.title,
      content: r.content?.slice(0, 400),
    })),
  });
}

export async function searchActivities(params: {
  destination: string;
  interests: string;
  budget: string;
}): Promise<string> {
  const query = `best ${params.interests} in ${params.destination} tours activities prices cost USD ${params.budget} budget 2025 2026`;
  const result = await client.search(query, {
    maxResults: 8,
    searchDepth: "advanced",
    includeAnswer: true,
  });
  return JSON.stringify({
    answer: result.answer,
    results: result.results.slice(0, 6).map((r) => ({
      title: r.title,
      content: r.content?.slice(0, 400),
    })),
  });
}

export async function searchGeneral(params: {
  query: string;
}): Promise<string> {
  const result = await client.search(params.query, {
    maxResults: 5,
    includeAnswer: true,
  });
  return JSON.stringify({
    answer: result.answer,
    results: result.results.slice(0, 4).map((r) => ({
      title: r.title,
      content: r.content?.slice(0, 300),
    })),
  });
}
