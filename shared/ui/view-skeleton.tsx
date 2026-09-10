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

export function CatalogSkeleton() {
  return (
    <div
      className="catalog-skeleton"
      aria-label="Loading workspace"
      aria-busy="true"
    >
      <span className="skeleton skeleton-heading" />
      <span className="skeleton skeleton-line" />
      <div className="catalog-skeleton-grid">
        {[0, 1, 2].map((item) => (
          <span className="skeleton skeleton-card" key={item} />
        ))}
      </div>
    </div>
  );
}

export function DiscussionSkeleton() {
  return (
    <div
      className="discussion-skeleton"
      aria-label="Loading discussion"
      aria-busy="true"
    >
      {[0, 1, 2].map((item) => (
        <span
          className={`skeleton discussion-skeleton-message message-${item}`}
          key={item}
        />
      ))}
    </div>
  );
}
