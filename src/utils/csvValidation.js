import Papa from "papaparse";

const REQUIRED_COLUMNS = {
  // employee (C+D), regularHours, and overtimeHours are derived downstream.
  timesheet: ["property"],
};

const MAPPING_RULES = {
  mileage: {
    required: [{ field: "mileage", columnLetter: "H" }],
    optional: [{ field: "property" }],
    derived: [{ field: "employee", fromLetters: ["C", "D"], joinWith: " " }],
  },
  reservations: {
    required: [
      { field: "property", columnLetter: "F" },
      { field: "nightlyRate", columnLetter: "L" },
    ],
    optional: [{ field: "reservationId" }],
  },
};

const normalizeColumns = (row = {}) =>
  Object.keys(row).map((key) => key.trim().toLowerCase());

const normalizeValue = (value) => String(value || "").trim();

const toNumber = (value, fallback = 0) => {
  const parsed = Number.parseFloat(String(value ?? "").replace(/[$,]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const letterToIndex = (letter) => letter.toUpperCase().charCodeAt(0) - 65;

const getColumnKeyByLetter = (headers, letter) => headers[letterToIndex(letter)] || "";

const resolveFieldValue = (row, headers, fieldRule) => {
  if (fieldRule.columnLetter) {
    const key = getColumnKeyByLetter(headers, fieldRule.columnLetter);
    return key ? row[key] : undefined;
  }

  const matchingKey = headers.find((key) => key.trim().toLowerCase() === fieldRule.field.toLowerCase());
  return matchingKey ? row[matchingKey] : undefined;
};

const hasMappedColumn = (headers, fieldRule) => {
  if (fieldRule.columnLetter) {
    return Boolean(getColumnKeyByLetter(headers, fieldRule.columnLetter));
  }
  return headers.some((key) => key.trim().toLowerCase() === fieldRule.field.toLowerCase());
};

const pickValue = (row, preferredKeys = []) => {
  const entry = Object.entries(row).find(([key]) => preferredKeys.includes(key.trim().toLowerCase()));
  return entry ? entry[1] : "";
};

const pickValueByColumnLetter = (row, letter) => {
  const keys = Object.keys(row || {});
  const index = letterToIndex(letter);
  if (index < 0 || index >= keys.length) {
    return "";
  }
  return row[keys[index]] ?? "";
};

const mapNormalizedRow = (fileType, row) => {
  const nameSignals = Object.entries(row || {})
    .filter(([key, value]) => {
      const normalizedKey = key.trim().toLowerCase();
      const hasNameHint =
        normalizedKey.includes("name") ||
        normalizedKey.includes("employee") ||
        normalizedKey.includes("worker") ||
        normalizedKey.includes("first") ||
        normalizedKey.includes("last");
      return hasNameHint && normalizeValue(value);
    })
    .slice(0, 10)
    .map(([key, value]) => ({
      key: normalizeValue(key),
      value: normalizeValue(value),
    }));

  if (fileType === "timesheet") {
    const firstName = normalizeValue(
      pickValue(row, ["employee first name", "first name", "firstname", "first_name"]) ||
        pickValueByColumnLetter(row, "C"),
    );
    const lastName = normalizeValue(
      pickValue(row, ["employee last name", "last name", "lastname", "last_name"]) ||
        pickValueByColumnLetter(row, "D"),
    );
    const combinedName = `${firstName} ${lastName}`.trim();

    return {
      employee:
        normalizeValue(pickValue(row, ["employee", "worker", "name", "employee name"])) ||
        combinedName,
      firstName,
      lastName,
      columnC: normalizeValue(pickValueByColumnLetter(row, "C")),
      columnD: normalizeValue(pickValueByColumnLetter(row, "D")),
      nameSignals,
      property: normalizeValue(pickValue(row, ["property", "jobcode", "location", "property name"])),
      date: normalizeValue(pickValue(row, ["date", "work date", "shift date"])),
      hours: toNumber(pickValue(row, ["hours", "total hours", "qbt hours"]), 0),
      regularHours: toNumber(pickValue(row, ["regularhours", "regular hours", "reghours", "hours"]), 0),
      overtimeHours: toNumber(pickValue(row, ["overtimehours", "overtime hours", "othours", "ot"]), 0),
      weekendHours: toNumber(pickValue(row, ["weekendhours", "weekend hours"]), 0),
      holidayHours: toNumber(pickValue(row, ["holidayhours", "holiday hours"]), 0),
      mileage: toNumber(pickValue(row, ["mileage", "miles"]), 0),
      rate: toNumber(pickValue(row, ["rate", "base rate", "hourly rate"]), 0),
      grossPay: toNumber(pickValue(row, ["grosspay", "gross pay", "pay"]), 0),
      onCall: normalizeValue(pickValue(row, ["oncall", "on call"])),
    };
  }

  if (fileType === "mileage") {
    const firstName = normalizeValue(
      pickValue(row, ["employee first name", "first name", "firstname", "first_name"]) ||
        pickValueByColumnLetter(row, "A"),
    );
    const lastName = normalizeValue(
      pickValue(row, ["employee last name", "last name", "lastname", "last_name"]) ||
        pickValueByColumnLetter(row, "B"),
    );
    const combinedName = `${firstName} ${lastName}`.trim();
    const reported = toNumber(pickValue(row, ["milesreported", "mileage", "miles"]), 0);
    const verified = toNumber(pickValue(row, ["verifiedmiles", "milesverified", "expectedmiles"]), reported);
    return {
      employee:
        normalizeValue(pickValue(row, ["employee", "worker", "name", "employee name"])) ||
        combinedName,
      firstName,
      lastName,
      columnA: normalizeValue(pickValueByColumnLetter(row, "A")),
      columnB: normalizeValue(pickValueByColumnLetter(row, "B")),
      nameSignals,
      property: normalizeValue(pickValue(row, ["property", "jobcode", "location"])),
      date: normalizeValue(pickValue(row, ["date", "work date"])),
      milesReported: reported,
      milesVerified: verified,
    };
  }

  return {
    property: normalizeValue(pickValue(row, ["property", "jobcode", "location"])),
    date: normalizeValue(pickValue(row, ["date", "reservation date"])),
    reservationsCount: toNumber(pickValue(row, ["reservations", "reservationcount", "count", "units"]), 0),
  };
};

export const parseAndValidateCsv = (fileType, file) =>
  new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data || [];
        const preview = rows.slice(0, 5);
        const headers = Object.keys(rows[0] || {});
        const firstRowColumns = normalizeColumns(rows[0]);
        const expectedColumns = REQUIRED_COLUMNS[fileType] || [];
        const missingColumns = expectedColumns.filter(
          (column) => !firstRowColumns.includes(column.toLowerCase()),
        );
        const emptyRows = rows.filter((row) =>
          Object.values(row).every((value) => !String(value || "").trim()),
        ).length;

        const errors = [];
        const warnings = [];

        if (missingColumns.length > 0) {
          errors.push(`Missing columns: ${missingColumns.join(", ")}`);
        }

        if (results.errors.length > 0) {
          errors.push(`Format issues: ${results.errors[0].message}`);
        }

        const mappingRule = MAPPING_RULES[fileType];
        if (mappingRule) {
          const missingRequiredMapped = mappingRule.required
            .filter((rule) => !hasMappedColumn(headers, rule))
            .map((rule) =>
              rule.columnLetter
                ? `${rule.field} (column ${rule.columnLetter})`
                : rule.field,
            );

          if (missingRequiredMapped.length > 0) {
            errors.push(`Missing mapped source columns: ${missingRequiredMapped.join(", ")}`);
          }

          mappingRule.optional?.forEach((rule) => {
            if (!hasMappedColumn(headers, rule)) {
              warnings.push(`${rule.field} column not found; field will be skipped`);
            }
          });

          mappingRule.derived?.forEach((rule) => {
            const hasAllSourceColumns = rule.fromLetters.every((letter) =>
              hasMappedColumn(headers, { field: "", columnLetter: letter }),
            );
            if (!hasAllSourceColumns) {
              warnings.push(
                `${rule.field} derivation source columns (${rule.fromLetters.join("+")}) missing`,
              );
            }
          });
        }

        if (emptyRows > 0) {
          warnings.push(`${emptyRows} empty rows were ignored`);
        }

        const status = errors.length > 0 ? "Errors" : warnings.length > 0 ? "Warnings" : "Valid";
        const normalizedRows = rows.map((row) => mapNormalizedRow(fileType, row));

        resolve({
          fileName: file.name,
          rowCount: rows.length,
          preview,
          normalizedRows,
          errors,
          warnings,
          status,
        });
      },
      error: reject,
    });
  });
