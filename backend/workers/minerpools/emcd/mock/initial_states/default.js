'use strict'

module.exports = (now = new Date()) => {
  const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10)
  return {
    hashrate: { currHr: 150e12, avg1Hr: 145e12, avg24Hr: 140e12, rejects: { Avg1Hr: 1e12, Avg24Hr: 2e12 } },
    workers: [
      { worker: 'account.rig-1', workerName: 'rig-1', active: 1, hashrate: 150e12, hashrate1h: 145e12, hashrate24h: 140e12, lastbeat: Math.floor(now.getTime() / 1000) },
      { worker: 'account.rig-2', workerName: 'rig-2', hashrate: 0, hashrate1h: 0, hashrate24h: 0, lastbeat: 0 }
    ],
    balance: { coin: 'btc', balance: '0.00125000', updatedAt: now.toISOString() },
    earnings: [{ date: yesterday, totalAmount: 0.00012 }],
    payouts: [{ time: `${yesterday}T12:00:00Z`, amount: 0.0001, txId: 'mock-transaction-1' }]
  }
}
