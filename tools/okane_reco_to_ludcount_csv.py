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


@dataclass(frozen=True)
class SourceSchema:
    name: str
    query: str


def _database_uri(database: Path) -> str:
    return f"{database.resolve().as_uri()}?mode=ro"


LEGACY_SCHEMA = SourceSchema(
    name="legacy",
    query="""
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
    """,
)

ROOM_SCHEMA = SourceSchema(
    name="room",
    query="""
        SELECT
          d.ID AS source_id,
          d.ID_Category AS category_id,
          d.Date AS date,
          d.Time AS time,
          d.Price AS pice,
          d.Memo AS memo,
          d.ID_Payment AS payment_id,
          d.shopID AS shopname_id,
          d.delete_flag AS source_deleted,
          c.delete_flag AS source_category_deleted,
          c.income_flag,
          COALESCE(
            NULLIF(TRIM(c.NameJa), ''),
            NULLIF(TRIM(c.Name), ''),
            'Category ' || c.CategoryID
          ) AS category_name
        FROM Category_detail d
        JOIN Category c ON c.CategoryID = d.ID_Category
        ORDER BY d.Date, d.Time, d.ID
    """,
)


def _table_columns(connection: sqlite3.Connection, table: str) -> set[str]:
    return {
        str(row[1]).casefold()
        for row in connection.execute(
            f'PRAGMA table_info("{table}")'  # noqa: S608 - fixed table names
        )
    }


def _detect_schema(connection: sqlite3.Connection) -> SourceSchema:
    schemas = (
        (
            LEGACY_SCHEMA,
            {
                "categorydetail": {
                    "id",
                    "categoryid",
                    "date",
                    "time",
                    "pice",
                    "memo",
                    "payment_id",
                    "shopname_id",
                    "delete_flag",
                },
                "categories": {
                    "categoryid",
                    "categoryname",
                    "categorynameja",
                    "income_flag",
                    "delete_flag",
                },
            },
        ),
        (
            ROOM_SCHEMA,
            {
                "category_detail": {
                    "id",
                    "id_category",
                    "date",
                    "time",
                    "price",
                    "memo",
                    "id_payment",
                    "shopid",
                    "delete_flag",
                },
                "category": {
                    "categoryid",
                    "name",
                    "nameja",
                    "income_flag",
                    "delete_flag",
                },
            },
        ),
    )
    tables = {
        str(row[0]).casefold(): str(row[0])
        for row in connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        )
    }
    failures: list[str] = []
    for schema, required_tables in schemas:
        missing_details: list[str] = []
        for table_key, expected_columns in required_tables.items():
            actual_table = tables.get(table_key)
            if actual_table is None:
                missing_details.append(f"missing table {table_key}")
                continue
            missing_columns = sorted(
                expected_columns - _table_columns(connection, actual_table)
            )
            if missing_columns:
                missing_details.append(
                    f"{actual_table} missing {', '.join(missing_columns)}"
                )
        if not missing_details:
            return schema
        failures.append(f"{schema.name}: {'; '.join(missing_details)}")
    raise ValueError(
        "Unsupported Okanereco database schema (" + " | ".join(failures) + ")"
    )


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


def _normalize_date(value: object) -> str:
    text = str(value or "").strip()
    if len(text) == 10 and text[4] == "/" and text[7] == "/":
        return text.replace("/", "-")
    return text


def _convert_row(row: sqlite3.Row) -> tuple[dict[str, object], list[str]]:
    amount_minor, amount_error = _amount_minor(row["pice"])
    category = (row["category_name"] or "").strip()
    note = row["memo"] or ""
    date_value = _normalize_date(row["date"])
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
    if not _valid_date(date_value):
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
        "date": date_value,
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
        schema = _detect_schema(connection)
        database_version = connection.execute("PRAGMA user_version").fetchone()[0]
        source_rows = connection.execute(schema.query).fetchall()

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
