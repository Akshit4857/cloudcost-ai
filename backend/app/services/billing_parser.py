import csv
import io
import re
from datetime import datetime
from typing import Any, Dict, List, Set, Tuple
from fastapi import HTTPException, UploadFile, status

from app.schemas.billing import BillingSummaryResponse, DateRange

REQUIRED_COLUMNS = ["date", "service", "resource", "cost", "currency"]
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB safety limit for MVP in-memory parsing


async def parse_and_validate_billing_csv(
    file: UploadFile,
) -> Tuple[BillingSummaryResponse, List[Dict[str, Any]]]:
    """Safely parse and validate an uploaded cloud billing CSV file in memory.

    Enforces schema: date,service,resource,cost,currency
    Validates row dates, non-negative costs, and single currency constraint.
    Returns:
        (BillingSummaryResponse, list_of_validated_records)
    """
    # 1. Filename validation
    filename = file.filename or "upload.csv"
    # Basic sanitize filename (remove path traversal characters)
    sanitized_filename = re.sub(r"[^\w\.-]", "_", filename.strip())

    if not sanitized_filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file extension. Expected a .csv file, got '{filename}'.",
        )

    # 2. In-memory read with size limit check
    contents = await file.read()
    if not contents or len(contents.strip()) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded CSV file is empty.",
        )

    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds the 10 MB limit for in-memory processing.",
        )

    # 3. Decode UTF-8 safely
    try:
        decoded_text = contents.decode("utf-8")
    except UnicodeDecodeError:
        try:
            # Fallback for excel-exported utf-8 with BOM or latin-1
            decoded_text = contents.decode("utf-8-sig")
        except UnicodeDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to decode file. Please ensure the CSV is saved with UTF-8 encoding.",
            )

    # 4. Parse CSV text
    stream = io.StringIO(decoded_text.strip(), newline=None)
    reader = csv.reader(stream)

    try:
        raw_header = next(reader, None)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read CSV header: {str(e)}",
        )

    if not raw_header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The CSV file has no header row.",
        )

    # Normalize header column names (trim and lowercase)
    normalized_headers = [col.strip().lower() for col in raw_header if col is not None]

    # Validate all required columns exist
    missing_columns = [col for col in REQUIRED_COLUMNS if col not in normalized_headers]
    if missing_columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Missing required CSV column(s): {', '.join(missing_columns)}. "
                f"Required schema: {', '.join(REQUIRED_COLUMNS)}."
            ),
        )

    # Map column names to index positions
    col_idx = {name: normalized_headers.index(name) for name in REQUIRED_COLUMNS}

    total_cost = 0.0
    service_totals: Dict[str, float] = {}
    daily_totals: Dict[str, float] = {}
    currencies: Set[str] = set()
    dates: List[datetime] = []
    valid_rows_count = 0
    validated_records: List[Dict[str, Any]] = []

    # 5. Row-by-row validation
    for line_num, row in enumerate(reader, start=2):
        # Skip completely blank lines
        if not row or not any(cell.strip() for cell in row):
            continue

        # Check row length against required columns
        max_idx = max(col_idx.values())
        if len(row) <= max_idx:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Row {line_num} is malformed: expected at least {max_idx + 1} columns, found {len(row)}.",
            )

        raw_date = row[col_idx["date"]].strip()
        raw_service = row[col_idx["service"]].strip()
        raw_resource = row[col_idx["resource"]].strip()
        raw_cost = row[col_idx["cost"]].strip()
        raw_currency = row[col_idx["currency"]].strip().upper()

        # Check non-empty values
        if not raw_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Row {line_num}: 'date' field cannot be empty.",
            )
        if not raw_service:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Row {line_num}: 'service' field cannot be empty.",
            )
        if not raw_resource:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Row {line_num}: 'resource' field cannot be empty.",
            )
        if not raw_cost:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Row {line_num}: 'cost' field cannot be empty.",
            )
        if not raw_currency:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Row {line_num}: 'currency' field cannot be empty.",
            )

        # Validate Date format (ISO YYYY-MM-DD)
        try:
            parsed_date = datetime.strptime(raw_date, "%Y-%m-%d")
            dates.append(parsed_date)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Row {line_num}: Invalid date format '{raw_date}'. Expected format: YYYY-MM-DD.",
            )

        # Validate Cost (numeric, >= 0)
        # Handle optional '$' sign if user exported with currency symbols
        cleaned_cost = raw_cost.replace("$", "").replace(",", "")
        try:
            cost_val = float(cleaned_cost)
            if cost_val < 0:
                raise ValueError("Negative cost")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Row {line_num}: Invalid cost value '{raw_cost}'. Cost must be a positive number.",
            )

        # Currency tracking
        currencies.add(raw_currency)

        # Aggregate totals
        total_cost += cost_val
        service_totals[raw_service] = service_totals.get(raw_service, 0.0) + cost_val
        daily_totals[raw_date] = daily_totals.get(raw_date, 0.0) + cost_val
        valid_rows_count += 1

        validated_records.append(
            {
                "billing_date": parsed_date.date(),
                "service": raw_service,
                "resource": raw_resource,
                "cost": round(cost_val, 2),
                "currency": raw_currency,
            }
        )

    # 6. Post-processing checks
    if valid_rows_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded CSV contains a header but no data rows.",
        )

    # Mixed currency check (MVP requirement)
    if len(currencies) > 1:
        currency_list = sorted(list(currencies))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Mixed currencies detected: {', '.join(currency_list)}. "
                "For accurate totals, all rows in an uploaded CSV must use the same single currency."
            ),
        )

    single_currency = next(iter(currencies))

    # Calculate date range
    dates.sort()
    date_range = DateRange(
        start=dates[0].strftime("%Y-%m-%d"),
        end=dates[-1].strftime("%Y-%m-%d"),
    )

    # Round service totals and overall total to 2 decimals
    rounded_service_totals = {
        svc: round(amt, 2)
        for svc, amt in sorted(service_totals.items(), key=lambda x: x[1], reverse=True)
    }

    rounded_daily_totals = {
        d: round(cost, 2)
        for d, cost in sorted(daily_totals.items())
    }

    summary = BillingSummaryResponse(
        filename=sanitized_filename,
        total_rows=valid_rows_count,
        total_cost=round(total_cost, 2),
        currency=single_currency,
        service_totals=rounded_service_totals,
        daily_totals=rounded_daily_totals,
        date_range=date_range,
        status="success",
    )

    return summary, validated_records

