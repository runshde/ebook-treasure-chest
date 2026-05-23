#!/usr/bin/env python3
"""
从 all-books.json 生成去重搜索索引 docs/search-index.json。
同一本书（title+author）只保留一条记录，优先保留自有链接（66191444）。
"""
import json
from pathlib import Path

ROOT = Path(__file__).parent.parent
ALL_BOOKS = ROOT / "docs" / "all-books.json"
OUTPUT = ROOT / "docs" / "search-index.json"
OWN_USER = "66191444"


def main():
    print("读取 all-books.json ...")
    with open(ALL_BOOKS, encoding="utf-8") as f:
        books = json.load(f)
    print(f"共 {len(books):,} 条（含重复）")

    # key=(title,author) → 优先保留自有链接
    seen: dict[tuple, dict] = {}
    for b in books:
        key = (b.get("title", ""), b.get("author", ""))
        if key not in seen:
            seen[key] = b
        else:
            # 如果当前已有条目不是自有链接，而新条目是，则替换
            if OWN_USER not in seen[key].get("link", "") and OWN_USER in b.get("link", ""):
                seen[key] = b

    unique = list(seen.values())
    print(f"去重后 {len(unique):,} 条")

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(unique, f, ensure_ascii=False, separators=(",", ":"))

    size_mb = OUTPUT.stat().st_size / 1024 / 1024
    print(f"✅ search-index.json 已生成 ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
