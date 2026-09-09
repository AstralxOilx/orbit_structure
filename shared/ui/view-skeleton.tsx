export function ViewSkeleton() {
  return (
    <div className="view-skeleton" aria-label="Loading view" aria-busy="true">
      {[0, 1, 2, 3].map((column) => (
        <div key={column}>
          <span className="skeleton skeleton-heading" />
          {[0, 1, 2].map((card) => (
            <span className="skeleton skeleton-card" key={card} />
          ))}
        </div>
      ))}
    </div>
  );
}
