# String Replacement Summary

## Overview
This document summarizes all string replacements made in the `/docs` and `/scripts` directories according to the specified rules.

## Replacement Rules Applied

1. **'tars' → 'ae'** (case-insensitive)
   - TARS → AE
   - Tars → Ae  
   - tars → ae

2. **'agent' → 'aegnt'** (case-insensitive)
   - AGENT → AEGNT
   - Agent → Aegnt
   - agent → aegnt

3. **Special case: 'agent-tars' → 'aegnt-27'**
   - agent-tars → aegnt-27
   - Agent-Tars → Aegnt-27
   - AGENT-TARS → AEGNT-27

## Files Modified

### Scripts Directory (`/scripts`)
No files contained any occurrences of 'tars' or 'agent', so no changes were made.

### Documentation Directory (`/docs`)

#### Main Documentation Files

1. **`/docs/sdk.md`**
   - @ui-tars/sdk → @ui-ae/sdk
   - UI-TARS → UI-AE
   - UITarsModel → UIAeModel
   - GUIAgent → GUIAegnt
   - guiAgent → guiAegnt
   - All other case variations replaced accordingly

2. **`/docs/deployment.md`**
   - UI-TARS → UI-AE
   - All deployment guide references updated

3. **`/docs/quick-start.md`**
   - UI-TARS → UI-AE
   - ui-tars → ui-ae
   - Doubao-1.5-UI-TARS → Doubao-1.5-UI-AE
   - All image paths updated to use ui-ae directory

4. **`/docs/preset.md`**
   - UI-TARS Desktop → UI-AE Desktop
   - ui-tars → ui-ae
   - All configuration references updated

5. **`/docs/setting.md`**
   - UI-TARS → UI-AE
   - UTIO (UI-TARS Insights and Observation) → UTIO (UI-AE Insights and Observation)
   - All provider names and configuration examples updated

#### Archive Documentation Files (`/docs/archive-1.0/`)

1. **`README.md`**
   - UI-TARS → UI-AE
   - GUI Agent → GUI Aegnt
   - agents → aegnts
   - All references and citations updated

2. **`sdk.md`**
   - Same replacements as main sdk.md file
   - All SDK references and code examples updated

3. **`preset.md`**, **`quick-start.md`**, **`setting.md`**, **`deployment.md`**
   - All occurrences replaced following the same rules

## Summary Statistics

- Total files checked: ~15 files
- Total files modified: 10 files
- Total replacements made: Hundreds of occurrences across all variations

## Notes

- All replacements were case-sensitive to preserve proper formatting
- Special attention was paid to compound words like 'agent-tars' → 'aegnt-27'
- Image paths and URLs were updated to reflect the new naming convention
- Code examples, configuration files, and documentation text were all updated consistently