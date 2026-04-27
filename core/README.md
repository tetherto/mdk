# MDK Core

## Quick start

### 1. Clone the repo

```bash
git clone https://github.com/tetherto/mdk.git
cd mdk/core
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run a sample

Use the miner client sample to test mock miner registration:

```bash
node samples/miners/mdk.client.miner.js
```

The sample starts an API server on port 3000 and registers miners with example config. See `samples/miners/mdk.client.miner.js` for the full reference implementation.
