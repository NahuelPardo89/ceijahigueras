import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZES = [10, 25, 50];

export const Pagination = ({ currentPage, totalItems, pageSize, onPageChange, onPageSizeChange }: PaginationProps) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  const getPages = () => {
    const pages: (number | 'dots')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 1) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, safePage - 1);
      let end = Math.min(totalPages - 1, safePage + 1);

      if (safePage <= 3) {
        start = 2;
        end = Math.min(4, totalPages - 1);
      } else if (safePage >= totalPages - 2) {
        start = Math.max(totalPages - 3, 2);
        end = totalPages - 1;
      }

      if (start > 2) pages.push('dots');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('dots');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="pagination-bar">
      <div className="pagination-info">
        <span className="pagination-count">{startItem}-{endItem} de {totalItems}</span>

        <div className="pagination-size-selector">
          <span className="pagination-size-label">Items por pág:</span>
          {PAGE_SIZES.map(size => (
            <button
              key={size}
              className={`pagination-size-btn ${pageSize === size ? 'pagination-size-active' : ''}`}
              onClick={() => onPageSizeChange(size)}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="pagination-nav">
          <button
            className="pagination-btn"
            disabled={safePage <= 1}
            onClick={() => onPageChange(1)}
            title="Primera página"
          >
            <ChevronsLeft size={14} />
          </button>
          <button
            className="pagination-btn"
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
            title="Anterior"
          >
            <ChevronLeft size={14} />
          </button>

          {getPages().map((p, i) =>
            p === 'dots' ? (
              <span key={`dots-${i}`} className="pagination-dots">...</span>
            ) : (
              <button
                key={p}
                className={`pagination-btn pagination-page ${safePage === p ? 'pagination-page-active' : ''}`}
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            )
          )}

          <button
            className="pagination-btn"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(safePage + 1)}
            title="Siguiente"
          >
            <ChevronRight size={14} />
          </button>
          <button
            className="pagination-btn"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(totalPages)}
            title="Última página"
          >
            <ChevronsRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
