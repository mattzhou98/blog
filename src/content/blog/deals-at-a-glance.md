---
title: "Adding Competitor Deals to the Market Intelligence Platform"
description: "The platform now tracks the move-in deals nearby communities are running, sorts each one by type, and shows how long it's been up, so managers can see the offers they're up against"
date: "2026-07-17"
type: feat
categories: ["Internship", "Digital Summer Clinic"]
---

About a month into my internship at **tour.video / LeaseMagnets**, I'm still working on the
same market intelligence platform, the tool that shows property managers how they compare to
nearby competitors. Last time I added their reviews. This time it's the deals.

Apartment communities run move-in specials all the time: a month of free rent, a waived
application fee, a gift card for signing by the end of the month. If a competitor down the
street is giving away a month's rent and you aren't, that's something you want to know before
you lose a lease over it. The catch is that these offers are buried on property websites and
worded a hundred different ways, so tracking them by hand isn't realistic.

So the platform now pulls those specials in on its own and sorts each one into a plain
category, like rent discount, waived fee, or gift card, so a manager can look at a competitor
and see what kind of deal they're running without reading the fine print. The sorting is done
by a language model that reads the offer and picks the category that's actually worth the most
to a renter, since one special often counts as a few things at once.

I also added a start date to each deal, which turned out to be trickier than it sounds.
Communities reword the same special over and over ("one month free" becomes "1 month free!"),
and I didn't want a small wording change to look like a brand-new offer. So there's a step that
recognizes when two differently-worded specials are really the same deal and keeps the original
date. Now you can see not just what a competitor is offering, but how long they've been
offering it, and a deal that's been up for two months usually means they're having trouble
filling units. More soon.
