(function () {
    'use strict';

    if (!window.sharedI18n || typeof window.sharedI18n.registerTranslations !== 'function') {
        return;
    }

    var vi = {
        bookForge: {
            docTitle: 'Book Forge by Max - Bóc Tách & Dàn Trang Sách In | Trần Thắng Minh',
            breadcrumb: 'Book Forge by Max',
            meta: {
                title: 'Book Forge by Max v1.0.1 (Beta)',
                pillBeta: 'Beta',
                pillSize: '~41 MB (.zip)',
                pillStack: 'C# + Node.js',
                pillWindows: 'Windows App'
            },
            heroDownloadLabel: 'Tải Book Forge by Max (.zip)',
            finalDownloadLabel: 'Tải Ngay Book Forge by Max (.zip)',
            summary: '<strong>Book Forge by Max</strong> là phần mềm Windows dành cho việc biên tập và xuất bản sách: bóc tách PDF thành Markdown để dịch hoặc biên tập, rồi dàn trang Markdown thành PDF sách in hoặc PDF đọc trên màn hình. Gồm những tính năng nổi bật:',
            features: {
                extract: '<strong>Bóc tách sách sang Markdown:</strong> Nhận file <code>.pdf</code> hoặc <code>.md</code>, nhận diện chương và đề mục, lọc header/footer, tách ảnh và vector. PDF phải có lớp văn bản.',
                chunk: '<strong>Chia chương để dịch bằng AI:</strong> Chương dài hơn ngưỡng (mặc định 25.000 ký tự) được chia theo đề mục H2, H3.',
                publish: '<strong>Dàn trang PDF sách in:</strong> Lề gáy so le, running header theo chương, mục lục in và bookmark PDF theo độ sâu H1 đến H3.',
                screen: '<strong>PDF đọc trên màn hình:</strong> Chế độ <em>Digital screen</em> dùng lề hai bên bằng nhau.',
                sizes: '<strong>9 khổ sách:</strong> A6, A5, A4, B5, US-Trade, US-Letter, Mass-Market, Kindle, Crown.',
                editor: '<strong>Soạn Header &amp; Ghi chú dịch giả:</strong> Cửa sổ 2 cột, soạn bên trái, xem trước trang in theo khổ giấy bên phải.',
                bible: '<strong>Translation Bible:</strong> Tự tạo 4 tài liệu Glossary, Style Guide, Character Voice, Context Anchor để dùng khi dịch bằng AI.',
                audit: '<strong>QA Audit:</strong> Báo thiếu ảnh và file tổng lệch chương; so bản dịch với nguyên tác; so số từ với PDF gốc.',
                interfaceOptions: '<strong>Giao diện Sáng/Tối:</strong> Đổi ngay trên thanh tiêu đề.'
            },
            spotlight: {
                extractCaption: 'PDF to Markdown',
                publishCaption: 'Markdown to PDF',
                editorCaption: 'Soạn Header & Ghi chú dịch giả'
            },
            privacy: '<strong>Bảo mật bản thảo:</strong> Bóc tách, trích ảnh và dàn trang đều chạy trên máy của bạn, bản thảo không bị gửi đi đâu. Kết nối mạng duy nhất của phần mềm là khi bạn tự bấm kiểm tra cập nhật trong tab Info. Phần mềm không thu thập dữ liệu và không chứa tracker.',
            guide: {
                setup: {
                    title: 'Cài Đặt &amp; Khởi Chạy Lần Đầu',
                    s1Title: 'Tải &amp; Giải Nén',
                    s1Desc: 'Tải file <strong>Book Forge by Max v1.0.1 (Beta).zip</strong> và giải nén vào thư mục bạn muốn. Thư viện xử lý sách đã đi kèm, không cần cài thêm.',
                    s2Title: 'Cài Node.js',
                    s2Desc: 'Nếu máy chưa có, tải bản LTS tại <a href="https://nodejs.org/" target="_blank" rel="noopener noreferrer">nodejs.org</a> và cài với thiết lập mặc định. Cần bản 22.12 trở lên.',
                    s3Title: 'Mở &amp; Sử Dụng',
                    s3Desc: 'Nhấp đúp vào <strong>Book Forge by Max.exe</strong> để bắt đầu.'
                },
                workflow: {
                    title: 'Quy Trình Làm Một Cuốn Sách',
                    s1Title: 'Bóc Tách',
                    s1Desc: 'Ở thẻ <strong>PDF to Markdown</strong>, chọn hoặc kéo thả file, chọn nơi lưu rồi bấm <strong>Extract Content</strong>. Bạn nhận được một thư mục dự án gồm các chương Markdown, ảnh và Translation Bible.',
                    s2Title: 'Biên Tập &amp; Dịch',
                    s2Desc: 'Kiểm tra lại các chương, rồi dịch hoặc biên tập trong <code>chapters_translated</code>. Bấm <strong>Edit Header and Translator Note</strong> để soạn phần đầu trang và ghi chú dịch giả.',
                    s3Title: 'Xuất Bản',
                    s3Desc: 'Ở thẻ <strong>Markdown to PDF</strong>, chọn bản dịch hoặc nguyên tác, khổ sách, kiểu lề và độ sâu mục lục. Bấm <strong>Run QA Audit</strong> để rà lỗi, rồi <strong>Publish PDF Book</strong> để xuất file.'
                },
                modules: {
                    title: '4 Phân Hệ',
                    m1Title: 'PDF to Markdown',
                    m1Desc: 'Chuyển PDF có lớp văn bản, hoặc file Markdown, thành dự án sách:',
                    m1Item1: '<strong>Nhận diện cấu trúc:</strong> Tìm chương và đề mục H1, H2, H3 theo mục lục, cỡ chữ và mẫu tiêu đề. Nên xem lại kết quả, vì độ chính xác phụ thuộc vào file PDF.',
                    m1Item2: '<strong>Smart chunking:</strong> Chọn chia theo H1, H1 &amp; H2 hoặc H1, H2 &amp; H3, với ngưỡng từ 15.000 đến 40.000 ký tự. Đoạn không có đề mục con có thể dài hơn ngưỡng.',
                    m1Item3: '<strong>Ảnh &amp; vector:</strong> Tách ảnh bìa và hình minh họa vào <code>images_original</code>, chèn liên kết Markdown vào chương.',
                    m1Item4: '<strong>Chú thích:</strong> Lọc số trang, tiêu đề lặp và tái tạo chú thích chân trang <code>[^1]</code>.',
                    m2Title: 'Markdown to PDF',
                    m2Desc: 'Dàn trang thư mục dự án hoặc một file <code>.md</code> thành PDF:',
                    m2Item1: '<strong>Print book (Gutter):</strong> Lề trong rộng hơn lề ngoài, đảo chiều giữa trang lẻ và trang chẵn để đóng gáy.',
                    m2Item2: '<strong>Digital screen (Even):</strong> Lề hai bên bằng nhau để đọc trên màn hình.',
                    m2Item3: '<strong>Menu depth:</strong> Mục lục in và bookmark PDF theo H1, H1 &amp; H2 hoặc H1, H2 &amp; H3.',
                    m2Item4: '<strong>Font Lora:</strong> Nhúng sẵn, hỗ trợ tiếng Việt.',
                    m3Title: 'Header &amp; Translator Note',
                    m3Desc: 'Cửa sổ biên tập riêng cho từng bản (Translated, Original):',
                    m3Item1: '<strong>Running Header:</strong> 4 dòng chia hai bên đầu trang, có chỉnh tỉ lệ độ rộng. Bỏ trống bên trái thì tự lấy tên chương.',
                    m3Item2: '<strong>Ghi chú dịch giả:</strong> Soạn bằng Markdown, nằm trước mục lục khi bật <em>Include translator note</em>.',
                    m3Item3: '<strong>Print Preview:</strong> Xem trước trang in theo khổ giấy ngay trong cửa sổ.',
                    m3Item4: '<strong>Reset to Template:</strong> Đưa về mẫu ban đầu khi cần.',
                    m4Title: 'Translation Bible &amp; QA Audit',
                    m4Desc: 'Giữ bản dịch thống nhất và rà lỗi trước khi xuất:',
                    m4Item1: 'Tạo sẵn <code>Glossary.md</code>, <code>Style-Guide.md</code>, <code>Character-Voice.md</code> và <code>Context-Anchor.md</code>.',
                    m4Item2: '<strong>Báo lỗi:</strong> Thiếu ảnh, file tổng không khớp với các chương.',
                    m4Item3: '<strong>Cảnh báo:</strong> Lỗi typography, thẻ <code>**</code> chưa đóng, bản dịch thiếu file hoặc lệch số đề mục, ảnh, đoạn so với nguyên tác.',
                    m4Item4: '<strong>So với PDF gốc:</strong> Cảnh báo khi Markdown có dưới 90% số từ của PDF. Cần file <code>[Tên sách].pdf</code>, không có thì bỏ qua bước này.'
                },
                paperSizes: {
                    title: '9 Khổ Sách',
                    thFormat: 'Khổ',
                    thDimensions: 'Kích thước',
                    thUse: 'Phù hợp với',
                    a6: 'Sách bỏ túi, bản in nhỏ',
                    a5: 'Sách tiêu chuẩn (mặc định)',
                    b5: 'Giáo trình, sách chuyên khảo',
                    a4: 'Tài liệu, sách tham khảo',
                    usTrade: 'Sách thương mại khổ Mỹ',
                    usLetter: 'Tài liệu khổ Bắc Mỹ',
                    massMarket: 'Sách bìa mềm bỏ túi',
                    kindle: 'Máy đọc sách',
                    crown: 'Sách có nhiều minh họa'
                },
                tips: {
                    title: 'Mẹo Sử Dụng',
                    t1Title: 'Chọn kiểu lề theo mục đích',
                    t1Desc: 'Dùng <strong>Print book (Gutter)</strong> khi đem đi in và đóng gáy, vì phần gáy luôn che mất một ít ở mép trong. Dùng <strong>Digital screen (Even)</strong> khi chỉ đọc trên máy tính, máy bảng.',
                    t2Title: 'Chọn Menu depth theo thể loại',
                    t2Desc: 'Tiểu thuyết nên chọn <code>H1</code> để mục lục gọn. Sách kinh tế, kỹ năng nên chọn <code>H1 &amp; H2</code>. Sách kỹ thuật nên chọn <code>H1, H2 &amp; H3</code> để dễ tra cứu.',
                    t3Title: 'Dùng Translation Bible với AI',
                    t3Desc: 'Trước khi gửi một chương cho AI dịch, hãy đính kèm <code>Glossary.md</code> và <code>Style-Guide.md</code> để giữ thuật ngữ và cách xưng hô thống nhất trong cả cuốn sách.',
                    t4Title: 'Giữ đúng đường dẫn ảnh',
                    t4Desc: 'Giữ liên kết tương đối như <code>![Mô tả](../images_original/fig_01.png)</code>. Khi xuất PDF, Book Forge tự căn giữa và co ảnh cho vừa trang.'
                }
            },
            limits: {
                title: 'Giới Hạn Cần Biết',
                noticeTitle: '⚠️ Những Điều Book Forge Chưa Làm Được',
                noticeScan: '<strong>PDF scan:</strong> Chỉ xử lý PDF có lớp văn bản. Nếu không bôi đen được chữ trong file, hãy chạy OCR trước.',
                noticeCheck: '<strong>Nhận diện chương:</strong> Kết quả phụ thuộc vào cách trình bày của PDF, có thể nhầm hoặc cắt thiếu tên chương. Hãy xem lại các file chương trước khi dịch.',
                noticeReextract: '<strong>Bóc tách lại:</strong> Toàn bộ file <code>.md</code> trong <code>chapters_original</code> sẽ bị xóa và tạo lại. Thư mục <code>chapters_translated</code> không bị ảnh hưởng.',
                noticeBeta: '<strong>Bản Beta:</strong> Phần mềm vẫn đang được hoàn thiện, hãy kiểm tra file PDF trước khi gửi nhà in.'
            },
            requirements: {
                title: 'Yêu Cầu Hệ Thống &amp; Lưu Ý Khi Mở',
                thComponent: 'Thành phần',
                thMin: 'Tối thiểu (khuyến nghị)',
                thRec: 'Nên dùng (khuyến nghị)',
                osName: '<strong>Hệ Điều Hành</strong>',
                osMin: 'Windows 10 (64-bit) Version 1809+',
                osRec: 'Windows 11 (64-bit) bản mới nhất',
                cpuName: '<strong>Vi Xử Lý (CPU)</strong>',
                cpuMin: 'Intel Core i3 / AMD Ryzen 3',
                cpuRec: 'Intel Core i5 / AMD Ryzen 5 trở lên',
                ramName: '<strong>Bộ Nhớ RAM</strong>',
                ramMin: '4 GB',
                ramRec: '8 GB trở lên với sách trên 300 trang',
                diskName: '<strong>Dung Lượng Đĩa</strong>',
                diskMin: '500 MB trống (app sau khi giải nén ~145 MB)',
                diskRec: '2 GB trên SSD',
                screenName: '<strong>Màn Hình</strong>',
                screenMin: '1280 x 720',
                screenRec: '1920 x 1080 trở lên',
                runtimeName: '<strong>Môi Trường</strong>',
                runtimeMin: '.NET Framework 4.8 &amp; Node.js 22.12+',
                runtimeRec: '.NET Framework 4.8 &amp; Node.js LTS mới nhất',
                browserName: '<strong>Trình Duyệt</strong>',
                browserMin: 'Microsoft Edge (có sẵn trên Windows), dùng để dàn trang PDF',
                browserRec: 'Microsoft Edge bản mới nhất',
                ramNote: 'Lúc mở, app dùng khoảng 50 MB RAM. Khi xuất PDF, Node.js và Edge chạy ngầm dùng thêm RAM: khoảng 770 MB khi thử với một cuốn 60 trang.',
                dataNote: 'Dự án sách lưu ở nơi bạn chọn: cạnh file nguồn, trong thư mục <code>Book Forge by Max-Files</code>, hoặc thư mục tùy chọn. Cài đặt nằm trong file <code>_BookForgeConfig</code> cạnh file exe.',
                smartScreenTitle: 'ℹ️ Thông báo Windows SmartScreen trong lần mở đầu tiên',
                smartScreenDesc: 'Phần mềm chưa được ký số nên Windows Defender SmartScreen có thể hiện cảnh báo <em>"Unknown Publisher"</em>. Bạn chỉ cần nhấn <strong>More info &rarr; Run anyway</strong> để mở.'
            }
        }
    };

    var en = {
        bookForge: {
            docTitle: 'Book Forge by Max - Book Extraction & Print Layout | Trần Thắng Minh',
            breadcrumb: 'Book Forge by Max',
            meta: {
                title: 'Book Forge by Max v1.0.1 (Beta)',
                pillBeta: 'Beta',
                pillSize: '~41 MB (.zip)',
                pillStack: 'C# + Node.js',
                pillWindows: 'Windows App'
            },
            heroDownloadLabel: 'Download Book Forge by Max (.zip)',
            finalDownloadLabel: 'Download Book Forge by Max (.zip) Now',
            summary: '<strong>Book Forge by Max</strong> is Windows software for editing and publishing books: extract a PDF into Markdown to translate or edit it, then lay the Markdown out as a print-ready or on-screen PDF. Key features include:',
            features: {
                extract: '<strong>Book to Markdown:</strong> Takes a <code>.pdf</code> or <code>.md</code> file, finds chapters and headings, filters headers and footers, and extracts images and vectors. The PDF must have a text layer.',
                chunk: '<strong>Chapter Splitting for AI Translation:</strong> Chapters longer than the threshold (25,000 characters by default) are split at their H2 and H3 headings.',
                publish: '<strong>Print PDF Layout:</strong> Alternating gutter margins, running headers by chapter, a printed table of contents and PDF bookmarks down to H3.',
                screen: '<strong>On-Screen PDF:</strong> <em>Digital screen</em> mode uses equal margins on both sides.',
                sizes: '<strong>9 Paper Sizes:</strong> A6, A5, A4, B5, US-Trade, US-Letter, Mass-Market, Kindle, Crown.',
                editor: '<strong>Header &amp; Translator Note Editor:</strong> A two-column window: write on the left, preview the printed page at your paper size on the right.',
                bible: '<strong>Translation Bible:</strong> Creates four documents (Glossary, Style Guide, Character Voice, Context Anchor) to use when translating with AI.',
                audit: '<strong>QA Audit:</strong> Reports missing images and a master file that no longer matches its chapters, compares the translation with the original, and compares word counts with the source PDF.',
                interfaceOptions: '<strong>Light/Dark Interface:</strong> Switch right from the title bar.'
            },
            spotlight: {
                extractCaption: 'PDF to Markdown',
                publishCaption: 'Markdown to PDF',
                editorCaption: 'Header & Translator Note Editor'
            },
            privacy: '<strong>Manuscript Privacy:</strong> Extraction, image handling and layout all run on your computer, and your manuscript is never sent anywhere. The software\'s only network connection is when you choose to check for updates in the Info tab. It collects no telemetry and contains no trackers.',
            guide: {
                setup: {
                    title: 'Setup &amp; First Launch',
                    s1Title: 'Download &amp; Extract',
                    s1Desc: 'Download <strong>Book Forge by Max v1.0.1 (Beta).zip</strong> and extract it to any folder. The processing libraries are included, so there is nothing else to install for them.',
                    s2Title: 'Install Node.js',
                    s2Desc: 'If your computer does not have it, get the LTS version from <a href="https://nodejs.org/" target="_blank" rel="noopener noreferrer">nodejs.org</a> and install it with the default settings. Version 22.12 or later is required.',
                    s3Title: 'Open &amp; Start',
                    s3Desc: 'Double-click <strong>Book Forge by Max.exe</strong> to begin.'
                },
                workflow: {
                    title: 'How to Make a Book',
                    s1Title: 'Extract',
                    s1Desc: 'In the <strong>PDF to Markdown</strong> tab, pick or drop a file, choose where to save it, and press <strong>Extract Content</strong>. You get a project folder with Markdown chapters, images and the Translation Bible.',
                    s2Title: 'Edit &amp; Translate',
                    s2Desc: 'Check the chapters, then translate or edit in <code>chapters_translated</code>. Press <strong>Edit Header and Translator Note</strong> to write the page header and the translator\'s note.',
                    s3Title: 'Publish',
                    s3Desc: 'In the <strong>Markdown to PDF</strong> tab, choose the translated or original edition, paper size, margin mode and contents depth. Press <strong>Run QA Audit</strong> to check for problems, then <strong>Publish PDF Book</strong> to create the file.'
                },
                modules: {
                    title: 'The 4 Modules',
                    m1Title: 'PDF to Markdown',
                    m1Desc: 'Turns a PDF with a text layer, or a Markdown file, into a book project:',
                    m1Item1: '<strong>Structure Detection:</strong> Finds chapters and H1, H2, H3 headings from the table of contents, font sizes and heading patterns. Check the result, because accuracy depends on the PDF.',
                    m1Item2: '<strong>Smart chunking:</strong> Split by H1, H1 &amp; H2, or H1, H2 &amp; H3, with a threshold from 15,000 to 40,000 characters. A section with no sub-heading can stay longer.',
                    m1Item3: '<strong>Images &amp; Vectors:</strong> Saves the cover and illustrations to <code>images_original</code> and links them from the chapters.',
                    m1Item4: '<strong>Notes:</strong> Filters page numbers and repeated titles, and rebuilds footnotes as <code>[^1]</code>.',
                    m2Title: 'Markdown to PDF',
                    m2Desc: 'Lays out a project folder or a single <code>.md</code> file as a PDF:',
                    m2Item1: '<strong>Print book (Gutter):</strong> The inner margin is wider than the outer one and flips between odd and even pages for binding.',
                    m2Item2: '<strong>Digital screen (Even):</strong> Equal margins on both sides for reading on a screen.',
                    m2Item3: '<strong>Menu depth:</strong> Printed contents and PDF bookmarks by H1, H1 &amp; H2, or H1, H2 &amp; H3.',
                    m2Item4: '<strong>Lora Font:</strong> Embedded, with full Vietnamese support.',
                    m3Title: 'Header &amp; Translator Note',
                    m3Desc: 'A separate editor for each edition (Translated, Original):',
                    m3Item1: '<strong>Running Header:</strong> Four lines split across the top of the page, with an adjustable width ratio. Leave the left side empty to use the chapter title.',
                    m3Item2: '<strong>Translator\'s Note:</strong> Written in Markdown, placed before the contents when <em>Include translator note</em> is on.',
                    m3Item3: '<strong>Print Preview:</strong> Shows the printed page at your paper size inside the window.',
                    m3Item4: '<strong>Reset to Template:</strong> Returns to the original template when you need it.',
                    m4Title: 'Translation Bible &amp; QA Audit',
                    m4Desc: 'Keeps a translation consistent and catches problems before publishing:',
                    m4Item1: 'Creates <code>Glossary.md</code>, <code>Style-Guide.md</code>, <code>Character-Voice.md</code> and <code>Context-Anchor.md</code>.',
                    m4Item2: '<strong>Errors:</strong> Missing images, a master file that does not match the chapters.',
                    m4Item3: '<strong>Warnings:</strong> Typography errors, unclosed <code>**</code> markers, translations with missing files or different heading, image or paragraph counts.',
                    m4Item4: '<strong>Against the Source PDF:</strong> Warns when the Markdown has under 90% of the PDF\'s words. Needs <code>[Book].pdf</code>, and this step is skipped without it.'
                },
                paperSizes: {
                    title: '9 Paper Sizes',
                    thFormat: 'Size',
                    thDimensions: 'Dimensions',
                    thUse: 'Good for',
                    a6: 'Pocket books, small prints',
                    a5: 'Standard books (default)',
                    b5: 'Textbooks, monographs',
                    a4: 'Documents, reference books',
                    usTrade: 'US trade paperbacks',
                    usLetter: 'North American documents',
                    massMarket: 'Mass-market paperbacks',
                    kindle: 'E-readers',
                    crown: 'Illustrated books'
                },
                tips: {
                    title: 'Usage Tips',
                    t1Title: 'Choose margins by purpose',
                    t1Desc: 'Use <strong>Print book (Gutter)</strong> for printing and binding, because the spine always hides a little of the inner edge. Use <strong>Digital screen (Even)</strong> when the book is only read on a computer or tablet.',
                    t2Title: 'Choose Menu depth by genre',
                    t2Desc: 'Novels work best with <code>H1</code> for a short contents page. Business and self-help books suit <code>H1 &amp; H2</code>. Technical books suit <code>H1, H2 &amp; H3</code> for easy lookup.',
                    t3Title: 'Use the Translation Bible with AI',
                    t3Desc: 'Before sending a chapter to an AI for translation, attach <code>Glossary.md</code> and <code>Style-Guide.md</code> to keep terms and forms of address consistent across the book.',
                    t4Title: 'Keep image paths intact',
                    t4Desc: 'Keep relative links such as <code>![Description](../images_original/fig_01.png)</code>. When publishing, Book Forge centers images and fits them to the page.'
                }
            },
            limits: {
                title: 'Known Limits',
                noticeTitle: '⚠️ What Book Forge Cannot Do Yet',
                noticeScan: '<strong>Scanned PDFs:</strong> Only PDFs with a text layer can be processed. If you cannot select the text in the file, run OCR first.',
                noticeCheck: '<strong>Chapter Detection:</strong> Results depend on how the PDF is laid out, and a chapter can be misidentified or have its title cut short. Check the chapter files before translating.',
                noticeReextract: '<strong>Extracting Again:</strong> All <code>.md</code> files in <code>chapters_original</code> are deleted and rebuilt. <code>chapters_translated</code> is not touched.',
                noticeBeta: '<strong>Beta:</strong> The software is still being finished, so check your PDF before sending it to a printer.'
            },
            requirements: {
                title: 'System Requirements &amp; Launch Guide',
                thComponent: 'Component',
                thMin: 'Minimum (suggested)',
                thRec: 'Recommended (suggested)',
                osName: '<strong>Operating System</strong>',
                osMin: 'Windows 10 (64-bit) Version 1809+',
                osRec: 'Latest Windows 11 (64-bit)',
                cpuName: '<strong>Processor (CPU)</strong>',
                cpuMin: 'Intel Core i3 / AMD Ryzen 3',
                cpuRec: 'Intel Core i5 / AMD Ryzen 5 or better',
                ramName: '<strong>Memory (RAM)</strong>',
                ramMin: '4 GB',
                ramRec: '8 GB or more for books over 300 pages',
                diskName: '<strong>Disk Space</strong>',
                diskMin: '500 MB free (the app takes ~145 MB once extracted)',
                diskRec: '2 GB on an SSD',
                screenName: '<strong>Screen</strong>',
                screenMin: '1280 x 720',
                screenRec: '1920 x 1080 or higher',
                runtimeName: '<strong>Runtime</strong>',
                runtimeMin: '.NET Framework 4.8 &amp; Node.js 22.12+',
                runtimeRec: '.NET Framework 4.8 &amp; latest Node.js LTS',
                browserName: '<strong>Browser</strong>',
                browserMin: 'Microsoft Edge (built into Windows), used to lay out PDFs',
                browserRec: 'Latest Microsoft Edge',
                ramNote: 'The app uses about 50 MB of RAM when open. While publishing a PDF, Node.js and Edge run in the background and use more: about 770 MB in a test with a 60-page book.',
                dataNote: 'Book projects are saved where you choose: next to the source file, in a <code>Book Forge by Max-Files</code> folder, or in a custom folder. Settings are kept in a <code>_BookForgeConfig</code> file next to the exe.',
                smartScreenTitle: 'ℹ️ Windows SmartScreen notice on first launch',
                smartScreenDesc: 'The software is not code-signed, so Windows Defender SmartScreen may display an <em>"Unknown Publisher"</em> prompt. Simply click <strong>More info &rarr; Run anyway</strong> to open it.'
            }
        }
    };

    window.sharedI18n.registerTranslations('vi', vi);
    window.sharedI18n.registerTranslations('en', en);
})();
