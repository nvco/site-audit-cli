---
allowed-tools: Bash(git *:*)
description: Git commit workflow - stage changes, update changelog, and commit everything together
---

# Automated Git Commit Workflow

Please perform the complete git commit workflow for this project:

## Step 1: Analyze Current Changes
First, check the current git status and show what changes will be committed:

```bash
!git status
!git diff --stat
```

## Step 2: Update CHANGELOG.md
Add an entry to CHANGELOG.md using the date-based format.

**Format:**
1. Check if today's date section (## YYYY-MM-DD) already exists at the top
2. If it exists, add the new entry under the appropriate category (### Added, ### Changed, ### Fixed, etc.)
3. If it doesn't exist, create a new date section at the top before all other dates

**Example for new date section:**
```
## 2025-10-24

### Changed
- Brief description of the change
  - Specific change or feature details
  - Additional bullet points for multiple changes

## 2025-10-23
...
```

**Example adding to existing date:**
```
## 2025-10-24

### Added
- New feature description
  - Feature details

### Changed
- Previous entry description
  - Details

## 2025-10-23
...
```

**Categories:**
- **Added**: New features, pages, functionality
- **Changed**: Updates to existing features
- **Fixed**: Bug fixes
- **Security**: Security improvements
- **Performance**: Performance improvements
- **Removed**: Removed features

**Important**: Always add an empty line between commit entries for better readability.

## Step 3: Stage All Changes
Stage all changes including the updated CHANGELOG:

```bash
!git add .
```

## Step 4: Create Commit
Analyze the changes and create a descriptive commit message following our project standards. The commit should:

- Have a clear, descriptive title summarizing the changes
- Include bullet points for specific changes if multiple features/fixes

Create the commit using a HEREDOC format for proper formatting.
**Important**: Do NOT add any Claude Code footers or co-author credits to commits.

## Step 5: Final Status
Show the final git status to confirm everything was committed successfully.

---

This automates our standard commit process: update changelog → stage everything → commit.
