# Avisite - Project Plan aur Checklist

Ye file project ka master checklist hai. Har step ke aage [ ] ko [x] karte jao.
Naya session shuru ho to sabse pehle ye file padho aur jahan [ ] bacha ho wahin se aage badho.

## Project ka goal
- SEO-friendly, mobile-friendly, dynamic website
- Main content: tools (PDF, image, video, text) + blog
- Tools zyadatar browser (client-side) mein chalenge, heavy kaam baad mein server pe
- Tech: pure HTML, CSS, JavaScript (koi framework nahi, koi database nahi abhi)
- Blog: har post ek alag HTML file
- Website ka content (text, blog, tools) English mein hi rahega. Ye plan file Hinglish mein hai, sirf aapke liye.

## Folder structure (final target)
```
avisite/
  index.html              (home page)
  tools/
    index.html            (tools listing)
    compress-pdf.html
    merge-pdf.html
    image-compressor.html
    image-to-pdf.html
  blog/
    index.html            (blog listing)
    how-to-compress-pdf.html
  css/
    style.css
  js/
    main.js               (common JS: menu, theme)
    tools/                (har tool ki alag JS file)
  about.html
  contact.html
  privacy-policy.html
  terms.html
  404.html
  sitemap.xml
  robots.txt
  PLAN.md
```

---

## Phase 0: Setup
- [x] Project folders banaye (css, js, tools, blog)
- [ ] Final domain name decide karo (Avisite: avisite.com / avisite.in check karna) (.com ya .in)
- [ ] Free hosting chuno (GitHub Pages / Netlify / Cloudflare Pages)
- [ ] Git repository banao aur folder push karo

## Phase 1: Design system (pehle yahi banao)
- [x] Color palette fix karo (1 primary, 1 accent, neutrals, background)
- [x] Font chuno (max 2, Google Fonts se, `font-display: swap`)
- [x] 8px spacing system define karo (CSS variables mein)
- [x] Border radius aur shadow tokens banao
- [x] Dark mode variables banao (optional, baad mein bhi ho sakta hai)
- [x] `css/style.css` mein base styles: reset, body, typography, buttons, cards

## Phase 2: Layout components
- [x] Header (logo + navigation)
- [x] Mobile hamburger menu (44px touch target)
- [x] Footer (links: About, Contact, Privacy, Terms)
- [ ] Breadcrumbs component
- [ ] Tool card component (grid mein dikhane ke liye)
- [ ] Blog card component
- [ ] Reusable FAQ accordion
- [ ] Mobile-first test: 375px width par sab sahi dikhe, horizontal scroll na ho

## Phase 3: Common pages
- [x] `index.html` - home (hero, popular tools grid, latest blog, trust section)
- [x] `tools/index.html` - sabhi tools ki listing
- [x] `blog/index.html` - blog listing (abhi koi post nahi, "Coming soon" card hai)
- [ ] `about.html`
- [ ] `contact.html`
- [ ] `privacy-policy.html` (clearly likho: files device se bahar nahi jaati)
- [ ] `terms.html`
- [ ] `404.html`

## Phase 4: Tools (ek ek karke, MVP order)
Har tool ka template same rahega:
1. Drop zone (desktop drag-drop, mobile tap to select)
2. Options panel
3. Process button + progress
4. Preview (jahan possible ho)
5. Download button + "files browser mein hi process hoti hain" note
6. Neeche: "Kaise use karein" (3-5 steps), FAQ (3-5), 300+ words ka useful text

Tools ka order:
- [ ] 4.1 Image compressor (Canvas API) - `tools/image-compressor.html`
- [ ] 4.2 Image to PDF (pdf-lib) - `tools/image-to-pdf.html`
- [ ] 4.3 PDF merge (pdf-lib) - `tools/merge-pdf.html`
- [ ] 4.4 PDF compress / split (pdf-lib) - `tools/compress-pdf.html`
- [ ] 4.5 PDF rotate / page extract
- [ ] 4.6 Text / word counter, JSON formatter (easy, quick wins)
- [ ] 4.7 Baad mein: video compress, PDF to Word (server-side, abhi nahi)

Har tool ke liye:
- [ ] HTML page ready
- [ ] JS file `js/tools/<name>.js` likhi
- [ ] Mobile par test kiya
- [ ] Error handling (galat file, bahut badi file) dikhaya
- [ ] File size limit set ki
- [ ] Title, meta description, H1, FAQ, JSON-LD (SoftwareApplication) add kiya

## Phase 4B: Quiz tool (JSON based, timer, local history)
- [x] quiz/index.html - quiz landing page (SEO text, steps, FAQ)
- [x] quiz/prompt.html - copy-able prompt page (PDF se JSON banwane ke liye, ChatGPT/Claude ke liye)
- [x] quiz/start.html - JSON upload, validation, mode/options, "Start" button
- [x] JSON schema fix karo: quizTitle, timeLimitMinutes, questions[{id, question, options(4), answerIndex(0-3), explanation}]
- [x] Validation: galat JSON par clear error message (js/quiz/validate.js)
- [x] Quiz engine: timer (total time), auto-submit, progress bar, next/previous, skip (js/quiz/engine.js, quiz/play.html)
- [x] Shuffle questions aur options (optional toggle)
- [ ] Do mode chunne ka option (start screen par):
  - [ ] Practice mode: har answer ke baad turant sahi/galat highlight, sahi answer dikhe, achhe jawab par appreciation message, galat par encouragement message ("Next time dhyan do"), explanation turant dikhe. Timer optional.
  - [ ] Exam mode (fully exam based): jawab dene ke baad tak koi feedback nahi
- [ ] Exam mode details:
- [x] Question palette: har question ka status dikhe (answered / not answered / marked for review / not visited)
- [x] Mark for review aur "answer + review" option
- [x] Timer warning (last 5 min par color change) aur time khatam hone par auto-submit
- [x] Submit confirmation dialog (kitne answered, kitne unanswered dikhaye)
- [x] Negative marking option: user start screen par decide kare (off / on), aur penalty value set kare (jaise -0.25 ya -0.33 per wrong answer)
- [x] Attempt summary: attempted, correct, wrong, unattempted, accuracy %, final score (negative marks ke saath)
- [ ] Keyboard shortcut (1-4 keys) aur mobile buttons 44px
- [x] Result screen (exam mode): score, time taken, aur review jisme har question ka apna answer, sahi answer, aur sahi/galat status dikhe
- [x] Retry (wrong-answers-only retry abhi nahi)
- [x] Local history localStorage (completed tests) mein: date, score, time, status (completed / in progress)
- [x] Resume: beech mein band hone par progress wapas load (confirm prompt)
- [ ] Export history (JSON download) aur Import history
- [ ] Clear history option with confirmation
- [ ] Mobile test (375px) aur Chrome/Safari test

## Phase 5: Blog
- [ ] Blog post template HTML banaya (`blog/_template.html`)
- [ ] Keyword research kiya (har post ke liye ek primary keyword)
- [ ] Post 1: `how-to-compress-pdf.html`
- [ ] Post 2: image compress guide
- [ ] Post 3: PDF merge guide
- [ ] Har post mein: title, description, H1, date, reading time, JSON-LD (Article), related tool link
- [ ] Blog listing `blog/index.html` mein sabhi posts ke links
- [ ] Har post ko tool page se link kiya aur tool ko post se

Target: hafte mein 2-3 posts.

## Phase 6: SEO (har page par check karo)
- [ ] Har page ka unique `<title>` (50-60 characters, keyword pehle)
- [ ] Har page ki meta description (150-160 characters)
- [ ] Har page par ek hi H1
- [ ] Clean URLs (`/tools/compress-pdf`), hyphen se separate
- [ ] Canonical tag har page par
- [ ] Open Graph tags (og:title, og:description, og:image)
- [ ] JSON-LD: tools = SoftwareApplication, blog = Article, FAQ = FAQPage
- [ ] Images: alt text, WebP, `loading="lazy"`
- [ ] Internal links: blog <-> tools
- [ ] Breadcrumbs
- [ ] `sitemap.xml` banaya
- [ ] `robots.txt` banaya (sitemap ka link ke saath)
- [ ] 404 page

## Phase 7: Performance aur mobile
- [ ] JS sirf us page par load ho jahan zaroorat ho (tool JS sirf tool page par)
- [ ] CSS ek file mein, unused CSS hataya
- [ ] Images compress ki
- [ ] PageSpeed Insights mein mobile score 90+
- [ ] Core Web Vitals green (LCP, CLS, INP)
- [ ] Google Mobile-Friendly Test pass
- [ ] Har page par `<meta name="viewport">` hai

## Phase 8: Legal aur AdSense (agar ads lagane hain)
- [ ] Privacy policy complete
- [ ] Terms of use complete
- [ ] About aur Contact page mein real info
- [ ] Kam se kam 15-20 achhe content pages/posts hone ke baad AdSense apply karo

## Phase 9: Analytics aur indexing
- [ ] Google Search Console mein site add aur verify
- [ ] sitemap.xml submit
- [ ] Har naye post par "Request indexing" (URL Inspection)
- [ ] Google Analytics 4 lagaya
- [ ] Mahine mein ek baar check: kaunsa page traffic la raha hai

## Phase 10: Launch
- [ ] Sab links test kiye (broken links nahi)
- [ ] Sab tools ek baar test kiye (real files se)
- [ ] Mobile par Chrome aur Safari dono mein test
- [ ] Hosting par deploy kiya
- [ ] Custom domain connect kiya, HTTPS on hai

## Phase 11: Maintenance (ongoing)
- [ ] Hafte mein 2-3 blog posts
- [ ] Har mahine tools ko improve karo based on analytics
- [ ] Backlinks: forums, Reddit, Quora, relevant blogs par useful answers ke saath
- [ ] Search Console errors check karo

---

## Progress log
- 2026-11-02: Time guide: start page par recommended time difficulty se aata hai (easy 30 sec, medium 1 min, hard 2 min per question). Auto-fill hota hai, user change kar sakta hai, aur 'Use recommended time' button se wapas aa jaata hai.
- 2026-11-02: Bug fixes: (1) highlighted options/feedback ka text dark mode mein invisible tha, ab explicit dark text hai. (2) Palette ab practice mein sahi=green, galat=red dikhata hai; exam mein neutral violet; unanswered grey; marked = amber ring. (3) Result page par bhi question map hai (click karne par review par scroll). (4) Question ID ab system text se banata hai, duplicate apne aap pakdta hai. (5) Question bank ko 'Download my question bank (.json)' se computer par save kar sakte ho, wahi file dobara upload ho sakti hai.
- 2026-11-02: Prompt ab AI se downloadable quiz-pages-FROM-TO.json file maangta hai (agar AI file bana sake). Start page par 'Paste the JSON text instead' option jod diya, taaki download na ho to bhi JSON text paste karke bank mein add ho sake.
- 2026-11-02: Prompt page ab From page, To page aur Number of questions input leta hai, aur prompt apne aap banta hai (copy button ke saath).
- 2026-11-02: Question bank system: start page ab multiple JSON files leta hai, sab questions localStorage ki bank mein jaate hain (duplicate skip), topic-wise checkbox, number of questions aur minutes. Test ke questions topic-wise balance (round-robin) se system chunta hai. Prompt ab topic aur difficulty (easy/medium/hard) maangta hai aur jitne ho sake utne questions.
- 2026-11-02: Site se connect: navigation aur footer mein Quiz link sab pages par, home page par Study quizzes section, tools listing par Study tools section, quiz/index.html hub page.
- 2026-11-02: Bug fix: global [hidden] rule (author CSS hidden attribute ko override kar rahe the).
- 2026-11-02: Quiz engine complete: quiz/play.html + js/quiz/engine.js + quiz CSS. Practice aur exam mode, timer, palette, mark for review, negative marking, resume, history (localStorage). Pending: history ka separate page, export/import, clear history, mobile/browser testing, wrong-only retry.
- 2026-11-02: Quiz part 1 ready: quiz/prompt.html (copy prompt), quiz/start.html (upload, validation, mode, timer/shuffle/negative marking options), js/quiz/validate.js, js/quiz/prompt.js, js/quiz/start.js, quiz/sample-quiz.json (testing ke liye). Quiz engine quiz/play.html abhi pending hai (start button wahan le jaata hai).
- 2026-11-02: Quiz do mode mein decide hua: Practice mode (turant feedback, appreciation/encouragement) aur Exam mode (score last mein, full review).
- 2026-11-02: Quiz ko exam-style decide hua: exam mode default, question palette, mark for review, timer warning, submit confirmation, optional negative marking (user decide karega).
- 2026-11-02: Quiz tool (Phase 4B) plan mein add hua. Design: JSON format, prompt page, upload + validation, timer, localStorage history, export/import.
- 2026-11-02: tools/index.html aur blog/index.html English mein bane. Pending: home page ka 'How to compress a PDF' link tab tak 404 dega jab tak post file na bane.
- 2026-11-02: Phase 3 home page (index.html) English mein complete: hero, popular tools (4), latest guides, trust section. Tools aur blog ke links abhi placeholder hain jab tak un pages ka kaam na ho.
- 2026-11-02: Plan banaya, project folders banaye (css, js, tools, blog).
- 2026-11-02: Naam Avisite fix hua, folder avisite/ rename hua.
- 2026-11-02: Phase 1 complete: css/style.css (design tokens, reset, typography, buttons, header/nav/footer CSS, cards, forms, FAQ, breadcrumbs, dark mode, mobile-first breakpoints 768px/1024px). 
- 2026-11-02: Phase 2 partial: header, mobile menu (js/main.js), footer ready in index.html. Breadcrumbs/cards/FAQ ka HTML baad mein. | Agla: index.html ka home content (Phase 3), phir baaki common pages

### Har step ke baad yahan entry jodni hai
Format: `- YYYY-MM-DD: kya complete hua | agla step`

## Agla step
Quiz bank ko browser mein test karna. Phir history page, export/import, clear history. Phir Phase 4 (Image Compressor).

## Purana note: Quiz engine: quiz/play.html + js/quiz/engine.js (sessionStorage se settings padhe, practice/exam logic, timer, result, history).

## Purana note
Phase 3 ke baaki pages (about, contact, privacy, terms, 404) banao. Phir Phase 4 mein pehla tool: image compressor. Header/footer index.html se copy karna hai. Mobile par menu test pending hai.
