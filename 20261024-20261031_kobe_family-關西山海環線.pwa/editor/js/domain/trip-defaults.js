// Domain defaults only.  Nothing in this file knows about the editor or HTML.
// Keeping the project shape here lets a future mobile UI reuse the same data.
export const SCHEMA_VERSION = 2;

export const EXPENSE_CATEGORIES = ["食物", "交通", "住宿", "門票", "購物", "其他"];

const id = () => crypto.randomUUID();

export function newTrip() {
  return {
    schemaVersion: SCHEMA_VERSION,
    tripId: id(),
    title: "未命名旅程",
    appName: "",
    destination: "",
    note: "",
    previewLanguage: "zh",
    previewTheme: "classic",
    coverImage: null,
    startDate: "",
    endDate: "",
    days: [],
    settings: newTripSettings(),
    notes: [],
    packingGroups: [],
    references: [],
    expenses: [],
  };
}

export function newTripSettings() {
  return {
    showMap: true,
    timezone: "",
    homeCurrency: "TWD",
    destinationCurrency: "",
    currencyRates: [],
    travelers: [],
    expenseCategories: [...EXPENSE_CATEGORIES],
  };
}

export function newDay() {
  return { id: id(), date: "", title: "", stops: [newStop()] };
}

export function newStop() {
  return {
    id: id(), kind: "景點", name: "", address: "", location: null, time: "", endTime: "", openTime: "", closeTime: "", hours: "", offlineNote: "", website: "",
    checkIn: "", checkOut: "", flightNumber: "", departureTime: "", arrivalTime: "", flightDuration: "", departureAirport: "", arrivalAirport: "",
    departureTerminal: "", arrivalTerminal: "", flightSourceUrl: "", lookupStatus: "", lastFlightLookup: "", lastPlaceLookup: "",
    autoFields: {}, autoValues: {}, manualFields: {}, lookupEvidence: { place: [], flight: [], route: [] }, lookupVerification: {}, links: { googleMaps: "" },
    nextLeg: { distance: "", duration: "", mode: "", lastRouteLookup: "", manualFields: {}, autoValues: {}, transit: { fare: "", steps: [] } },
  };
}

// A candidate is deliberately one simple bucket.  Its kind is only a filter,
// so a restaurant is not forced into a deeper food taxonomy.
export function newReference() {
  return { id: id(), kind: "景點", name: "", group: "", address: "", website: "", note: "", image: null, dayId: "", sourceUrl: "", createdAt: new Date().toISOString() };
}

export function newNote() {
  return { id: id(), title: "", content: "", website: "", image: null, dayId: "", createdAt: new Date().toISOString() };
}

export function newPackingGroup() {
  return { id: id(), title: "", items: [] };
}

export function newPackingItem() {
  return { id: id(), text: "", checked: false, travelerId: "", quantity: 1 };
}

// Store the original amount, not only a converted amount.  The exchange-rate
// snapshot makes later totals reproducible even when rates change.
export function newExpense() {
  return {
    id: id(), dayId: "", occurredAt: new Date().toISOString(), description: "", category: "食物", payerId: "", participantIds: [], participantCount: 1, splitMode: "equal",
    amount: "", currency: "", feeAmount: "", feeCurrency: "", homeAmount: "", exchangeRate: "", receipt: null, note: "", createdAt: new Date().toISOString(),
  };
}
