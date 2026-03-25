export interface RunFilter {
  status: "all" | "success" | "error" | "pending";
  // Filter by run name substring.
  search: string;
  // ISO date string or null.
  startDate: string | null;
  endDate: string | null;
}

export const defaultFilter: RunFilter = {
  status: "all",
  search: "",
  startDate: null,
  endDate: null,
};

export default defaultFilter;

