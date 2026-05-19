import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DataTable, type ColumnConfig } from "./DataTable";

interface TestRow {
  id: number;
  name: string;
  price: number;
}

const columns: ColumnConfig<TestRow>[] = [
  { key: "id", header: "ID" },
  { key: "name", header: "Name", sortable: true },
  { key: "price", header: "Price", sortable: true, render: (row) => `$${row.price}` },
];

const testData: TestRow[] = [
  { id: 1, name: "Property A", price: 250000 },
  { id: 2, name: "Property B", price: 350000 },
  { id: 3, name: "Property C", price: 450000 },
];

describe("DataTable", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders table with correct headers", () => {
    render(
      <DataTable
        columns={columns}
        data={testData}
        pagination={{ page: 1, pageSize: 20, total: 3 }}
        onPageChange={() => {}}
        getRowKey={(row) => row.id}
      />
    );
    expect(screen.getByText("ID")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Price")).toBeInTheDocument();
  });

  it("renders row data correctly", () => {
    render(
      <DataTable
        columns={columns}
        data={testData}
        pagination={{ page: 1, pageSize: 20, total: 3 }}
        onPageChange={() => {}}
        getRowKey={(row) => row.id}
      />
    );
    expect(screen.getByText("Property A")).toBeInTheDocument();
    expect(screen.getByText("$250000")).toBeInTheDocument();
  });

  it("shows empty state when no data", () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        pagination={{ page: 1, pageSize: 20, total: 0 }}
        onPageChange={() => {}}
        getRowKey={(row) => row.id}
      />
    );
    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  it("calls onSort when sortable header is clicked", () => {
    const onSort = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={testData}
        pagination={{ page: 1, pageSize: 20, total: 3 }}
        sorting={{ field: "name", direction: "asc" }}
        onPageChange={() => {}}
        onSort={onSort}
        getRowKey={(row) => row.id}
      />
    );
    // Click on Name header to toggle sort
    fireEvent.click(screen.getByText("Name"));
    expect(onSort).toHaveBeenCalledWith({ field: "name", direction: "desc" });
  });

  it("calls onSort with asc when clicking a new column", () => {
    const onSort = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={testData}
        pagination={{ page: 1, pageSize: 20, total: 3 }}
        sorting={{ field: "name", direction: "asc" }}
        onPageChange={() => {}}
        onSort={onSort}
        getRowKey={(row) => row.id}
      />
    );
    fireEvent.click(screen.getByText("Price"));
    expect(onSort).toHaveBeenCalledWith({ field: "price", direction: "asc" });
  });

  it("displays pagination info correctly", () => {
    render(
      <DataTable
        columns={columns}
        data={testData}
        pagination={{ page: 2, pageSize: 2, total: 5 }}
        onPageChange={() => {}}
        getRowKey={(row) => row.id}
      />
    );
    expect(screen.getByText("Showing 3 to 4 of 5 results")).toBeInTheDocument();
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
  });

  it("calls onPageChange when pagination buttons are clicked", () => {
    const onPageChange = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={testData}
        pagination={{ page: 2, pageSize: 2, total: 6 }}
        onPageChange={onPageChange}
        getRowKey={(row) => row.id}
      />
    );
    fireEvent.click(screen.getByLabelText("Go to next page"));
    expect(onPageChange).toHaveBeenCalledWith(3);

    fireEvent.click(screen.getByLabelText("Go to previous page"));
    expect(onPageChange).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByLabelText("Go to first page"));
    expect(onPageChange).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByLabelText("Go to last page"));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("disables pagination buttons at boundaries", () => {
    render(
      <DataTable
        columns={columns}
        data={testData}
        pagination={{ page: 1, pageSize: 20, total: 3 }}
        onPageChange={() => {}}
        getRowKey={(row) => row.id}
      />
    );
    expect(screen.getByLabelText("Go to first page")).toBeDisabled();
    expect(screen.getByLabelText("Go to previous page")).toBeDisabled();
    expect(screen.getByLabelText("Go to next page")).toBeDisabled();
    expect(screen.getByLabelText("Go to last page")).toBeDisabled();
  });

  it("has accessible aria-sort attributes on sortable columns", () => {
    render(
      <DataTable
        columns={columns}
        data={testData}
        pagination={{ page: 1, pageSize: 20, total: 3 }}
        sorting={{ field: "name", direction: "asc" }}
        onPageChange={() => {}}
        onSort={() => {}}
        getRowKey={(row) => row.id}
      />
    );
    const nameHeader = screen.getByText("Name").closest("th");
    expect(nameHeader).toHaveAttribute("aria-sort", "ascending");

    const priceHeader = screen.getByText("Price").closest("th");
    expect(priceHeader).toHaveAttribute("aria-sort", "none");
  });

  it("has accessible table label", () => {
    render(
      <DataTable
        columns={columns}
        data={testData}
        pagination={{ page: 1, pageSize: 20, total: 3 }}
        onPageChange={() => {}}
        getRowKey={(row) => row.id}
        ariaLabel="Property listings"
      />
    );
    expect(screen.getByRole("table")).toHaveAttribute("aria-label", "Property listings");
  });
});
