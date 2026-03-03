const uniswapV2 = require("./uniswapV2Adapter");
const uniswapV3 = require("./uniswapV3Adapter");
const joeLb = require("./joeLbAdapter");
const balancer = require("./balancerAdapter");

const ADAPTERS = {
  uniswap_v2: uniswapV2,
  uniswap_v3: uniswapV3,
  joe_lb: joeLb,
  balancer,
};

module.exports = { ADAPTERS };
