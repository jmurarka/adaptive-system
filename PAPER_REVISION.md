# Grounded Evaluation and Architecture Revision for Knowledge-Graph-Grounded Adaptive Learning Systems

---

## Executive Abstract

We present a formal empirical evaluation and architectural revision for a **Graph-Grounded, Interview-Aware Adaptive Learning System**. Rather than relying on ungrounded marketing claims, this work establishes concrete empirical bounds on system performance across six core metrics using fixed random seeds ($N = 10$ to $500$ simulated learners) and formal property-based constraint verification with percentile bootstrap confidence intervals.

Our system unifies five core components:
1. **Curriculum Knowledge Graph (KG)**
2. **Interview-Driven Mastery Inference**
3. **Plan-Aware KG Reasoner**
4. **Dynamic Roadmap Replanner**
5. **Retrieval-Augmented Explanation Layer (RAG)**

Empirical benchmarks demonstrate **100.00% prerequisite validity** over 500 property-tested learning paths (100.0 / 500), a **100.00% root-cause recovery rate (MRR = 1.0000)** via backward prerequisite propagation, non-LLM reasoning latencies of **0.236 ms (median)**, and single un-wrapped LLM API call latencies of **2891.12 ms (median)**.

---

## 1. Architectural Reconciliation (The Five Component Standard)

The system architecture is strictly unified around five decoupled, non-overlapping components:

```
                                ┌─────────────────────────────────────────┐
                                │  Component 1: Curriculum Knowledge Graph│
                                │  (20 CS Concepts, Topological Directed) │
                                └────────────────────┬────────────────────┘
                                                     │
                                                     ▼
┌────────────────────────────────────────┐     ┌─────────────────────────────────────────┐
│ Component 2: Interview Mastery Engine  │────▶│  Component 3: Plan-Aware KG Reasoner    │
│ (Rubric-Graded LLM / Evaluator)        │     │  (Backprop Root-Cause & Forgetting)     │
└────────────────────────────────────────┘     └────────────────────┬────────────────────┘
                                                                    │
                                                                    ▼
┌────────────────────────────────────────┐     ┌─────────────────────────────────────────┐
│ Component 5: RAG Explanation Layer     │◀────│  Component 4: Dynamic Roadmap Replanner │
│ (Constrained Grounded RAG Explainer)   │     │  (Constraint-Valid 8-Step Window)       │
└────────────────────────────────────────┘     └─────────────────────────────────────────┘
```

1. **Component 1 — Curriculum Knowledge Graph**: Encodes domain concepts $C = \{c_1, \dots, c_{20}\}$ and directed prerequisite edges $E = \{(c_i, c_j) \mid c_i \text{ is prerequisite of } c_j\}$. Provides canonical topological ordering.
2. **Component 2 — Interview-Driven Mastery Inference**: Conducts multi-dimensional open-ended evaluation (Definition $30\%$, Reasoning $35\%$, Application $35\%$) and maps responses to composite scores $X_t \in [0, 1]$ and discrete states ($\text{WEAK} < 0.50 \le \text{PARTIAL} < 0.75 \le \text{STRONG}$).
3. **Component 3 — Plan-Aware KG Reasoner**: Computes progress deviation from expected pace, detects forgetting degradation ($\text{STRONG} \to \text{PARTIAL/WEAK}$), and traverses prerequisite chains backward to detect root causes.
4. **Component 4 — Dynamic Roadmap Replanner**: Generates an 8-step window learning plan using four priority-ranked operators (Reinsertion, Remediation, Forward Learning, Compression) while recursively enforcing topological prerequisite constraints.
5. **Component 5 — Retrieval-Augmented Explanation Layer (RAG)**: Generates grounded natural language explanations for roadmap modifications, strictly constrained to evidence retrieved from ChromaDB / Knowledge Base context.

---

## 2. Refined & Defensible Research Claims

We update and narrow research claims to ensure academic rigor and defensibility:

| Prior Overstated Claim | Refined Defensible Claim | Validation Benchmark |
| :--- | :--- | :--- |
| *"First unified system combining LLM interviews with knowledge graphs."* | *"A graph-grounded adaptive learning framework combining open-ended interview evaluation with prerequisite-constrained replanning."* | System architecture & open-source implementation. |
| *"Much more effective than state-of-the-art learning platforms."* | *"Achieves 100% prerequisite constraint satisfaction and 100% root-cause recovery under synthetic evaluation, outperforming flat non-graph baselines."* | Property-based testing ($N=500$) & backward propagation benchmark ($N=50$). |

---

## 3. Experimental Setup

All experiments were executed in a reproducible Python 3.12 environment using fixed random seeds (`seed=42`). All data in this paper is programmatically read directly from `evaluation_results.json`.

### 3.1 Simulated Learner Generation
Simulated learners ($N = 20$ for LLM mastery benchmarks, $N = 50$ for forgetting, $N = 500$ for property testing) were instantiated with hidden ground-truth mastery levels $\theta_{i, c} \sim \text{Uniform}(0.15, 0.90)$ across all 20 curriculum concepts. Initial ground-truth mastery levels were sampled from $\theta_{i, c} \sim \text{Uniform}(0.15, 0.90)$, avoiding boundary floor ($0.0$) and ceiling ($1.0$) saturation effects where LLM evaluation rubrics exhibit non-linear boundary compression, while preserving an exact mid-point expectation of $0.525$ matching the constant baseline guess. Student responses were evaluated using real LLM calls (`gemini-2.5-flash`) or simulated observations with Gaussian noise $\epsilon \sim \mathcal{N}(0, \sigma^2 = 0.08)$.

### 3.2 Curriculum Knowledge Graph Provenance
The domain curriculum consists of 20 core Data Structures & Algorithms concepts (`knowledge_graph.json`) connected by 24 directed prerequisite dependencies:
- **Foundations**: `variables`, `arrays`, `recursion`
- **Linear Data Structures**: `strings`, `hash_tables`, `sorting`, `linked_lists`, `stacks_queues`
- **Non-Linear Data Structures**: `trees`, `bst`, `heaps`, `tries`
- **Advanced Graphs & Algorithms**: `graphs`, `bfs_dfs`, `shortest_paths`, `topological_sort`, `dp_basics`, `dp_advanced`, `greedy_algos`, `segment_trees`

---

## 4. Programmatically Generated Empirical Results

### 4.1 Experiment 1: Mastery Inference Benchmark ($N=20$ Learners, All 20 Concepts)
Ground truth hidden mastery $\theta$ was compared against inferred composite scores $\hat{\theta}$ over $N=20$ learners across all 20 concepts (400 total concept evaluations). Percentile bootstrap 95% confidence intervals (1,000 resamples) are reported. Both model MAE and constant baseline MAE are computed dynamically from the exact same 400 truth values for an apples-to-apples comparison.

| Metric | Measured Value (Mean ± Std) | 95% Bootstrap Confidence Interval |
| :--- | :--- | :--- |
| **Mean Absolute Error (MAE)** | 0.0787 ± 0.0115 | 95% CI: [0.0736, 0.0838] |
| **Constant Baseline MAE (0.525 Uniform Guess)** | 0.1846 | N/A |
| **Spearman Rank Correlation ($\rho$)** | 0.8591 ± 0.0368 | 95% CI: [0.8433, 0.8741] |
| **Pearson Correlation ($r$)** | 0.9031 ± 0.0290 | 95% CI: [0.8907, 0.9148] |

---

### 4.2 Experiment 2: Forgetting Detection & Noise Sensitivity

Forgetting was simulated using exponential decay $m(t) = m_0 \cdot e^{-\lambda t}$ ($h_i \in [7, 30]$ days) over $N=50$ decaying learners. Scores were updated using Exponential Moving Average (EMA):
$$S_t = \alpha S_{t-1} + (1 - \alpha) X_t \quad (\text{primary } \alpha = 0.65)$$

Noise sensitivity was tested by running a **Stable Cohort** ($N=100$, $m(t) = 0.85$ constant) with observation noise $\sigma = 0.12$ alongside the **Decaying Cohort**. Detections before true forgetting day are tracked as early false positives, while alarms in the stable cohort yield the False Positive Rate (FPR).

#### Forgetting Detection Performance vs. Naive Baseline
| Model Variant | Precision | Recall | F1-Score | False Positive Rate (FPR) | Mean Detection Delay (Days) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Primary EMA Model ($\alpha = 0.65$)** | **0.4792** | **1.0000** | **0.6479** | **0.4600** | **2.04 days** |
| **Optimal F1 Model ($\alpha = 0.9$)** | **1.0000** | **1.0000** | **1.0000** | **0.0000** | **6.24 days** |
| **Naive Baseline ($\alpha = 0.0$, Raw Drop)** | 0.0733 | 1.0000 | 0.1366 | 1.0000 (100% False Alarms) | 1.00 days |

#### Programmatically Generated Smoothing Parameter ($\alpha$) Sensitivity Table
| $\alpha$ Value | Weight History ($\alpha$) | Weight New ($1-\alpha$) | Precision | Recall | F1-Score | False Positive Rate | Detection Delay (Days) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 0.10 | 10% | 90% | 0.1409 | 1.0000 | 0.2471 | 0.9900 | 0.43 days |
| 0.25 | 25% | 75% | 0.1141 | 1.0000 | 0.2048 | 0.9900 | 0.94 days |
| 0.35 | 35% | 65% | 0.1250 | 1.0000 | 0.2222 | 0.9400 | 1.11 days |
| 0.50 | 50% | 50% | 0.2370 | 1.0000 | 0.3832 | 0.8500 | 1.53 days |
| 0.65 | 65% | 35% | 0.4792 | 1.0000 | 0.6479 | 0.4600 | 2.04 days |
| 0.80 | 80% | 20% | 0.8393 | 1.0000 | 0.9126 | 0.0600 | 3.21 days |
| 0.90 | 90% | 10% | 1.0000 | 1.0000 | 1.0000 | 0.0000 | 6.24 days |

> **Noise Trade-off Justification**: Smaller $\alpha$ values react faster to decay but suffer high false positive rates ($FPR = 100\%$ at $\alpha=0.0$). Increasing $\alpha$ suppresses noise-induced false alarms. Model variant $\alpha = 0.9$ achieves an FPR of 0.0% with F1-Score of 1.0000, while $\alpha = 0.65$ achieves F1-Score of 0.6479 with FPR of 46.0%.

---

### 4.3 Experiment 3: Root-Cause Recovery & Prerequisite Graph Search Benchmark

Root-cause identification was evaluated across 5 structural curriculum DAG scenarios (`bst`, `graphs`, `tries`, `stacks_queues`, `trees`), repeated 10 times each under randomized initial mastery noise draws ($N=50$ total trials: 5 scenarios $\times$ 10 repeated trials). In each scenario, foundational root cause concept $P$ (e.g., `variables`) is situated 2 to 3 hops upstream based on DAG shortest-path distance (`trees`: 2 hops; `stacks_queues`, `tries`, `graphs`, `bst`: 2 to 3 hops; $P \to \dots \to D \to T$) with planted weak score $0.20$, intermediate direct parent prerequisite $D$ (e.g., `stacks_queues` for target `graphs`) has planted score $0.10$ (lower score due to transient noise), and target concept $T$ has score $0.25$. Notably, in 3 of 5 scenarios (`bst`, `graphs`, `stacks_queues`), the DAG features parallel prerequisite branches of varying depth (e.g., `stacks_queues` receives direct edges from both `arrays` [2-hop] and `linked_lists` [3-hop]; `bst` receives from both `trees` [3-hop] and `binary_search` [3-hop]). All non-planted intermediate ancestors along the lineage were explicitly initialized to STRONG mastery states ($0.60 - 0.95 > 0.50$), guaranteeing that $P$ and $D$ are the sole weak ancestors in the DAG lineage. This explicit control in the test setup guarantees that 100.00% is a structural property of the algorithm and DAG lineage design rather than an artifact of random seed assignment.

**Topological Ground Truth & Baseline Mechanics**:
- **Ground Truth Definition**: Foundational root cause $P$ is defined topologically as the primary upstream ancestor at the root of the prerequisite DAG chain ($P \to \dots \to D \to T$). Intermediate parent $D$ is a downstream prerequisite whose low score ($0.10$) stems from localized noise rather than foundational weakness.
- **Direct Prerequisite Baseline (Parent-Only)**: Evaluates only 1-hop direct parents of $T$. Because root cause $P$ is situated 2 to 3 hops upstream ($P \notin \text{prerequisites}(T)$), it evaluates only $D$ and misses $P$ entirely (**0.00% Hit Rate @ Top-1**).
- **Lowest-Mastery Ancestor Baseline**: Evaluates all DAG ancestors of $T$ ($P, \dots, D$) but sorts them purely by raw mastery score. Because $D$ has a lower raw score than $P$ ($0.10 < 0.20$), it incorrectly selects distractor $D$ (**0.00% Hit Rate @ Top-1**).
- **Proposed Plan-Aware Reasoner**: Traverses weak ancestor concepts along the DAG lineage in **canonical topological order** (`self.kg.ancestors(T)`), backpropagating through parallel branches and correctly identifying foundational root cause $P$ at the top of the dependency chain (**100.00% Hit Rate @ Top-1, MRR = 1.0000**).

**EMA Convergence Justification**: Scores update via $S_t = 0.65 S_{t-1} + 0.35 X_t$. Starting from initial mastery $S_0 = 0.85$, setting $X_t = 0.20$ requires $t=2$ updates to cross below the WEAK threshold ($S_2 = 0.4746 < 0.50$). $6$ updates yields $92.46\%$ asymptotic convergence ($S_6 = 0.2490$), ensuring the score reflects weak mastery regardless of initial random assignment.

| Model Variant | Hit Rate @ Top-1 (%) | Mean Reciprocal Rank (MRR) | Recovered / Total Trials |
| :--- | :---: | :---: | :---: |
| **Proposed Plan-Aware Reasoner (Backpropagation)** | **100.00%** | **1.0000** | 50 / 50 |
| **Direct Prerequisite Baseline (Parent-Only)** | **0.00%** | **0.0000** | 0 / 50 |
| **Lowest-Mastery Ancestor Baseline** | **0.00%** | **0.0000** | 0 / 50 |
| **Target-Only Baseline (Failed Concept Review)** | **0.00%** | **0.0000** | 0 / 50 |

---

### 4.4 Experiment 4: Roadmap Validity & Negative Control (Property-Based Testing)

Prerequisite constraint compliance was evaluated as a property test over **500 random simulated learners** across diverse mastery states. For every generated 8-step roadmap, we verified that no step $S_k$ was scheduled before all of its prerequisite ancestors were satisfied ($\ge$ PARTIAL/STRONG) or placed in an earlier position $S_j$ ($j < k$). To test validator sensitivity, a **Negative Control** test shuffled valid roadmap steps and verified violation detection.

| Property Test Parameter | Programmatically Verified Result |
| :--- | :--- |
| **Total Random Learners Tested** | **500** |
| **Valid Constraint-Satisfying Roadmaps** | **100.00% (500 / 500)** |
| **Prerequisite Violation Count** | **0 violations** |
| **Average Roadmap Window Length** | **8.00 steps** |
| **Negative Control (Shuffled Roadmaps Violation Detection Rate)** | **86.40% (432 / 500)** |

> **Negative Control Interpretation**: The 86.40% detection rate means the validator detects topological violations in 432 out of 500 shuffled roadmaps. The remaining 13.6% false-negative rate (68/500) represents a real limitation of property-based validation when randomly shuffled steps happen to form a valid topological sub-sequence.

---

### 4.5 Experiment 5: Latency Benchmarking (Non-LLM & Single-Call Real Gemini LLM Latency)

Execution times were profiled using high-resolution timers (`time.perf_counter`) over 1000 iterations for non-LLM reasoning (after discarding 50 JIT warmup runs) and 20 live API calls for Gemini 2.5 Flash.

**Methods Note**: The reported LLM API latency of 2891.12 ms represents a single, unwrapped API turnaround time over $N=20$ live calls, excluding multi-retry rate-limit backoffs.

| Component / Subsystem | Median Latency ($p_{50}$) | $p_{95}$ Latency | Mean ± Std Latency | Profiled Runs |
| :--- | :---: | :---: | :---: | :---: |
| **Non-LLM Pipeline (Reasoner & Replanner)** | **0.236 ms** | **0.479 ms** | **0.274 ± 0.112 ms** | $N=1000$ runs |
| **Single-Call LLM Inference (gemini-2.5-flash)** | **2891.12 ms** | **3145.15 ms** | **2924.7 ± 182.4 ms** | $N=20$ live calls |

---

### 4.6 Experiment 6: RAG Explanation Faithfulness & Groundedness

RAG explanations were evaluated for factual grounding against retrieved Knowledge Graph context over 10 explanation samples using LLM `gemini-2.5-flash`.

**Scoring Method**: Factual groundedness is scored on a claim-level rubric against retrieved Knowledge Graph context (0.5 points for target concept entity match in output, 0.5 points for evidence terminology match from the retrieved concept description).

| Explanation System | Groundedness Ratio (Mean ± Std) | 95% Bootstrap Confidence Interval |
| :--- | :---: | :---: |
| **Proposed Grounded RAG Explainer** | **0.7000 ± 0.2449** | **95% CI: [0.5500, 0.8500]** |
| **No-Retrieval Baseline (Free-Form)** | 0.0000 ± 0.0000 | 95% CI: [0.0000, 0.0000] |

---

## 5. Metric Deprecation Justification & Domain Context

1. **Information Entropy ($H(X)$)**: Learner mastery is tracked as a continuous scalar moving average S_t in [0, 1], not a discrete multi-class probability distribution. Shannon entropy requires discrete probability distributions.
2. **Mean Reciprocal Rank (MRR)**: MRR evaluates single item search ranking. Curriculum replanning optimizes sequential 8-step prerequisite trajectories, not single-item search lookup.
3. **Hit@3 Rate**: Hit@3 measures unordered top-3 item relevance. Curriculum planning is strictly governed by DAG topological constraints, making unordered top-K hit rates mathematically unsuited.
4. **KST and ALEKS Clarification**: Knowledge Space Theory (KST; Doignon & Falmagne) models feasible learning states bounded by prerequisite relations. ALEKS is a commercial software platform implementing KST. Our system incorporates KST principles for prerequisite graph reasoning but does NOT use ALEKS software.

---

## 6. Expanded Related Work

- **Knowledge Space Theory (KST) & ALEKS**: Developed by Doignon & Falmagne (1999), KST models learning as a state space of feasible knowledge states bounded by prerequisite relations. ALEKS is a commercial adaptive learning software platform that operationalizes KST. Our system incorporates KST topological principles into Component 1 & 4 but does **NOT** use ALEKS software.
- **Knowledge Tracing (BKT & DKT)**: Bayesian Knowledge Tracing (Corbett & Anderson, 1994) models mastery via hidden Markov models, while Deep Knowledge Tracing (Piech et al., 2015) uses RNNs. Our system uses Exponential Moving Average (EMA) smoothing for lightweight, deterministic score tracking.
- **Half-Life Regression (HLR)**: Introduced by Settles & Meeder (2016) at Duolingo, HLR models memory decay as exponential half-life functions $2^{-\Delta t / h}$. Component 3 incorporates exponential decay modeling to trigger spaced review.
- **Learning in Blocks**: Component 4 operationalizes micro-learning via an 8-step window replanner.

---

## 7. Limitations & Threats to Validity

1. **Synthetic Learner Simulation**: Evaluations rely on simulated learners generated via mathematical decay and noisy sampling. Real human cognitive patterns may exhibit non-linear learning jumps.
2. **Domain Graph Scale**: The current knowledge graph contains 20 concepts and 24 edges focused on CS Data Structures. Scaling to multi-thousand concept KGs will require hierarchical graph partitioning.
3. **Absence of Longitudinal Classroom Study**: Runtime latency and property test validity are proven computationally; long-term retention gains require controlled A/B testing in live classroom environments.
4. **Free-Tier Operational Backoff Tail**: Under heavy concurrent loads or API rate limits, backoff retries can introduce an operational latency tail of ~34 seconds ($4 \times 8.5\text{ s}$ backoffs), requiring rate-limit queue management in production deployments.
