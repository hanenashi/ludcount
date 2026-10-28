from __future__ import annotations

import csv
import sqlite3
import tempfile
import unittest
from pathlib import Path

from tools.okane_reco_to_ludcount_csv import convert_database


class OkaneRecoConverterTest(unittest.TestCase):
    def test_separates_importable_and_review_rows(self) -> None:
        with tempfile.TemporaryDirectory() as directory_value:
            directory = Path(directory_value)
            database = directory / "MMJ.sqlite"
            output = directory / "import.csv"
            review = directory / "review.csv"
            with sqlite3.connect(database) as connection:
                connection.executescript(
                    """
                    PRAGMA user_version = 4;
                    CREATE TABLE Categories (
                      categoryID INTEGER PRIMARY KEY,
                      categoryName VARCHAR,
                      categoryNameJa VARCHAR,
                      income_flag INTEGER DEFAULT 0,
                      delete_flag INTEGER DEFAULT 0
                    );
                    CREATE TABLE CategoryDetail (
                      id INTEGER PRIMARY KEY,
                      categoryID INTEGER NOT NULL,
                      date DATE NOT NULL,
                      time TIME NOT NULL,
                      pice DOUBLE DEFAULT 0,
                      memo TEXT,
                      payment_id INTEGER DEFAULT 1,
                      shopname_id INTEGER DEFAULT 1,
                      delete_flag INTEGER DEFAULT 0
                    );
                    INSERT INTO Categories VALUES
                      (1, 'Food', '食費', 0, 0),
                      (2, 'Salary', '給料', 1, 0);
                    INSERT INTO CategoryDetail VALUES
                      (1, 1, '2026-08-01', '10:00:00', 1000, '昼食', 1, 1, 0),
                      (2, 2, '2026-08-02', '11:00:00', 12.34, '', 1, 1, 0),
                      (3, 1, '2026-08-03', '12:00:00', 0, '', 1, 1, 0),
                      (4, 1, '2026-08-04', '13:00:00', -5, '', 1, 1, 0),
                      (5, 1, '2026-08-05', '14:00:00', 20, '', 1, 1, 1);
                    """
                )

            summary = convert_database(database, output, review)

            self.assertEqual(summary.database_version, 4)
            self.assertEqual(summary.total_rows, 5)
            self.assertEqual(summary.import_ready_rows, 2)
            self.assertEqual(summary.review_rows, 3)
            self.assertEqual(output.read_bytes()[:3], b"\xef\xbb\xbf")

            with output.open(encoding="utf-8-sig", newline="") as input_file:
                rows = list(csv.DictReader(input_file, delimiter=";"))
            self.assertEqual(rows[0]["amountMinor"], "100000")
            self.assertEqual(rows[0]["category"], "食費")
            self.assertEqual(rows[1]["amountMinor"], "1234")
            self.assertEqual(rows[1]["type"], "income")

            with review.open(encoding="utf-8-sig", newline="") as input_file:
                review_rows = list(csv.DictReader(input_file, delimiter=";"))
            self.assertEqual(
                [row["reviewReasons"] for row in review_rows],
                ["zero_amount", "negative_amount", "source_deleted"],
            )

    def test_converts_room_schema_and_normalizes_slash_dates(self) -> None:
        with tempfile.TemporaryDirectory() as directory_value:
            directory = Path(directory_value)
            database = directory / "mmj.db"
            output = directory / "import.csv"
            review = directory / "review.csv"
            with sqlite3.connect(database) as connection:
                connection.executescript(
                    """
                    PRAGMA user_version = 2;
                    CREATE TABLE Category (
                      CategoryID INTEGER PRIMARY KEY,
                      Name TEXT,
                      NameJa TEXT,
                      income_flag INTEGER DEFAULT 0,
                      delete_flag INTEGER DEFAULT 0
                    );
                    CREATE TABLE Category_detail (
                      ID INTEGER PRIMARY KEY,
                      ID_Category INTEGER NOT NULL,
                      Date TEXT NOT NULL,
                      Time TEXT NOT NULL,
                      Price TEXT NOT NULL,
                      Memo TEXT,
                      ID_Payment INTEGER DEFAULT 1,
                      shopID INTEGER DEFAULT 1,
                      delete_flag INTEGER DEFAULT 0
                    );
                    INSERT INTO Category VALUES
                      (-3, 'Income', '収入', 1, 0),
                      (10, 'Food', '食費', 0, 0);
                    INSERT INTO Category_detail VALUES
                      (101, -3, '2026/10/28', '09:30', '1250', '', 2, 3, 0),
                      (102, 10, '2026/10/29', '12:45:00', '45.67', '昼食', 1, 4, 0);
                    """
                )

            summary = convert_database(database, output, review)

            self.assertEqual(summary.database_version, 2)
            self.assertEqual(summary.total_rows, 2)
            self.assertEqual(summary.import_ready_rows, 2)
            self.assertEqual(summary.review_rows, 0)
            with output.open(encoding="utf-8-sig", newline="") as input_file:
                rows = list(csv.DictReader(input_file, delimiter=";"))
            self.assertEqual(rows[0]["date"], "2026-10-28")
            self.assertEqual(rows[0]["categorySourceId"], "-3")
            self.assertEqual(rows[0]["type"], "income")
            self.assertEqual(rows[0]["amountMinor"], "125000")
            self.assertEqual(rows[1]["date"], "2026-10-29")
            self.assertEqual(rows[1]["amountMinor"], "4567")
            self.assertEqual(rows[1]["category"], "食費")

    def test_refuses_to_overwrite_existing_output(self) -> None:
        with tempfile.TemporaryDirectory() as directory_value:
            directory = Path(directory_value)
            database = directory / "MMJ.sqlite"
            output = directory / "import.csv"
            review = directory / "review.csv"
            database.touch()
            output.write_text("existing", encoding="utf-8")
            with self.assertRaises(FileExistsError):
                convert_database(database, output, review)


if __name__ == "__main__":
    unittest.main()
