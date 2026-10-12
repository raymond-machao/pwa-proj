// Shared validation for imported, looked-up, and rendered coordinates.
export function validCoordinates(value) {
  const numeric = part => (typeof part === "number" || typeof part === "string")
    && String(part).trim() !== "" && Number.isFinite(Number(part));
  return Boolean(value && numeric(value.lat) && numeric(value.lon)
    && Math.abs(Number(value.lat)) <= 90 && Math.abs(Number(value.lon)) <= 180);
}
