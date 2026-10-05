---
title: Benchmark your site
description: Measure real CPU, RAM, disk, and latency for your MDK deployment and size Workers against pass/fail thresholds
docs@tether_slug: guides/deployment/benchmark-your-site
---

Turn a sizing guess into a number you can trust: real Kernel, Gateway, and Worker processes under real load, for
your own hardware.

Use the benchmark harness when you want a filled [capacity and metrics template][capacity-template] from measured
runs on your own hardware, instead of by hand. See [when to use this][benchmark-when] for the specific cases.

## Run the benchmark

- Follow the benchmark harness [config][benchmark-config]
- Use the [quick start][benchmark-run]

> [!NOTE]
> Learn more from the [benchmark readme][benchmark-readme].

## Links

[capacity-template]: capacity-metrics-template.md
<!-- docs@tether.io: capacity-template → guides/deployment/capacity-metrics-template -->

[benchmark-readme]: ../../../backend/tests/benchmark/README.md
<!-- docs@tether.io: benchmark-readme → guides/deployment/benchmark-your-site#overview -->

[benchmark-when]: ../../../backend/tests/benchmark/README.md#when-to-use-this
<!-- docs@tether.io: benchmark-when → guides/deployment/benchmark-your-site#when-to-use-this -->

[benchmark-config]: ../../../backend/tests/benchmark/config/benchmark.config.json.example
<!-- docs@tether.io: benchmark-config → https://github.com/tetherto/mdk/blob/main/backend/tests/benchmark/config/benchmark.config.json.example -->

[benchmark-run]: ../../../backend/tests/benchmark/README.md#quickstart
<!-- docs@tether.io: benchmark-run → guides/deployment/benchmark-your-site#quickstart -->
