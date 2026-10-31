interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageCount, onPageChange }: PaginationProps) {
  const safeCount = Math.max(1, pageCount);
  const pages = Array.from({ length: safeCount }, (_, index) => index + 1);

  function go(next: number) {
    if (next < 1 || next > safeCount || next === page) {
      return;
    }
    onPageChange(next);
  }

  return (
    <nav className="mt-6 flex items-center justify-center gap-1 text-sm" aria-label="페이지">
      <PageButton label="«" disabled={page === 1} onClick={() => go(1)} />
      <PageButton label="<" disabled={page === 1} onClick={() => go(page - 1)} />
      {pages.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => go(item)}
          className={
            item === page
              ? "grid size-8 place-items-center rounded-lg bg-blue-600 font-medium text-white"
              : "grid size-8 place-items-center rounded-lg text-neutral-600 hover:bg-white"
          }
          aria-current={item === page ? "page" : undefined}
        >
          {item}
        </button>
      ))}
      <PageButton label=">" disabled={page === safeCount} onClick={() => go(page + 1)} />
      <PageButton label="»" disabled={page === safeCount} onClick={() => go(safeCount)} />
    </nav>
  );
}

function PageButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-lg text-neutral-500 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {label}
    </button>
  );
}
