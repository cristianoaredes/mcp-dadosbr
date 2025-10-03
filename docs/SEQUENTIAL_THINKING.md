# Sequential Thinking Tool

## 📋 Overview

The `sequentialthinking` tool provides structured and iterative reasoning capabilities for complex problem-solving. It allows LLMs to "think out loud" in an organized way, with support for revisions, branches, and dynamic planning.

## 🎯 Features

- ✅ **Dynamic Planning**: Adjust total thoughts as understanding deepens
- ✅ **Revisions**: Question and revise previous thoughts
- ✅ **Branching**: Explore alternative approaches
- ✅ **Context Tracking**: Maintain context across multiple steps
- ✅ **Colorized Output**: Visual feedback with colored formatting
- ✅ **Flexible Progress**: Add more thoughts even after reaching the "end"

## 🧠 When to Use

### Perfect For:
- Breaking down complex problems into steps
- Planning and design with room for revision
- Analysis that might need course correction
- Problems where the full scope isn't initially clear
- Multi-step solutions requiring context
- Filtering relevant from irrelevant information
- Complex investigations (e.g., company intelligence)

### Not Ideal For:
- Simple, single-step queries
- Questions with obvious answers
- Tasks requiring no planning or analysis

## 📖 API Reference

### Input Schema

```typescript
{
  // Required
  thought: string;              // Your current thinking step
  thoughtNumber: number;        // Current number (1, 2, 3...)
  totalThoughts: number;        // Estimated total needed
  nextThoughtNeeded: boolean;   // Continue thinking?
  
  // Optional - for advanced use
  isRevision?: boolean;         // Is this revising previous thinking?
  revisesThought?: number;      // Which thought to revise
  branchFromThought?: number;   // Branching point
  branchId?: string;            // Branch identifier
  needsMoreThoughts?: boolean;  // Need more than originally planned?
}
```

### Output Schema

```typescript
{
  ok: boolean;
  data?: {
    thoughtNumber: number;
    totalThoughts: number;
    nextThoughtNeeded: boolean;
    branches: string[];              // Active branch IDs
    thoughtHistoryLength: number;    // Total thoughts so far
  };
  error?: string;
}
```

## 🎬 Usage Examples

### Example 1: Basic Linear Thinking

```typescript
// Thought 1
sequentialthinking({
  thought: "Need to investigate CNPJ 00000000000191. First, get basic data.",
  thoughtNumber: 1,
  totalThoughts: 5,
  nextThoughtNeeded: true
})

// Thought 2
sequentialthinking({
  thought: "Basic data obtained. Company is BANCO DO BRASIL SA. Need to check financial status.",
  thoughtNumber: 2,
  totalThoughts: 5,
  nextThoughtNeeded: true
})

// Thought 3
sequentialthinking({
  thought: "Will search for recent news and regulatory filings.",
  thoughtNumber: 3,
  totalThoughts: 5,
  nextThoughtNeeded: true
})

// Thought 4
sequentialthinking({
  thought: "Found regulatory reports. Bank is active and well-regulated.",
  thoughtNumber: 4,
  totalThoughts: 5,
  nextThoughtNeeded: true
})

// Thought 5 (Final)
sequentialthinking({
  thought: "Investigation complete. BANCO DO BRASIL SA is a major active financial institution.",
  thoughtNumber: 5,
  totalThoughts: 5,
  nextThoughtNeeded: false  // Done!
})
```

### Example 2: Dynamic Planning

```typescript
// Start with conservative estimate
sequentialthinking({
  thought: "Initial plan: check company, then decide next steps.",
  thoughtNumber: 1,
  totalThoughts: 3,
  nextThoughtNeeded: true
})

// Realize more work needed
sequentialthinking({
  thought: "Company data shows complexity. Need deeper investigation.",
  thoughtNumber: 2,
  totalThoughts: 7,  // Adjusted up!
  nextThoughtNeeded: true
})

// Continue with new plan...
```

### Example 3: Revision

```typescript
// Original thought
sequentialthinking({
  thought: "Hypothesis: Company is active based on CNPJ data.",
  thoughtNumber: 3,
  totalThoughts: 5,
  nextThoughtNeeded: true
})

// Later, revise that thought
sequentialthinking({
  thought: "REVISION: Previous hypothesis was wrong. New evidence shows inactivity.",
  thoughtNumber: 4,
  totalThoughts: 5,
  nextThoughtNeeded: true,
  isRevision: true,
  revisesThought: 3  // Revising thought #3
})
```

### Example 4: Branching

```typescript
// Main path
sequentialthinking({
  thought: "Two possible approaches: A) legal search, B) document search.",
  thoughtNumber: 5,
  totalThoughts: 10,
  nextThoughtNeeded: true
})

// Branch A
sequentialthinking({
  thought: "Exploring approach A: Legal search...",
  thoughtNumber: 6,
  totalThoughts: 10,
  nextThoughtNeeded: true,
  branchFromThought: 5,
  branchId: "legal-search"
})

// Branch B
sequentialthinking({
  thought: "Exploring approach B: Document search...",
  thoughtNumber: 6,
  totalThoughts: 10,
  nextThoughtNeeded: true,
  branchFromThought: 5,
  branchId: "document-search"
})
```

## 🎨 Visual Output

The tool provides colorized terminal output for better visualization:

```
┌──────────────────────────────────────────────┐
│ 💭 Thought 1/5                               │
├──────────────────────────────────────────────┤
│ Need to investigate company X                │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ 🔄 Revision 4/5 (revising thought 2)         │
├──────────────────────────────────────────────┤
│ Previous hypothesis was incorrect            │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ 🌿 Branch 6/10 (from thought 5, ID: legal)   │
├──────────────────────────────────────────────┤
│ Exploring legal search approach              │
└──────────────────────────────────────────────┘
```

## 🔧 Configuration

### Disable Thought Logging

To disable colorized output (e.g., in production):

```bash
# Disable visual output
DISABLE_THOUGHT_LOGGING=true npx @aredes.me/mcp-dadosbr
```

Thoughts will still be processed, but won't print to stderr.

## 💡 Integration with Other Tools

### With cnpj_lookup

```typescript
// Step 1: Plan
sequentialthinking({
  thought: "Will look up CNPJ, then analyze results",
  thoughtNumber: 1,
  totalThoughts: 3,
  nextThoughtNeeded: true
})

// Step 2: Execute
const data = await cnpj_lookup({ cnpj: "00000000000191" })

// Step 3: Analyze
sequentialthinking({
  thought: "Company status: Active. BANCO DO BRASIL SA is a major financial institution.",
  thoughtNumber: 2,
  totalThoughts: 3,
  nextThoughtNeeded: true
})
```

### With cnpj_search

```typescript
// Step 1: Plan search strategy
sequentialthinking({
  thought: "Will search: 1) gov records, 2) lawsuits, 3) social media",
  thoughtNumber: 1,
  totalThoughts: 7,
  nextThoughtNeeded: true
})

// Step 2: Execute first search
const govResults = await cnpj_search({
  query: "00000000000191 site:gov.br"
})

// Step 3: Evaluate results
sequentialthinking({
  thought: `Found ${govResults.count} government records. Most relevant: ...`,
  thoughtNumber: 2,
  totalThoughts: 7,
  nextThoughtNeeded: true
})

// Continue pattern...
```

## 🎯 Best Practices

### 1. Start Conservative

Begin with a conservative estimate of thoughts needed:

```typescript
// ✅ Good: Start small
totalThoughts: 5

// ❌ Bad: Over-plan initially
totalThoughts: 20
```

You can always adjust upward as needed!

### 2. Be Specific in Thoughts

```typescript
// ❌ Bad: Vague
thought: "Checking something"

// ✅ Good: Specific
thought: "Searching for legal cases in JusBrasil for company X"
```

### 3. Use Revisions When Wrong

Don't be afraid to revise previous thinking:

```typescript
sequentialthinking({
  thought: "REVISION: My previous assumption about the company status was incorrect based on new evidence.",
  isRevision: true,
  revisesThought: 3
})
```

### 4. Branch for Alternatives

When exploring multiple approaches:

```typescript
sequentialthinking({
  thought: "Branching to explore hypothesis B",
  branchFromThought: 5,
  branchId: "hypothesis-b"
})
```

### 5. Only Set nextThoughtNeeded=false When Done

```typescript
// ✅ Good: Clear completion
sequentialthinking({
  thought: "Analysis complete. Final answer: ...",
  nextThoughtNeeded: false
})

// ❌ Bad: Premature end
sequentialthinking({
  thought: "Maybe done?",
  nextThoughtNeeded: false  // Too early!
})
```

## 📊 Real-World Example: Company Investigation

```typescript
// Thought 1: Initialize
sequentialthinking({
  thought: "Starting investigation of CNPJ 00000000000191. Plan: 1) Basic data, 2) Financial status, 3) Regulatory compliance",
  thoughtNumber: 1,
  totalThoughts: 7,
  nextThoughtNeeded: true
})

// Thought 2: Get basic data
const basicData = await cnpj_lookup({ cnpj: "00000000000191" })

sequentialthinking({
  thought: "Retrieved basic data. Company: BANCO DO BRASIL SA. Status: Active since 1966. Major financial institution.",
  thoughtNumber: 2,
  totalThoughts: 7,
  nextThoughtNeeded: true
})

// Thought 3: Plan deeper search
sequentialthinking({
  thought: "Bank is active. Need to check regulatory reports and recent news.",
  thoughtNumber: 3,
  totalThoughts: 7,
  nextThoughtNeeded: true
})

// Thought 4: Search government
const govResults = await cnpj_search({
  query: "00000000000191 site:gov.br"
})

sequentialthinking({
  thought: `Found ${govResults.count} government records. Official regulatory filings found.`,
  thoughtNumber: 4,
  totalThoughts: 7,
  nextThoughtNeeded: true
})

// Thought 5: Search legal
const legalResults = await cnpj_search({
  query: '"BANCO DO BRASIL SA" site:jusbrasil.com.br'
})

sequentialthinking({
  thought: `Found ${legalResults.count} legal cases. Typical litigation for large institution.`,
  thoughtNumber: 5,
  totalThoughts: 7,
  nextThoughtNeeded: true
})

// Thought 6: Search online presence
const onlineResults = await cnpj_search({
  query: '"BANCO DO BRASIL" site:linkedin.com OR site:gov.br'
})

sequentialthinking({
  thought: `Found extensive online presence. Strong institutional profile.`,
  thoughtNumber: 6,
  totalThoughts: 7,
  nextThoughtNeeded: true
})

// Thought 7: Conclude
sequentialthinking({
  thought: "CONCLUSION: BANCO DO BRASIL SA is a major, well-regulated, active financial institution with 120 billion in capital. State-owned bank operating since 1966.",
  thoughtNumber: 7,
  totalThoughts: 7,
  nextThoughtNeeded: false
})
```

## ⚠️ Important Notes

### Memory & Context

- Thoughts are stored in memory during the session
- History is available via `getHistory()` method
- Branches are tracked separately
- Reset with `reset()` if needed (programmatic use)

### Performance

- Each thought call is fast (<1ms)
- No external API calls
- Minimal memory footprint
- Logs to stderr (won't interfere with MCP protocol)

## 🔮 Advanced Features

### Programmatic Access

```typescript
import { SequentialThinkingProcessor } from './lib/core/sequential-thinking.js';

const processor = new SequentialThinkingProcessor();

// Process thought
const result = processor.processThought({
  thought: "Analyzing...",
  thoughtNumber: 1,
  totalThoughts: 5,
  nextThoughtNeeded: true
});

// Get history
const history = processor.getHistory();

// Get branches
const branches = processor.getBranches();

// Reset
processor.reset();
```

## 🎓 Theory: Why Sequential Thinking?

Sequential thinking helps LLMs:

1. **Break down complexity**: Large problems → manageable steps
2. **Maintain context**: Track progress across multiple steps
3. **Self-correct**: Revise when new information emerges
4. **Explore alternatives**: Branch to test multiple hypotheses
5. **Transparent reasoning**: Show thinking process to user

This is especially useful for:
- Complex investigations
- Multi-source data analysis
- Iterative problem-solving
- Exploratory research

---

**Related Documentation**:
- [Web Search Tool](./WEB_SEARCH.md)
- [Usage Examples](./USAGE_EXAMPLES.md)
- [MCP Client Integration](./MCP_CLIENT_INTEGRATION.md)
