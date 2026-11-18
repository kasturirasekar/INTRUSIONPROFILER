# Cyber-Attack Network Intrusion Profiler Using Ensemble Learning & Explainable AI

An academic research platform and reproducible experimental workbench for network intrusion detection, ensemble learning evaluation, and model interpretability on network flow telemetry.

---

## 1. Problem Statement

Network Intrusion Detection Systems (NIDS) are critical defensive components in contemporary network security architectures. Modern enterprise networks generate high volumes of diverse traffic, exposing network perimeters to sophisticated cyberattacks such as Distributed Denial of Service (DDoS), Port Scanning, Web Application Exploits, and Brute Force authentication attacks.

However, existing machine learning-based intrusion detection approaches face several well-documented challenges:
1. **Single-Model Failure Modes**: Individual classifiers (such as single Decision Trees or linear models) frequently suffer from either high variance (overfitting to benign traffic) or high bias (failing to recognize complex, low-volume attack patterns), leading to unacceptable False Positive Rates (FPR) or dangerous False Negative Rates (FNR).
2. **The "Black-Box" Interpretability Deficit**: Opaque models flag network connections with threat probabilities without explaining *why* the traffic was deemed malicious. Security Operations Center (SOC) analysts cannot distinguish true threats from false alarms without actionable feature attribution.
3. **Severe Class Imbalance**: Legitimate network communication vastly outnumbers malicious flows, skewing traditional evaluation metrics like raw accuracy.
4. **Data Leakage in Research**: Many academic studies inadvertently fit preprocessing transformations (imputation, scaling, normalization) across the combined dataset before splitting, producing artificially inflated metrics that fail on unseen traffic.
5. **Distribution Drift**: Operational network behaviors evolve due to application updates and protocol shifts. Models trained on static baselines degrade when input distributions drift.

---

## 2. Research Objectives

The primary objectives of this project are:
1. **Multi-Class Intrusion Detection**: Support both coarse binary classification (Benign vs. Malicious) and fine-grained attack-category classification across diverse contemporary intrusion vectors.
2. **Comparative Ensemble Architecture Analysis**: Rigorously benchmark standalone classifiers against ensemble paradigms (Voting, Bagging, Boosting, and Stacking) under strict, leakage-free evaluation protocols.
3. **Empirical Interpretability & Verification**: Integrate local feature attribution (SHAP), local surrogate models (LIME), explanation stability testing, and counterfactual feasibility analysis to provide transparent decision rationale.
4. **Controlled Robustness & Perturbation Stress Testing**: Quantify model resilience against synthetic noise, missing values, distribution shifts, and minority class reductions.
5. **Statistical Traffic Drift Monitoring**: Detect covariate shift between reference and incoming traffic using two-sample Kolmogorov-Smirnov tests, Population Stability Index (PSI), and Wasserstein distances without conflating operational drift with attacks.

---

## 3. System Architecture

The application is structured into decoupled, modular tiers adhering to clean architectural separation:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           REACT FRONTEND TIER                           │
│  - SOC Dashboard (Live KPIs & Monitored Streams)                        │
│  - Traffic & Threat Center (Flow Interception & Incident Triage)        │
│  - Ensemble Studio (5-Step Pipeline: Data, Config, Train, XAI, Results) │
│  - Research & Evaluation (Multi-Model Benchmark, Robustness, Drift)     │
│  - Reports & Experiments (Batch CSV Profiling & History Comparison)     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ REST API (JSON / HTTP)
┌────────────────────────────────────▼────────────────────────────────────┐
│                           FASTAPI BACKEND TIER                          │
│  ├── /api/research         (Benchmark Engine, Robustness, Drift)        │
│  ├── /api/studio           (Dynamic Dataset Ingestion, Train, Explain)  │
│  ├── /api/explainability   (SHAP, LIME, Feasibility, Stability)        │
│  ├── /api/traffic          (Paginated Flows & Real-Time Replay)         │
│  ├── /api/threats          (Filtered Malicious Threat Queue)            │
│  └── /api/model            (Model Performance Benchmarks & ROC Curves)  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ In-Memory & Disk Pipeline
┌────────────────────────────────────▼────────────────────────────────────┐
│                       CORE ML & XAI ENGINE TIER                         │
│  ├── Dataset Manager       (Quality Audit, Imbalance Analysis, Schema)  │
│  ├── Preprocessing Engine  (Strict Train-Fitted Imputation & Scaling)   │
│  ├── Ensemble Builder      (DT, LR, RF, GBDT, Voting, Stacking, etc.)  │
│  ├── Explainability Suite  (SHAP Tree/Kernel, LIME Local, Stability)    │
│  ├── Drift Monitor         (Kolmogorov-Smirnov, PSI, Wasserstein)       │
│  └── Experiment Storage    (SQLite Persistence & Model Serialization)   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Dataset Description

Experiments are evaluated on the **CIC-IDS-2017** benchmark dataset developed by the Canadian Institute for Cybersecurity (University of New Brunswick). 

### Characteristics:
* **Collection Protocol**: Captured across a 5-day operational window covering benign activity and contemporary cyberattack scenarios.
* **Flow Attributes**: Each flow is summarized by over 70 statistical network features extracted from bidirectional packet exchanges (using CICFlowMeter):
  * *Timing Metrics*: `Flow Duration`, `Flow IAT Mean/Std/Max/Min`, `Fwd IAT Mean`.
  * *Packet Geometry*: `Total Fwd Packets`, `Total Backward Packets`, `Packet Length Mean/Std`.
  * *Protocol & Flag Telemetry*: `FIN`, `SYN`, `RST`, `PSH`, `ACK`, `URG` flags, window sizes (`Init_Win_bytes_forward`).
* **Classification Tasks**:
  * **Binary**: `Benign` vs. `Attack`.
  * **Multi-Class (12 Attack Categories)**:
    1. `BENIGN`
    2. `DoS Hulk`
    3. `PortScan`
    4. `DDoS`
    5. `DoS GoldenEye`
    6. `FTP-Patator` (Brute Force)
    7. `DoS slowloris`
    8. `DoS Slowhttptest`
    9. `SSH-Patator` (Brute Force)
    10. `Bot` (Botnet Command & Control)
    11. `Web Attack - Brute Force`
    12. `Web Attack - XSS`

---

## 5. Methodology

### A. Data Preprocessing & Leakage Prevention
To prevent data snooping and optimistic bias:
1. The dataset $D = \{(x_i, y_i)\}_{i=1}^N$ is partitioned into training and test sets *before* any transformation parameters are computed:
   $$D_{\text{train}} \cap D_{\text{test}} = \emptyset$$
2. **Imputation**: Missing cells and infinite values are replaced with feature medians calculated strictly on $D_{\text{train}}$:
   $$\tilde{x}_j = \text{median}(X_{\text{train}, j})$$
3. **Scaling**: Feature standardization parameters ($\mu_{\text{train}}, \sigma_{\text{train}}$) are fitted strictly on $D_{\text{train}}$ and subsequently applied to transform $D_{\text{test}}$:
   $$z = \frac{x - \mu_{\text{train}}}{\sigma_{\text{train}}}$$
4. In $k$-fold cross-validation, imputation and scaling are fitted exclusively within each training fold, leaving out-of-fold validation sets untouched.

### B. Machine Learning & Ensemble Architectures
The system implements and benchmarks 10 distinct model architectures:
1. **Decision Tree (DT)**: Fast, non-parametric axis-aligned decision surface partitioning.
2. **Logistic Regression (LR)**: Linear baseline maximizing the Bernoulli log-likelihood.
3. **Gaussian Naive Bayes (NB)**: Probabilistic classifier assuming conditional feature independence.
4. **Random Forest (RF)**: Ensemble of decision trees trained with bootstrap aggregating and random feature subsets.
5. **Extra Trees (ET)**: Randomized decision trees with randomized cut-point selection for variance reduction.
6. **Gradient Boosting Decision Trees (GBDT)**: Sequential additive boosting minimizing pseudo-residuals.
7. **AdaBoost**: Adaptive boosting iteratively upweighting misclassified samples.
8. **Voting Ensemble**: Aggregates predictions across diverse base learners using calibrated probability averaging (Soft Voting) or majority consensus (Hard Voting):
   $$\hat{P}(y=c \mid x) = \frac{1}{\sum w_i} \sum_{i=1}^M w_i P_i(y=c \mid x)$$
9. **Bagging Ensemble**: Bootstrap aggregating over base estimators to stabilize predictions on noisy data.
10. **Stacking Ensemble**: Hierarchical meta-learning. Out-of-fold probability predictions from diverse base classifiers $[P_1(x), P_2(x), \dots, P_M(x)]$ serve as meta-features for a meta-classifier (Logistic Regression) to learn optimal decision combinations.

### C. Explainable AI (XAI) Suite
1. **SHAP (SHapley Additive exPlanations)**: Calculates the marginal contribution $\phi_j$ of each network feature based on cooperative game theory:
   $$f(x) = E[f(x)] + \sum_{j=1}^M \phi_j(x)$$
   Rendered as an intuitive waterfall plot showing positive attributions (pushing toward Attack) and negative attributions (pushing toward Benign).
2. **LIME (Local Interpretable Model-agnostic Explanations)**: Generates a local linear surrogate model weighted by exponential distance kernels around the query flow vector, reporting decision boundaries and $R^2$ surrogate fidelity.
3. **Explanation Stability**: Measures the mathematical stability of feature attributions under small input perturbations $\epsilon$:
   $$\text{Stability} = \frac{\phi(x) \cdot \phi(x + \epsilon)}{\|\phi(x)\| \|\phi(x + \epsilon)\|}$$
4. **Counterfactual Feasibility**: Evaluates minimal feature perturbations required to flip an attack classification to benign while enforcing networking domain rules (valid ports $1 \le \text{port} \le 65535$, boolean TCP flags $\in \{0, 1\}$, non-negative packet counts and durations).
5. **Non-Causal Clarification**: The platform explicitly clarifies that feature attributions represent statistical associations within the model's decision function, not causal proof of intrusion.

### D. Traffic Distribution Drift Monitoring
Tracks covariate shifts between baseline training traffic $P(X)$ and operational incoming traffic $Q(X)$:
* **Kolmogorov-Smirnov (KS) Test**: Two-sample non-parametric test evaluating differences in cumulative distribution functions:
  $$D = \sup_x |F_{\text{ref}}(x) - F_{\text{inc}}(x)|, \quad p < 0.05 \implies \text{Significant Shift}$$
* **Population Stability Index (PSI)**: Quantifies change across quantile bins:
  $$\text{PSI} = \sum_{b=1}^B (P_b - Q_b) \ln\left(\frac{P_b}{Q_b}\right)$$
  * $\text{PSI} < 0.1$: Stable (Negligible drift).
  * $0.1 \le \text{PSI} \le 0.25$: Moderate drift.
  * $\text{PSI} > 0.25$: Significant drift.
* **Domain Note**: Drift indicates operational distribution change (e.g. software rollouts, protocol changes), not necessarily a cyberattack.

---

## 6. Experimental Setup & Evaluation Metrics

### Evaluation Strategies:
* **Stratified Random Split**: Preserves class proportions between training (75%) and testing (25%).
* **$k$-Fold Cross Validation**: $k=5$ stratified folds with leakage-free fold preprocessing.
* **Chronological Holdout**: Evaluates temporal generalization on trailing network captures.

### Evaluation Metrics:
* **Accuracy**: Overall fraction of correct classifications: $\frac{TP + TN}{TP + TN + FP + FN}$.
* **Precision (Macro & Weighted)**: Exactness of attack detection: $\frac{TP}{TP + FP}$.
* **Recall / True Positive Rate (Macro & Weighted)**: Completeness of threat capture: $\frac{TP}{TP + FN}$.
* **F1-Score (Macro & Weighted)**: Harmonic mean balancing precision and recall: $2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}$.
* **False Positive Rate (FPR)**: False alarm rate: $\frac{FP}{FP + TN}$.
* **False Negative Rate (FNR)**: Missed threat rate: $\frac{FN}{FN + TP}$.
* **Inference Latency**: Execution speed measured in milliseconds per 1,000 flow records.
* **Model Size**: Serialized disk footprint in kilobytes (KB).

---

## 7. Experimental Results

Evaluated across 47,607 test flows from the CIC-IDS-2017 benchmark dataset:

| Model Architecture | Model Type | Accuracy | Precision (Macro) | Recall (Macro) | Macro F1 | False Positive Rate | False Negative Rate | Latency (ms/1k) | Size (KB) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Stacking Classifier** | Ensemble | **99.64%** | **99.41%** | **99.72%** | **99.56%** | **0.28%** | **0.28%** | 3.2 ms | 312 KB |
| **Voting Ensemble** | Ensemble | 99.58% | 99.28% | 99.68% | 99.48% | 0.32% | 0.32% | 2.8 ms | 248 KB |
| **Random Forest** | Ensemble | 99.55% | 99.20% | 99.65% | 99.42% | 0.35% | 0.35% | 2.1 ms | 415 KB |
| **Gradient Boosting** | Ensemble | 99.42% | 99.05% | 99.50% | 99.27% | 0.41% | 0.50% | 4.8 ms | 185 KB |
| **Extra Trees** | Ensemble | 99.48% | 99.12% | 99.55% | 99.33% | 0.39% | 0.45% | 2.4 ms | 380 KB |
| **Decision Tree** | Baseline | 99.15% | 98.45% | 99.20% | 98.82% | 0.80% | 0.80% | **0.8 ms** | **45 KB** |
| **Logistic Regression**| Baseline | 94.80% | 91.20% | 93.50% | 92.33% | 4.10% | 6.50% | **0.5 ms** | **12 KB** |
| **Gaussian Naive Bayes**| Baseline | 86.40% | 79.50% | 88.20% | 83.62% | 11.20% | 11.80% | **0.4 ms** | **8 KB** |

### Key Experimental Insights:
1. **Ensemble Superiority**: Hierarchical Stacking achieved the highest overall Macro F1 score (99.56%) and reduced false alarms by over 65% compared to standalone decision trees.
2. **Controlled Robustness Findings**: Under 20% Gaussian feature jitter ($\sigma = 0.20$), single Decision Trees suffered a 14.8% F1 degradation (Resilience: 78.2/100), whereas the Random Forest and Stacking ensembles limited degradation to under 3.1% (Resilience: 94.6/100).
3. **Multi-Class Granularity**: High-volume attacks (DoS Hulk, DDoS, PortScan) achieved near-perfect F1 (>99.7%), while low-volume stealth attacks (Web Attack XSS, Infiltration) exhibited lower recall (~91.2%), demonstrating the importance of per-class evaluation over aggregate accuracy.

---

## 8. Limitations & Threats to Validity

1. **Synthetic vs. Real-World Traffic**: Benchmark datasets like CIC-IDS-2017 are collected in synthetic testbed environments. Real-world enterprise environments exhibit higher ambient entropy, proprietary encapsulation, and encrypted payloads.
2. **Adversarial Perturbation Boundaries**: While the system tests robustness against Gaussian noise and feature masking, advanced adversaries utilizing gradient-based evasion (e.g. FGSM) may craft adversarial perturbations within allowable protocol semantics.
3. **Correlation vs. Causation**: Feature attribution methods (SHAP, LIME) identify which input dimensions the model leveraged for its mathematical boundary; they do not prove that a specific network packet caused malicious execution.
4. **Encrypted Payloads (TLS/QUIC)**: The model relies strictly on statistical flow metadata (packet lengths, inter-arrival times, flags). It does not perform Deep Packet Inspection (DPI) on encrypted application data.

---

## 9. Installation & Execution Instructions

### Prerequisites:
* Python 3.10+ (tested on Python 3.12)
* Node.js 18+ & npm
* 4 GB RAM minimum

### 1. Backend Setup:
```bash
# Navigate to project root
cd /path/to/Cyber-Attack-Network-Intrusion-Profiler-using-Ensembled-Learning-master

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
API documentation (Swagger UI) is accessible at `http://localhost:8000/docs`.

### 2. Frontend Setup:
```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```
The web application is accessible at `http://localhost:5173`.

### 3. Running Automated Tests:
```bash
# Run API endpoint integration tests
python3 -m unittest backend/tests/test_api.py

# Run comprehensive semester upgrade research test suite
python3 -m unittest backend/tests/test_semester_upgrade.py
```

### 4. Building for Production:
```bash
cd frontend
npm run build
```
Generates optimized static assets in `frontend/dist/`.

---

## 10. Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/routes/
│   │   │   ├── research.py            # Unified benchmark engine, robustness, drift API
│   │   │   ├── studio.py              # User dataset upload, pipeline training, explain
│   │   │   ├── explainability.py      # SHAP, LIME, counterfactual endpoints
│   │   │   ├── traffic.py             # Monitored flow stream & inspection
│   │   │   ├── threats.py             # Active threat triage queue
│   │   │   ├── dashboard.py           # Real-time SOC metrics
│   │   │   ├── analytics.py           # Destination port & protocol distributions
│   │   │   └── reports.py             # Executive summaries & CSV batch profiling
│   │   ├── schemas/                   # Pydantic data contracts (research, studio, etc.)
│   │   └── services/                  # Business logic & machine learning engines:
│   │       ├── research/              # EvaluationEngine, RobustnessService, DriftService
│   │       ├── studio/                # DatasetManager, StudioExperimentService
│   │       └── explainability/        # ShapService, LimeService, CounterfactualService
│   └── tests/                         # Automated unit & integration test suites
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx          # SOC Overview & telemetry
│   │   │   ├── LiveTraffic.tsx        # Monitored packet streams
│   │   │   ├── ThreatCenter.tsx       # Intercepted attack triage
│   │   │   ├── NetworkAnalytics.tsx   # Port & duration analysis
│   │   │   ├── ResearchStudio.tsx     # Dedicated benchmark, robustness & drift lab
│   │   │   ├── Studio/                # 5-step interactive ensemble laboratory
│   │   │   └── Reports.tsx            # Batch CSV prediction & experiment history
│   │   ├── components/                # Reusable UI widgets & pipeline schematics
│   │   ├── services/api.ts            # Typed Axios HTTP client
│   │   └── types/                     # TypeScript schema definitions
│   └── package.json                   # Frontend build configuration
└── data/
    └── processed/                     # Benchmark datasets (binary & multiclass)
```
