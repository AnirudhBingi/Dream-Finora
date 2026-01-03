# Daily Command Prompts

## Quick Reference

**These prompts are instructions for the AI assistant.** Simply type them when you start or finish work. The AI will handle all documentation updates automatically.

---

## 🌅 START OF DAY PROMPT

When the user sends you "START OF DAY - Day XX", you should:

```
START OF DAY - Day XX

When you receive this prompt, automatically:

1. Review yesterday's progress by reading `docs/DAILY_LOGS/DAY_YY.md` (where YY = yesterday's day number)

2. Check for unresolved issues by reviewing files in `docs/ISSUES/` directory

3. Read today's goals from the appropriate roadmap:
   - If Day 1-40: Read from `SOP/DEVELOPMENT_ROADMAP.md`
   - If Day 41+: Read from `SOP/DEVELOPMENT_ROADMAP_COMPREHENSIVE.md`
   
4. Create or update `docs/DAILY_LOGS/DAY_0XX.md` (zero-padded) with:
   - Today's date
   - Goals extracted from the roadmap
   - Status: 🟡 IN PROGRESS

5. Read `docs/PROGRESS.md` and provide a summary of current project status

6. Present today's planned tasks from the roadmap in a clear, organized format

7. Identify any blockers mentioned in yesterday's log that need attention

8. Verify documentation structure is in order

9. Check today's tasks and proactively remind about relevant SOP docs:
   - If UI work is involved: Mention "Remember to reference SOP/UI_UX_DESIGN_GUIDE.md"
   - If feature implementation: Mention "Remember to reference SOP/FEATURE_SPECIFICATIONS.md"
   - If database work: Mention "Reference SOP/DATABASE_SETUP.md if needed"
   - If technical decisions: Mention "Reference SOP/TECHNICAL_ROADMAP.md if needed"

10. Provide a clear, actionable summary to get started
```

**Note:** Daily log filenames are zero-padded: Day 1 = `DAY_01.md`, Day 69 = `DAY_69.md`, etc.

---

## 🌇 END OF DAY PROMPT

When the user sends you "END OF DAY - Day XX", you should:

```
END OF DAY - Day XX

When you receive this prompt, automatically:

1. Review the conversation history to identify what was accomplished today

2. Update `docs/DAILY_LOGS/DAY_0XX.md` (zero-padded) with:
   - Change status from 🟡 IN PROGRESS to ✅ COMPLETED (or ❌ BLOCKED if applicable)
   - Mark completed tasks with checkboxes [x]
   - Document all completed tasks in detail
   - List any issues encountered (create new files in docs/ISSUES/ if significant)
   - Document solutions found during the day
   - Note any decisions made (create ADR in docs/DECISIONS/ if significant)
   - Ask user for time spent (if not already mentioned)
   - Summarize code changes (files modified, new files created)
   - Extract tomorrow's goals from roadmap
   - Cross-check completed work against roadmap:
     * If Day 1-40: Compare with SOP/DEVELOPMENT_ROADMAP.md Day XX section
     * If Day 41+: Compare with SOP/DEVELOPMENT_ROADMAP_COMPREHENSIVE.md Day XX section

3. Update roadmap checkmarks in the appropriate roadmap file:
   - Read the Day XX section from the roadmap (SOP/DEVELOPMENT_ROADMAP.md for Days 1-40, SOP/DEVELOPMENT_ROADMAP_COMPREHENSIVE.md for Days 41+)
   - Mark ALL completed tasks with [x] checkmarks
   - Add ✅ symbols to completed checklist items
   - Update status indicators (✅ COMPLETED, 🟡 IN PROGRESS, etc.) if applicable
   - Ensure backend tasks, mobile tasks, and checklist items are all marked appropriately
   - This ensures the roadmap accurately reflects what has been implemented

4. Update `docs/PROGRESS.md`:
   - Mark the current day as completed
   - Update progress percentages if applicable
   - Add any new features completed to the feature list

5. Update `docs/CHANGELOG.md` if there were significant changes:
   - New features added
   - Breaking changes
   - Major bug fixes
   - Important updates

6. Create issue documentation in `docs/ISSUES/` for any bugs or problems encountered:
   - Use ISSUE-XXX naming format
   - Follow the template structure
   - Include reproduction steps and solutions

7. Create ADR (Architecture Decision Record) in `docs/DECISIONS/` for significant decisions:
   - Use ADR-XXX naming format
   - Document context, decision, and consequences

8. Review all open issues in `docs/ISSUES/` and suggest fixes or next steps

9. Provide a comprehensive summary including:
   - What was accomplished
   - Key achievements
   - Progress made
   - Any blockers or concerns

10. List blockers or concerns that need attention tomorrow

11. Confirm all documentation has been updated (daily log, progress, roadmap checkmarks) and remind user to commit changes
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
- Days 1-40 use `SOP/DEVELOPMENT_ROADMAP.md` (already completed)
- Days 41+ use `SOP/DEVELOPMENT_ROADMAP_COMPREHENSIVE.md` (current roadmap)
- See `ROADMAP_SUMMARY.md` for quick overview of comprehensive roadmap

### Weekly
- Friday evening: Use **WEEKLY REVIEW** prompt

---

## 📝 Notes

- Always use the exact prompts above (copy/paste)
- Fill in Day XX with actual day number (zero-padded: DAY_01, DAY_02, etc.)
- Days 1-40: Reference `SOP/DEVELOPMENT_ROADMAP.md` (completed)
- Days 41+: Reference `SOP/DEVELOPMENT_ROADMAP_COMPREHENSIVE.md` (current)
- Be specific in your descriptions
- Include error messages when reporting issues
- I'll handle all documentation updates automatically

## 📚 Key Reference Documents

- **Current Roadmap:** `SOP/DEVELOPMENT_ROADMAP_COMPREHENSIVE.md` (Days 41-110)
- **Historical Roadmap:** `SOP/DEVELOPMENT_ROADMAP.md` (Days 1-40, completed)
- **Quick Overview:** `ROADMAP_SUMMARY.md`
- **Feature Specs:** `SOP/FEATURE_SPECIFICATIONS.md`
- **UI/UX Guide:** `SOP/UI_UX_DESIGN_GUIDE.md`
- **Progress:** `docs/PROGRESS.md`

---

**Remember: These are instructions for the AI assistant. You just need to type the simple prompt (e.g., "START OF DAY - Day 69") and the AI will handle everything!**

