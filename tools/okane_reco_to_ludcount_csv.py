#!/usr/bin/env python3
"""Convert an Okanereco MMJ SQLite backup into Ludcount import CSV files."""

from __future__ import annotations

import argparse
import csv
import os
import sqlite3
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Iterable, Sequence

MAX_AMOUNT_MINOR = 1_000_000_000

IMPORT_COLUMNS = (
    "sourceApp",
    "sourceId",
    "date",
    "sourceTime",
    "type",
    "amountMinor",
    "currency",
    "categorySourceId",
    "category",
    "note",
    "sourcePaymentId",
    "sourceShopId",
)
REVIEW_COLUMNS = IMPORT_COLUMNS + (
    "reviewReasons",
    "sourceDeleted",
    "sourceCategoryDeleted",
)


@dataclass(frozen=True)
class ConversionSummary:
    database_version: int
    total_rows: int
    import_ready_rows: int
    review_rows: int


def _database_uri(database: Path) -> str:
    return f"{database.resolve().as_uri()}?mode=ro"


def _validate_schema(connection: sqlite3.Connection) -> None:
    required_columns = {
        "CategoryDetail": {
            "id",
            "categoryID",
            "date",
            "time",
            "pice",
            "memo",
            "payment_id",
            "shopname_id",
            "delete_flag",
        },
        "Categories": {
            "categoryID",
            "categoryName",
            "categoryNameJa",
            "income_flag",
            "delete_flag",
        },
    }
    for table, expected in required_columns.items():
        actual = {
            row[1]
            for row in connection.execute(
                f'PRAGMA table_info("{table}")'  # noqa: S608 - fixed table names
            )
        }
        missing = sorted(expected - actual)
        if missing:
            raise ValueError(f"{table} is missing required columns: {', '.join(missing)}")


def _amount_minor(value: object) -> tuple[int | None, str | None]:
    try:
        minor = Decimal(str(value)) * 100
    except (InvalidOperation, ValueError):
        return None, "invalid_amount"
    if minor != minor.to_integral_value():
        return None, "unsupported_amount_precision"
    return int(minor), None


def _valid_date(value: str) -> bool:
    try:
        return date.fromisoformat(value).isoformat() == value
    except ValueError:
        return False


def _convert_row(row: sqlite3.Row) -> tuple[dict[str, object], list[str]]:
    amount_minor, amount_error = _amount_minor(row["pice"])
    category = (row["category_name"] or "").strip()
    note = row["memo"] or ""
    reasons: list[str] = []

    if row["source_deleted"] != 0:
        reasons.append("source_deleted")
    if row["source_category_deleted"] != 0:
        reasons.append("source_category_deleted")
    if amount_error:
        reasons.append(amount_error)
    elif amount_minor is not None:
        if amount_minor == 0:
            reasons.append("zero_amount")
        elif amount_minor < 0:
            reasons.append("negative_amount")
        elif amount_minor > MAX_AMOUNT_MINOR:
            reasons.append("amount_above_ludcount_limit")
    if not _valid_date(row["date"]):
        reasons.append("invalid_date")
    if not category:
        reasons.append("missing_category")
    elif len(category) > 60:
        reasons.append("category_name_over_60_characters")
    if len(note) > 120:
        reasons.append("note_over_120_characters")

    converted = {
        "sourceApp": "okane-reco",
        "sourceId": row["source_id"],
        "date": row["date"],
        "sourceTime": row["time"],
        "type": "income" if row["income_flag"] == 1 else "expense",
        "amountMinor": "" if amount_minor is None else amount_minor,
        "currency": "CZK",
        "categorySourceId": row["category_id"],
        "category": category,
        "note": note,
        "sourcePaymentId": row["payment_id"],
        "sourceShopId": row["shopname_id"],
    }
    return converted, reasons


def _write_csv(
    path: Path,
    columns: Sequence[str],
    rows: Iterable[dict[str, object]],
    *,
    force: bool,
) -> None:
    if path.exists() and not force:
        raise FileExistsError(f"Refusing to overwrite existing file: {path}")
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.tmp")
    try:
        with temporary.open("w", encoding="utf-8-sig", newline="") as output:
            writer = csv.DictWriter(
                output,
                fieldnames=columns,
                delimiter=";",
                quoting=csv.QUOTE_ALL,
                lineterminator="\n",
            )
            writer.writeheader()
            writer.writerows(rows)
        os.chmod(temporary, 0o600)
        temporary.replace(path)
    finally:
        if temporary.exists():
            temporary.unlink()


def convert_database(
    database: Path,
    output: Path,
    review_output: Path,
    *,
    force: bool = False,
) -> ConversionSummary:
    if not database.is_file():
        raise FileNotFoundError(f"Database file does not exist: {database}")
    if not force:
        existing_outputs = [path for path in (output, review_output) if path.exists()]
        if existing_outputs:
            names = ", ".join(str(path) for path in existing_outputs)
            raise FileExistsError(f"Refusing to overwrite existing file(s): {names}")

    with sqlite3.connect(_database_uri(database), uri=True) as connection:
        connection.row_factory = sqlite3.Row
        integrity = connection.execute("PRAGMA integrity_check").fetchone()[0]
        if integrity != "ok":
            raise ValueError(f"SQLite integrity check failed: {integrity}")
        _validate_schema(connection)
        database_version = connection.execute("PRAGMA user_version").fetchone()[0]
        source_rows = connection.execute(
            """
            SELECT
              d.id AS source_id,
              d.categoryID AS category_id,
              d.date,
              d.time,
              d.pice,
              d.memo,
              d.payment_id,
              d.shopname_id,
              d.delete_flag AS source_deleted,
              c.delete_flag AS source_category_deleted,
              c.income_flag,
              COALESCE(
                NULLIF(TRIM(c.categoryNameJa), ''),
                NULLIF(TRIM(c.categoryName), ''),
                'Category ' || c.categoryID
              ) AS category_name
            FROM CategoryDetail d
            JOIN Categories c ON c.categoryID = d.categoryID
            ORDER BY d.date, d.time, d.id
            """
        ).fetchall()

    import_rows: list[dict[str, object]] = []
    review_rows: list[dict[str, object]] = []
    for source_row in source_rows:
        converted, reasons = _convert_row(source_row)
        if reasons:
            review_rows.append(
                {
                    **converted,
                    "reviewReasons": ",".join(reasons),
                    "sourceDeleted": source_row["source_deleted"],
                    "sourceCategoryDeleted": source_row["source_category_deleted"],
                }
            )
        else:
            import_rows.append(converted)

    _write_csv(output, IMPORT_COLUMNS, import_rows, force=force)
    _write_csv(review_output, REVIEW_COLUMNS, review_rows, force=force)
    return ConversionSummary(
        database_version=database_version,
        total_rows=len(source_rows),
        import_ready_rows=len(import_rows),
        review_rows=len(review_rows),
    )


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("database", type=Path, help="Okanereco MMJ SQLite backup")
    parser.add_argument("output", type=Path, help="Import-ready Ludcount CSV")
    parser.add_argument(
        "--review-output",
        required=True,
        type=Path,
        help="CSV receiving deleted or invalid rows",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite output files if they already exist",
    )
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    summary = convert_database(
        args.database,
        args.output,
        args.review_output,
        force=args.force,
    )
    print(f"SQLite user_version: {summary.database_version}")
    print(f"Source transaction rows: {summary.total_rows}")
    print(f"Import-ready rows: {summary.import_ready_rows}")
    print(f"Review rows: {summary.review_rows}")
    print(f"Import CSV: {args.output}")
    print(f"Review CSV: {args.review_output}")


if __name__ == "__main__":
    main()
