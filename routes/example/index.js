'use strict'
const { rssUpdate } = require('@tasks')

module.exports = async function (fastify, opts) {
  fastify.get('/', async function (request, reply) {
    rssUpdate(fastify)
    return 'this is an example'
  })
}
