---
title: "Building This Blog as Code: Astro, GitHub Pages, and Google Analytics"
description: >
  Why I treat my blog like a software project — and why I wired in analytics
  before the first reader ever arrived.
date: "2026-06-22"
type: feat
categories: [Astro, Analytics, Web]
---

First post. Before I write about anything else, a quick note on how this blog is
built — because the way I publish is itself part of what I want to show.

## Why not a hosted platform?

Plenty of great hosted blogging platforms exist, and they're a perfectly fine
choice. I went a different route on purpose. My core strengths are **coding** and
**analytics**, so I wanted the way I publish to be evidence of that, not just a
place to talk about it. Instead of a hosted editor, this site is a small software
project:

- **Astro** turns plain Markdown into a clean, fast website — static HTML by
  default, with interactive components dropped in only where a post actually needs
  them. No database, no plugins to keep patched — just text files I can version
  and diff.
- **GitHub** stores the source. Every change is a commit with a message, so the
  blog has a full history.
- **GitHub Actions** rebuilds and deploys the site automatically every time I
  push. I never click "publish" — `git push` *is* publishing.
- **GitHub Pages** hosts it for free.

Writing a post is now the same motion as shipping code: edit a Markdown file,
commit, push, and ~60 seconds later it's live.

## Measuring from day one

I wired in **Google Analytics 4** before the first reader ever arrived, with a
lightweight cookie-consent banner so it's transparent about tracking.

Practicing analytics on something I actually own — watching which posts get read,
where readers come from, how the links between my profiles perform — is a far
better way to learn the tooling than studying it in the abstract.

## What's coming

Each week I'll post about one of three things:

1. **The work** — what I'm building and shipping (in general terms where I need to
   respect confidentiality).
2. **What I'm learning** — analytics, AI tooling, and the craft of building for
   the web.
3. **The reading** — interesting things from industry sources like eMarketer,
   Moz, and AdAge that change how I think about digital.

If you're here, welcome. New post every week.
