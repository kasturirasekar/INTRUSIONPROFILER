# Demo inputs for the app sections

These are copyable fixtures for exercising the app locally. The labeled CIC
binary sample currently contains **1,500 real flow rows**. Lab uses every row
once across a stratified train/holdout split; the dashboard's generated demo
traffic is display telemetry and is not used as ground truth for training.

The two flow payloads contain all 78 CIC numeric features and can be reused in
the Prediction and Explainable AI sections.

## Sections and sample calls

| Section | Input or action | API check |
| --- | --- | --- |
| Dashboard | No input | `GET /api/dashboard/summary` |
| Live Traffic | Choose a page/filter or request a stream batch | `GET /api/traffic?page=1&page_size=25`; `GET /api/traffic/stream?batch_size=10` |
| Threat Center | Choose severity/search filters | `GET /api/threats?page=1&page_size=25&severity=High` |
| Network Analytics | No input | `GET /api/analytics` |
| Model Performance | No input | `GET /api/model/performance` |
| Prediction / real-time profiling | Submit one live flow or a batch | `realtime_profile_flow.json`, `predict_benign.json`, `predict_attack.json`, or `prediction_batch.json` |
| Ensemble Lab | Preview dataset/preprocessing or launch a benchmark | `lab_dataset_preview.json`, `lab_preprocessing_preview.json`, `lab_experiment.json` |
| Studio | Launch a labeled CIC experiment | `studio_experiment.json`; explain a completed run with `studio_explain.json` after replacing its experiment ID |
| Research & Evaluation | Run benchmark, robustness, or drift checks | `research_benchmark.json`, `research_robustness.json`, `research_drift.json` |
| Explainable AI | Explain a labeled attack flow | `explain_flow.json` |
| Reports | No input; choose export size if needed | `GET /api/reports/summary`; `GET /api/reports/export-csv?max_rows=100` |
| Settings | UI preferences only | No API payload required |

## Run payloads

From the project root, for example:

```bash
curl -X POST http://localhost:5173/api/predict \
  -H 'Content-Type: application/json' \
  --data @data/samples/demo_inputs/realtime_profile_flow.json

curl -X POST http://localhost:8000/api/predict \
  -H 'Content-Type: application/json' \
  --data @data/samples/demo_inputs/predict_attack.json

curl -X POST http://localhost:8000/api/predict/batch \
  -H 'Content-Type: application/json' \
  --data @data/samples/demo_inputs/prediction_batch.json

curl -X POST http://localhost:8000/api/research/benchmark \
  -H 'Content-Type: application/json' \
  --data @data/samples/demo_inputs/research_benchmark.json

curl -X POST http://localhost:8000/api/research/robustness \
  -H 'Content-Type: application/json' \
  --data @data/samples/demo_inputs/research_robustness.json

curl -X POST http://localhost:8000/api/research/drift \
  -H 'Content-Type: application/json' \
  --data @data/samples/demo_inputs/research_drift.json

curl -X POST http://localhost:8000/api/explainability/prediction \
  -H 'Content-Type: application/json' \
  --data @data/samples/demo_inputs/explain_flow.json

curl -X POST http://localhost:8000/api/datasets/preview \
  -H 'Content-Type: application/json' \
  --data @data/samples/demo_inputs/lab_dataset_preview.json

curl -X POST http://localhost:8000/api/preprocessing/preview \
  -H 'Content-Type: application/json' \
  --data @data/samples/demo_inputs/lab_preprocessing_preview.json

curl -X POST http://localhost:8000/api/experiments \
  -H 'Content-Type: application/json' \
  --data @data/samples/demo_inputs/lab_experiment.json

curl -X POST http://localhost:8000/api/studio/experiments \
  -H 'Content-Type: application/json' \
  --data @data/samples/demo_inputs/studio_experiment.json
```

The Studio and Lab JSON files are request bodies, not uploaded CSVs. To try a
CSV upload in Studio, use `data/samples/sample_cic_binary.csv` and select its
`target` column.
