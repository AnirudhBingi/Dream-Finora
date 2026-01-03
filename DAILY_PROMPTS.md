# Daily Command Prompts

## Quick Reference

Copy and paste these prompts to me at the start and end of each day. This ensures all documentation stays updated and organized.

---

## 🌅 START OF DAY PROMPT

Copy this and paste it to me when you start working:

```
START OF DAY - Day XX

Please:
1. Review my progress from yesterday (check `docs/DAILY_LOGS/DAY_YY.md`)
2. Check if there are any unresolved issues in docs/ISSUES/
3. Update `docs/DAILY_LOGS/DAY_0XX.md` with today's goals:
   - If Day 1-40: from DEVELOPMENT_ROADMAP.md
   - If Day 41+: from DEVELOPMENT_ROADMAP_COMPREHENSIVE.md
4. Check docs/PROGRESS.md and tell me current project status
5. Show me today's planned tasks:
   - If Day 1-40: from DEVELOPMENT_ROADMAP.md
   - If Day 41+: from DEVELOPMENT_ROADMAP_COMPREHENSIVE.md
6. Check for any blockers from yesterday that need attention
7. Confirm all documentation is in order
8. If today involves UI work, remind me to reference SOP/UI_UX_DESIGN_GUIDE.md
9. If today involves feature implementation, remind me to reference SOP/FEATURE_SPECIFICATIONS.md
```

**Important:** Our daily log filenames are zero-padded: Day 1 = `DAY_01.md`, Day 2 = `DAY_02.md`, etc.  
Fill in: `XX` = today, `YY` = yesterday.

---

## 🌇 END OF DAY PROMPT

Copy this and paste it to me when you finish working:

```
END OF DAY - Day XX

Please:
1. Review what I accomplished today
2. Update `docs/DAILY_LOGS/DAY_0XX.md` with:
   - All completed tasks
   - Any issues encountered (create issue docs if significant)
   - Solutions found
   - Decisions made (create ADR if significant)
   - Time spent
   - Code changes summary
   - Tomorrow's goals
   - Cross-check: what we planned vs what we did:
     * If Day 1-40: from DEVELOPMENT_ROADMAP.md Day XX section
     * If Day 41+: from DEVELOPMENT_ROADMAP_COMPREHENSIVE.md Day XX section
3. Update docs/PROGRESS.md with progress made
4. Update docs/CHANGELOG.md if there were significant changes
5. Create ISSUE docs for any bugs/problems encountered
6. Create ADR docs for any significant decisions made
7. Review all open issues and suggest fixes
8. Give me a summary of today's progress
9. List any blockers or concerns
10. Confirm everything is documented and committed
```

---

## 🔧 DURING DEVELOPMENT PROMPT

Use this when you encounter a problem:

```
I ENCOUNTERED AN ISSUE:

[Describe the issue]
- What I was trying to do:
- What went wrong:
- Error message: [paste error]
- What I've tried:
```

---

## 📋 WEEKLY REVIEW PROMPT

Use this at the end of each week:

```
WEEKLY REVIEW - Week X

Please:
1. Summarize progress from this week (all daily logs)
2. List all issues resolved
3. List all decisions made
4. Update docs/PROGRESS.md with week's achievements
5. Identify patterns in issues/blockers
6. Suggest improvements for next week
7. Show velocity (features completed, issues resolved)
8. Highlight any risks or concerns
```

---

## 🐛 ISSUE PROMPT

Use this when you need to document a bug:

```
DOCUMENT ISSUE:

Issue: [Brief description]
Category: Bug / Blocker / Performance / Configuration
Priority: High / Medium / Low
Error: [Paste error message]
What I was doing: [Describe]
```

---

## 💡 DECISION PROMPT

Use this when you need to document a significant decision:

```
DOCUMENT DECISION:

Decision: [What are you deciding about?]
Options: [List options you're considering]
Context: [Why do you need to decide?]
```

---

## 📊 STATUS CHECK PROMPT

Use this anytime to check project status:

```
STATUS CHECK

Please show me:
1. Current day and phase
2. Progress percentage
3. Open issues
4. Recent decisions
5. Blockers
6. Next steps
```

---

## 🎯 QUICK START GUIDE

### First Time Setup
1. Start Day 1 with: **START OF DAY - Day 01**
2. Work through tasks
3. End with: **END OF DAY - Day 01**

### Regular Days
1. Morning: Use **START OF DAY** prompt
2. If stuck: Use **ISSUE PROMPT**
3. If deciding: Use **DECISION PROMPT**
4. Evening: Use **END OF DAY** prompt

**Note:** 
- Days 1-40 use `DEVELOPMENT_ROADMAP.md` (already completed)
- Days 41+ use `DEVELOPMENT_ROADMAP_COMPREHENSIVE.md` (current roadmap)
- See `ROADMAP_SUMMARY.md` for quick overview of comprehensive roadmap

### Weekly
- Friday evening: Use **WEEKLY REVIEW** prompt

---

## 📝 Notes

- Always use the exact prompts above (copy/paste)
- Fill in Day XX with actual day number (zero-padded: DAY_01, DAY_02, etc.)
- Days 1-40: Reference `DEVELOPMENT_ROADMAP.md` (completed)
- Days 41+: Reference `DEVELOPMENT_ROADMAP_COMPREHENSIVE.md` (current)
- Be specific in your descriptions
- Include error messages when reporting issues
- I'll handle all documentation updates automatically

## 📚 Key Reference Documents

- **Current Roadmap:** `DEVELOPMENT_ROADMAP_COMPREHENSIVE.md` (Days 41-110)
- **Historical Roadmap:** `DEVELOPMENT_ROADMAP.md` (Days 1-40, completed)
- **Quick Overview:** `ROADMAP_SUMMARY.md`
- **Feature Specs:** `SOP/FEATURE_SPECIFICATIONS.md`
- **UI/UX Guide:** `SOP/UI_UX_DESIGN_GUIDE.md`
- **Progress:** `docs/PROGRESS.md`

---

**Remember: Just copy the prompts and paste them to me. I'll handle the rest!**

