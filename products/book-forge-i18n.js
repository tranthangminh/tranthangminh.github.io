(function () {
    'use strict';

    if (!window.sharedI18n || typeof window.sharedI18n.registerTranslations !== 'function') {
        return;
    }

    var vi = {
        bookForge: {
            breadcrumb: 'Book Forge by Max',
            meta: {
                title: 'Book Forge by Max v1.0 (Beta)',
                pillVersion: 'Version 1.0 (Beta)',
                pillStack: 'C# WinForms + Node.js Engine',
                pillStandard: 'Chuẩn Nhà Xuất Bản',
                pillSize: '~393 KB (.zip)',
                badge: 'Windows App • Book Publishing Suite'
            },
            privacy: '<strong>Quy trình khép kín &amp; Bảo mật bản thảo (100% Offline):</strong> Toàn bộ dữ liệu bóc tách sách, trích xuất ảnh và dàn trang PDF đều được xử lý trực tiếp trên máy của bạn. Bản thảo của bạn hoàn toàn bảo mật, không bị gửi lên bất kỳ đám mây nào.',
            summary: '<strong>Book Forge by Max</strong> là hệ sinh thái phần mềm chuyên biệt trên Windows, giải quyết triệt để bài toán khó khăn nhất trong quy trình xuất bản sách: <strong>chuyển đổi hai chiều giữa Sách Điện Tử / PDF và Sách In Chuẩn Xuất Bản</strong>.',
            features: {
                f1: '<strong>Bóc tách PDF thông minh (PDF to Markdown):</strong> Tự động nhận diện cấu trúc chương mục H1/H2/H3 bằng phân tích hình học tọa độ, bóc tách toàn bộ ảnh gốc và lọc sạch header/footer rác.',
                f2: '<strong>Dàn trang in ấn đỉnh cao (Markdown to PDF):</strong> Tự động tính toán lề gáy so le (Gutter Margins) chuẩn đóng gáy in ấn, tạo mục lục in 2-Pass chuẩn xác từng số trang và nhúng cây bookmark PDF phân cấp.',
                f3: '<strong>Soạn thảo Front Matter 2 cột:</strong> Biên tập trang bìa lót, trang bản quyền, lời tựa dịch giả với khung Live Preview HTML/CSS thời gian thực song song.',
                f4: '<strong>Translation Bible &amp; QA Audit:</strong> Tự động khởi tạo bộ 4 tài liệu cốt lõi (Glossary, Style Guide, Character Voice, Context) chuẩn vàng để kết hợp cùng AI dịch thuật (Claude, ChatGPT, Gemini).'
            },
            ctaDownload: 'Tải Book Forge by Max v1.0 (Beta) (.zip)',
            ctaFinalDownload: 'Tải Ngay Book Forge by Max v1.0 (Beta) (.zip)',
            downloadUnit: 'lượt tải',
            previewCaption: 'Ảnh chụp giao diện phần mềm',
            previewAlt: 'Book Forge by Max - Giao diện chính hệ thống',
            modules: {
                title: '4 Phân Hệ Tính Năng Đột Phá',
                m1Title: '1. Phân Hệ PDF to Markdown',
                m1Desc: 'Bóc tách thông minh từ file PDF bất kỳ sang tài liệu Markdown sạch sẽ:',
                m1Item1: '<strong>Heading Clustering:</strong> Phân cụm cỡ chữ và tọa độ không gian nhận diện chuẩn Chương chính (H1), Mục lớn (H2) và Tiểu mục (H3).',
                m1Item2: '<strong>Subsection Splitting:</strong> Chia nhỏ chương theo ngưỡng ký tự (mặc định 25.000 ký tự - kích thước lý tưởng cho LLM/AI dịch thuật).',
                m1Item3: '<strong>Image Extractor:</strong> Bóc tách toàn bộ ảnh minh họa chuẩn tỉ lệ gốc và chèn cú pháp liên kết Markdown vào đúng đoạn văn.',
                m1Item4: '<strong>Footnote Reconstruction:</strong> Xóa số trang/header rác và gom tái tạo chú thích chân trang <code>[^1]</code> chuẩn xác.',
                m2Title: '2. Phân Hệ Markdown to PDF',
                m2Desc: 'Dàn trang in ấn xuất bản đỉnh cao sang file PDF chuẩn quốc tế:',
                m2Item1: '<strong>Gutter Margins:</strong> Tự động tính lề so le (trang lẻ tăng lề trái, trang chẵn tăng lề phải) giúp đóng gáy keo nhiệt/may chỉ không bị mất chữ.',
                m2Item2: '<strong>Mục Lục In 2-Pass:</strong> Đo trang thực tế sau khi tính độ dài mục lục, đảm bảo không bao giờ bị lệch hay đè số trang.',
                m2Item3: '<strong>Tùy chọn TOC Depth:</strong> Chọn độ sâu mục lục H1 (tiểu thuyết), H1 &amp; H2 (sách kỹ năng), hoặc H1, H2 &amp; H3 (sách kỹ thuật).',
                m2Item4: '<strong>Typography Lora:</strong> Nhúng sẵn font serif quốc tế cao cấp Lora, tối ưu độ tương phản cho mắt khi đọc lâu.',
                m3Title: '3. Soạn Thảo Front Matter Editor',
                m3Desc: 'Cửa sổ biên tập độc lập cho các trang mở đầu cuốn sách:',
                m3Item1: 'Soạn thảo trang bìa lót (Half Title &amp; Title Page), trang bản quyền nhà xuất bản (Copyright Page), lời tựa hoặc ghi chú của dịch giả.',
                m3Item2: '<strong>Khung Live Preview song song:</strong> Cột trái nhập Markdown, cột phải tự động hiển thị trực quan bản in theo thời gian thực.',
                m3Item3: 'Tích hợp các nút mẫu nhanh (Insert Header Template, Insert Translator Note).',
                m4Title: '4. Translation Bible &amp; QA Audit',
                m4Desc: 'Khung quản lý dịch thuật chuyên nghiệp và đối soát chất lượng:',
                m4Item1: 'Tự động khởi tạo 4 file: <code>Glossary.md</code> (từ điển thuật ngữ), <code>Style-Guide.md</code> (quy chuẩn hành văn), <code>Character-Voice.md</code> (ngữ điệu nhân vật), <code>Context-Anchor.md</code> (bối cảnh tác phẩm).',
                m4Item2: '<strong>QA Audit Engine:</strong> Đối soát số lượng chương mục, kiểm tra các cặp thẻ đóng mở, kiểm tra link ảnh tránh việc in ra bị mất hình.'
            },
            workflow: {
                title: 'Quy Trình Hoạt Động Khép Kín (Workflow Từ A - Z)',
                s1Title: 'Bóc Tách PDF Gốc',
                s1Desc: 'Chọn file PDF sách cần xử lý. Book Forge sẽ bóc tách toàn bộ nội dung sang các file Markdown sạch, tự động chia chương nhỏ, bóc ảnh gốc và tạo Translation Bible.',
                s2Title: 'Biên Tập &amp; Dịch Thuật',
                s2Desc: 'Dịch thuật hoặc hiệu đính nội dung (kết hợp tiện lợi cùng AI với khung Translation Bible). Dùng Front Matter Editor để viết lời tựa, thông tin bản quyền với Live Preview.',
                s3Title: 'Xuất Bản Sách In PDF',
                s3Desc: 'Chọn khổ sách (A5, B5, Pocket...), chế độ lề so le Gutter và độ sâu mục lục. Bấm <em>Publish to PDF</em> để nhận ngay file PDF in ấn chuẩn quốc tế sẵn sàng gửi nhà in.'
            },
            paperSizes: {
                title: 'Đa Dạng Khổ Sách Chuẩn Quốc Tế',
                thFormat: 'Khổ Sách',
                thDimensions: 'Kích Thước (mm)',
                thGenre: 'Thể Loại Sách Phù Hợp',
                thBinding: 'Kiểu Đóng Gáy',
                a5Name: '<strong>A5</strong> (Tiêu chuẩn phổ biến)',
                a5Genre: 'Tiểu thuyết, văn học, tản văn, truyện ngắn',
                a5Binding: 'Lề gáy so le Print Gutter (20 - 24 mm)',
                b5Name: '<strong>B5</strong> (Khổ lớn nghiên cứu)',
                b5Genre: 'Giáo trình đại học, sách chuyên ngành, sách kỹ thuật',
                b5Binding: 'Print Gutter / May chỉ keo gáy',
                pocketName: '<strong>Pocket Book</strong> (Bỏ túi)',
                pocketGenre: 'Sổ tay kỹ năng, cẩm nang du lịch, thơ bỏ túi',
                pocketBinding: 'Print Gutter nhỏ gọn',
                usTradeName: '<strong>US-Trade</strong>',
                usTradeGenre: 'Sách xuất bản thị trường quốc tế (Amazon KDP, IngramSpark)',
                usTradeBinding: 'Chuẩn in ấn quốc tế',
                digitalName: '<strong>Digital / Tablet</strong>',
                digitalDim: 'Tự động cân bằng',
                digitalGenre: 'Đọc trên iPad, máy đọc sách, điện thoại, máy tính',
                digitalBinding: 'Lề cân đối 2 bên (Digital Mode)'
            },
            setup: {
                title: 'Hướng Dẫn Cài Đặt &amp; Khởi Chạy Lần Đầu',
                intro: 'Chỉ cần 4 bước đơn giản, thực hiện thiết lập môi trường 1 lần duy nhất:',
                s1Title: 'Tải &amp; Giải Nén',
                s1Desc: 'Tải file nén <strong>Book Forge by Max v1.0 (Beta).zip</strong> và giải nén vào thư mục mong muốn (Ví dụ: <code>D:\\Book Forge by Max\\</code>).',
                s2Title: 'Cài Node.js LTS',
                s2Desc: 'Truy cập <a href="https://nodejs.org/" target="_blank" rel="noopener noreferrer" style="color: var(--accent-primary); font-weight: 700;">nodejs.org</a>, tải và cài đặt bản Node.js LTS với các thiết lập mặc định (nếu máy đã có Node.js, bỏ qua bước này).',
                s3Title: 'Chạy setup.bat (1-Click)',
                s3Desc: 'Nhấp đúp vào file <strong>setup.bat</strong> trong thư mục vừa giải nén. Script sẽ tự động cài 5 gói engine dàn trang cốt lõi qua npm.',
                s4Title: 'Mở &amp; Sử Dụng',
                s4Desc: 'Nhấp đúp vào <strong>Book Forge by Max.exe</strong> để mở ứng dụng và bắt đầu dự án xuất bản sách của bạn!'
            },
            requirements: {
                title: 'Yêu Cầu Cấu Hình Hệ Thống',
                thComponent: 'Thành phần',
                thMin: 'Cấu hình tối thiểu (Minimum)',
                thRec: 'Cấu hình khuyên dùng (Recommended)',
                osName: '<strong>Hệ Điều Hành</strong>',
                osMin: 'Windows 10 (64-bit) Version 1809+',
                osRec: 'Windows 11 (64-bit) bản mới nhất',
                cpuName: '<strong>Vi Xử Lý (CPU)</strong>',
                cpuMin: 'Intel Core i3 / AMD Ryzen 3 (2.0 GHz)',
                cpuRec: 'Intel Core i5 / AMD Ryzen 5 đa nhân',
                ramName: '<strong>Bộ Nhớ RAM</strong>',
                ramMin: '4 GB RAM',
                ramRec: '8 GB RAM trở lên (khi xử lý sách PDF &gt; 300 trang)',
                diskName: '<strong>Dung Lượng Đĩa</strong>',
                diskMin: '500 MB dung lượng trống',
                diskRec: '2 GB ổ cứng SSD tốc độ cao',
                runtimeName: '<strong>Môi Trường</strong>',
                runtimeMin: '.NET Framework 4.8 &amp; Node.js v18+ LTS',
                runtimeRec: '.NET Framework 4.8 &amp; Node.js v20+ LTS'
            },
            tips: {
                title: 'Mẹo &amp; Kinh Nghiệm Dàn Trang Thực Tế (Pro Tips)',
                t1Title: '📌 1. Lựa chọn Gutter Margins theo độ dày sách',
                t1Desc: 'Với sách dán keo nhiệt gáy cứng (&gt; 200 trang), phần gáy luôn bị nuốt vào trong 5-8 mm. Chế độ <strong>Print Gutter</strong> của Book Forge đã bù trừ lề trong lên tới 24 mm, giúp người đọc không phải bẹt mạnh sách vẫn đọc rõ từng chữ sát mép trong.',
                t2Title: '📌 2. Chọn Menu Depth phù hợp thể loại',
                t2Desc: 'Tiểu thuyết chỉ nên chọn <code>H1</code> để mục lục gọn gàng; Sách kinh tế, kỹ năng nên chọn <code>H1 &amp; H2</code> để độc giả dễ quét luận điểm; Sách kỹ thuật lập trình nên chọn <code>H1, H2 &amp; H3</code> để tra cứu từng hàm chi tiết.',
                t3Title: '📌 3. Tận dụng Translation Bible với AI',
                t3Desc: 'Trước khi gửi chương sách cho Claude, ChatGPT hay Gemini dịch, hãy đính kèm nội dung <code>Glossary.md</code> và <code>Style-Guide.md</code> vào System Prompt. AI sẽ dịch chuẩn xác 100% ngôi xưng hô và từ khóa chuyên ngành xuyên suốt toàn bộ cuốn sách!',
                t4Title: '📌 4. Quản lý ảnh minh họa thông minh',
                t4Desc: 'Giữ cú pháp liên kết tương đối <code>![Mô tả](images/fig_01.png)</code>. Khi xuất PDF, Book Forge tự động căn giữa ảnh, tối ưu kích thước tránh tràn trang và tự ngắt trang thông minh.'
            }
        }
    };

    var en = {
        bookForge: {
            breadcrumb: 'Book Forge by Max',
            meta: {
                title: 'Book Forge by Max v1.0 (Beta)',
                pillVersion: 'Version 1.0 (Beta)',
                pillStack: 'C# WinForms + Node.js Engine',
                pillStandard: 'Publisher Standard',
                pillSize: '~393 KB (.zip)',
                badge: 'Windows App • Book Publishing Suite'
            },
            privacy: '<strong>Closed Workflow &amp; Manuscript Confidentiality (100% Offline):</strong> All book parsing, image extraction, and PDF typesetting are processed directly on your local machine. Your manuscripts remain completely confidential and are never transmitted to any cloud.',
            summary: '<strong>Book Forge by Max</strong> is a specialized Windows software suite that comprehensively solves the most challenging bottleneck in book publishing: <strong>bidirectional conversion between Ebooks / PDF and Publication-Ready Print Books</strong>.',
            features: {
                f1: '<strong>Smart PDF Parsing (PDF to Markdown):</strong> Automatically detects H1/H2/H3 chapter structures via coordinate geometry analysis, extracts all original images, and filters out header/footer noise.',
                f2: '<strong>High-End Print Typesetting (Markdown to PDF):</strong> Automatically computes alternating gutter margins for bookbinding, generates precise 2-pass print tables of contents, and embeds hierarchical PDF bookmark trees.',
                f3: '<strong>2-Column Front Matter Editor:</strong> Compose half-title pages, copyright notices, and translator prefaces with side-by-side real-time HTML/CSS live preview.',
                f4: '<strong>Translation Bible &amp; QA Audit:</strong> Automatically generates the 4 core guideline documents (Glossary, Style Guide, Character Voice, Context) optimized for AI-assisted translation (Claude, ChatGPT, Gemini).'
            },
            ctaDownload: 'Download Book Forge by Max v1.0 (Beta) (.zip)',
            ctaFinalDownload: 'Download Now Book Forge by Max v1.0 (Beta) (.zip)',
            downloadUnit: 'downloads',
            previewCaption: 'Software Interface Screenshot',
            previewAlt: 'Book Forge by Max - Main Application Interface',
            modules: {
                title: '4 Breakthrough Feature Modules',
                m1Title: '1. PDF to Markdown Engine',
                m1Desc: 'Intelligent parsing from any PDF into clean Markdown documents:',
                m1Item1: '<strong>Heading Clustering:</strong> Clusters font sizes and spatial coordinates to accurately identify Chapters (H1), Major Sections (H2), and Subsections (H3).',
                m1Item2: '<strong>Subsection Splitting:</strong> Automatically divides chapters by character thresholds (default 25,000 characters - ideal chunk size for translation LLMs).',
                m1Item3: '<strong>Image Extractor:</strong> Extracts all illustrations in original resolutions and links them into Markdown at exact paragraph positions.',
                m1Item4: '<strong>Footnote Reconstruction:</strong> Eliminates page numbers and headers, restructuring footnotes into standard <code>[^1]</code> syntax.',
                m2Title: '2. Markdown to PDF Typesetting',
                m2Desc: 'Publication-grade print book layout generation into international standard PDFs:',
                m2Item1: '<strong>Gutter Margins:</strong> Calculates alternating margins (wider inside gutter on odd/even pages) to prevent content loss during spine gluing or thread stitching.',
                m2Item2: '<strong>2-Pass Print TOC:</strong> Measures actual layout page numbers after resolving table-of-contents length, ensuring zero page number drift.',
                m2Item3: '<strong>TOC Depth Selection:</strong> Choose TOC granularity: H1 (novels), H1 &amp; H2 (non-fiction), or H1, H2 &amp; H3 (technical books).',
                m2Item4: '<strong>Lora Typography:</strong> Bundles premium international serif font Lora, calibrated for long-form reading comfort.',
                m3Title: '3. Front Matter Editor',
                m3Desc: 'Dedicated authoring interface for introductory book matter:',
                m3Item1: 'Compose half-title and title pages, copyright and colophon pages, prefaces, or translator acknowledgments.',
                m3Item2: '<strong>Side-by-Side Live Preview:</strong> Markdown input on the left with instant real-time print rendering on the right.',
                m3Item3: 'Built-in quick template insertion buttons (Insert Header Template, Insert Translator Note).',
                m4Title: '4. Translation Bible &amp; QA Audit',
                m4Desc: 'Professional translation guide framework and automated quality assurance:',
                m4Item1: 'Automatically generates 4 core files: <code>Glossary.md</code> (terminology), <code>Style-Guide.md</code> (writing standards), <code>Character-Voice.md</code> (dialogue persona), and <code>Context-Anchor.md</code> (story context).',
                m4Item2: '<strong>QA Audit Engine:</strong> Cross-checks chapter counts, validates balanced Markdown/HTML tags, and verifies image paths to prevent missing assets.'
            },
            workflow: {
                title: 'End-to-End Publishing Workflow (A - Z)',
                s1Title: 'Extract Source PDF',
                s1Desc: 'Select source PDF. Book Forge parses content into clean Markdown files, splits chapters, extracts images, and generates a Translation Bible.',
                s2Title: 'Edit &amp; Translate',
                s2Desc: 'Translate or proofread content (streamlined with AI using Translation Bible). Use Front Matter Editor for prefaces and copyright with Live Preview.',
                s3Title: 'Publish Print PDF',
                s3Desc: 'Select book trim size (A5, B5, Pocket...), gutter margin mode, and TOC depth. Click <em>Publish to PDF</em> for a print-ready PDF ready for the printing press.'
            },
            paperSizes: {
                title: 'International Standard Book Sizes',
                thFormat: 'Book Format',
                thDimensions: 'Dimensions (mm)',
                thGenre: 'Recommended Genre',
                thBinding: 'Binding Type',
                a5Name: '<strong>A5</strong> (Standard Format)',
                a5Genre: 'Novels, literature, essays, short stories',
                a5Binding: 'Print Gutter alternating margins (20 - 24 mm)',
                b5Name: '<strong>B5</strong> (Large Format)',
                b5Genre: 'Academic textbooks, monographs, technical books',
                b5Binding: 'Print Gutter / Thread sewing glued spine',
                pocketName: '<strong>Pocket Book</strong>',
                pocketGenre: 'Skill handbooks, travel guides, poetry books',
                pocketBinding: 'Compact Print Gutter',
                usTradeName: '<strong>US-Trade</strong>',
                usTradeGenre: 'International trade publications (Amazon KDP, IngramSpark)',
                usTradeBinding: 'International print standard',
                digitalName: '<strong>Digital / Tablet</strong>',
                digitalDim: 'Auto-balanced',
                digitalGenre: 'Reading on iPads, e-readers, phones, PCs',
                digitalBinding: 'Symmetric margins (Digital Mode)'
            },
            setup: {
                title: 'Installation &amp; First-Run Guide',
                intro: 'Four straightforward steps, one-time environment setup:',
                s1Title: 'Download &amp; Extract',
                s1Desc: 'Download <strong>Book Forge by Max v1.0 (Beta).zip</strong> and extract it into your desired folder (e.g., <code>D:\\Book Forge by Max\\</code>).',
                s2Title: 'Install Node.js LTS',
                s2Desc: 'Visit <a href="https://nodejs.org/" target="_blank" rel="noopener noreferrer" style="color: var(--accent-primary); font-weight: 700;">nodejs.org</a>, download and install Node.js LTS with default settings (skip if already installed).',
                s3Title: 'Run setup.bat (1-Click)',
                s3Desc: 'Double-click <strong>setup.bat</strong> in the extracted folder. The script automatically installs the 5 core typesetting engine packages via npm.',
                s4Title: 'Launch &amp; Use',
                s4Desc: 'Double-click <strong>Book Forge by Max.exe</strong> to launch the application and start your book publishing project!'
            },
            requirements: {
                title: 'System Requirements',
                thComponent: 'Component',
                thMin: 'Minimum Requirements',
                thRec: 'Recommended',
                osName: '<strong>Operating System</strong>',
                osMin: 'Windows 10 (64-bit) Version 1809+',
                osRec: 'Windows 11 (64-bit) latest build',
                cpuName: '<strong>Processor (CPU)</strong>',
                cpuMin: 'Intel Core i3 / AMD Ryzen 3 (2.0 GHz)',
                cpuRec: 'Multi-core Intel Core i5 / AMD Ryzen 5',
                ramName: '<strong>Memory (RAM)</strong>',
                ramMin: '4 GB RAM',
                ramRec: '8 GB RAM or higher (for PDFs &gt; 300 pages)',
                diskName: '<strong>Disk Space</strong>',
                diskMin: '500 MB free space',
                diskRec: '2 GB high-speed SSD storage',
                runtimeName: '<strong>Runtime Environment</strong>',
                runtimeMin: '.NET Framework 4.8 &amp; Node.js v18+ LTS',
                runtimeRec: '.NET Framework 4.8 &amp; Node.js v20+ LTS'
            },
            tips: {
                title: 'Typesetting Best Practices (Pro Tips)',
                t1Title: '📌 1. Match Gutter Margins to Book Thickness',
                t1Desc: 'For perfect-bound books (&gt; 200 pages), the spine swallows 5-8 mm. Book Forge’s <strong>Print Gutter</strong> compensates with up to 24 mm inner margin, so readers can read cleanly without straining the binding.',
                t2Title: '📌 2. Match TOC Depth to Genre',
                t2Desc: 'Novels should use <code>H1</code> for a concise TOC; Business and non-fiction benefit from <code>H1 &amp; H2</code> for quick scanning; Technical manuals need <code>H1, H2 &amp; H3</code> for granular lookups.',
                t3Title: '📌 3. Leverage Translation Bible with AI',
                t3Desc: 'Before submitting chapters to Claude, ChatGPT, or Gemini, include <code>Glossary.md</code> and <code>Style-Guide.md</code> in the System Prompt. AI maintains 100% consistent terminology and character pronouns throughout the entire book!',
                t4Title: '📌 4. Smart Illustration Handling',
                t4Desc: 'Maintain relative markdown image paths <code>![Caption](images/fig_01.png)</code>. When rendering PDF, Book Forge automatically centers illustrations, prevents overflow, and manages intelligent page breaks.'
            }
        }
    };

    window.sharedI18n.registerTranslations('vi', vi);
    window.sharedI18n.registerTranslations('en', en);
})();
