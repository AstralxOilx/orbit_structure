export function formatDate(date: string) {
  if (
    date &&
    typeof document !== "undefined" &&
    document.documentElement.dataset.dateFormat === "iso"
  )
    return date;
  return date
    ? new Intl.DateTimeFormat(
        typeof document !== "undefined"
          ? document.documentElement.lang || "en"
          : "en",
        { month: "short", day: "numeric" },
      ).format(new Date(`${date}T12:00:00`))
    : "No date";
}
