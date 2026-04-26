import React, { useState } from "react";
import { useQuery } from "react-query";

interface FilterBarProps {
  apiEndpoint: string;
  alphabeticalProperty: string;
  dateProperty: string;
  onFilterChange: (filters: {
    page: number;
    size: number;
    sort: string;
  }) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  apiEndpoint,
  alphabeticalProperty,
  dateProperty,
  onFilterChange,
}) => {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [sort, setSort] = useState(`${dateProperty},desc`);

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSort(e.target.value);
    onFilterChange({ page, size, sort: e.target.value });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    onFilterChange({ page: newPage, size, sort });
  };

  const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    setSize(newSize);
    onFilterChange({ page, size: newSize, sort });
  };

  return (
    <div className="flex items-center justify-between p-4 bg-gray-100 border-b border-gray-300">
      <div className="flex items-center space-x-4">
        <label>
          Sort by:
          <select
            value={sort}
            onChange={handleSortChange}
            className="ml-2 p-2 border rounded"
          >
            <option value={`${dateProperty},desc`}>Date (Newest)</option>
            <option value={`${dateProperty},asc`}>Date (Oldest)</option>
            <option value={`${alphabeticalProperty},asc`}>
              Alphabetical (A-Z)
            </option>
            <option value={`${alphabeticalProperty},desc`}>
              Alphabetical (Z-A)
            </option>
          </select>
        </label>
      </div>
      <div className="flex items-center space-x-4">
        <label>
          Items per page:
          <select
            value={size}
            onChange={handleSizeChange}
            className="ml-2 p-2 border rounded"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </label>
        <button
          onClick={() => handlePageChange(page - 1)}
          disabled={page === 0}
          className="p-2 border rounded bg-gray-200 disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={() => handlePageChange(page + 1)}
          className="p-2 border rounded bg-gray-200"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default FilterBar;
