# Changelog

## Unreleased

### Added
- A clear error when Node.js is older than 22.12, shown before any step starts.
- Automated tests in `tests/` for chapter detection, margins and the Node.js check. They are not part of the release ZIP.

### Changed
- The README now requires Node.js 22.12 or later, matching the bundled libraries. It listed v18+.
- Margin tooltips give the A5 values and say that other paper sizes use their own margins. The Digital tooltip said 18 mm, while A5 uses 16 mm.

### Fixed
- A chapter on the first page of the PDF is no longer merged into `00-front-matter.md`.
- Section headings at the top of a page are no longer treated as chapters.
- Long chapter titles that wrap over several lines keep their full text and are no longer repeated as a heading below the title.
- Chapters that start in the middle of a page are detected and split at their heading.
- Long chapters split at their first section, which was previously lost after a repeated title.
- The first line of each page is no longer dropped from books without running headers. Headings at the top of a page were mistaken for running headers.
- Contents pages: titles with `:` or accents, page numbers after dot leaders, words such as "Mill" read as Roman numerals, section entries, and the `Mục lục` heading.
- Text drawn inside a vector figure no longer appears again as a heading or body text. Boxes that hold sentences keep their text in the chapter.
- English words in chapters with images are no longer split, for example "Soun dings".
- A PDF with no detectable chapter is saved as one chapter instead of producing no files.

## v1.0.1 (Beta)

### Added
- QA Audit compares translated chapters with the original: missing or extra files, heading, image and paragraph counts.
- QA Audit compares the word count of the original chapters with the source PDF and warns below 90%.
- QA Audit reports missing images and unclosed `**` / `***` markers.

### Changed
- Smart chunking and Split threshold now apply to PDF extraction, as they already did for Markdown. Long chapters are split into more files by default.
- Re-extracting a PDF clears the `.md` files in `chapters_original/` first, so files from earlier split settings are not compiled twice. `chapters_translated/` is not touched.
- Chapter file names keep accented letters from the chapter title.
- QA Audit separates errors from warnings. Only errors mark the audit as failed.
- QA Audit only accepts `[Book].pdf` as the source PDF and skips the comparison when it is absent.

### Removed
- The Typography font dropdown. It had no effect: books are always typeset in Lora.
- The `setup.bat` and `npm install` steps from the documentation. Libraries ship with the app.

### Fixed
- Failed PDF extraction, Markdown splitting or compilation no longer reports success.
- QA Audit no longer reports "publication-ready" regardless of its findings.
- QA Audit no longer reports a false compiled-file mismatch on books with a cover or `images_*` paths.
- QA Audit no longer mistakes a published A6, US-Trade, US-Letter, Mass-Market or Crown PDF for the source PDF.
- Saved paths containing `\n` (for example `D:\new folder`) or quotes are restored correctly.
- Extraction works on a new book with "Scaffold translation_bible" turned off.
- Re-extracting a Markdown book picks up edits made to the source file.
- The progress bar follows the publishing stages, never moves backward and no longer reaches 100% early in a batch.
- Publishing zero PDFs is no longer reported as successful.
- Closing the window during a run stops it first, so it no longer raises an error.
- Dropdowns follow the Light theme instead of staying dark.
- Browser profiles left in the temp folder by a stopped run are removed on the next run.
