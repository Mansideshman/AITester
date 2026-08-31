# jenkins_logs

Drop Jenkins console output (`.log`/`.txt`) or JUnit-style test result
files (`results.xml`) here.

Ingested by `qabuddy/loaders/jenkins_log_loader.py` (`source_type=jenkins_log`).
JUnit XML is parsed with one chunk per `<testcase>` element (name, status,
failure/error excerpt). Console logs are split on common test-run markers,
falling back to a generic sliding-window split if none are found. Chunk
size/overlap: 1500/200 chars (larger than prose so stack traces stay
coherent in one chunk).

Run `python ingest.py jenkins_log` after adding files.
