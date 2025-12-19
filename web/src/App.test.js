import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

// Mock fetch globally
global.fetch = jest.fn();

describe("App Component", () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  test("renders the app title and components", () => {
    render(<App />);
    expect(screen.getByText(/hybrid imaging search demo/i)).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  test("allows user to input text", async () => {
    render(<App />);

    const textField = screen.getByLabelText(/or type your query here/i);
    await userEvent.type(textField, "female patients with emphysema");
    expect(textField.value).toBe("female patients with emphysema");
  });

  test("displays default queries in dropdown", () => {
    render(<App />);
    const dropdown = screen.getByRole("combobox");
    expect(dropdown).toBeInTheDocument();
  });

  test("search button is disabled when input is empty", () => {
    render(<App />);
    const searchButton = screen.getByRole("button", { name: /search/i });
    expect(searchButton).toBeDisabled();
  });

  test("search button is enabled when input has text", async () => {
    render(<App />);
    const textField = screen.getByLabelText(/or type your query here/i);
    const searchButton = screen.getByRole("button", { name: /search/i });

    await userEvent.type(textField, "CT scan");
    expect(searchButton).toBeEnabled();
  });

  test("calls API on search button click", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        rows: [{ PatientID: "123", Modality: "CT" }],
        geminiResponse: { query: "SELECT * FROM dicom", notes: "Test query" },
      }),
    });

    render(<App />);
    const textField = screen.getByLabelText(/or type your query here/i);
    const searchButton = screen.getByRole("button", { name: /search/i });

    await userEvent.type(textField, "CT scan");
    await userEvent.click(searchButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/query",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ textInput: "CT scan" }),
        })
      );
    });
  });

  test("displays error message on API failure", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Server error" }),
    });

    render(<App />);
    const textField = screen.getByLabelText(/or type your query here/i);
    const searchButton = screen.getByRole("button", { name: /search/i });

    await userEvent.type(textField, "CT scan");
    await userEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText(/error.*server error/i)).toBeInTheDocument();
    });
  });

  test("displays loading state during fetch", async () => {
    fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ rows: [], geminiResponse: { notes: "" } }),
              }),
            100
          )
        )
    );

    render(<App />);
    const textField = screen.getByLabelText(/or type your query here/i);
    const searchButton = screen.getByRole("button", { name: /search/i });

    await userEvent.type(textField, "CT scan");
    await userEvent.click(searchButton);

    // Check for loading spinner
    expect(screen.getByRole("progressbar")).toBeInTheDocument();

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });
  });
});
