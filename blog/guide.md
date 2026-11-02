# Avisite: Blog aur Tool Add karne ka Guide

Ye file sirf aapke reference ke liye hai. Ise site par publish nahi kiya jaata.

## 1. Naya blog post add karna

1. `_posts/` folder mein ek nayi file banao. Naam aisa ho:
   `YYYY-MM-DD-post-ka-naam.md`
   Example: `2026-11-03-aadhaar-pdf-guide.md`

2. File ke sabse upar ye front matter likho (`---` ke beech):

```
---
layout: post
title: "Post ka poora title"
short_title: "Chhota title (breadcrumb ke liye)"
description: "Google par dikhne wala 1-2 line ka description"
date: 2026-11-03
minutes: 4
permalink: /blog/post-ka-naam.html
cta_title: "Neeche ke card ka title"
cta_text: "Ek line ka text"
cta_href: /tools/compress-pdf.html
cta_label: "Button ka text"
---
```

3. Front matter ke neeche post ka text Markdown mein likho:
   - `## Heading` se section banta hai
   - `**bold**` se bold text
   - `[text](/tools/compress-pdf.html)` se link
   - `- item` se list

4. Save / commit karo. Blog listing, home page ki "Latest guides", aur sitemap apne aap update ho jaate hain.

**Rules:**
- `permalink` ka naam URL mein use hota hai, to ise short aur English mein rakho (jaise `pdf-size-kaise-kam-karein`).
- `permalink` har post ke liye alag hona chahiye.
- `description` 150 characters ke aas-paas rakho.

## 2. Naya tool add karna

1. Tool ki HTML page banao, jaise `tools/naya-tool.html`. Iske liye `tools/image-compressor.html` ko copy karke shuru karo:
   - `<title>`, `<meta name="description">`, canonical URL badlo
   - Tool ka UI, FAQ aur text badlo
   - JSON-LD (`SoftwareApplication`) mein naam badlo

2. Tool ka JavaScript `js/tools/naya-tool.js` mein rakho, aur HTML ke andar `<script src>` se load karo.

3. `_data/tools.yml` kholo, aur sahi group mein ek entry jodo:

```
      - title: Naya Tool
        url: /tools/naya-tool.html
        icon: "🆕"
        text: Tool ka ek line ka description.
```

4. Agar naya group chahiye, to `groups:` ke neeche naya `- name:` block jodo.

## 3. Jo cheez alag se update karni hai

- **Service worker cache**: `sw.js` mein `CACHE_NAME` ka version badlo (jaise `avisite-v1` se `avisite-v2`), taaki users ko naya content jaldi mile. Naye tool ki JS file bhi `CORE_ASSETS` list mein jodo.
- **Contact email**: `contact.html` mein `[YOUR-EMAIL@example.com]` ko asli email se badlo.
- **Date**: `privacy-policy.html` aur `terms.html` ki "Last updated" date badlo, jab bhi text change ho.

## 4. Check karna ki sab theek hai

1. Commit ke 1-3 minute baad GitHub repo ke **Actions** tab mein check karo ki build green hai.
2. Build red ho to error message copy karke AI ya developer ko bhejo.
3. Live site par naya post aur tool khol kar check karo: list mein dikhta hai, link khulta hai, mobile par theek hai.

## 5. Kaam ki cheezein

| Kaam | File / Folder |
|---|---|
| Blog post | `_posts/` |
| Tool list | `_data/tools.yml` |
| Tool page | `tools/` |
| Tool JS | `js/tools/` |
| Quiz | `quiz/` aur `js/quiz/` |
| Style / colors | `css/style.css` (`:root` ke variables) |
| Site ka header/footer | har HTML page mein alag-alag hai, badalna ho to sab jagah badlein |
| Install / offline | `manifest.json`, `sw.js` |

## 6. Kab kisi se poochna hai

- Build fail ho, aur error samajh na aaye
- Naya tool jo JavaScript se bada ho
- Design ya layout badalna ho
- Koi bhi file galti se delete ho jaaye (GitHub par history se wapas laa sakte hain)
