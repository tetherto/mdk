'use strict'

const { Aggregator } = require('mingo/aggregator')
const { OperatorType, Context, initOptions } = require('mingo/core')
const accumulatorOperators = require('mingo/operators/accumulator')
const pipelineOperators = require('mingo/operators/pipeline')
const { getNestedProperty } = require('./util')
const mingoAggrOpts = initOptions({
  context: Context.init({
    [OperatorType.ACCUMULATOR]: accumulatorOperators,
    [OperatorType.PIPELINE]: pipelineOperators
  })
})

module.exports = async function (data, conf) {
  // get cross thing ids to fetch
  const idsSearch = new Aggregator(conf.searchAggr, mingoAggrOpts)
  const ids = idsSearch.run(data)[0]?.ids

  const crossThgs = await this.listThings({
    query: { id: { $in: ids } },
    fields: conf.searchFields,
    limit: ids?.length
  })

  // set cross thing val by matching the ids
  setCrossThgData(data, crossThgs, conf)

  // aggr group by cross thing val
  aggrCrossThgData(data, conf)
}

const aggrCrossThgData = (thgdata, conf) => {
  thgdata.forEach(thgObj => {
    for (const key in thgObj) {
      if (key === conf.crossArrKey) {
        const agg = new Aggregator(conf.groupAggr, mingoAggrOpts)
        thgObj[conf.crossArrKey] = agg.run(thgObj[conf.crossArrKey])
      }
    }
  })
}

const setCrossThgData = (thgdata, crossThgs, conf) => {
  thgdata.forEach(thgObj => {
    for (const key in thgObj) {
      if (key === conf.crossArrKey) {
        thgObj[conf.crossArrKey].forEach(obj => {
          const thg = crossThgs.find(t => t.id === obj[conf.crossObjKey])
          if (thg) obj.crossThg = getNestedProperty(thg, conf.thgProperty)
        })
      }
    }
  })
}
