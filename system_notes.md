# Adaptive Learning System: How It Works (Team Explanation)

## What Is This System?
This is an AI-powered learning platform that creates personalized study plans for students. It uses a knowledge graph of computer science concepts and adapts the learning path based on how well the student understands each topic through interviews.

## Key Idea: Static Foundation + Dynamic Adaptation
- **Static Parts**: The curriculum structure and questions don't change. They're like a fixed map of what needs to be learned.
- **Dynamic Parts**: The student's progress, scores, and study plan change in real-time based on their performance.

## The Static Foundation: Knowledge Graph (KG)

### What It Is
Imagine a map of 20 DSA (Data Structures & Algorithms) concepts, where each concept has prerequisites. For example:
- "Arrays" must come before "Stacks"
- "Linked Lists" must come before "Queues"

This map is stored in `knowledge_graph.json` and never changes during learning.

### How It's Used
- **Base Roadmap**: Provides the "correct" order to learn concepts (topological sort)
- **Rules Enforcement**: Ensures you can't learn advanced topics until basics are covered
- **Analysis Tool**: Helps detect why a student is struggling (e.g., weak foundations)

**Example**: If a student is weak on "Arrays", the system knows "Stacks" and "Queues" are at risk because they depend on arrays.

## Dynamic Adaptation: Scores and Roadmaps

### How Scores Are Calculated (From Interviews)

1. **Student Takes Interview**: For a concept like "Binary Trees", they answer 3-5 open-ended questions:
   - Definition: "What is a binary tree?"
   - Reasoning: "Why use trees over arrays?"
   - Application: "Implement inorder traversal"

2. **Scoring Process**:
   - **AI Evaluation**: Gemini LLM grades each answer on a 0-1 scale for definition, reasoning, application
   - **Fallback**: If no AI, uses mock scoring
   - **Composite Score**: Weighted average (30% definition + 35% reasoning + 35% application)
   - **Mastery Level**:
     - 0.75+ = "Strong" (ready to move on)
     - 0.50-0.74 = "Partial" (needs review)
     - <0.50 = "Weak" (major gaps)

3. **Score Smoothing**: New scores blend with old ones (65% old + 35% new) to avoid one bad day ruining progress.

**Example**: Student scores 0.8 on definition, 0.6 on reasoning, 0.7 on application → Composite: 0.69 → "Partial" mastery.

### How the Roadmap Changes Based on Scores

The system doesn't just follow the fixed order—it adapts like a GPS rerouting around traffic.

#### Step-by-Step Process
1. **After Interview**: Score updates the student's mastery for that concept
2. **Analysis Phase**: System checks for problems:
   - **Forgetting**: Was this concept "Strong" before but now "Partial"? (Spaced repetition needed)
   - **Weak Roots**: Are prerequisite concepts weak? (Fix foundations first)
   - **Progress Check**: How far behind/ahead is the student vs. expected pace?
3. **Replanning Phase**: Creates a new personalized roadmap:
   - **Reinsert Forgotten Topics**: "Review Binary Trees—you forgot this"
   - **Fix Weak Prerequisites**: "Study Arrays first—it's causing issues in Stacks"
   - **Continue Forward**: "Next, learn Queues"
   - **Compress if Ahead**: Merge steps if student is progressing fast

#### Business Rules
- **Hard Rule**: You can't learn a concept until its prerequisites are at least "Weak"
- **Triggers for Change**: Forgetting detected OR >2 concepts behind schedule
- **Max Plan Length**: Shows only next 8 steps to avoid overwhelm
- **Priorities**: Fix forgetting first, then foundations, then new topics

**Example Scenario**:
- Student masters "Arrays" (score 0.8)
- Later, "Stacks" interview shows weak reasoning (score 0.4)
- System detects "Arrays" as root cause
- New roadmap: 1. Review Arrays, 2. Reinforce Stacks, 3. Learn Queues

## Overall Flow (End-to-End)

```
Student Logs In → Chooses Concept → Takes Interview → Gets Score
       ↓                ↓              ↓            ↓
   Load Profile    Fetch Questions   AI Grades    Update Mastery
       ↓                ↓              ↓            ↓
   Analyze Progress → Detect Issues → Replan Roadmap → Show Next Steps
```

- **Triggers**: After each interview or when requesting a new plan
- **Feedback Loop**: Better scores = easier roadmaps; struggles = more review
- **Persistence**: Scores saved in memory (use database for production)
- **Explanations**: AI generates why changes happened (e.g., "You're weak on prerequisites")

## Why This Matters
- **Personalization**: No one-size-fits-all learning
- **Efficiency**: Focus on gaps, not repetition
- **Scalability**: Static KG allows easy addition of new domains
- **AI Integration**: LLM makes assessment human-like

This system turns static curriculum into dynamic, student-centered learning paths.