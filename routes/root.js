'use strict'

module.exports = async function (fastify, opts) {

  fastify.get('/healthy', async function (request, reply) {
    return { status: 'ok' };
  })
}
