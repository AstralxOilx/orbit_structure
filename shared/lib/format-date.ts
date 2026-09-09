export function formatDate(date: string) {
  return date
    ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
        new Date(`${date}T12:00:00`),
      )
    : "No date";
}
