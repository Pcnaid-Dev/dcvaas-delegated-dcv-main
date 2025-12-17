import { ReactNode, useState, useMemo } from 'react';
import { Input } from './input';
import { Button } from './button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { MagnifyingGlass, CaretUp, CaretDown } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (item: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchKey?: keyof T;
  searchPlaceholder?: string;
  filters?: {
    key: keyof T;
    label: string;
    options: { value: string; label: string }[];
  }[];
  onRowClick?: (item: T) => void;
  emptyState?: ReactNode;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchKey,
  searchPlaceholder = 'Search...',
  filters,
  onRowClick,
  emptyState,
  className,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  // Filter and sort data
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (search && searchKey) {
      const searchLower = search.toLowerCase();
      result = result.filter((item) => {
        const value = item[searchKey];
        return String(value).toLowerCase().includes(searchLower);
      });
    }

    // Apply filters
    if (filters) {
      filters.forEach((filter) => {
        const filterValue = filterValues[String(filter.key)];
        if (filterValue && filterValue !== 'all') {
          result = result.filter((item) => {
            return String(item[filter.key]) === filterValue;
          });
        }
      });
    }

    // Apply sorting
    if (sortKey) {
      result.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        
        let comparison = 0;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          comparison = aVal.localeCompare(bVal);
        } else if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, search, searchKey, sortKey, sortDirection, filterValues, filters]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Filters */}
      {(searchKey || filters) && (
        <div className="flex flex-col sm:flex-row gap-4">
          {searchKey && (
            <div className="flex-1 relative">
              <MagnifyingGlass
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
          {filters &&
            filters.map((filter) => (
              <Select
                key={String(filter.key)}
                value={filterValues[String(filter.key)] || 'all'}
                onValueChange={(value) =>
                  setFilterValues((prev) => ({
                    ...prev,
                    [String(filter.key)]: value,
                  }))
                }
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder={filter.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All {filter.label}</SelectItem>
                  {filter.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
        </div>
      )}

      {/* Table */}
      {processedData.length === 0 ? (
        emptyState || (
          <div className="text-center py-12 text-muted-foreground">
            No results found
          </div>
        )
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={cn(column.className)}
                  >
                    {column.sortable ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort(column.key)}
                        className="h-auto p-0 hover:bg-transparent font-semibold"
                      >
                        {column.header}
                        {sortKey === column.key && (
                          <span className="ml-1">
                            {sortDirection === 'asc' ? (
                              <CaretUp size={16} weight="bold" />
                            ) : (
                              <CaretDown size={16} weight="bold" />
                            )}
                          </span>
                        )}
                      </Button>
                    ) : (
                      <span className="font-semibold">{column.header}</span>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedData.map((item, index) => (
                <TableRow
                  key={index}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    onRowClick && 'cursor-pointer hover:bg-muted/50'
                  )}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(column.className)}
                    >
                      {column.render
                        ? column.render(item)
                        : String(item[column.key] ?? '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Results count */}
      {processedData.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {processedData.length} of {data.length} results
        </div>
      )}
    </div>
  );
}
