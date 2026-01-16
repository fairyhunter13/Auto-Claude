# Discovery Mode User Prompts

This document contains the user interaction prompts for TEA's discovery mode.

## Initial Discovery Prompt

When an unknown language is detected:

```markdown
## Unknown Language Detected

I couldn't identify the programming language(s) in your project from my knowledge base.

**Detected file extensions**: {extensions}
**Possible language hints**: {hints}

### Options

1. **[Discover]** - Let me research this language online and analyze your project
   - I'll search for testing frameworks and best practices
   - Takes ~30-60 seconds
   - Requires web access

2. **[Tell Me]** - You tell me the language name
   - I'll search my knowledge base again with the correct name
   - Fastest option if you know the language

3. **[Universal]** - Apply universal testing principles
   - Language-agnostic test patterns
   - Lower confidence but works for any language

4. **[Skip]** - Skip testing for these files
   - Focus on recognized languages only

What would you like to do?
```

## Language Confirmation Prompt

When user provides language name:

```markdown
## Language: {language_name}

Thanks! Let me check if I have specific knowledge about {language_name}...

{if found}
Found it! Loading {language_name} testing strategy.
{/if}

{if not_found}
I don't have specific knowledge about {language_name}, but I can:

1. **[Research]** - Search for {language_name} testing best practices online
2. **[Family]** - Apply {inferred_family} family patterns (detected similarity)
3. **[Universal]** - Apply universal testing principles

What would you like?
{/if}
```

## Discovery Progress Prompt

During discovery:

```markdown
## Discovering: {language_name}

{spinner} Analyzing project structure...
{check} Found {n} source files
{check} Found {m} potential test files

{spinner} Searching for testing frameworks...
{check} Found: {framework_names}

{spinner} Extracting best practices...
{check} Identified {p} patterns

**Estimated time remaining**: {time}s
```

## Discovery Results Prompt

After discovery completes:

```markdown
## Discovery Complete: {language_name}

**Confidence**: {confidence_level} ({confidence_percent}%)

### What I Found

| Aspect | Finding |
|--------|---------|
| Test Framework | {framework_name} |
| Test Pattern | `{test_pattern}` |
| Test Command | `{test_command}` |
| Assertion Style | {assertion_style} |

### Evidence

- {evidence_1}
- {evidence_2}
- {evidence_3}

### Recommended Strategy

{strategy_summary}

### Actions

1. **[Accept]** - Use this strategy
2. **[Modify]** - Adjust the recommendations
3. **[Reject]** - Use universal fallback instead
4. **[Save]** - Save to knowledge base for future projects

What would you like to do?
```

## Low Confidence Warning

When confidence is below threshold:

```markdown
## Low Confidence Warning

My discovery for {language_name} has **low confidence** ({confidence_percent}%).

### Reasons

- {reason_1}
- {reason_2}

### Recommendations

The strategy I generated may need significant adjustment. Consider:

1. **[Proceed with Caution]** - Use the strategy but verify manually
2. **[Add Information]** - Tell me more about your testing setup
3. **[Universal Fallback]** - Use safe, generic patterns

What would you like to do?
```

## Modification Prompt

When user wants to modify recommendations:

```markdown
## Modify Strategy: {language_name}

Current settings:

| Setting | Current Value | Options |
|---------|---------------|---------|
| Framework | {framework} | [Change] |
| Test Pattern | `{pattern}` | [Change] |
| Test Command | `{command}` | [Change] |
| Assertion Style | {style} | [Change] |

### Custom Input

Or tell me what you'd like to change:

> _Type your modifications or corrections..._

### Common Adjustments

- "Use {framework} instead of {current_framework}"
- "Test files are in `{directory}`"
- "We run tests with `{command}`"
```

## Save to Knowledge Base Prompt

When user wants to save discovered strategy:

```markdown
## Save Strategy: {language_name}

Would you like to save this strategy to the knowledge base?

**Benefits**:
- Faster detection in future projects
- Contributes to TEA's knowledge
- Can be promoted to official strategy

**Save Location**: `_bmad/bmm/testarch/knowledge/languages/_provisional/{language_name}/_provisional.md`

**Options**:

1. **[Save as Provisional]** - Save with "needs validation" flag
2. **[Save as Validated]** - Save as confirmed correct
3. **[Don't Save]** - Use for this session only

{if validated}
Note: Validated strategies may be submitted upstream to improve TEA for everyone.
{/if}
```

## Existing Tests Found Prompt

When existing tests are discovered:

```markdown
## Existing Tests Found

I found existing test files in your project:

```
{test_file_list}
```

### Detected Patterns

| Pattern | Example |
|---------|---------|
| File naming | `{naming_pattern}` |
| Framework | `{detected_framework}` |
| Assertion | `{assertion_example}` |

### Options

1. **[Adopt]** - Use the existing patterns as the strategy
2. **[Analyze]** - Let me examine them more closely
3. **[Override]** - I want to use different patterns
4. **[Hybrid]** - Combine existing with best practices

What would you like?
```

## Multi-Language Project Prompt

For polyglot projects:

```markdown
## Multi-Language Project Detected

Your project contains multiple programming languages:

| Language | Files | Status | Framework |
|----------|-------|--------|-----------|
| {lang_1} | {n1} | {status_1} | {fw_1} |
| {lang_2} | {n2} | {status_2} | {fw_2} |
| {lang_3} | {n3} | {status_3} | {fw_3} |

### Status Legend
- Known - Full strategy available
- Family - Using family-level patterns
- Discovery - Needs research
- Unknown - Will use universal fallback

### Options

1. **[Process All]** - Handle each language automatically
2. **[Select]** - Choose which languages to configure
3. **[Focus]** - Only configure the primary language ({primary})

Which approach would you prefer?
```

## Error/Failure Prompts

### Web Fetch Failed

```markdown
## Web Research Unavailable

I couldn't search online for {language_name} testing information.

**Reason**: {error_reason}

### Fallback Options

1. **[Project Only]** - Analyze your project without web research
   - Lower confidence
   - Based on file patterns and existing tests

2. **[Universal]** - Apply universal testing principles
   - Works for any language
   - Generic patterns

3. **[Retry]** - Try web research again
   - May work if temporary issue

4. **[Manual]** - You provide the testing information

What would you like to do?
```

### No Evidence Found

```markdown
## Insufficient Evidence

I couldn't gather enough information about {language_name}:

- No build system files found
- No existing tests found
- No documentation found
- Web research yielded no results

### Options

1. **[Tell Me]** - Provide information about your test setup
2. **[Universal]** - Apply universal testing principles
3. **[Skip]** - Skip testing for this language

Please choose an option or tell me about your testing setup:

> _E.g., "We use XYZ framework, tests are in tests/ folder"_
```
