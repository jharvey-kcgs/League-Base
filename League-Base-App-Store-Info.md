# League Base — App Store Connect / TestFlight Reference

Everything below is written to be copy-pasted directly into the relevant
App Store Connect fields once your account is active. Edit freely — this
is a starting point, not a final draft you're locked into.

---

## 1. Basic App Information

**App Name**
```
League Base
```

**Subtitle** (30 characters max — App Store only, optional for TestFlight)
```
LoL Esports Companion
```
(29 characters)

**SKU** (an internal identifier only you see — any unique string works)
```
leaguebase-2026-001
```

**Primary Language**
```
English (U.S.)
```

**Bundle ID**
```
com.JHarvey.LeagueBase
```
(This should already be selectable in App Store Connect once your Apple
Developer account and Xcode/EAS have registered it — matches what's in
app.json.)

---

## 2. Beta App Description (TestFlight — shown to testers, not the public)

This is what your friends actually see in the TestFlight app before installing:

```
League Base is a personal companion app for League of Legends esports —
LCS, LEC, LCK, LPL, CBLOL, and LCP all in one place. Pick a favorite team
and the whole app themes itself around them: colors, accents, everything.

From there, browse any region to see standings, upcoming and recent
matches, full rosters, and VOD links pulled straight from lolesports.com's
own public data. LCP even gets a real Swiss-stage bracket showing who's
locked into playoffs and who's been eliminated.

This is an early build — appreciate any bugs, confusing screens, or "this
should really do X" feedback you run into. Shake your phone or use
TestFlight's "Send Beta Feedback" to send a report directly, screenshot
included.
```

---

## 3. What to Test (per-build notes — update this each time you submit a new build)

This is the one field you'll actually revisit for every future build, not
just the first one. First-build version:

```
First build! A few things worth specifically trying:

- Pick a favorite team during onboarding — confirm the app's colors/theme
  update to match
- Browse a couple of different regions from the hamburger menu
- Open a team page and check Record, Upcoming/Recent Games, Roster, and
  VODs all load
- Try both Light and Dark mode (Settings > Theme)
- If anything crashes or looks broken, TestFlight's feedback button is
  the fastest way to report it
```

---

## 4. Full App Description (App Store listing — only needed if this ever goes
public; not required for TestFlight-only distribution, but good to have
ready)

```
League Base is a companion app for League of Legends esports fans who
want everything about their favorite region and team in one place, built
around real official data rather than a generic scores widget.

FOLLOW YOUR TEAM
Pick a favorite team from LCS, LEC, LCK, LPL, CBLOL, or LCP, and the app
themes itself around them — colors, accents, the works. See their full
roster, current record, upcoming and recent matches, and VOD links,
without digging through a dozen tabs.

BROWSE ANY REGION
Every region gets its own standings table, match schedule, and team
directory. Following a Swiss-format region like LCP? See the real
bracket — who's locked into playoffs, who's been eliminated, and
everything in between.

BUILT ON REAL DATA
Match schedules, results, standings, and VODs come from lolesports.com's
own public data. No account, no login, no ads, no tracking — just
League of Legends esports, organized the way a fan actually wants to
browse it.
```

---

## 5. App Privacy (the "Privacy Nutrition Label" questionnaire)

This app has an unusually simple answer here, worth knowing going in:
**League Base collects no user data at all.** No accounts, no analytics,
no backend, no network requests that send anything about you anywhere.
The only thing stored is your favorite team and theme preference, saved
locally on your own device (AsyncStorage) — never transmitted anywhere.

When App Store Connect's privacy questionnaire asks "Do you or your
third-party partners collect data from this app?", the honest answer is
**No**. That collapses nearly the entire rest of that section automatically.

---

## 6. Support URL / Contact / Marketing URL

**Contact email**:
```
JHarvey.appdeveloper@gmail.com
```

**Support URL**:
```
https://github.com/jharvey-kcgs/League-Base
```
Confirmed public and viewable without sign-in, so this should satisfy
Apple's requirement. One thing worth doing before submitting, though: the
README on GitHub is currently noticeably behind the real, working app —
it still describes CBLOL/LCP as not-yet-added, VODs as not-yet-built, and
TestFlight as "hasn't come up yet." Push your latest local commits before
pointing reviewers (or anyone else) at this link, so what they see
actually matches what's really in the app.

**Marketing URL**: same GitHub link works here too if App Store Connect
asks for one separately — no need for a second page.

---

## 7. Age Rating / Content

League of Legends esports content, no user-generated content, no
in-app purchases, no ads. Should qualify for the lowest available age
rating tier (4+) when App Store Connect's content questionnaire asks —
answer "No" to violence, gambling-adjacent mechanics, user-generated
content, etc., since none of that applies here.

---

## 8. Category

**Primary**: Sports
**Secondary** (optional): Entertainment
