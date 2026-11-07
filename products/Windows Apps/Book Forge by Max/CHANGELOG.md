# Changelog

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
