'use strict'
const Tasks = require('../../task')

module.exports = async function (fastify, opts) {
  fastify.get('/', async function (request, reply) {
    Tasks(fastify)
    return 'this is an example'
  })
}
